import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { visits, questionnaires } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params
    if (!sessionId) return NextResponse.json({ error: 'Required' }, { status: 400 })

    const sessionRows = await db.select().from(visits).where(eq(visits.sessionId, sessionId)).limit(1)
    const session = sessionRows[0] || null

    const qRows = await db.select().from(questionnaires).where(eq(questionnaires.sessionId, sessionId)).limit(1)
    const questionnaire = qRows[0] || null

    return NextResponse.json({ session, questionnaire })
  } catch (error) {
    return NextResponse.json({ session: null, questionnaire: null })
  }
}
