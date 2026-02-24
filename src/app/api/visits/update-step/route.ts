import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { visits } from '@/db/schema'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { visitId, step, boothNumber } = body

    if (!visitId || !step) {
      return NextResponse.json(
        { error: 'visitId and step are required' },
        { status: 400 }
      )
    }

    const validSteps = [
      'line_registered',
      'questionnaire_completed',
      'diagnosis_started',
      'photos_uploaded',
      'analysis_completed',
      'report_generated',
      'line_sent',
      'line_confirmed',
    ]

    if (!validSteps.includes(step)) {
      return NextResponse.json(
        { error: 'Invalid step' },
        { status: 400 }
      )
    }

    // 現在のステップタイムスタンプを取得
    const currentVisitRows = await db
      .select({
        stepTimestamps: visits.stepTimestamps,
        currentStep: visits.currentStep,
      })
      .from(visits)
      .where(eq(visits.id, visitId))
      .limit(1)

    if (currentVisitRows.length === 0) {
      return NextResponse.json(
        { error: 'Visit not found' },
        { status: 404 }
      )
    }

    const currentVisit = currentVisitRows[0]

    // ステップタイムスタンプを更新
    const timestamps = (currentVisit.stepTimestamps as Record<string, string>) || {}
    timestamps[step] = new Date().toISOString()

    // 更新データを準備
    const updateData: Record<string, any> = {
      currentStep: step,
      stepTimestamps: timestamps,
      updatedAt: new Date(),
    }

    // ブース番号が指定されている場合は更新
    if (boothNumber !== undefined) {
      updateData.boothNumber = boothNumber
    }

    // ステップに応じてstatusを完全同期
    const STEP_TO_STATUS: Record<string, string> = {
      'line_registered': 'in_progress',
      'questionnaire_started': 'in_progress',
      'questionnaire_completed': 'in_progress',
      'diagnosis_started': 'in_progress',
      'photos_uploaded': 'in_progress',
      'analysis_completed': 'diagnosis_completed',
      'report_generated': 'diagnosis_completed',
      'line_sent': 'report_sent',
      'line_confirmed': 'report_sent',
    }
    if (STEP_TO_STATUS[step]) {
      updateData.status = STEP_TO_STATUS[step]
    }

    // 更新実行
    await db
      .update(visits)
      .set(updateData as Partial<typeof visits.$inferInsert>)
      .where(eq(visits.id, visitId))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in update-step API:', error)
    return NextResponse.json(
      { error: 'サーバーエラー' },
      { status: 500 }
    )
  }
}
