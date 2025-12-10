import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

// Gemini APIの初期化
const genAI = process.env.GEMINI_API_KEY 
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null

// Supabase クライアント (Service Role)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)


export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const body = await request.json()
    const { sessionId, visitId, questionnaire, postureAnalysis, oralAnalysis, staffNotes, testMode, testData, customPrompt } = body

    let dataForPrompt = {
      childName: '',
      childAge: '',
      childAgeMonths: 0,
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

    // テストモード: 直接データを使用
    if (testMode && testData) {
      dataForPrompt.childName = testData.childName || 'テスト太郎'
      dataForPrompt.childAge = String(testData.childAge || 5)
      dataForPrompt.childAgeMonths = testData.childAgeMonths || 0
      dataForPrompt.childGender = testData.childGender || '男'
      dataForPrompt.postureScore = String(testData.postureScore || 5)
      dataForPrompt.oralScore = String(testData.oralScore || 5)
      dataForPrompt.postureIssues = testData.postureIssues?.join(', ') || 'なし'
      dataForPrompt.oralIssues = testData.oralIssues?.join(', ') || 'なし'
      dataForPrompt.staffNotes = testData.staffNotes || ''
      
      // 問診・診断データをフォーマット
      const details: string[] = []
      if (testData.questionnaire) {
        for (const [key, value] of Object.entries(testData.questionnaire)) {
          details.push(`[問診] ${key}: ${value}`)
        }
      }
      if (testData.diagnosis) {
        for (const [key, value] of Object.entries(testData.diagnosis)) {
          details.push(`[診断] ${key}: ${value}`)
        }
      }
      dataForPrompt.diagnosisDetails = details.join('\n')
      
    } else if (sessionId) {
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

    // APIキーがない場合はエラーを返す
    if (!genAI) {
      console.error('[AI Report] GEMINI_API_KEY is not configured')
      return NextResponse.json(
        { error: 'GEMINI_API_KEYが設定されていません。環境変数を確認してください。' },
        { status: 500 }
      )
    }

    // Gemini APIでレポート生成
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

    // 年齢表示の構築
    const ageDisplay = dataForPrompt.childAgeMonths > 0 
      ? `${dataForPrompt.childAge}歳${dataForPrompt.childAgeMonths}ヶ月`
      : `${dataForPrompt.childAge}歳`
    
    // 年齢に応じた注意事項
    const ageNum = parseInt(dataForPrompt.childAge) || 5
    const ageConsiderations = []
    if (ageNum <= 2) {
      ageConsiderations.push('乳児期のため、発達段階を考慮した評価が必要です')
      ageConsiderations.push('足の形状（扁平足など）は発達途上であり、経過観察が基本です')
    } else if (ageNum <= 4) {
      ageConsiderations.push('幼児期のため、一部の評価項目は参考程度としてください')
      ageConsiderations.push('習癖（指しゃぶり等）はこの年齢では一般的な場合があります')
    } else if (ageNum <= 6) {
      ageConsiderations.push('乳歯から永久歯への生え変わり時期を考慮してください')
    }

    // プロンプト構築（カスタムプロンプトがある場合は変数を置換）
    let prompt: string
    
    if (customPrompt) {
      // カスタムプロンプトの変数を置換
      prompt = customPrompt
        .replace(/\{\{childName\}\}/g, dataForPrompt.childName)
        .replace(/\{\{ageDisplay\}\}/g, ageDisplay)
        .replace(/\{\{childGender\}\}/g, dataForPrompt.childGender)
        .replace(/\{\{postureScore\}\}/g, dataForPrompt.postureScore)
        .replace(/\{\{oralScore\}\}/g, dataForPrompt.oralScore)
        .replace(/\{\{postureIssues\}\}/g, dataForPrompt.postureIssues)
        .replace(/\{\{oralIssues\}\}/g, dataForPrompt.oralIssues)
        .replace(/\{\{staffNotes\}\}/g, dataForPrompt.staffNotes || 'なし')
        .replace(/\{\{diagnosisDetails\}\}/g, dataForPrompt.diagnosisDetails || 'なし')
        .replace(/\{\{ageConsiderations\}\}/g, ageConsiderations.length > 0 
          ? `【年齢に関する考慮事項】\n${ageConsiderations.join('\n')}`
          : '')
    } else {
      // デフォルトプロンプト
      prompt = `
あなたは口腔育成の専門家として、診断結果から親御さん向けのレポートを生成してください。

【重要な指示】
- 専門用語は避け、親御さんにわかりやすい表現を使ってください
- ポジティブな点も必ず言及してください
- 問題点は深刻になりすぎない表現で伝えてください
- 「です・ます」調で統一してください

対象のお子様情報:
- お名前: ${dataForPrompt.childName}
- 年齢: ${ageDisplay}
- 性別: ${dataForPrompt.childGender}
- 既往歴: ${dataForPrompt.medicalHistory || 'なし'}
- 気になる症状: ${dataForPrompt.concerns || 'なし'}

${ageConsiderations.length > 0 ? `【年齢に関する考慮事項】\n${ageConsiderations.join('\n')}\n` : ''}

姿勢分析結果:
- 全体評価: ${dataForPrompt.postureScore}/10
- 問題点: ${dataForPrompt.postureIssues}

口腔分析結果:
- 全体評価: ${dataForPrompt.oralScore}/10
- 問題点: ${dataForPrompt.oralIssues}

スタッフの所見: ${dataForPrompt.staffNotes || 'なし'}

詳細診断項目:
${dataForPrompt.diagnosisDetails || 'なし'}

以下の形式でJSONとしてレポートを出力してください:
{
  "summary": "全体の要約（150-200文字程度、ポジティブな点から始める）",
  "analysis": "詳細な分析内容（姿勢と口腔の相関関係を含む、300文字程度）",
  "recommendations": ["具体的で実践しやすい改善提案1", "改善提案2", "改善提案3"],
  "nextSteps": ["次のステップ1", "次のステップ2"],
  "encouragingMessage": "親御さんへの温かい励ましのメッセージ（50-100文字）"
}
      `.trim()
    }

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

      const processingTime = Date.now() - startTime

      // ai_analysis_resultsテーブルに保存
      if (sessionId || visitId) {
        const { data: analysisRecord, error: dbError } = await supabase
          .from('ai_analysis_results')
          .upsert(
            {
              visit_id: visitId || null,
              session_id: sessionId || null,
              summary: reportResult.summary,
              detailed_analysis: { analysis: reportResult.analysis },
              improvement_suggestions: reportResult.recommendations,
              next_steps: reportResult.nextSteps,
              encouragement_message: reportResult.encouragingMessage,
              model_version: 'gemini-pro',
              prompt_version: 'v1.0',
              processing_time_ms: processingTime,
              status: 'completed',
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: sessionId ? 'session_id' : 'visit_id',
            }
          )
          .select()
          .single()

        if (dbError) {
          console.error('[AI Report] DB save error:', dbError)
          // DBエラーでも結果は返す
        } else {
          console.log('[AI Report] Saved to ai_analysis_results:', analysisRecord?.id)
        }
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

