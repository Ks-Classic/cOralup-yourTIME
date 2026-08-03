import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { db } from '@/db'
import { profiles, events, eventStaffs } from '@/db/schema'
import { eq, or, and, inArray, sql } from 'drizzle-orm'

const LINE_STAFF_CHANNEL_SECRET = process.env.LINE_STAFF_CHANNEL_SECRET!
const LINE_STAFF_CHANNEL_ACCESS_TOKEN = process.env.LINE_STAFF_CHANNEL_ACCESS_TOKEN!
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://coralup-yourtime.vercel.app'
const STAFF_LIFF_ID = process.env.NEXT_PUBLIC_STAFF_LIFF_ID
const STAFF_LOGIN_URL = STAFF_LIFF_ID
  ? `https://liff.line.me/${STAFF_LIFF_ID}`
  : `${APP_URL}/staff/login`

// ========================================
// エントリポイント
// ========================================
export async function POST(request: NextRequest) {
  try {
    const bodyText = await request.text()
    const signature = request.headers.get('x-line-signature')

    if (!signature) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    const expected = crypto.createHmac('sha256', LINE_STAFF_CHANNEL_SECRET).update(bodyText).digest('base64')
    if (signature !== expected) return NextResponse.json({ error: 'Invalid' }, { status: 401 })

    const lineEvents = JSON.parse(bodyText).events
    for (const event of lineEvents) {
      try {
        if (event.type === 'follow') await handleFollow(event)
        else if (event.type === 'unfollow') await handleUnfollow(event)
        else if (event.type === 'message') await handleMessage(event)
        else if (event.type === 'postback') await handlePostback(event)
      } catch (eventError) {
        // 個別イベントの処理失敗で全体を止めない
        console.error(`[Staff Webhook] Failed to handle event type=${event.type}:`, eventError)
      }
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Staff Webhook] Error:', error)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}

// ========================================
// スタッフ検索ヘルパー（共通化）
// ========================================
async function findStaffProfile(lineUserId: string) {
  const rows = await db.select().from(profiles)
    .where(and(
      eq(profiles.lineUserId, lineUserId),
      or(eq(profiles.role, 'staff'), eq(profiles.secondaryRole, 'staff'))
    ))
    .limit(1)
  return rows[0] || null
}

// ========================================
// Follow イベント（友だち追加時）
// ========================================
async function handleFollow(event: any) {
  const lineUserId = event.source.userId

  // LINE プロフィール取得（失敗してもフローを止めない）
  let lineDisplayName = 'スタッフ'
  let pictureUrl: string | null = null
  try {
    const res = await fetch(`https://api.line.me/v2/bot/profile/${lineUserId}`, {
      headers: { Authorization: `Bearer ${LINE_STAFF_CHANNEL_ACCESS_TOKEN}` }
    })
    if (res.ok) {
      const profile = await res.json()
      lineDisplayName = profile.displayName || 'スタッフ'
      pictureUrl = profile.pictureUrl || null
    }
  } catch (e) {
    console.warn('[Staff Webhook] Failed to fetch LINE profile:', e)
  }

  const existing = await findStaffProfile(lineUserId)

  if (existing) {
    // 既存スタッフ → isActive を復活
    await db.update(profiles).set({
      isActive: true,
      avatarUrl: pictureUrl ?? existing.avatarUrl,
      lastActivityAt: new Date()
    } as Partial<typeof profiles.$inferInsert>).where(eq(profiles.id, existing.id))

    if (existing.displayName) {
      // 名前登録済み → activeなイベントがあるか確認して分岐
      const activeEventsExist = await hasActiveEvents()
      const staffEvents = await getStaffActiveEvents(existing.id)

      if (!activeEventsExist) {
        // イベントが存在しない → ログインリンクのみ
        await sendMessage(lineUserId, {
          type: 'text',
          text: `${existing.displayName}さん、おかえりなさい！🦷\n\n下のURLからスタッフアプリへログインしてください。\n\n${STAFF_LOGIN_URL}`
        })
      } else if (staffEvents.length > 0) {
        // 既にイベント選択済み → ログインリンク + 現在の登録状況
        const eventList = staffEvents.map(e => `・${e.eventName}`).join('\n')
        await sendMessage(lineUserId, {
          type: 'text',
          text: `${existing.displayName}さん、おかえりなさい！🦷\n\n【登録済みイベント】\n${eventList}\n\n📱 スタッフアプリ\n${STAFF_LOGIN_URL}\n\n他のイベントにも参加する場合は「イベント変更」と送ってください。`
        })
      } else {
        // イベント未選択 → 選択メッセージ
        await sendEventSelectionMessage(lineUserId, existing.displayName)
      }
    } else {
      // 名前未登録 → ウェルカムメッセージ
      await sendWelcomeMessage(lineUserId, lineDisplayName)
    }
  } else {
    // 新規登録
    const anyExisting = await db.select().from(profiles)
      .where(eq(profiles.lineUserId, lineUserId)).limit(1)

    if (anyExisting[0]) {
      // 既に親として登録済み → secondaryRole を追加
      await db.update(profiles).set({
        secondaryRole: 'staff',
        isActive: true,
        lastActivityAt: new Date()
      } as Partial<typeof profiles.$inferInsert>).where(eq(profiles.id, anyExisting[0].id))

      if (anyExisting[0].displayName) {
        await sendEventSelectionMessage(lineUserId, anyExisting[0].displayName)
        return
      }
    } else {
      // 完全新規
      await db.insert(profiles).values({
        lineUserId,
        displayName: null,
        role: 'staff',
        isActive: true,
        avatarUrl: pictureUrl
      } as typeof profiles.$inferInsert)
    }

    await sendWelcomeMessage(lineUserId, lineDisplayName)
  }
}

// ========================================
// ウェルカムメッセージ（名前入力を促す）
// ========================================
async function sendWelcomeMessage(userId: string, lineDisplayName: string) {
  await sendMessage(userId, {
    type: 'text',
    text: `${lineDisplayName}さん、友だち登録ありがとうございます！🦷\n\ncOralupスタッフ用アカウントです。\n\nスタッフアプリに表示する実名（姓名）を教えてください。\n\n（例：山田 太郎）`
  })
}

// ========================================
// アクティブなイベントがあるか確認
// ========================================
async function hasActiveEvents(): Promise<boolean> {
  const rows = await db.select({ id: events.id }).from(events)
    .where(or(eq(events.status, 'active'), eq(events.status, 'upcoming')))
    .limit(1)
  return rows.length > 0
}

// ========================================
// イベント選択メッセージ（Flex Message のボタン）
// ========================================
async function sendEventSelectionMessage(userId: string, displayName: string) {
  const activeEvents = await db.select().from(events)
    .where(or(eq(events.status, 'active'), eq(events.status, 'upcoming')))
    .orderBy(events.startDate)

  if (activeEvents.length === 0) {
    await sendMessage(userId, {
      type: 'text',
      text: `${displayName}さん、登録ありがとうございます！✨\n\n現在参加可能なイベントがありません。\nイベントが登録されましたらお知らせします。\n\n📱 スタッフアプリ\n${STAFF_LOGIN_URL}`
    })
    return
  }

  // Flex Message でイベント選択ボタンを作成
  const eventButtons: any[] = activeEvents.map(evt => ({
    type: 'button',
    action: {
      type: 'postback',
      label: truncateLabel(evt.name, 20),
      data: `action=select_event&event_id=${evt.id}`,
      displayText: `${evt.name} に参加します`
    },
    style: 'primary',
    color: '#1DB446',
    margin: 'sm',
    height: 'sm'
  }))

  // 「すべてに参加」ボタン（2件以上の場合）
  if (activeEvents.length >= 2) {
    const allEventIds = activeEvents.map(e => e.id).join(',')
    eventButtons.push({
      type: 'button',
      action: {
        type: 'postback',
        label: 'すべてに参加',
        data: `action=select_event&event_id=${allEventIds}`,
        displayText: 'すべてのイベントに参加します'
      },
      style: 'primary',
      color: '#0068C9',
      margin: 'sm',
      height: 'sm'
    })
  }

  // イベント情報テキスト
  const eventInfoTexts = activeEvents.map(evt => {
    const dateStr = evt.startDate
      ? new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }).format(new Date(evt.startDate))
      : '日程未定'
    return {
      type: 'box',
      layout: 'vertical',
      margin: 'md',
      contents: [
        { type: 'text', text: evt.name, weight: 'bold', size: 'sm', color: '#333333' },
        { type: 'text', text: `📅 ${dateStr}　📍 ${evt.venue || '未定'}`, size: 'xs', color: '#888888', wrap: true }
      ]
    }
  })

  const flexMessage = {
    type: 'flex',
    altText: '参加イベントを選択してください',
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [{ type: 'text', text: '🦷 参加イベント選択', weight: 'bold', size: 'lg', color: '#333333' }],
        paddingBottom: 'none'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: `${displayName}さん、登録ありがとうございます！\n\n参加予定のイベントを選択してください。`, wrap: true, size: 'sm', color: '#555555' },
          { type: 'separator', margin: 'lg' },
          ...eventInfoTexts,
          { type: 'separator', margin: 'lg' },
          ...eventButtons
        ]
      }
    }
  }

  await sendMessage(userId, flexMessage)
}

