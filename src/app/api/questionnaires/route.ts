import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { questionnaires, visits } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      sessionId,
      childName,
      childAge,
      childGender,
      parentName,
      parentPhone,
      medicalHistory = [],
      concerns = [],
      idealGoals = [],
      notes,
    } = body

    // バリデーション
    if (!sessionId || !childName || !parentName || !parentPhone) {
      return NextResponse.json(
        { error: '必須項目が入力されていません' },
        { status: 400 }
      )
    }

    // 問診票データの保存
    const insertedRows = await db
      .insert(questionnaires)
      .values({
        sessionId,
        childName,
        childAge,
        childGender,
        parentName,
        parentPhone,
        medicalHistory,
        concerns,
        idealGoals,
        notes: notes || '',
      } as typeof questionnaires.$inferInsert)
      .returning()

    const questionnaire = insertedRows[0]

    // セッションのステータスを更新
    await db
      .update(visits)
      .set({
        status: 'in_progress',
        currentStep: 'questionnaire_completed',
      } as Partial<typeof visits.$inferInsert>)
      .where(eq(visits.sessionId, sessionId))

    return NextResponse.json({
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
    }, { status: 201 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'セッションIDが指定されていません' },
        { status: 400 }
      )
    }

    const rows = await db
      .select()
      .from(questionnaires)
      .where(eq(questionnaires.sessionId, sessionId))
      .limit(1)

    if (rows.length === 0) {
      return NextResponse.json(
        { error: '問診票が見つかりません' },
        { status: 404 }
      )
    }

    const q = rows[0]

    return NextResponse.json({
      id: q.id,
      session_id: q.sessionId,
      child_name: q.childName,
      child_age: q.childAge,
      child_gender: q.childGender,
      parent_name: q.parentName,
      parent_phone: q.parentPhone,
      medical_history: q.medicalHistory,
      concerns: q.concerns,
      ideal_goals: q.idealGoals,
      notes: q.notes,
      created_at: q.createdAt,
      updated_at: q.updatedAt,
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
