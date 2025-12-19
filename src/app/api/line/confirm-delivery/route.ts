import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { visits, lineMessageLogs } from '@/db/schema'
import { eq, desc, and } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { visitId, confirmationStatus } = body

    if (!visitId || !confirmationStatus) return NextResponse.json({ error: 'Required' }, { status: 400 })

    const logs = await db
      .select({ id: lineMessageLogs.id })
      .from(lineMessageLogs)
      .where(and(eq(lineMessageLogs.visitId, visitId), eq(lineMessageLogs.messageType, 'report')))
      .orderBy(desc(lineMessageLogs.createdAt))
      .limit(1)

    if (logs.length === 0) return NextResponse.json({ error: 'Log not found' }, { status: 404 })

    await db.update(lineMessageLogs).set({
      staffConfirmationStatus: confirmationStatus,
      staffConfirmedAt: new Date()
    } as any).where(eq(lineMessageLogs.id, logs[0].id))

    const visitRows = await db.select({ stepTimestamps: visits.stepTimestamps }).from(visits).where(eq(visits.id, visitId)).limit(1)
    const timestamps = (visitRows[0]?.stepTimestamps as Record<string, string>) || {}
    timestamps.line_confirmed = new Date().toISOString()

    await db.update(visits).set({
      status: 'diagnosis_completed',
      currentStep: 'line_confirmed',
      stepTimestamps: timestamps,
      updatedAt: new Date()
    } as Partial<typeof visits.$inferInsert>).where(eq(visits.id, visitId))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
  }
}
