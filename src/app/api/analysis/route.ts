import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { visits, children, questionnaires, diagnoses, aiAnalysisLogs } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { analyzeWithRetry, extractJSON } from '@/lib/gemini'
import { updateVisitProgress } from '@/lib/visit-status'
import {
  OralDiagnosisOutput,
  OralDiagnosisOutputSchema,
  buildOralAnalysisPrompt,
  getDefaultOralDiagnosisOutput,
  OralAnalysisInput
} from '@/agents/oral-diagnosis/schema'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { visitId } = body

    if (!visitId) {
      return NextResponse.json({ error: 'visitIdが必要です' }, { status: 400 })
    }

    // visitデータを取得
    const visitRows = await db.select().from(visits).where(eq(visits.id, visitId)).limit(1)
    const visit = visitRows[0]

    if (!visit) {
      return NextResponse.json({ error: '来場データが見つかりません' }, { status: 404 })
    }

    // 子供データ取得
    const childRows = await db.select().from(children).where(eq(children.id, visit.childId!)).limit(1)
    const child = childRows[0]

    // 問診データ取得(questionnaireResponsesが理想だが、従来ロジックに合わせる)
    const qRows = await db.select().from(questionnaires).where(eq(questionnaires.sessionId, visit.sessionId)).limit(1)
    const qData = qRows[0]

    // 診断データ取得
    const dRows = await db.select().from(diagnoses).where(eq(diagnoses.sessionId, visit.sessionId)).limit(1)
    const dData = dRows[0]

    // 年齢計算
    const birthDate = child ? new Date(child.birthday) : new Date()
    const visitDate = visit.visitDate ? new Date(visit.visitDate) : new Date()
    const ageInMonths = Math.floor((visitDate.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44))
    const ageYears = Math.floor(ageInMonths / 12)
    const ageMonthsRemainder = ageInMonths % 12

    const analysisInput: OralAnalysisInput = {
      childInfo: {
        ageYears,
        ageMonths: ageMonthsRemainder,
        gender: (child?.gender as any) || 'other'
      },
      questionnaire: (qData as any) || {}, // 実際は項目ごとの回答が必要
      diagnosis: (dData?.diagnosisItems as any) || {},
      photoUrls: (dData?.photos as any[]) || []
    }

    const prompt = buildOralAnalysisPrompt(analysisInput)
    let analysisResult: OralDiagnosisOutput
    let rawResponse: string = ''

    try {
      rawResponse = await analyzeWithRetry(prompt)
      const parsed = extractJSON<OralDiagnosisOutput>(rawResponse)
      analysisResult = OralDiagnosisOutputSchema.parse(parsed)
    } catch (aiError) {
      console.error('[Analysis] AI分析エラー:', aiError)
      analysisResult = getDefaultOralDiagnosisOutput()
      analysisResult.professionalNote = `AI分析エラー: ${(aiError as Error).message}`
    }

    // Log保存
    const insertedLog = await db.insert(aiAnalysisLogs).values({
      visitId: visitId,
      inputData: analysisInput,
      generatedContent: analysisResult.parentComment,
      finalContent: analysisResult.parentComment,
    } as typeof aiAnalysisLogs.$inferInsert).returning()

    await updateVisitProgress(visitId, 'analysis_completed')

    return NextResponse.json({
      success: true,
      analysisId: insertedLog[0]?.id || null,
      result: analysisResult,
    })

  } catch (error) {
    console.error('[Analysis] エラー:', error)
    return NextResponse.json({ error: 'AI分析中にエラーが発生しました' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const visitId = searchParams.get('visitId')

    if (!visitId) {
      return NextResponse.json({ error: 'visitIdが必要です' }, { status: 400 })
    }

    const logs = await db
      .select()
      .from(aiAnalysisLogs)
      .where(eq(aiAnalysisLogs.visitId, visitId))
      .orderBy(desc(aiAnalysisLogs.createdAt))
      .limit(1)

    if (logs.length === 0) {
      return NextResponse.json({ error: '分析結果が見つかりません' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      analysis: logs[0]
    })
  } catch (error) {
    console.error('[Analysis GET] エラー:', error)
    return NextResponse.json({ error: '分析結果の取得中にエラーが発生しました' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { analysisId, finalContent, feedbackScore } = body

    if (!analysisId) {
      return NextResponse.json({ error: 'analysisIdが必要です' }, { status: 400 })
    }

    const updated = await db
      .update(aiAnalysisLogs)
      .set({
        finalContent: finalContent,
        feedbackScore: feedbackScore,
        updatedAt: new Date()
      } as any)
      .where(eq(aiAnalysisLogs.id, analysisId))
      .returning()

    if (updated.length === 0) {
      return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      analysis: updated[0]
    })
  } catch (error) {
    console.error('[Analysis PATCH] エラー:', error)
    return NextResponse.json({ error: '更新中にエラーが発生しました' }, { status: 500 })
  }
}