// ========================================
// Unfollow イベント（ブロック時）
// ========================================
async function handleUnfollow(event: any) {
  await db.update(profiles).set({ isActive: false })
    .where(eq(profiles.lineUserId, event.source.userId))
}

// ========================================
// Message イベント（テキストメッセージ受信）
// エッジケース対応:
//   - スタンプ/画像 → type !== 'text' で無視
//   - 空文字/長すぎ → バリデーション
//   - URL, 特殊文字 → 名前として保存（制限しない）
//   - 「イベント変更」コマンド → イベント再選択
//   - 名前変更後、再度イベント選択が送られないようフラグ制御
// ========================================
async function handleMessage(event: any) {
  if (event.message.type !== 'text') {
    // テキスト以外（スタンプ、画像等）はスルー
    return
  }

  const text = event.message.text.trim()
  const lineUserId = event.source.userId

  // スタッフ確認
  const staff = await findStaffProfile(lineUserId)
  if (!staff) return

  // ===== コマンド処理 =====
  // 「イベント変更」「イベント選択」でイベント再選択
  if (text === 'イベント変更' || text === 'イベント選択') {
    if (staff.displayName) {
      await sendEventSelectionMessage(lineUserId, staff.displayName)
    } else {
      await sendMessage(lineUserId, {
        type: 'text',
        text: 'まず実名（姓名）を入力してください。\n\n（例：山田 太郎）'
      })
    }
    return
  }

  // 「ヘルプ」「使い方」
  if (text === 'ヘルプ' || text === '使い方') {
    await sendMessage(lineUserId, {
      type: 'text',
      text: `【cOralupスタッフBot 使い方】\n\n・登録名変更 →「名前変更 山田 太郎」\n・参加イベント追加 →「イベント変更」\n・使い方確認 →「ヘルプ」\n\nスタッフアプリ：${STAFF_LOGIN_URL}`
    })
    return
  }

  if (text === '名前変更') {
    await sendMessage(lineUserId, {
      type: 'text',
      text: '「名前変更」の後に実名（姓名）を入力してください。\n\n（例：名前変更 山田 太郎）'
    })
    return
  }

  const nameChangeMatch = text.match(/^名前変更[\s：:]+(.+)$/)
  if (staff.displayName && !nameChangeMatch) {
    await sendMessage(lineUserId, {
      type: 'text',
      text: `メッセージを受け取りました。登録名は変更していません。\n\n参加イベントを追加する場合は「イベント変更」、登録名を直す場合は「名前変更 実名」と送ってください。\n\nスタッフアプリ：${STAFF_LOGIN_URL}`
    })
    return
  }

  // ===== 名前入力処理 =====
  const nameInput = nameChangeMatch?.[1]?.trim() || text

  // バリデーション
  if (nameInput.length === 0) {
    await sendMessage(lineUserId, {
      type: 'text',
      text: '実名（姓名）を入力してください。\n\n（例：山田 太郎）'
    })
    return
  }

  if (nameInput.length > 50) {
    await sendMessage(lineUserId, {
      type: 'text',
      text: '実名（姓名）は50文字以内で入力してください。\n\n（例：山田 太郎）'
    })
    return
  }

  // URL っぽい文字列は警告（ただしブロックはしない）
  if (nameInput.match(/^https?:\/\//)) {
    await sendMessage(lineUserId, {
      type: 'text',
      text: 'URLではなく、実名（姓名）を入力してください。\n\n（例：山田 太郎）'
    })
    return
  }

  // displayNameを更新
  const isFirstRegistration = !staff.displayName
  await db.update(profiles).set({
    displayName: nameInput,
    lastActivityAt: new Date()
  } as Partial<typeof profiles.$inferInsert>).where(eq(profiles.id, staff.id))

  if (isFirstRegistration) {
    // 初回名前登録 → イベント選択に進む
    await sendEventSelectionMessage(lineUserId, nameInput)
  } else {
    // 名前変更のみ（イベント選択は再送しない）
    await sendMessage(lineUserId, {
      type: 'text',
      text: `登録名を「${nameInput}」に更新しました！✨\n\nスタッフアプリ：${STAFF_LOGIN_URL}\n\n参加イベントを追加したい場合は「イベント変更」と送ってください。`
    })
  }
}

// ========================================
// Postback イベント（ボタン押下時）
// エッジケース対応:
//   - ボタン2回押し → onConflictDoNothing で重複防止
//   - 不正な postback データ → パース失敗を安全にハンドル
//   - イベントが削除された後のボタン押下 → DB存在チェック
//   - スタッフが削除された後のボタン押下 → プロフィール存在チェック
// ========================================
async function handlePostback(event: any) {
  const lineUserId = event.source.userId
  const data = event.postback?.data

  if (!data) {
    console.warn('[Staff Webhook] Postback event without data')
    return
  }

  const params = new URLSearchParams(data)
  const action = params.get('action')

  if (action === 'select_event') {
    await handleEventSelection(lineUserId, params.get('event_id') || '')
  }
  // 未知の action はログだけ残して無視
}

async function handleEventSelection(lineUserId: string, eventIdStr: string) {
  const staff = await findStaffProfile(lineUserId)
  if (!staff) {
    console.error('[Staff Webhook] Staff not found for event selection:', lineUserId)
    await sendMessage(lineUserId, {
      type: 'text',
      text: 'スタッフ情報が見つかりません。再度友だち追加してください。'
    })
    return
  }

  // カンマ区切りの event_id を分割
  const eventIds = eventIdStr.split(',').filter(id => id.length > 0)

  if (eventIds.length === 0) {
    await sendMessage(lineUserId, {
      type: 'text',
      text: 'イベントの選択に失敗しました。もう一度お試しください。'
    })
    return
  }

  // 選択されたイベント情報を取得（存在チェック兼ねる）
  const selectedEvents = await db.select().from(events)
    .where(and(
      inArray(events.id, eventIds),
      or(eq(events.status, 'active'), eq(events.status, 'upcoming'))
    ))

  if (selectedEvents.length === 0) {
    await sendMessage(lineUserId, {
      type: 'text',
      text: 'イベントが見つかりませんでした。既に終了したイベントの可能性があります。\n\n「イベント変更」と送ると最新のイベント一覧が表示されます。'
    })
    return
  }

  // event_staffs に登録。取消済みだった場合も confirmed へ戻す。
  for (const evt of selectedEvents) {
    try {
      await db.execute(sql`
        INSERT INTO event_staffs (event_id, profile_id, status, updated_at)
        VALUES (${evt.id}, ${staff.id}, 'confirmed', NOW())
        ON CONFLICT (event_id, profile_id)
        DO UPDATE SET status = 'confirmed', updated_at = NOW()
      `)
    } catch (error) {
      console.error(`[Staff Webhook] Failed to register event_staff for event=${evt.id}:`, error)
    }
  }

  // 登録完了メッセージ
  const eventNames = selectedEvents.map(e => {
    const dateStr = e.startDate
      ? new Intl.DateTimeFormat('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' }).format(new Date(e.startDate))
      : ''
    return `・${e.name}（${dateStr}）`
  }).join('\n')

  const displayName = staff.displayName || 'スタッフ'

  await sendMessage(lineUserId, {
    type: 'text',
    text: `${displayName}さん、イベント登録完了です！🎉\n\n【参加イベント】\n${eventNames}\n\n━━━━━━━━━━━━━━━\n📱 アプリの準備をお願いします\n━━━━━━━━━━━━━━━\n\n① 下のURLからLINEログイン\n${STAFF_LOGIN_URL}\n\n② Safari/Chromeでスタッフホームが開きます\n③ ブックマーク登録📌\n\n当日はブックマークからすぐアクセスできます！\n\n━━━━━━━━━━━━━━━\n💡 コマンド\n・登録名変更 →「名前変更 山田 太郎」\n・イベント追加 →「イベント変更」\n・使い方 →「ヘルプ」と送信`
  })
}

