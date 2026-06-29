import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { lineMessageLogs } from '@/db/schema'
import { sendPushMessageSafe } from '@/lib/line-messaging'
import { updateVisitProgress } from '@/lib/visit-status'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://coralup-yourtime.vercel.app'

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

    // Flex Messageでリッチな通知を送信
    const flexMessage = {
      type: 'flex',
      altText: `${childName}さんの分析レポートが完成しました`,
      contents: {
        type: 'bubble',
        hero: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '🦷 cOral up',
              weight: 'bold',
              size: 'sm',
              color: '#1e40af'
            }
          ],
          paddingAll: 'lg',
          backgroundColor: '#eff6ff'
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '分析レポート完成',
              weight: 'bold',
              size: 'xl',
              margin: 'md'
            },
            {
              type: 'text',
              text: `${childName}さんの口腔育成診断レポートが完成しました。`,
              size: 'sm',
              color: '#666666',
              margin: 'md',
              wrap: true
            },
            ...(eventName ? [{
              type: 'text' as const,
              text: `📍 ${eventName}`,
              size: 'xs' as const,
              color: '#999999',
              margin: 'md' as const
            }] : [])
          ]
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'primary',
              height: 'sm',
              action: {
                type: 'uri',
                label: 'レポートを見る',
                uri: reportUrl
              },
              color: '#2563eb'
            },
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: '※ レポートは90日間有効です',
                  size: 'xxs',
                  color: '#aaaaaa',
                  align: 'center'
                }
              ],
              margin: 'md'
            }
          ],
          flex: 0
        }
      }
    }

    // 残数チェック付きで送信
    const result = await sendPushMessageSafe({
      to: lineUserId,
      messages: [flexMessage],
    })

    const sentAt = new Date()

    if (result.quotaExceeded) {
      // 上限到達 — ログ記録 + フォールバック情報返却
      await db.insert(lineMessageLogs).values({
        visitId: visitId || null,
        sessionId: sessionId || null,
        lineUserId,
        messageType: 'report',
        messageContent: JSON.stringify(flexMessage),
        status: 'quota_exceeded',
        response: { quotaExceeded: true, quota: result.quota },
        errorMessage: 'LINE月間送信上限に達しました',
        sentAt,
      } as typeof lineMessageLogs.$inferInsert)

      return NextResponse.json({
        success: false,
        quotaExceeded: true,
        fallbackMessage: 'LINE通知の月間上限に達しました。こちらのURLをお客様に直接お伝えください。',
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
        messageContent: JSON.stringify(flexMessage),
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
      messageContent: JSON.stringify(flexMessage),
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
      reportUrl
    })

  } catch (error) {
    console.error('Send report error:', error)
    return NextResponse.json(
      { error: 'サーバーエラー' },
      { status: 500 }
    )
  }
}
