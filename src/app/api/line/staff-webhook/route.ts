import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const LINE_STAFF_CHANNEL_SECRET = process.env.LINE_STAFF_CHANNEL_SECRET!
const LINE_STAFF_CHANNEL_ACCESS_TOKEN = process.env.LINE_STAFF_CHANNEL_ACCESS_TOKEN!
const CORALUP_ORG_ID = process.env.CORALUP_ORG_ID
const STAFF_LIFF_ID = process.env.NEXT_PUBLIC_STAFF_LIFF_ID
// 本番Vercel URLをデフォルトに（環境変数で上書き可能）
const getAppUrl = () => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  // 環境変数が設定されていればそれを使用
  if (appUrl && !appUrl.includes('localhost')) return appUrl.replace(/\/$/, '')
  // デフォルトは本番Vercel URL
  return 'https://coralup-yourtime.vercel.app'
}
const APP_URL = getAppUrl()

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
        // console.log('[Staff Webhook] Unhandled event type:', event.type)
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
  // console.log('[Staff Webhook] Follow event:', lineUserId)

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
      // console.log('[Staff Webhook] Profile fetched:', { displayName })
    }

    // 既存スタッフ確認（role='staff' または secondary_role='staff'）
    const { data: existing } = await supabase
      .from('profiles')
      .select('id, role, secondary_role')
      .eq('line_user_id', lineUserId)
      .or('role.eq.staff,secondary_role.eq.staff')
      .single()

    if (existing) {
      // 既存スタッフ: is_active を true に戻す
      // role='staff'またはsecondary_role='staff'が既にある場合は更新のみ
      const updateData: any = {
        is_active: true,
        display_name: displayName,
        avatar_url: avatarUrl,
        last_activity_at: new Date().toISOString(),
      }

      // 既にstaffロールがない場合のみsecondary_role='staff'を設定
      if (existing.role !== 'staff' && existing.secondary_role !== 'staff') {
        updateData.secondary_role = 'staff'
      }

      await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', existing.id)

      // console.log('[Staff Webhook] Staff reactivated:', existing.id)

      // 再登録メッセージ送信（ブックマーク案内付き）
      await sendLineMessage(
        lineUserId,
        `${displayName}さん、おかえりなさい！\n\ncOralupスタッフとして再登録されました。\n\n📌 診断アプリURL:\n${APP_URL}/staff/home\n\n初回ログイン:\n${APP_URL}/staff/liff-login\n\n※ブックマーク登録をお願いします。`
      )
    } else {
      // 既存プロフィール（親御さん等）があるか確認
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, role, secondary_role')
        .eq('line_user_id', lineUserId)
        .single()

      if (existingProfile) {
        // 既存レコードがある場合: roleを上書きせず、secondary_role='staff'を設定
        const { data: updatedStaff, error: updateError } = await supabase
          .from('profiles')
          .update({
            display_name: displayName,
            avatar_url: avatarUrl,
            secondary_role: 'staff',
            is_active: true,
            organization_id: CORALUP_ORG_ID || null,
            last_activity_at: new Date().toISOString(),
          })
          .eq('id', existingProfile.id)
          .select()
          .single()

        if (updateError) {
          console.error('[Staff Webhook] Error updating profile:', updateError)
          throw updateError
        }

        // console.log('[Staff Webhook] Profile updated with staff role:', updatedStaff.id)
      } else {
        // 新規スタッフ登録
        const { data: newStaff, error: insertError } = await supabase
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

        if (insertError) {
          console.error('[Staff Webhook] Error creating staff:', insertError)
          throw insertError
        }

        // console.log('[Staff Webhook] Staff created:', newStaff.id)

        // 登録完了メッセージ送信（名前入力案内 + ブックマーク案内）
        await sendLineMessage(
          lineUserId,
          `${displayName}さん、cOralupスタッフとして登録されました！🎉\n\n次に、お名前を登録してください。\n「姓 名」の形式で送信してください。\n例: 山田 太郎\n\n※スペースなしでも登録できます（例: 山田太郎）`
        )
      }
    }
  } catch (error) {
    console.error('[Staff Webhook] handleFollowEvent error:', error)
  }
}

