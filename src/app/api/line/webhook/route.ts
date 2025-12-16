import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET!
// 親御さん用のMessaging APIアクセストークン（LINE_MESSAGING_CHANNEL_ACCESS_TOKENを優先）
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN || process.env.LINE_CHANNEL_ACCESS_TOKEN!
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://coralup-yourtime.vercel.app'
const CORALUP_ORG_ID = process.env.CORALUP_ORG_ID
const DEFAULT_EVENT_ID = process.env.DEFAULT_EVENT_ID // YourTIMEイベントID

// Supabase クライアント
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-line-signature')

    // 署名の検証
    if (!signature) {
      return NextResponse.json(
        { error: '署名が見つかりません' },
        { status: 400 }
      )
    }

    const expectedSignature = crypto
      .createHmac('sha256', LINE_CHANNEL_SECRET)
      .update(body)
      .digest('base64')

    if (signature !== expectedSignature) {
      return NextResponse.json(
        { error: '署名が無効です' },
        { status: 400 }
      )
    }

    // Webhookイベントの処理
    const events = JSON.parse(body).events

    for (const event of events) {
      switch (event.type) {
        case 'follow':
          await handleFollowEvent(event)
          break
        case 'message':
          await handleMessageEvent(event)
          break
        case 'postback':
          await handlePostbackEvent(event)
          break
        default:
          // console.log('Unhandled event type:', event.type)
      }
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('Error in LINE webhook:', error)
    return NextResponse.json(
      { error: 'Webhook処理中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

async function handleFollowEvent(event: any) {
  // フォロー時の処理
  const lineUserId = event.source.userId

  // console.log('User followed:', lineUserId)

  try {
    // LINEプロフィールを取得
    // console.log('[LINE Webhook] Fetching profile with token:', LINE_CHANNEL_ACCESS_TOKEN ? `${LINE_CHANNEL_ACCESS_TOKEN.substring(0, 20)}...` : 'NOT SET')
    
    const profileResponse = await fetch(
      `https://api.line.me/v2/bot/profile/${lineUserId}`,
      {
        headers: {
          Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
        },
      }
    )

    let displayName = null
    let avatarUrl = null

    if (profileResponse.ok) {
      const profile = await profileResponse.json()
      displayName = profile.displayName
      avatarUrl = profile.pictureUrl
      // console.log('LINE profile fetched:', { displayName, avatarUrl })
    } else {
      const errorText = await profileResponse.text()
      console.error('[LINE Webhook] Profile fetch failed:', profileResponse.status, errorText)
    }

    // 既存プロフィール確認
    const { data: existing, error: existingError } = await supabase
      .from('profiles')
      .select('id, role, secondary_role')
      .eq('line_user_id', lineUserId)
      .maybeSingle()

    let data, error
    if (existing) {
      // 既存レコード: roleを上書きせず、secondary_roleを設定
      if (existing.role === 'parent' || existing.secondary_role === 'parent') {
        // 既に親御さんロールがある場合は更新のみ
        const { data: updated, error: updateError } = await supabase
          .from('profiles')
          .update({
            display_name: displayName,
            avatar_url: avatarUrl,
            last_activity_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single()
        data = updated
        error = updateError
      } else {
        // 他のロール（staff等）がある場合、secondary_role='parent'を追加
        const { data: updated, error: updateError } = await supabase
          .from('profiles')
          .update({
            display_name: displayName,
            avatar_url: avatarUrl,
            secondary_role: 'parent',
            last_activity_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single()
        data = updated
        error = updateError
      }
    } else {
      // 新規作成: role='parent'で作成
      const { data: inserted, error: insertError } = await supabase
        .from('profiles')
        .insert({
          line_user_id: lineUserId,
          display_name: displayName,
          avatar_url: avatarUrl,
          role: 'parent',
          last_activity_at: new Date().toISOString(),
        })
        .select()
        .single()
      data = inserted
      error = insertError
    }

    if (error) {
      console.error('Error registering user to profiles:', error)
      throw error
    }

    // console.log('User registered to profiles:', data)

    // ウェルカムメッセージを送信
    await sendWelcomeMessage(lineUserId, displayName)
  } catch (error) {
    console.error('Error in handleFollowEvent:', error)
  }
}

async function sendWelcomeMessage(userId: string, displayName: string | null) {
  // LIFF IDが設定されている場合はLIFF URLを使用
  const liffId = process.env.NEXT_PUBLIC_PARENT_LIFF_ID
  const questionnaireUrl = liffId
    ? `https://liff.line.me/${liffId}`
    : `${APP_URL}/parent/questionnaire/demo`

  const welcomeMessage = {
    type: 'text',
    text: `${displayName ? `${displayName}さん、` : ''}友だち登録ありがとうございます！🦷\n\n` +
          'cOralup口腔育成診断システムです。\n\n' +
          '下のボタンから問診を開始してください👇',
  }

  // Flex Messageでより見やすいボタンを送信
  const flexMessage = {
    type: 'flex',
    altText: 'お子様の口腔育成診断を始めましょう',
    contents: {
      type: 'bubble',
      hero: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '🦷 口腔育成診断',
            weight: 'bold',
            size: 'xl',
            align: 'center',
            color: '#F97316',
          },
        ],
        paddingAll: '20px',
        backgroundColor: '#FFF7ED',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: 'お子様の口腔育成状態を\n専門スタッフが診断します',
            wrap: true,
            size: 'sm',
            align: 'center',
            color: '#666666',
          },
          {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: '📝 問診票の入力（約5分）',
                size: 'xs',
                color: '#888888',
              },
              {
                type: 'text',
                text: '📷 スタッフによる撮影・診断',
                size: 'xs',
                color: '#888888',
              },
              {
                type: 'text',
                text: '📊 LINEでレポートをお届け',
                size: 'xs',
                color: '#888888',
              },
            ],
            margin: 'lg',
            spacing: 'sm',
          },
        ],
        paddingAll: '15px',
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            action: {
              type: 'uri',
              label: '問診を開始する',
              uri: questionnaireUrl,
            },
            style: 'primary',
            color: '#F97316',
          },
        ],
        paddingAll: '15px',
      },
    },
  }

  await sendMessage(userId, welcomeMessage)
  await sendMessage(userId, flexMessage)
}

