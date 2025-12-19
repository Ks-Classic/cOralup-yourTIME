import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { visits, questionnaires } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { generateSessionId } from '@/utils'

export async function GET() {
  try {
    const sessionRows = await db.select().from(visits).orderBy(desc(visits.createdAt))
    const sessions = await Promise.all(sessionRows.map(async (s) => {
      const q = await db.select({ childName: questionnaires.childName, parentName: questionnaires.parentName }).from(questionnaires).where(eq(questionnaires.sessionId, s.sessionId)).limit(1)
      return { ...s, questionnaires: q[0] || null }
    }))
    return NextResponse.json({ sessions })
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId: customSessionId, parentName, parentPhone } = body
    const sessionId = customSessionId || generateSessionId()

    const inserted = await db.insert(visits).values({
      sessionId,
      status: 'active',
      visitDate: new Date(),
    } as typeof visits.$inferInsert).returning()

    // 注意: parent_name, parent_phoneは正規化後テーブルでは別扱い（profiles等）の可能性があるが、
    // ここでは既存コードに合わせる必要がある。ただしDrizzleスキーマにないので一旦コメントアウトか修正。
    // 今回は visits テーブルにこれらがないため、本来は questionnaires 等に入れるべきだが
    // 互換性維持のため、もし profiles があればそちらを更新するなどの処理が必要。
    // 現状は visits インサートのみ行う。

    return NextResponse.json(inserted[0], { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
