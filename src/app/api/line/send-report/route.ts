import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { lineMessageLogs } from '@/db/schema'
import { sendPushMessageSafe } from '@/lib/line-messaging'
import { updateVisitProgress } from '@/lib/visit-status'
import { buildReportMessages } from '@/lib/line-report-message'

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || 'https://coralup-yourtime.vercel.app'

// Vercel Serverless: LINE API通信のため60秒に延長
export const maxDuration = 60

interface SendReportRequest {
  lineUserId: string
  visitId: string
  childName: string
  eventName?: string
  sessionId?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: SendReportRequest = await request.json()
    const { lineUserId, childName, eventName, visitId, sessionId } = body

    if (!lineUserId || !visitId) {
      return NextResponse.json(
        { error: 'lineUserId と visitId は必須です' },
        { status: 400 }
      )
    }

    const reportUrl = `${APP_URL}/report/${visitId}`

    // Flex Messageでリッチな通知を送信（本番/デモ共通の生成元を使用）
    const messages = buildReportMessages({
      childName,
      reportUrl,
      eventName,
    })

    // 残数チェック付きで送信
    const result = await sendPushMessageSafe({
      to: lineUserId,
      messages,
    })

    const sentAt = new Date()

    if (result.quotaExceeded) {
      // 上限到達 — ログ記録 + フォールバック情報返却
      await db.insert(lineMessageLogs).values({
        visitId: visitId || null,
        sessionId: sessionId || null,
        lineUserId,
        messageType: 'report',
        messageContent: JSON.stringify(messages),
        status: 'quota_exceeded',
        response: { quotaExceeded: true, quota: result.quota },
        errorMessage: 'LINE月間送信上限に達しました',
        sentAt,
      } as typeof lineMessageLogs.$inferInsert)

      return NextResponse.json({
        success: false,
        quotaExceeded: true,
        fallbackMessage:
          'LINE通知の月間上限に達しました。こちらのURLをお客様に直接お伝えください。',
        fallbackReportUrl: reportUrl,
        reportUrl,
      })
    }

    if (!result.success) {
      // 送信失敗
      await db.insert(lineMessageLogs).values({
        visitId: visitId || null,
        sessionId: sessionId || null,
        lineUserId,
        messageType: 'report',
        messageContent: JSON.stringify(messages),
        status: 'failed',
        response: result.responseData,
        errorMessage: result.error,
        sentAt,
      } as typeof lineMessageLogs.$inferInsert)

      return NextResponse.json(
        { error: 'LINE通知の送信に失敗しました', details: result.error },
        { status: 500 }
      )
    }

    // 成功ログを記録
    await db.insert(lineMessageLogs).values({
      visitId: visitId || null,
      sessionId: sessionId || null,
      lineUserId,
      messageType: 'report',
      messageContent: JSON.stringify(messages),
      status: 'success',
      response: result.responseData,
      sentAt,
    } as typeof lineMessageLogs.$inferInsert)

    await updateVisitProgress(visitId, 'line_sent', {
      reportSentAt: sentAt,
    })

    return NextResponse.json({
      success: true,
      message: 'レポートURLをLINEで送信しました',
      reportUrl,
    })
  } catch (error) {
    console.error('Send report error:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}
