import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getStaffSession } from '@/lib/staff-auth'
import { logger } from '@/lib/logger'
import { db } from '@/db'
import { lineMessageLogs, profiles } from '@/db/schema'
import { eq } from 'drizzle-orm'
import {
  buildReportMessages,
  type LineReportMessage,
} from '@/lib/line-report-message'
import {
  DEMO_REPORT_PREFIX,
  parseDemoReportRequest,
  type DemoReportSnapshot,
} from '@/lib/demo-report'

export const maxDuration = 30

const LINE_PUSH_TIMEOUT_MS = 10_000

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || 'https://coralup-yourtime.vercel.app'

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}


async function sendStaffLineMessages(
  lineUserId: string,
  messages: LineReportMessage[]
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
        messages,
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

    const parsedBody = parseDemoReportRequest(
      await request.json().catch(() => null)
    )
    if (!parsedBody) {
      return NextResponse.json(
        { error: 'invalid demo report' },
        { status: 400 }
      )
    }

    const demoReportId = randomUUID()
    const reportUrl = `${APP_URL}/report/${DEMO_REPORT_PREFIX}${demoReportId}`
    const snapshot: DemoReportSnapshot = {
      childName: parsedBody.childName,
      childAge: parsedBody.childAge,
      eventName: '8/2 YourTIME.8th 東京',
      diagnosisDate: new Date().toISOString(),
      summary: parsedBody.reportSummary,
    }

    await db.insert(lineMessageLogs).values({
      id: demoReportId,
      lineUserId: recipientLineUserId,
      messageType: 'demo_report',
      messageContent: { demoReport: snapshot },
      status: 'pending',
    } as typeof lineMessageLogs.$inferInsert)

    // 本番と同一フォーマットのFlex。違いはボタンの向き先(デモレポート)と
    // altText/注記の「デモ」明示だけ。staffNameはaltTextに含めない(本番同様)。
    const messages = buildReportMessages({
      childName: parsedBody.childName,
      reportUrl,
      isDemo: true,
    })

    const result = await sendStaffLineMessages(recipientLineUserId, messages)

    if (!result.success) {
      await db
        .update(lineMessageLogs)
        .set({
          status: 'failed',
          errorMessage: result.error,
        } as Partial<typeof lineMessageLogs.$inferInsert>)
        .where(eq(lineMessageLogs.id, demoReportId))
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

    await db
      .update(lineMessageLogs)
      .set({
        status: 'success',
        response: result.responseData,
        sentAt: new Date(),
      } as Partial<typeof lineMessageLogs.$inferInsert>)
      .where(eq(lineMessageLogs.id, demoReportId))

    return NextResponse.json({
      success: true,
      message: 'スタッフ本人へデモLINEを送信しました',
      reportUrl,
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
