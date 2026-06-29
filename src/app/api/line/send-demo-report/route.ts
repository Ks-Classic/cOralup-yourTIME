import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession } from '@/lib/staff-auth'
import { logger } from '@/lib/logger'
import { db } from '@/db'
import { profiles } from '@/db/schema'
import { eq } from 'drizzle-orm'

export const maxDuration = 30

// LINEテキストは5000字上限。余裕を持った業務上の上限を設ける。
const MAX_CHILD_NAME_LENGTH = 100
const MAX_REPORT_SUMMARY_LENGTH = 2000
const LINE_PUSH_TIMEOUT_MS = 10_000

interface SendDemoReportRequest {
  childName: string
  reportSummary?: string
}

interface LineTextMessage {
  type: 'text'
  text: string
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function parseRequestBody(body: unknown): SendDemoReportRequest | null {
  if (!body || typeof body !== 'object') return null

  const record = body as Record<string, unknown>
  if (!isNonEmptyString(record.childName)) return null

  const childName = record.childName.trim()
  if (childName.length > MAX_CHILD_NAME_LENGTH) return null

  const reportSummary = isNonEmptyString(record.reportSummary)
    ? record.reportSummary.trim()
    : undefined
  if (reportSummary && reportSummary.length > MAX_REPORT_SUMMARY_LENGTH)
    return null

  return { childName, reportSummary }
}

function buildDemoReportMessage(params: {
  childName: string
  staffName: string
  reportSummary?: string
}): LineTextMessage {
  const summary =
    params.reportSummary ||
    'デモ診断レポートの送信確認です。実運用データは保存・更新されていません。'

  return {
    type: 'text',
    text: [
      '【デモ】cOral up 診断レポート',
      '',
      `${params.staffName}さん宛のデモ送信です。`,
      `${params.childName}さんの診断レポートが完成しました。`,
      '',
      summary,
      '',
      '※これはスタッフ確認用のデモ送信です。',
      '※患者/保護者には送信されていません。',
      '※DBのvisit/report/LINE配信確認は更新していません。',
    ].join('\n'),
  }
}

async function sendStaffLineMessage(
  lineUserId: string,
  message: LineTextMessage
): Promise<{
  success: boolean
  responseData?: unknown
  error?: string
}> {
  // 呼び出し時にenvを読む(モジュール初期化時固定を避ける)
  const accessToken = process.env.LINE_STAFF_CHANNEL_ACCESS_TOKEN
  if (!accessToken) {
    return {
      success: false,
      error: 'LINE_STAFF_CHANNEL_ACCESS_TOKEN is not set',
    }
  }

  let response: Response
  try {
    response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [message],
      }),
      signal: AbortSignal.timeout(LINE_PUSH_TIMEOUT_MS),
    })
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'LINE push request failed',
    }
  }

  const responseData = await response.json().catch(() => ({}))

  if (!response.ok) {
    return {
      success: false,
      responseData,
      error: JSON.stringify(responseData),
    }
  }

  return { success: true, responseData }
}

export async function POST(request: NextRequest) {
  try {
    // 認証失敗は401で返す(getStaffSessionはnull=未認証、鍵未設定は例外→下のcatchで5xx)
    const session = await getStaffSession()
    if (!session) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    // 宛先は常に「認証済みスタッフ本人のLINE」。
    // LIFFログインならセッションJWTに lineUserId がある。
    // PINログイン等で無い場合は、本人(staffId)のプロフィールから登録済みLINEを引く。
    // いずれもサーバ側で確定し、body からは受け取らない(なりすまし防止)。
    let recipientLineUserId = isNonEmptyString(session.lineUserId)
      ? session.lineUserId
      : undefined

    if (!recipientLineUserId) {
      const rows = await db
        .select({ lineUserId: profiles.lineUserId })
        .from(profiles)
        .where(eq(profiles.id, session.staffId))
        .limit(1)
      if (isNonEmptyString(rows[0]?.lineUserId)) {
        recipientLineUserId = rows[0].lineUserId
      }
    }

    if (!recipientLineUserId) {
      return NextResponse.json(
        {
          error:
            'スタッフ本人のLINEが未登録です。スタッフ用LINE公式アカウントを友だち追加し、LINEログインで入り直すとデモLINEを受け取れます。',
        },
        { status: 400 }
      )
    }

    const parsedBody = parseRequestBody(await request.json().catch(() => null))
    if (!parsedBody) {
      return NextResponse.json(
        { error: 'childName is required' },
        { status: 400 }
      )
    }

    const message = buildDemoReportMessage({
      childName: parsedBody.childName,
      staffName: session.staffName,
      reportSummary: parsedBody.reportSummary,
    })

    const result = await sendStaffLineMessage(recipientLineUserId, message)

    if (!result.success) {
      // 内部エラー詳細(env名/LINE生エラー)はサーバログのみ。クライアントには返さない。
      logger.error(
        'Demo LINE report send failed',
        {
          path: '/api/line/send-demo-report',
          staffId: session.staffId,
        },
        result.error
      )

      return NextResponse.json(
        { error: 'デモLINE送信に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'スタッフ本人へデモLINEを送信しました',
    })
  } catch (error) {
    logger.error(
      'Demo LINE report send error',
      { path: '/api/line/send-demo-report' },
      error
    )
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}
