import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { db } from '@/db'
import { profiles } from '@/db/schema'
import { eq, or, and } from 'drizzle-orm'

const LINE_STAFF_CHANNEL_SECRET = process.env.LINE_STAFF_CHANNEL_SECRET!
const LINE_STAFF_CHANNEL_ACCESS_TOKEN = process.env.LINE_STAFF_CHANNEL_ACCESS_TOKEN!
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://coralup-yourtime.vercel.app'

export async function POST(request: NextRequest) {
  try {
    const bodyText = await request.text()
    const signature = request.headers.get('x-line-signature')

    if (!signature) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    const expected = crypto.createHmac('sha256', LINE_STAFF_CHANNEL_SECRET).update(bodyText).digest('base64')
    if (signature !== expected) return NextResponse.json({ error: 'Invalid' }, { status: 401 })

    const events = JSON.parse(bodyText).events
    for (const event of events) {
      if (event.type === 'follow') await handleFollow(event)
      else if (event.type === 'unfollow') await handleUnfollow(event)
      else if (event.type === 'message') await handleMessage(event)
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}

async function handleFollow(event: any) {
  const lineUserId = event.source.userId
  const res = await fetch(`https://api.line.me/v2/bot/profile/${lineUserId}`, { headers: { Authorization: `Bearer ${LINE_STAFF_CHANNEL_ACCESS_TOKEN}` } })
  const profile = await res.json()
  const lineDisplayName = profile.displayName || 'スタッフ'

  const existing = await db.select().from(profiles).where(and(eq(profiles.lineUserId, lineUserId), or(eq(profiles.role, 'staff'), eq(profiles.secondaryRole, 'staff')))).limit(1)

  if (existing[0]) {
    await db.update(profiles).set({
      isActive: true,
      avatarUrl: profile.pictureUrl,
      lastActivityAt: new Date()
    } as Partial<typeof profiles.$inferInsert>).where(eq(profiles.id, existing[0].id))

    // 既存スタッフの場合は、displayNameが設定済みなら登録完了メッセージを送る
    if (existing[0].displayName) {
      await sendMessage(lineUserId, {
        type: 'text',
        text: `${existing[0].displayName}さん、おかえりなさい！🦷\n\nスタッフアプリにログインするには、下のリンクからアプリを開いてください。\n\n${APP_URL}/staff/login`
      })
    } else {
      // displayNameが未設定の場合は名前入力を促す
      await sendWelcomeMessage(lineUserId, lineDisplayName)
    }
  } else {
    // 既存親など
    const anyExisting = await db.select().from(profiles).where(eq(profiles.lineUserId, lineUserId)).limit(1)
    if (anyExisting[0]) {
      await db.update(profiles).set({
        secondaryRole: 'staff',
        isActive: true,
        lastActivityAt: new Date()
      } as Partial<typeof profiles.$inferInsert>).where(eq(profiles.id, anyExisting[0].id))
    } else {
      await db.insert(profiles).values({
        lineUserId,
        displayName: null, // 最初は名前を空にして、ユーザーに入力してもらう
        role: 'staff',
        isActive: true,
        avatarUrl: profile.pictureUrl
      } as typeof profiles.$inferInsert)
    }

    // 新規登録の場合はウェルカムメッセージを送信
    await sendWelcomeMessage(lineUserId, lineDisplayName)
  }
}

async function sendWelcomeMessage(userId: string, lineDisplayName: string) {
  // テキストメッセージ
  const welcomeText = {
    type: 'text',
    text: `${lineDisplayName}さん、友だち登録ありがとうございます！🦷\n\ncOralupスタッフ用アカウントです。\n\nスタッフアプリにログインする際に表示するお名前を教えてください。\n\n（例：山田 太郎）`
  }

  await sendMessage(userId, welcomeText)
}

async function handleUnfollow(event: any) {
  await db.update(profiles).set({ isActive: false }).where(eq(profiles.lineUserId, event.source.userId))
}

async function handleMessage(event: any) {
  if (event.message.type !== 'text') return
  const text = event.message.text.trim()
  const lineUserId = event.source.userId

  // スタッフかどうか確認
  const staff = await db.select().from(profiles).where(and(eq(profiles.lineUserId, lineUserId), or(eq(profiles.role, 'staff'), eq(profiles.secondaryRole, 'staff')))).limit(1)
  if (!staff[0]) return

  // 名前として保存（空白やあまりに長すぎる文字列はスキップ）
  if (text.length === 0 || text.length > 50) {
    await sendMessage(lineUserId, {
      type: 'text',
      text: 'お名前を入力してください。\n\n（例：山田 太郎）'
    })
    return
  }

  // displayNameを更新
  await db.update(profiles).set({
    displayName: text,
    lastActivityAt: new Date()
  } as Partial<typeof profiles.$inferInsert>).where(eq(profiles.id, staff[0].id))

  // 確認メッセージを送信
  await sendMessage(lineUserId, {
    type: 'text',
    text: `ありがとうございます！\n「${text}」として登録しました。✨\n\nスタッフアプリにログインするには、下のリンクからアプリを開いてください。\n\n${APP_URL}/staff/login\n\n名前を変更したい場合は、このトークにメッセージを送ってください。`
  })
}

async function sendMessage(userId: string, message: any) {
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

    if (!response.ok) {
      console.error('[Staff Webhook] Failed to send message:', await response.text())
    }
  } catch (error) {
    console.error('[Staff Webhook] Error sending message:', error)
  }
}
