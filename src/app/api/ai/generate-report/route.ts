import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { supabase } from '@/lib/supabase'

// Gemini APIの初期化
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, questionnaire, postureAnalysis, oralAnalysis, staffNotes } = body

    let dataForPrompt = {
      childName: '',
      childAge: '',
      childGender: '',
      medicalHistory: '',
      concerns: '',
      postureScore: '',
      postureIssues: '',
      oralScore: '',
      oralIssues: '',
      staffNotes: '',
      diagnosisDetails: ''
    }

    if (sessionId) {
      // 1. DBからデータを取得
      const { data: qData, error: qError } = await supabase
        .from('questionnaires')
        .select('*')
        .eq('session_id', sessionId)
        .single()

      const { data: dData, error: dError } = await supabase
        .from('diagnoses')
        .select('*')
        .eq('session_id', sessionId)
        .single()

      // 正規化された診断回答を取得 (項目名やカテゴリ名も含める)
      const { data: rData, error: rError } = await supabase
        .from('diagnosis_responses')
        .select(`
          value,
          diagnosis_items (
            question,
            diagnosis_categories (
              name
            )
          )
        `)
        .eq('session_id', sessionId)

      if (qError || dError) {
        console.error('Data fetch error:', qError, dError)
        return NextResponse.json(
          { error: 'データの取得に失敗しました' },
          { status: 500 }
        )
      }

      // プロンプト用データ構築
      dataForPrompt.childName = qData?.child_name || ''
      dataForPrompt.childAge = qData?.child_age || ''
      dataForPrompt.childGender = qData?.child_gender || ''
      dataForPrompt.medicalHistory = Array.isArray(qData?.medical_history) ? qData.medical_history.join(', ') : (qData?.medical_history || 'なし')
      dataForPrompt.concerns = Array.isArray(qData?.concerns) ? qData.concerns.join(', ') : (qData?.concerns || 'なし')

      const pAnalysis = dData?.posture_analysis || {}
      const oAnalysis = dData?.oral_analysis || {}

      dataForPrompt.postureScore = pAnalysis.overall_score || pAnalysis.overallScore || '不明'
      dataForPrompt.postureIssues = Array.isArray(pAnalysis.issues) ? pAnalysis.issues.join(', ') : 'なし'
      dataForPrompt.oralScore = oAnalysis.overall_score || oAnalysis.overallScore || '不明'
      dataForPrompt.oralIssues = Array.isArray(oAnalysis.issues) ? oAnalysis.issues.join(', ') : 'なし'
      dataForPrompt.staffNotes = dData?.staff_notes || ''

      // 詳細回答のフォーマット
      if (rData && rData.length > 0) {
        dataForPrompt.diagnosisDetails = rData.map((r: any) => {
          const category = r.diagnosis_items?.diagnosis_categories?.name || 'その他'
          const question = r.diagnosis_items?.question || ''
          let answer = r.value
          try {
            // JSONの場合はパースして表示
            const parsed = JSON.parse(r.value)
            if (typeof parsed === 'object') {
              answer = JSON.stringify(parsed)
            } else {
              answer = parsed
            }
          } catch (e) {
            // そのまま
          }
          return `[${category}] ${question}: ${answer}`
        }).join('\n')
      }

    } else {
      // 既存ロジック: リクエストボディから直接使用
      if (!questionnaire || !postureAnalysis || !oralAnalysis) {
        return NextResponse.json(
          { error: '必要なデータが提供されていません' },
          { status: 400 }
        )
      }
      dataForPrompt.childName = questionnaire.child_name
      dataForPrompt.childAge = questionnaire.child_age
      dataForPrompt.childGender = questionnaire.child_gender
      dataForPrompt.medicalHistory = questionnaire.medical_history?.join(', ') || 'なし'
      dataForPrompt.concerns = questionnaire.concerns?.join(', ') || 'なし'
      dataForPrompt.postureScore = postureAnalysis.overall_score || postureAnalysis.overallScore
      dataForPrompt.postureIssues = postureAnalysis.issues?.join(', ') || 'なし'
      dataForPrompt.oralScore = oralAnalysis.overall_score || oralAnalysis.overallScore
      dataForPrompt.oralIssues = oralAnalysis.issues?.join(', ') || 'なし'
      dataForPrompt.staffNotes = staffNotes || 'なし'
    }

    // Gemini APIでレポート生成
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

    const prompt = `
あなたは口腔育成の専門家として、診断結果から親御さん向けのレポートを生成してください。

対象のお子様情報:
- お名前: ${dataForPrompt.childName}
- 年齢: ${dataForPrompt.childAge}歳
- 性別: ${dataForPrompt.childGender}
- 既往歴: ${dataForPrompt.medicalHistory}
- 気になる症状: ${dataForPrompt.concerns}

姿勢分析結果:
- 全体評価: ${dataForPrompt.postureScore}/10
- 問題点: ${dataForPrompt.postureIssues}

口腔分析結果:
- 全体評価: ${dataForPrompt.oralScore}/10
- 問題点: ${dataForPrompt.oralIssues}

スタッフの所見: ${dataForPrompt.staffNotes}

詳細診断項目:
${dataForPrompt.diagnosisDetails}

以下の形式でJSONとしてレポートを出力してください:
{
  "summary": "全体の要約（200文字程度）",
  "analysis": "詳細な分析内容（各部位の状態と関連性）",
  "recommendations": ["具体的な改善提案1", "具体的な改善提案2", ...],
  "nextSteps": ["次のステップ1", "次のステップ2", ...],
  "encouragingMessage": "親御さんへの励ましのメッセージ"
}
    `.trim()

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    // JSONを抽出してパース
    try {
      // レスポンスからJSON部分を抽出
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('JSONがレスポンスから見つかりませんでした')
      }

      const reportResult = JSON.parse(jsonMatch[0])

      // レスポンスの検証
      if (!reportResult.summary ||
        !reportResult.analysis ||
        !Array.isArray(reportResult.recommendations) ||
        !Array.isArray(reportResult.nextSteps) ||
        !reportResult.encouragingMessage) {
        throw new Error('レスポンスの形式が不正です')
      }

      return NextResponse.json(reportResult)
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      console.error('Raw response:', text)

      // エラー時はデフォルトレポートを返す（変更なし）
      const defaultReport = {
        summary: 'お子様の口腔・姿勢状態を分析いたしました。',
        analysis: '詳細な分析を行うため、専門医への相談をおすすめします。',
        recommendations: [
          '定期的な歯科検診を受診してください',
          '日常の姿勢に気をつけるよう指導してください'
        ],
        nextSteps: [
          'かかりつけの歯科医に相談する'
        ],
        encouragingMessage: 'お子様の健康な成長を一緒にサポートしていきましょう。',
      }

      return NextResponse.json(defaultReport, { status: 200 })
    }
  } catch (error) {
    console.error('Error in report generation:', error)
    return NextResponse.json(
      { error: 'レポート生成中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

