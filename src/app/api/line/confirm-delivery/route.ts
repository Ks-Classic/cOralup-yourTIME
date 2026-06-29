import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { lineMessageLogs } from '@/db/schema'
import { eq, desc, and } from 'drizzle-orm'
import { updateVisitProgress } from '@/lib/visit-status'

const CONFIRMATION_STATUSES = ['confirmed', 'not_received', 'unknown'] as const

function isConfirmationStatus(value: unknown): value is typeof CONFIRMATION_STATUSES[number] {
  return typeof value === 'string' && (CONFIRMATION_STATUSES as readonly string[]).includes(value)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { visitId, confirmationStatus } = body

    if (!visitId || !isConfirmationStatus(confirmationStatus)) {
      return NextResponse.json({ error: 'Invalid confirmationStatus' }, { status: 400 })
    }

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

    await updateVisitProgress(visitId, 'line_confirmed')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
  }
}
