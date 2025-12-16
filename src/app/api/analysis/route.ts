import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, isMockMode } from '@/lib/supabase'
import { analyzeWithRetry, extractJSON, isGeminiMockMode } from '@/lib/gemini'
import {
  OralDiagnosisOutput,
  OralDiagnosisOutputSchema,
  buildOralAnalysisPrompt,
  getDefaultOralDiagnosisOutput,
  OralAnalysisInput
} from '@/agents/oral-diagnosis/schema'

export const dynamic = 'force-dynamic'

/**
 * POST /api/analysis
 * AI分析を実行し、結果をDBに保存
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { visitId } = body

    if (!visitId) {
      return NextResponse.json(
        { error: 'visitIdが必要です' },
        { status: 400 }
      )
    }

    // モックモードの場合
    if (isMockMode) {
      const mockResult = getDefaultOralDiagnosisOutput()
      return NextResponse.json({
        success: true,
        analysisId: 'mock-analysis-id',
        result: mockResult,
        isMock: true
      })
    }

    const supabase = createServerSupabaseClient()

    // visitデータを取得
    const { data: visit, error: visitError } = await supabase
      .from('visits')
      .select(`
        *,
        children (*),
        medical_interviews (*),
        oral_diagnoses (*)
      `)
      .eq('id', visitId)
      .single()

    if (visitError || !visit) {
      return NextResponse.json(
        { error: '来場データが見つかりません' },
        { status: 404 }
      )
    }

    // 分析入力データを構築
    const child = visit.children
    const medicalInterview = visit.medical_interviews
    const oralDiagnosis = visit.oral_diagnoses

    // 年齢計算
    const birthDate = new Date(child.birthday)
    const visitDate = new Date(visit.visit_date)
    const ageInMonths = Math.floor(
      (visitDate.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
    )
    const ageYears = Math.floor(ageInMonths / 12)
    const ageMonthsRemainder = ageInMonths % 12

    const analysisInput: OralAnalysisInput = {
      childInfo: {
        ageYears,
        ageMonths: ageMonthsRemainder,
        gender: child.gender || 'other'
      },
      questionnaire: medicalInterview?.answers || {},
      diagnosis: oralDiagnosis?.details || {},
      photoUrls: oralDiagnosis?.photo_urls || []
    }

    // プロンプト構築
    const prompt = buildOralAnalysisPrompt(analysisInput)

    let analysisResult: OralDiagnosisOutput
    let rawResponse: string = ''

    try {
      // Gemini分析実行
      rawResponse = await analyzeWithRetry(prompt)

      // JSONパースとバリデーション
      const parsed = extractJSON<OralDiagnosisOutput>(rawResponse)
      analysisResult = OralDiagnosisOutputSchema.parse(parsed)
    } catch (aiError) {
      console.error('[Analysis] AI分析エラー:', aiError)

      // フォールバック
      analysisResult = getDefaultOralDiagnosisOutput()
      analysisResult.professionalNote = `AI分析エラー: ${(aiError as Error).message}`
    }

    // ai_analysis_logsに保存
    const { data: analysisLog, error: insertError } = await supabase
      .from('ai_analysis_logs')
      .insert({
        visit_id: visitId,
        input_data: analysisInput,
        generated_content: analysisResult.parentComment,
        final_content: analysisResult.parentComment, // 初期値は生成コメント
        feedback_score: null
      })
      .select()
      .single()

    if (insertError) {
      console.error('[Analysis] DB保存エラー:', insertError)
      // DB保存に失敗しても分析結果は返す
    }

    // visitsのステータス更新
    await supabase
      .from('visits')
      .update({ status: 'analysis_completed' })
      .eq('id', visitId)

    return NextResponse.json({
      success: true,
      analysisId: analysisLog?.id || null,
      result: analysisResult,
      isMock: isGeminiMockMode
    })

  } catch (error) {
    console.error('[Analysis] エラー:', error)
    return NextResponse.json(
      { error: 'AI分析中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/analysis?visitId=xxx
 * 分析結果を取得
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const visitId = searchParams.get('visitId')

    if (!visitId) {
      return NextResponse.json(
        { error: 'visitIdが必要です' },
        { status: 400 }
      )
    }

    if (isMockMode) {
      return NextResponse.json({
        success: true,
        analysis: {
          id: 'mock-id',
          visit_id: visitId,
          generated_content: 'モックモードの分析結果です',
          final_content: 'モックモードの分析結果です',
          feedback_score: null
        }
      })
    }

    const supabase = createServerSupabaseClient()

    const { data: analysis, error } = await supabase
      .from('ai_analysis_logs')
      .select('*')
      .eq('visit_id', visitId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      return NextResponse.json(
        { error: '分析結果が見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      analysis
    })

  } catch (error) {
    console.error('[Analysis GET] エラー:', error)
    return NextResponse.json(
      { error: '分析結果の取得中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/analysis
 * 分析結果（final_content）を更新
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { analysisId, finalContent, feedbackScore } = body

    if (!analysisId) {
      return NextResponse.json(
        { error: 'analysisIdが必要です' },
        { status: 400 }
      )
    }

    if (isMockMode) {
      return NextResponse.json({
        success: true,
        analysis: {
          id: analysisId,
          final_content: finalContent,
          feedback_score: feedbackScore
        }
      })
    }

    const supabase = createServerSupabaseClient()

    const updateData: Record<string, unknown> = {}
    if (finalContent !== undefined) {
      updateData.final_content = finalContent
    }
    if (feedbackScore !== undefined) {
      updateData.feedback_score = feedbackScore
    }

    const { data: analysis, error } = await supabase
      .from('ai_analysis_logs')
      .update(updateData)
      .eq('id', analysisId)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: '更新に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      analysis
    })

  } catch (error) {
    console.error('[Analysis PATCH] エラー:', error)
    return NextResponse.json(
      { error: '更新中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

