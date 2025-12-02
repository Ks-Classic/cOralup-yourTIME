import { NextRequest, NextResponse } from 'next/server'

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN!
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://coralup.vercel.app'

interface SendReportRequest {
  lineUserId: string
  reportUuid: string
  childName: string
  eventName?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: SendReportRequest = await request.json()
    const { lineUserId, reportUuid, childName, eventName } = body

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

    if (!response.ok) {
      const errorText = await response.text()
      console.error('LINE API error:', errorText)
      return NextResponse.json(
        { error: 'LINE通知の送信に失敗しました', details: errorText },
        { status: 500 }
      )
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