async function handleMessageEvent(event: any) {
  // メッセージ受信時の処理
  const userId = event.source.userId
  const message = event.message

  // console.log('Message received:', { userId, message })

  // テキストメッセージの場合
  if (message.type === 'text') {
    await handleTextMessage(userId, message.text)
  }
}

async function handlePostbackEvent(event: any) {
  // ポストバック時の処理
  const userId = event.source.userId
  const postbackData = event.postback.data

  // console.log('Postback received:', { userId, postbackData })

  // ポストバックデータの処理
  // 実際の実装では、適切な処理を行う
}

async function handleTextMessage(userId: string, text: string) {
  // テキストメッセージの処理
  // 実際の実装では、キーワードに応じた処理を行う

  if (text.toLowerCase().includes('診断結果')) {
    // 診断結果の照会処理
    await sendDiagnosisResult(userId)
  } else if (text.toLowerCase().includes('ヘルプ')) {
    // ヘルプメッセージ送信
    await sendHelpMessage(userId)
  } else {
    // デフォルトの応答
    await sendDefaultMessage(userId)
  }
}

async function sendDiagnosisResult(userId: string) {
  // 診断結果送信処理
  // 実際の実装では、ユーザーの最新の診断結果を取得して送信
  // console.log('Sending diagnosis result to:', userId)
}

async function sendHelpMessage(userId: string) {
  // ヘルプメッセージ送信処理
  // console.log('Sending help message to:', userId)

  const helpMessage = {
    type: 'text',
    text: 'cOralup口腔育成診断システムです。\n\n' +
          '以下のキーワードで操作できます：\n' +
          '• 診断結果: 最新の診断結果を確認\n' +
          '• ヘルプ: このメッセージを表示\n\n' +
          'ご質問がありましたら、スタッフまでお声かけください。'
  }

  await sendMessage(userId, helpMessage)
}

async function sendDefaultMessage(userId: string) {
  // デフォルトメッセージ送信処理
  // console.log('Sending default message to:', userId)

  const defaultMessage = {
    type: 'text',
    text: 'cOralup口腔育成診断システムをご利用いただきありがとうございます。\n\n' +
          '「ヘルプ」と入力すると、操作方法をご案内します。'
  }

  await sendMessage(userId, defaultMessage)
}

async function sendMessage(userId: string, message: any) {
  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: userId,
        messages: [message],
      }),
    })

    if (!response.ok) {
      console.error('Failed to send message:', await response.text())
    }
  } catch (error) {
    console.error('Error sending message:', error)
  }
}

