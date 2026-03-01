import { NextRequest, NextResponse } from 'next/server'
import { generateText, isGeminiAvailable } from '@/lib/gemini-client'

// Vercel Serverless: Gemini API応答に最大30秒かかるため60秒に延長
export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // モックモード: GEMINI_API_KEYがない場合はサンプルデータを返す
    if (!isGeminiAvailable()) {
      console.warn('[analyze-posture] Mock mode: GEMINI_API_KEY not configured, returning sample data')
      return NextResponse.json({
        overallScore: 6,
        issues: ['やや猫背の傾向がある', '右肩が若干下がっている'],
        recommendations: ['姿勢を意識した生活習慣を心がけてください', 'ストレッチを日課にすると良いでしょう'],
        severity: 'low',
        details: {
          headPosition: '頭部がやや前方に位置しています',
          shoulderBalance: '右肩が若干低い傾向があります',
          spineCurve: '胸椎部で軽度の後弯が見られます',
          pelvisTilt: '骨盤は概ね正常な位置です',
          footBalance: '足の位置とバランスは良好です',
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

    // Gemini APIで姿勢分析
    const prompt = `
あなたは口腔育成の専門家として、姿勢写真からお子様の姿勢状態を分析してください。

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
    "headPosition": "頭部の位置と傾きの分析",
    "shoulderBalance": "肩の高さの左右差の分析",
    "spineCurve": "背骨のカーブ状態の分析",
    "pelvisTilt": "骨盤の傾きの分析",
    "footBalance": "足の位置とバランスの分析"
  }
}
    `.trim()

    const text = await generateText(prompt, {
      model: 'gemini-2.5-flash-lite',
      logTag: 'analyze-posture',
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
          headPosition: '評価不能',
          shoulderBalance: '評価不能',
          spineCurve: '評価不能',
          pelvisTilt: '評価不能',
          footBalance: '評価不能',
        },
      })
    }
  } catch (error) {
    console.error('Error in posture analysis:', error)
    return NextResponse.json({ error: '姿勢分析中にエラーが発生しました' }, { status: 500 })
  }
}
