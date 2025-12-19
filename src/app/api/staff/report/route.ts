import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { visits, reports } from '@/db/schema'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

/**
 * GET /api/staff/report?sessionId=xxx
 * セッションデータを取得
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionIdが必要です' },
        { status: 400 }
      )
    }

    // セッションデータを取得
    const sessionRows = await db
      .select()
      .from(visits)
      .where(eq(visits.id, sessionId))
      .limit(1)

    if (sessionRows.length === 0) {
      return NextResponse.json(
        { error: 'セッションが見つかりません' },
        { status: 404 }
      )
    }

    const session = sessionRows[0]

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        session_id: session.sessionId,
        status: session.status,
        visit_date: session.visitDate,
        child_age_months: session.childAgeMonths,
        current_step: session.currentStep,
        child_id: session.childId,
        staff_profile_id: session.staffProfileId,
      },
    })
  } catch (error) {
    console.error('[Report GET] エラー:', error)
    return NextResponse.json(
      { error: 'データの取得に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/staff/report
 * レポートを保存
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, session_id } = body

    if (!session_id) {
      return NextResponse.json(
        { error: 'session_idが必要です' },
        { status: 400 }
      )
    }

    // レポートを保存
    const insertedRows = await db
      .insert(reports)
      .values({
        sessionId: session_id,
        reportType: 'diagnosis',
      } as typeof reports.$inferInsert)
      .returning()

    const report = insertedRows[0]

    return NextResponse.json({
      success: true,
      report: {
        id: report.id,
        session_id: report.sessionId,
        report_type: report.reportType,
      },
    })
  } catch (error) {
    console.error('[Report POST] エラー:', error)
    return NextResponse.json(
      { error: 'レポートの保存に失敗しました' },
      { status: 500 }
    )
  }
}
