import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { visits } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getStaffSession } from '@/lib/staff-auth'
import { logger } from '@/lib/logger'
import { updateVisitProgress } from '@/lib/visit-status'

/**
 * POST: QRスキャン時にスタッフを診断セッションに紐付け
 * Body: { visitId: string } または { sessionId: string }
 * 
 * 認証方法: Cookie認証（事前にログイン済みであること）
 */
export async function POST(request: NextRequest) {
  try {
    // Cookie認証でスタッフ識別
    const session = await getStaffSession()

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized: Staff session required' },
        { status: 401 }
      )
    }

    const staffId = session.staffId
    const staffName = session.staffName
    const logContext = { staffId, staffName, path: '/api/staff/session/assign' }

    const body = await request.json()
    const { visitId, sessionId } = body

    if (!visitId && !sessionId) {
      logger.warn('Missing visitId or sessionId', logContext)
      return NextResponse.json(
        { error: 'visitId or sessionId is required' },
        { status: 400 }
      )
    }

    let targetVisitId = visitId

    // sessionIdが渡された場合、visitIdを取得
    if (!targetVisitId && sessionId) {
      const visitRows = await db
        .select({ id: visits.id })
        .from(visits)
        .where(eq(visits.sessionId, sessionId))
        .limit(1)

      if (visitRows.length > 0) {
        targetVisitId = visitRows[0].id
      } else {
        // visitsレコードがない場合は作成
        const insertedRows = await db
          .insert(visits)
          .values({
            sessionId: sessionId,
            staffProfileId: staffId,
            visitDate: new Date(),
            status: 'in_progress',
            currentStep: 'diagnosis_started',
          } as typeof visits.$inferInsert)
          .returning()

        const newVisit = insertedRows[0]

        logger.info('Created new visit through assignment', {
          ...logContext,
          visitId: newVisit.id,
          action: 'created'
        })

        return NextResponse.json({
          success: true,
          visitId: newVisit.id,
          staffId,
          staffName,
          action: 'created',
        })
      }
    }

    const updatedRows = await updateVisitProgress(targetVisitId, 'diagnosis_started', {
      staffProfileId: staffId,
    })

    if (updatedRows.length === 0) {
      return NextResponse.json(
        { error: 'Visit not found' },
        { status: 404 }
      )
    }

    logger.info('Staff assigned to visit', {
      ...logContext,
      visitId: targetVisitId,
      action: 'updated'
    })

    return NextResponse.json({
      success: true,
      visitId: targetVisitId,
      staffId,
      staffName,
      action: 'updated',
    })
  } catch (error) {
    logger.error('Error assigning staff', { path: '/api/staff/session/assign' }, error)
    return NextResponse.json(
      { error: 'Failed to assign staff' },
      { status: 500 }
    )
  }
}