async function handleUnfollowEvent(event: any) {
  const lineUserId = event.source.userId
  // console.log('[Staff Webhook] Unfollow event:', lineUserId)

  try {
    // スタッフを非アクティブに（削除はしない）
    // role='staff' または secondary_role='staff' のユーザーを対象
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: false })
      .eq('line_user_id', lineUserId)
      .or('role.eq.staff,secondary_role.eq.staff')

    if (error) {
      console.error('[Staff Webhook] Error deactivating staff:', error)
    } else {
      // console.log('[Staff Webhook] Staff deactivated:', lineUserId)
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
  // console.log('[Staff Webhook] Message received:', { lineUserId, text })

  try {
    // スタッフプロフィール取得（role='staff' または secondary_role='staff'）
    const { data: staff } = await supabase
      .from('profiles')
      .select('id, display_name, first_name, last_name, role, secondary_role')
      .eq('line_user_id', lineUserId)
      .or('role.eq.staff,secondary_role.eq.staff')
      .single()

    if (!staff) {
      await sendLineMessage(
        lineUserId,
        'スタッフとして登録されていません。\n先に友だち追加してください。'
      )
      return
    }

    // 名前のパース（「姓 名」または「姓名」形式を想定）
    const { lastName, firstName } = await parseJapaneseName(text)

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

    // console.log('[Staff Webhook] Profile updated:', { lineUserId, lastName, firstName })

    // 登録完了メッセージ（Flex Message + テキスト）
    const staffHomeUrl = `${APP_URL}/staff/home`
    const liffLoginUrl = STAFF_LIFF_ID ? `https://liff.line.me/${STAFF_LIFF_ID}` : `${APP_URL}/staff/liff-login`

    // テキストメッセージ
    await sendLineMessage(
      lineUserId,
      `名前を登録しました！\n\n姓: ${lastName}\n名: ${firstName}\n\n🎉 下のボタンから診断アプリ（Webブラウザ）にアクセスしてください。\n初回はログイン画面が表示されます。`
    )

    // Flex Message（ボタン付き）
    const flexMessage = {
      type: 'flex',
      altText: '診断アプリを開く',
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '📌 ブックマーク登録をお願いします',
              weight: 'bold',
              size: 'sm',
              color: '#FF6B35',
              margin: 'md',
            },
            {
              type: 'text',
              text: '次回から素早くアクセスできるよう、診断アプリURLをブックマーク登録してください。',
              size: 'xs',
              color: '#666666',
              wrap: true,
              margin: 'sm',
            },
            {
              type: 'text',
              text: staffHomeUrl,
              size: 'xxs',
              color: '#999999',
              wrap: true,
              margin: 'md',
            },
          ],
          paddingAll: '15px',
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
                label: '診断アプリを開く（Webブラウザ）',
                uri: staffHomeUrl,
              },
              color: '#06C755',
            },
          ],
          paddingAll: '15px',
        },
      },
    }

    await sendFlexMessage(lineUserId, flexMessage)
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

// Gemini APIで姓名を分割（軽量・高精度）
async function parseJapaneseName(text: string): Promise<{ lastName: string; firstName: string }> {
  const trimmed = text.trim()

  // スペースがある場合はそのまま分割
  const spaceParts = trimmed.split(/\s+/)
  if (spaceParts.length >= 2) {
    return {
      lastName: spaceParts[0],
      firstName: spaceParts.slice(1).join(' '),
    }
  }

  // 1文字以下の場合
  if (trimmed.length <= 1) {
    return { lastName: trimmed, firstName: '' }
  }

  // Gemini APIで分割
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    // フォールバック: 2文字を姓として扱う
    // console.log('[Name Parse] No GEMINI_API_KEY, using fallback')
    return { lastName: trimmed.substring(0, 2), firstName: trimmed.substring(2) }
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `日本人の名前「${trimmed}」を姓と名に分割してください。JSONのみで回答: {"lastName":"姓","firstName":"名"}`
            }]
          }],
          generationConfig: { temperature: 0, maxOutputTokens: 50 }
        })
      }
    )

    if (!response.ok) throw new Error('API error')

    const data = await response.json()
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // JSONを抽出してパース
    const jsonMatch = content.match(/\{[^}]+\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      if (parsed.lastName && typeof parsed.lastName === 'string') {
        return {
          lastName: parsed.lastName,
          firstName: parsed.firstName || '',
        }
      }
    }
  } catch (error) {
    console.error('[Name Parse] Gemini API error:', error)
  }

  // フォールバック: 2文字を姓として扱う
  return { lastName: trimmed.substring(0, 2), firstName: trimmed.substring(2) }
}

async function sendFlexMessage(userId: string, flexMessage: any) {
  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LINE_STAFF_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: userId,
        messages: [flexMessage],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Staff Webhook] Failed to send flex message:', errorText)
    }
  } catch (error) {
    console.error('[Staff Webhook] sendFlexMessage error:', error)
  }
}