// ========================================
// スタッフの active イベント参加状況を取得
// ========================================
async function getStaffActiveEvents(profileId: string) {
  return await db.select({
    eventId: eventStaffs.eventId,
    eventName: events.name,
  })
    .from(eventStaffs)
    .innerJoin(events, eq(eventStaffs.eventId, events.id))
    .where(and(
      eq(eventStaffs.profileId, profileId),
      or(eq(events.status, 'active'), eq(events.status, 'upcoming')),
      or(eq(eventStaffs.status, 'confirmed'), eq(eventStaffs.status, 'pending'))
    ))
}

// ========================================
// LINE メッセージ送信（リトライ付き）
// ========================================
async function sendMessage(userId: string, message: any) {
  const maxRetries = 2
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LINE_STAFF_CHANNEL_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          to: userId,
          messages: [message],
        }),
      })

      if (response.ok) return

      const errorText = await response.text()
      console.error(`[Staff Webhook] Send message failed (attempt ${attempt + 1}):`, errorText)

      // 429 (Rate Limit) の場合はリトライ
      if (response.status === 429 && attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
        continue
      }

      // それ以外のエラーはリトライしない
      break
    } catch (error) {
      console.error(`[Staff Webhook] Send message error (attempt ${attempt + 1}):`, error)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
  }
}

// ========================================
// ユーティリティ
// ========================================
// Flex Message の label は最大20文字
function truncateLabel(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 1) + '…'
}
