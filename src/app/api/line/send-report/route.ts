import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { visits, lineMessageLogs } from '@/db/schema'
import { eq } from 'drizzle-orm'

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN!
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://coralup-yourtime.vercel.app'

interface SendReportRequest {
  lineUserId: string
  reportUuid: string
  childName: string
  eventName?: string
  visitId?: string
  sessionId?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: SendReportRequest = await request.json()
    const { lineUserId, reportUuid, childName, eventName, visitId, sessionId } = body

    if (!lineUserId || !reportUuid) {
      return NextResponse.json(
        { error: 'lineUserId と reportUuid は必須です' },
        { status: 400 }
      )
    }

    const reportUrl = `${APP_URL}/report/${reportUuid}`

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

    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [flexMessage]
      })
    })

    const responseData = await response.json().catch(() => ({}))
    const sentAt = new Date()

    if (!response.ok) {
      const errorText = JSON.stringify(responseData)
      console.error('LINE API error:', errorText)

      // 失敗ログを記録
      await db.insert(lineMessageLogs).values({
        visitId: visitId || null,
        sessionId: sessionId || null,
        lineUserId,
        messageType: 'report',
        messageContent: JSON.stringify(flexMessage),
        status: 'failed',
        response: responseData,
        errorMessage: errorText,
        sentAt,
      } as typeof lineMessageLogs.$inferInsert)

      return NextResponse.json(
        { error: 'LINE通知の送信に失敗しました', details: errorText },
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
      response: responseData,
      sentAt,
    } as typeof lineMessageLogs.$inferInsert)

    // visits.status と report_sent_at を更新
    if (visitId) {
      await db
        .update(visits)
        .set({
          status: 'published',
          currentStep: 'line_sent',
          reportSentAt: sentAt,
        } as Partial<typeof visits.$inferInsert>)
        .where(eq(visits.id, visitId))
    } else if (sessionId) {
      await db
        .update(visits)
        .set({
          status: 'published',
          currentStep: 'line_sent',
          reportSentAt: sentAt,
        } as Partial<typeof visits.$inferInsert>)
        .where(eq(visits.sessionId, sessionId))
    }

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
