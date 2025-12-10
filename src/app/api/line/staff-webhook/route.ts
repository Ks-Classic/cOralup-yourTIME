import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const LINE_STAFF_CHANNEL_SECRET = process.env.LINE_STAFF_CHANNEL_SECRET!
const LINE_STAFF_CHANNEL_ACCESS_TOKEN = process.env.LINE_STAFF_CHANNEL_ACCESS_TOKEN!
const CORALUP_ORG_ID = process.env.CORALUP_ORG_ID

// Supabase クライアント (Service Role)
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
      console.error('[Staff Webhook] Missing signature')
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    const expectedSignature = crypto
      .createHmac('sha256', LINE_STAFF_CHANNEL_SECRET)
      .update(body)
      .digest('base64')

    if (signature !== expectedSignature) {
      console.error('[Staff Webhook] Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Webhookイベントの処理
    const events = JSON.parse(body).events

    for (const event of events) {
      switch (event.type) {
        case 'follow':
          await handleFollowEvent(event)
          break
        case 'unfollow':
          await handleUnfollowEvent(event)
          break
        case 'message':
          await handleMessageEvent(event)
          break
        default:
          console.log('[Staff Webhook] Unhandled event type:', event.type)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Staff Webhook] Error:', error)
    return NextResponse.json(
      { error: 'Webhook processing error' },
      { status: 500 }
    )
  }
}

async function handleFollowEvent(event: any) {
  const lineUserId = event.source.userId
  console.log('[Staff Webhook] Follow event:', lineUserId)

  try {
    // LINEプロフィールを取得
    const profileResponse = await fetch(
      `https://api.line.me/v2/bot/profile/${lineUserId}`,
      {
        headers: {
          Authorization: `Bearer ${LINE_STAFF_CHANNEL_ACCESS_TOKEN}`,
        },
      }
    )

    let displayName = 'スタッフ'
    let avatarUrl = null

    if (profileResponse.ok) {
      const profile = await profileResponse.json()
      displayName = profile.displayName || 'スタッフ'
      avatarUrl = profile.pictureUrl
      console.log('[Staff Webhook] Profile fetched:', { displayName })
    }

    // 既存スタッフ確認
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('line_user_id', lineUserId)
      .eq('role', 'staff')
      .single()

    if (existing) {
      // 既存スタッフ: is_active を true に戻す
      await supabase
        .from('profiles')
        .update({
          is_active: true,
          display_name: displayName,
          avatar_url: avatarUrl,
          last_activity_at: new Date().toISOString(),
        })
        .eq('id', existing.id)

      console.log('[Staff Webhook] Staff reactivated:', existing.id)

      // 再登録メッセージ送信
      await sendLineMessage(
        lineUserId,
        `${displayName}さん、おかえりなさい！\n\ncOralupスタッフとして再登録されました。\n下のメニューから「アプリを開く」をタップしてログインしてください。`
      )
    } else {
      // 新規スタッフ登録
      const { data: newStaff, error } = await supabase
        .from('profiles')
        .insert({
          line_user_id: lineUserId,
          display_name: displayName,
          avatar_url: avatarUrl,
          role: 'staff',
          is_active: true,
          organization_id: CORALUP_ORG_ID || null,
          last_activity_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        console.error('[Staff Webhook] Error creating staff:', error)
        throw error
      }

      console.log('[Staff Webhook] Staff created:', newStaff.id)

        // 登録完了メッセージ送信（名前入力案内）
      await sendLineMessage(
        lineUserId,
        `${displayName}さん、cOralupスタッフとして登録されました！🎉\n\n次に、お名前を登録してください。\n「姓 名」の形式で送信してください。\n例: 山田 太郎\n\n※スペースなしでも登録できます（例: 山田太郎）`
      )
    }
  } catch (error) {
    console.error('[Staff Webhook] handleFollowEvent error:', error)
  }
}

async function handleUnfollowEvent(event: any) {
  const lineUserId = event.source.userId
  console.log('[Staff Webhook] Unfollow event:', lineUserId)

  try {
    // スタッフを非アクティブに（削除はしない）
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: false })
      .eq('line_user_id', lineUserId)
      .eq('role', 'staff')

    if (error) {
      console.error('[Staff Webhook] Error deactivating staff:', error)
    } else {
      console.log('[Staff Webhook] Staff deactivated:', lineUserId)
    }
  } catch (error) {
    console.error('[Staff Webhook] handleUnfollowEvent error:', error)
  }
}

async function handleMessageEvent(event: any) {
  const lineUserId = event.source.userId
  const message = event.message

  if (message.type !== 'text') {
    return
  }

  const text = message.text.trim()
  console.log('[Staff Webhook] Message received:', { lineUserId, text })

  try {
    // スタッフプロフィール取得
    const { data: staff } = await supabase
      .from('profiles')
      .select('id, display_name, first_name, last_name')
      .eq('line_user_id', lineUserId)
      .eq('role', 'staff')
      .single()

    if (!staff) {
      await sendLineMessage(
        lineUserId,
        'スタッフとして登録されていません。\n先に友だち追加してください。'
      )
      return
    }

    // 名前のパース（「姓 名」または「姓名」形式を想定）
    const nameParts = text.split(/\s+/)
    let lastName = ''
    let firstName = ''

    if (nameParts.length >= 2) {
      // 「姓 名」形式
      lastName = nameParts[0]
      firstName = nameParts.slice(1).join(' ')
    } else if (text.length >= 2) {
      // 「姓名」形式（2文字以上）
      // 簡易的に最初の1文字を姓、残りを名とする
      lastName = text.substring(0, 1)
      firstName = text.substring(1)
    } else {
      // 1文字の場合は姓として扱う
      lastName = text
      firstName = ''
    }

    // プロフィール更新
    const { error } = await supabase
      .from('profiles')
      .update({
        last_name: lastName,
        first_name: firstName,
        display_name: `${lastName} ${firstName}`.trim() || text,
        last_activity_at: new Date().toISOString(),
      })
      .eq('id', staff.id)

    if (error) {
      console.error('[Staff Webhook] Error updating profile:', error)
      await sendLineMessage(
        lineUserId,
        '名前の登録に失敗しました。もう一度お試しください。'
      )
      return
    }

    console.log('[Staff Webhook] Profile updated:', {
      lineUserId,
      lastName,
      firstName,
    })

    // 登録完了メッセージ
    await sendLineMessage(
      lineUserId,
      `名前を登録しました！\n\n姓: ${lastName}\n名: ${firstName}\n\n診断アプリはこちらからアクセスできます:\nhttps://your-app.vercel.app/staff/login`
    )
  } catch (error) {
    console.error('[Staff Webhook] handleMessageEvent error:', error)
  }
}

async function sendLineMessage(userId: string, text: string) {
  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LINE_STAFF_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: userId,
        messages: [{ type: 'text', text }],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Staff Webhook] Failed to send message:', errorText)
    }
  } catch (error) {
    console.error('[Staff Webhook] sendLineMessage error:', error)
  }
}

