import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Gemini APIの初期化
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null

export async function POST(request: NextRequest) {
  try {
    if (!genAI) {
      return NextResponse.json({ error: 'Gemini API key is not configured' }, { status: 500 })
    }

    const body = await request.json()
    const { imageDescription, age, medicalHistory = [], concerns = [] } = body

    // バリデーション
    if (!imageDescription) {
      return NextResponse.json({ error: '画像の説明が提供されていません' }, { status: 400 })
    }

    // Gemini APIで口腔分析
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' })

    const prompt = `
あなたは口腔機能の専門家として、口腔内写真からお子様の口腔状態を分析してください。

対象のお子様情報:
- 年齢: ${age}歳
- 既往歴: ${Array.isArray(medicalHistory) ? medicalHistory.join(', ') : medicalHistory}
- 気になる症状: ${Array.isArray(concerns) ? concerns.join(', ') : concerns}

写真の説明:
${imageDescription}

以下の形式でJSONとして分析結果を出力してください:
{
  "overallScore": 1-10の数値,
  "issues": ["問題点1", "問題点2", ...],
  "recommendations": ["改善提案1", "改善提案2", ...],
  "severity": "low" | "medium" | "high",
  "details": {
    "biteCondition": "咬合状態の分析",
    "teethAlignment": "歯並びの評価",
    "tonguePosition": "舌の位置と機能の分析",
    "oralCleanliness": "口腔内の清潔度の評価",
    "functionEstimation": "発音・嚥下機能の推定"
  }
}
    `.trim()

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    // JSONを抽出してパース
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('JSONがレスポンスから見つかりませんでした')
      }

      const analysisResult = JSON.parse(jsonMatch[0])
      return NextResponse.json(analysisResult)
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      return NextResponse.json({
        overallScore: 5,
        issues: ['分析に十分な情報が得られませんでした'],
        recommendations: ['専門医にご相談ください'],
        severity: 'medium',
        details: {
          biteCondition: '評価不能',
          teethAlignment: '評価不能',
          tonguePosition: '評価不能',
          oralCleanliness: '評価不能',
          functionEstimation: '評価不能',
        },
      })
    }
  } catch (error) {
    console.error('Error in oral analysis:', error)
    return NextResponse.json({ error: '口腔分析中にエラーが発生しました' }, { status: 500 })
  }
}
