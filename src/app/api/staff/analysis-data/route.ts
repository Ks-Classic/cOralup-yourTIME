import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { visits, questionnaires, diagnoses, reports } from '@/db/schema'
import { eq } from 'drizzle-orm'

/**
 * GET /api/staff/analysis-data?sessionId=xxx
 * 分析画面用データを取得（セッション、問診、診断）
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

    // セッションデータを取得（visit_id = sessionId として使用）
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

    // 問診票データを取得
    let questionnaire = null
    if (session.sessionId) {
      const qRows = await db
        .select()
        .from(questionnaires)
        .where(eq(questionnaires.sessionId, session.sessionId))
        .limit(1)
      questionnaire = qRows[0] || null
    }

    // 診断データを取得
    let diagnosis = null
    if (session.sessionId) {
      const dRows = await db
        .select()
        .from(diagnoses)
        .where(eq(diagnoses.sessionId, session.sessionId))
        .limit(1)
      diagnosis = dRows[0] || null
    }

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        session_id: session.sessionId,
        status: session.status,
        visit_date: session.visitDate,
        child_age_months: session.childAgeMonths,
        current_step: session.currentStep,
      },
      questionnaire: questionnaire ? {
        id: questionnaire.id,
        session_id: questionnaire.sessionId,
        child_name: questionnaire.childName,
        child_age: questionnaire.childAge,
        child_gender: questionnaire.childGender,
        parent_name: questionnaire.parentName,
        parent_phone: questionnaire.parentPhone,
        medical_history: questionnaire.medicalHistory,
        concerns: questionnaire.concerns,
        ideal_goals: questionnaire.idealGoals,
        notes: questionnaire.notes,
      } : null,
      diagnosis: diagnosis ? {
        id: diagnosis.id,
        session_id: diagnosis.sessionId,
        posture_analysis: diagnosis.postureAnalysis,
        oral_analysis: diagnosis.oralAnalysis,
        diagnosis_items: diagnosis.diagnosisItems,
        ai_analysis: diagnosis.aiAnalysis,
        staff_notes: diagnosis.staffNotes,
        photos: diagnosis.photos,
      } : null,
    })
  } catch (error) {
    console.error('[AnalysisData GET] エラー:', error)
    return NextResponse.json(
      { error: 'データの取得に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/staff/analysis-data
 * レポート保存 + セッションステータス更新
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, session_id } = body

    if (!session_id || !sessionId) {
      return NextResponse.json(
        { error: 'sessionIdとsession_idが必要です' },
        { status: 400 }
      )
    }

    // レポートを保存
    await db
      .insert(reports)
      .values({
        sessionId: session_id,
        reportType: 'diagnosis',
        content: '',
      } as typeof reports.$inferInsert)

    // セッションステータスを更新
    await db
      .update(visits)
      .set({ status: 'completed' } as Partial<typeof visits.$inferInsert>)
      .where(eq(visits.id, sessionId))

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error('[AnalysisData POST] エラー:', error)
    return NextResponse.json(
      { error: 'データの保存に失敗しました' },
      { status: 500 }
    )
  }
}
