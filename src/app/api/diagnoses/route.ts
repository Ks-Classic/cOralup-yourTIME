import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { diagnoses, diagnosisResponses, visits } from '@/db/schema'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      sessionId,
      postureAnalysis,
      oralAnalysis,
      diagnosisItems: diagnosisItemsData,
      staffNotes,
      photos = [],
    } = body

    // バリデーション
    if (!sessionId) {
      return NextResponse.json(
        { error: 'セッションIDが指定されていません' },
        { status: 400 }
      )
    }

    // 1. 診断結果の保存 (旧互換テーブル) - upsert
    const existingRows = await db
      .select({ id: diagnoses.id })
      .from(diagnoses)
      .where(eq(diagnoses.sessionId, sessionId))
      .limit(1)

    let diagnosis
    if (existingRows.length > 0) {
      // Update
      const updatedRows = await db
        .update(diagnoses)
        .set({
          postureAnalysis,
          oralAnalysis,
          diagnosisItems: diagnosisItemsData,
          staffNotes,
          photos,
          updatedAt: new Date(),
        } as Partial<typeof diagnoses.$inferInsert>)
        .where(eq(diagnoses.sessionId, sessionId))
        .returning()
      diagnosis = updatedRows[0]
    } else {
      // Insert
      const insertedRows = await db
        .insert(diagnoses)
        .values({
          sessionId,
          postureAnalysis,
          oralAnalysis,
          diagnosisItems: diagnosisItemsData,
          staffNotes,
          photos,
        } as typeof diagnoses.$inferInsert)
        .returning()
      diagnosis = insertedRows[0]
    }

    // 2. 診断項目別回答の保存 (正規化テーブル)
    if (diagnosisItemsData && Object.keys(diagnosisItemsData).length > 0) {
      for (const [itemId, value] of Object.entries(diagnosisItemsData)) {
        let serializedValue = value
        if (typeof value === 'object' && value !== null) {
          serializedValue = JSON.stringify(value)
        } else {
          serializedValue = String(value)
        }

        // Upsert for each response
        const existingResponse = await db
          .select({ id: diagnosisResponses.id })
          .from(diagnosisResponses)
          .where(eq(diagnosisResponses.sessionId, sessionId))
          .limit(1)

        if (existingResponse.length > 0) {
          await db
            .update(diagnosisResponses)
            .set({
              value: serializedValue as string,
              answeredAt: new Date(),
            } as Partial<typeof diagnosisResponses.$inferInsert>)
            .where(eq(diagnosisResponses.sessionId, sessionId))
        } else {
          await db
            .insert(diagnosisResponses)
            .values({
              sessionId,
              itemId,
              value: serializedValue as string,
              answeredAt: new Date(),
            } as typeof diagnosisResponses.$inferInsert)
        }
      }
    }

    // セッションのステータスを更新
    await db
      .update(visits)
      .set({ status: 'completed' } as Partial<typeof visits.$inferInsert>)
      .where(eq(visits.sessionId, sessionId))

    return NextResponse.json(diagnosis, { status: 201 })
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

    const diagnosisRows = await db
      .select()
      .from(diagnoses)
      .where(eq(diagnoses.sessionId, sessionId))
      .limit(1)

    if (diagnosisRows.length === 0) {
      return NextResponse.json(
        { error: '診断結果が見つかりません' },
        { status: 404 }
      )
    }

    const result = diagnosisRows[0]

    // Supabase形式に変換
    return NextResponse.json({
      id: result.id,
      session_id: result.sessionId,
      visit_id: result.visitId,
      posture_analysis: result.postureAnalysis,
      oral_analysis: result.oralAnalysis,
      diagnosis_items: result.diagnosisItems,
      ai_analysis: result.aiAnalysis,
      staff_notes: result.staffNotes,
      photos: result.photos,
      created_at: result.createdAt,
      updated_at: result.updatedAt,
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'セッションIDが指定されていません' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { postureAnalysis, oralAnalysis, diagnosisItems: diagnosisItemsData, staffNotes, photos } = body

    // 1. 診断結果の更新 (旧互換テーブル)
    const updatedRows = await db
      .update(diagnoses)
      .set({
        postureAnalysis,
        oralAnalysis,
        diagnosisItems: diagnosisItemsData,
        staffNotes,
        photos,
        updatedAt: new Date(),
      } as Partial<typeof diagnoses.$inferInsert>)
      .where(eq(diagnoses.sessionId, sessionId))
      .returning()

    if (updatedRows.length === 0) {
      return NextResponse.json(
        { error: '診断結果が見つかりません' },
        { status: 404 }
      )
    }

    const result = updatedRows[0]

    // 2. 診断項目別回答の更新 (正規化テーブル)
    if (diagnosisItemsData && Object.keys(diagnosisItemsData).length > 0) {
      for (const [itemId, value] of Object.entries(diagnosisItemsData)) {
        let serializedValue = value
        if (typeof value === 'object' && value !== null) {
          serializedValue = JSON.stringify(value)
        } else {
          serializedValue = String(value)
        }

        const existingResponse = await db
          .select({ id: diagnosisResponses.id })
          .from(diagnosisResponses)
          .where(eq(diagnosisResponses.sessionId, sessionId))
          .limit(1)

        if (existingResponse.length > 0) {
          await db
            .update(diagnosisResponses)
            .set({
              value: serializedValue as string,
              answeredAt: new Date(),
            } as Partial<typeof diagnosisResponses.$inferInsert>)
            .where(eq(diagnosisResponses.sessionId, sessionId))
        } else {
          await db
            .insert(diagnosisResponses)
            .values({
              sessionId,
              itemId,
              value: serializedValue as string,
              answeredAt: new Date(),
            } as typeof diagnosisResponses.$inferInsert)
        }
      }
    }

    return NextResponse.json({
      id: result.id,
      session_id: result.sessionId,
      posture_analysis: result.postureAnalysis,
      oral_analysis: result.oralAnalysis,
      diagnosis_items: result.diagnosisItems,
      staff_notes: result.staffNotes,
      photos: result.photos,
      updated_at: result.updatedAt,
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
