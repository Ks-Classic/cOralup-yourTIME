import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { db } from '@/db'
import { profiles } from '@/db/schema'
import { eq } from 'drizzle-orm'

const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET!
// 親御さん用のMessaging APIアクセストークン（LINE_MESSAGING_CHANNEL_ACCESS_TOKENを優先）
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN || process.env.LINE_CHANNEL_ACCESS_TOKEN!
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://coralup-yourtime.vercel.app'

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
        // Unhandled event type
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
  const lineUserId = event.source.userId

  try {
    // LINEプロフィールを取得
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
    } else {
      const errorText = await profileResponse.text()
      console.error('[LINE Webhook] Profile fetch failed:', profileResponse.status, errorText)
    }

    // 既存プロフィール確認
    const existingRows = await db
      .select({ id: profiles.id, role: profiles.role, secondaryRole: profiles.secondaryRole })
      .from(profiles)
      .where(eq(profiles.lineUserId, lineUserId))
      .limit(1)

    const existing = existingRows[0]

    if (existing) {
      // 既存レコード: roleを上書きせず、secondary_roleを設定
      if (existing.role === 'parent' || existing.secondaryRole === 'parent') {
        // 既に親御さんロールがある場合は更新のみ
        await db
          .update(profiles)
          .set({
            displayName,
            avatarUrl,
            lastActivityAt: new Date(),
          } as Partial<typeof profiles.$inferInsert>)
          .where(eq(profiles.id, existing.id))
      } else {
        // 他のロール（staff等）がある場合、secondary_role='parent'を追加
        await db
          .update(profiles)
          .set({
            displayName,
            avatarUrl,
            secondaryRole: 'parent',
            lastActivityAt: new Date(),
          } as Partial<typeof profiles.$inferInsert>)
          .where(eq(profiles.id, existing.id))
      }
    } else {
      // 新規作成: role='parent'で作成
      await db
        .insert(profiles)
        .values({
          lineUserId,
          displayName,
          avatarUrl,
          role: 'parent',
          lastActivityAt: new Date(),
        } as typeof profiles.$inferInsert)
    }

    // ウェルカムメッセージを送信
    await sendWelcomeMessage(lineUserId, displayName)
  } catch (error) {
    console.error('Error in handleFollowEvent:', error)
  }
}

async function sendWelcomeMessage(userId: string, displayName: string | null) {
  const welcomeMessage = {
    type: 'text',
    text: `${displayName ? `${displayName}さん、` : ''}友だち登録ありがとうございます！🦷\n\n` +
      'cOralup口腔育成診断システムです。\n' +
      'お子様の口腔育成状態を専門スタッフが診断します。\n\n' +
      '下のボタンを押して、問診登録にお進みください👇',
  }

  // messageアクションのボタン: タップするとユーザーからのメッセージとして記録され、
  // LINE公式アカウント管理画面のチャット一覧に表示されるようになる。
  // 問診リンクはボタンタップ後にhandleTextMessageから返信する。
  const startButton = {
    type: 'flex',
    altText: '問診登録を始めましょう',
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
            type: 'box',
            layout: 'vertical',
            contents: [
              { type: 'text', text: '📝 問診票の入力（約5分）', size: 'xs', color: '#888888' },
              { type: 'text', text: '📷 スタッフによる撮影・診断', size: 'xs', color: '#888888' },
              { type: 'text', text: '📊 LINEでレポートをお届け', size: 'xs', color: '#888888' },
            ],
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
              type: 'message',
              label: '📝 受け取って問診登録する',
              text: '問診を始めます',
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
  await sendMessage(userId, startButton)
}

// 問診開始リンクを送信（ボタンタップ後 / 手動で「問診」と入力した場合）
async function sendQuestionnaireLink(userId: string) {
  const liffId = process.env.NEXT_PUBLIC_PARENT_LIFF_ID
  const questionnaireUrl = liffId
    ? `https://liff.line.me/${liffId}`
    : `${APP_URL}/parent/questionnaire/demo`

  const confirmText = {
    type: 'text',
    text: 'ありがとうございます😊\n下のボタンから問診を開始してください👇',
  }

  const questionnaireButton = {
    type: 'flex',
    altText: '問診を開始する',
    contents: {
      type: 'bubble',
      size: 'kilo',
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

  await sendMessage(userId, confirmText)
  await sendMessage(userId, questionnaireButton)
}

async function handleMessageEvent(event: any) {
  const userId = event.source.userId
  const message = event.message

  if (message.type === 'text') {
    await handleTextMessage(userId, message.text)
  }
}

async function handlePostbackEvent(event: any) {
  // Postback処理
}

async function handleTextMessage(userId: string, text: string) {
  if (text === '問診を始めます') {
    // 「受け取って問診登録する」ボタンのタップ → 問診リンクを返信
    await sendQuestionnaireLink(userId)
  } else if (text.toLowerCase().includes('問診')) {
    // 手動で「問診」と入力した場合も問診リンクを送信
    await sendQuestionnaireLink(userId)
  } else if (text.toLowerCase().includes('診断結果')) {
    await sendDiagnosisResult(userId)
  } else if (text.toLowerCase().includes('ヘルプ')) {
    await sendHelpMessage(userId)
  } else {
    await sendDefaultMessage(userId)
  }
}

async function sendDiagnosisResult(userId: string) {
  // 診断結果送信処理
}

async function sendHelpMessage(userId: string) {
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
