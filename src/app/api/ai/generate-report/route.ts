import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Gemini APIの初期化
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { questionnaire, postureAnalysis, oralAnalysis, staffNotes } = body

    // バリデーション
    if (!questionnaire || !postureAnalysis || !oralAnalysis) {
      return NextResponse.json(
        { error: '必要なデータが提供されていません' },
        { status: 400 }
      )
    }

    // Gemini APIでレポート生成
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

    const prompt = `
あなたは口腔育成の専門家として、診断結果から親御さん向けのレポートを生成してください。

対象のお子様情報:
- お名前: ${questionnaire.child_name}
- 年齢: ${questionnaire.child_age}歳
- 性別: ${questionnaire.child_gender}
- 既往歴: ${questionnaire.medical_history?.join(', ') || 'なし'}
- 気になる症状: ${questionnaire.concerns?.join(', ') || 'なし'}

姿勢分析結果:
- 全体評価: ${postureAnalysis.overall_score}/10
- 深刻度: ${postureAnalysis.severity}
- 問題点: ${postureAnalysis.issues?.join(', ') || 'なし'}
- 改善提案: ${postureAnalysis.recommendations?.join(', ') || 'なし'}

口腔分析結果:
- 全体評価: ${oralAnalysis.overall_score}/10
- 深刻度: ${oralAnalysis.severity}
- 問題点: ${oralAnalysis.issues?.join(', ') || 'なし'}
- 改善提案: ${oralAnalysis.recommendations?.join(', ') || 'なし'}

スタッフの所見: ${staffNotes || 'なし'}

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

      // デフォルトのレポートを返す
      const defaultReport = {
        summary: 'お子様の口腔・姿勢状態を分析いたしました。専門的なアドバイスが必要な状態です。',
        analysis: '詳細な分析を行うため、専門医への相談をおすすめします。',
        recommendations: [
          '定期的な歯科検診を受診してください',
          '日常の姿勢に気をつけるよう指導してください',
          'バランスの良い食生活を心がけてください'
        ],
        nextSteps: [
          'かかりつけの歯科医に相談する',
          '必要に応じて専門医を紹介してもらう',
          '定期的に状態をチェックする'
        ],
        encouragingMessage: 'お子様の健康な成長を一緒にサポートしていきましょう。何か気になることがありましたら、いつでもご相談ください。',
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

