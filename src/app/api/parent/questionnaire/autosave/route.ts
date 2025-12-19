import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { visits, questionnaireResponses } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

interface AutosaveRequest {
  sessionId?: string
  visitId?: string
  itemId: string
  value: string
}

export async function POST(request: NextRequest) {
  try {
    const body: AutosaveRequest = await request.json()
    const { sessionId, visitId, itemId, value } = body

    if (!itemId || (!visitId && !sessionId)) return NextResponse.json({ success: false }, { status: 400 })

    let resolvedVisitId = visitId
    if (!resolvedVisitId && sessionId) {
      const v = await db.select({ id: visits.id }).from(visits).where(eq(visits.sessionId, sessionId)).limit(1)
      resolvedVisitId = v[0]?.id
    }

    const where = resolvedVisitId
      ? and(eq(questionnaireResponses.visitId, resolvedVisitId), eq(questionnaireResponses.itemId, itemId))
      : and(eq(questionnaireResponses.sessionId, sessionId!), eq(questionnaireResponses.itemId, itemId))

    const existing = await db.select({ id: questionnaireResponses.id }).from(questionnaireResponses).where(where).limit(1)

    if (existing[0]) {
      await db.update(questionnaireResponses).set({
        value,
        answeredAt: new Date()
      } as Partial<typeof questionnaireResponses.$inferInsert>).where(eq(questionnaireResponses.id, existing[0].id))
    } else {
      await db.insert(questionnaireResponses).values({
        visitId: resolvedVisitId || null,
        sessionId: sessionId || null,
        itemId: itemId,
        value,
        answeredAt: new Date()
      } as typeof questionnaireResponses.$inferInsert)
    }

    return NextResponse.json({ success: true, visitId: resolvedVisitId })
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
