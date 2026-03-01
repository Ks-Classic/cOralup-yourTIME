import { NextRequest, NextResponse } from 'next/server'
import { generateText, isGeminiAvailable } from '@/lib/gemini-client'

// Vercel Serverless: Gemini API応答に最大30秒かかるため60秒に延長
export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // モックモード: GEMINI_API_KEYがない場合はサンプルデータを返す
    if (!isGeminiAvailable()) {
      console.warn('[analyze-oral] Mock mode: GEMINI_API_KEY not configured, returning sample data')
      return NextResponse.json({
        overallScore: 7,
        issues: ['軽度の歯並びの乱れ', '舌の位置がやや低い'],
        recommendations: ['定期的な歯科検診を継続してください', '舌のトレーニングを検討してください'],
        severity: 'low',
        details: {
          biteCondition: '正常範囲内です',
          teethAlignment: '軽度の叢生が見られます',
          tonguePosition: '安静時に舌が低位にある傾向があります',
          oralCleanliness: '概ね良好です',
          functionEstimation: '発音・嚥下機能は正常と推測されます',
        },
        _mock: true,
        _message: 'これはローカル開発用のモックデータです。本番環境ではGEMINI_API_KEYを設定してください。'
      })
    }

    const body = await request.json()
    const { imageDescription, age, medicalHistory = [], concerns = [] } = body

    // バリデーション
    if (!imageDescription) {
      return NextResponse.json({ error: '画像の説明が提供されていません' }, { status: 400 })
    }

    // Gemini APIで口腔分析
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

    const text = await generateText(prompt, {
      model: 'gemini-2.5-flash-lite',
      logTag: 'analyze-oral',
    })

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
