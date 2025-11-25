import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Gemini APIの初期化
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { imageDescription, age, medicalHistory, concerns } = body

    // バリデーション
    if (!imageDescription) {
      return NextResponse.json(
        { error: '画像の説明が提供されていません' },
        { status: 400 }
      )
    }

    // Gemini APIで姿勢分析
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

    const prompt = `
あなたは口腔育成の専門家として、姿勢写真からお子様の姿勢状態を分析してください。

対象のお子様情報:
- 年齢: ${age}歳
- 既往歴: ${medicalHistory.join(', ')}
- 気になる症状: ${concerns.join(', ')}

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

      const analysisResult = JSON.parse(jsonMatch[0])

      // レスポンスの検証
      if (typeof analysisResult.overallScore !== 'number' ||
          !Array.isArray(analysisResult.issues) ||
          !Array.isArray(analysisResult.recommendations) ||
          !['low', 'medium', 'high'].includes(analysisResult.severity) ||
          !analysisResult.details) {
        throw new Error('レスポンスの形式が不正です')
      }

      return NextResponse.json(analysisResult)
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      console.error('Raw response:', text)

      // デフォルトのレスポンスを返す
      const defaultResponse = {
        overallScore: 5,
        issues: ['分析に十分な情報が得られませんでした'],
        recommendations: ['専門医にご相談ください'],
        severity: 'medium' as const,
        details: {
          headPosition: '評価不能',
          shoulderBalance: '評価不能',
          spineCurve: '評価不能',
          pelvisTilt: '評価不能',
          footBalance: '評価不能',
        },
      }

      return NextResponse.json(defaultResponse, { status: 200 })
    }
  } catch (error) {
    console.error('Error in posture analysis:', error)
    return NextResponse.json(
      { error: '姿勢分析中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

