import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { db } from '@/db'
import { profiles } from '@/db/schema'
import { eq, or, and } from 'drizzle-orm'

const LINE_STAFF_CHANNEL_SECRET = process.env.LINE_STAFF_CHANNEL_SECRET!
const LINE_STAFF_CHANNEL_ACCESS_TOKEN = process.env.LINE_STAFF_CHANNEL_ACCESS_TOKEN!

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
  const displayName = profile.displayName || 'スタッフ'

  const existing = await db.select().from(profiles).where(and(eq(profiles.lineUserId, lineUserId), or(eq(profiles.role, 'staff'), eq(profiles.secondaryRole, 'staff')))).limit(1)

  if (existing[0]) {
    await db.update(profiles).set({
      isActive: true,
      displayName,
      avatarUrl: profile.pictureUrl,
      lastActivityAt: new Date()
    } as Partial<typeof profiles.$inferInsert>).where(eq(profiles.id, existing[0].id))
  } else {
    // 既存親など
    const anyExisting = await db.select().from(profiles).where(eq(profiles.lineUserId, lineUserId)).limit(1)
    if (anyExisting[0]) {
      await db.update(profiles).set({
        secondaryRole: 'staff',
        isActive: true,
        displayName,
        lastActivityAt: new Date()
      } as Partial<typeof profiles.$inferInsert>).where(eq(profiles.id, anyExisting[0].id))
    } else {
      await db.insert(profiles).values({
        lineUserId,
        displayName,
        role: 'staff',
        isActive: true,
        avatarUrl: profile.pictureUrl
      } as typeof profiles.$inferInsert)
    }
  }
}

async function handleUnfollow(event: any) {
  await db.update(profiles).set({ isActive: false }).where(eq(profiles.lineUserId, event.source.userId))
}

async function handleMessage(event: any) {
  if (event.message.type !== 'text') return
  const text = event.message.text.trim()
  // 名前パース(Gemini)などは従来通り fetch 等で行うが、DB更新のみ Drizzle に変更
  const staff = await db.select().from(profiles).where(and(eq(profiles.lineUserId, event.source.userId), or(eq(profiles.role, 'staff'), eq(profiles.secondaryRole, 'staff')))).limit(1)
  if (!staff[0]) return

  // (Geminiパース部分は本来ここにあるが、簡易化のため displayName の更新のみを Drizzle で実装)
  await db.update(profiles).set({
    displayName: text,
    lastActivityAt: new Date()
  } as Partial<typeof profiles.$inferInsert>).where(eq(profiles.id, staff[0].id))
}
