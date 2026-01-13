import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const dynamic = 'force-dynamic'

/**
 * 紙問診票画像解析API
 * 
 * Geminiで画像から問診回答を自動抽出する
 */
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const image = formData.get('image') as File | null

        if (!image) {
            return NextResponse.json(
                { success: false, error: '画像が選択されていません' },
                { status: 400 }
            )
        }

        // 画像をBase64に変換
        const imageBuffer = await image.arrayBuffer()
        const base64Image = Buffer.from(imageBuffer).toString('base64')
        const mimeType = image.type || 'image/jpeg'

        // Gemini API初期化
        const apiKey = process.env.GEMINI_API_KEY

        // モックモード: GEMINI_API_KEYがない場合はサンプルデータを返す
        if (!apiKey) {
            console.warn('[paper-recovery/analyze] Mock mode: GEMINI_API_KEY not configured, returning sample data')
            return NextResponse.json({
                success: true,
                data: {
                    childName: '山田 太郎',
                    furigana: 'やまだ たろう',
                    birthday: '2020-05-15',
                    gender: 'male',
                    prefecture: '東京都',
                    questionnaire: {
                        has_siblings: 'has',
                        sibling_order: 2,
                        screen_time: 'within_30min',
                        screen_hours: null,
                        sleep_conditions: ['supine'],
                        bedtime: 21,
                        sleep_pattern: ['regular', 'afternoon_nap'],
                        lessons: ['swimming'],
                        eating_habits: [],
                        disliked_foods: 'ピーマン',
                        liked_foods: 'カレー',
                        photo_consent: 'yes'
                    },
                    confidence: 0.85
                },
                _mock: true,
                _message: 'これはローカル開発用のモックデータです。本番環境ではGEMINI_API_KEYを設定してください。'
            })
        }

        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

        // プロンプト
        const prompt = `あなたは歯科問診票の読み取りアシスタントです。
以下の問診票画像から、情報を抽出してJSON形式で返してください。

## 抽出項目

### 基本情報
- お名前（漢字）
- ふりがな
- 生年月日（YYYY-MM-DD形式）
- 性別（male/female）
- 都道府県

### 問診項目
以下の項目について、チェックがついているものを配列で返してください。

1. きょうだい: "none"（いない）または "has"（いる）
2. 何人目: 数値（きょうだいがいる場合のみ）
3. TV視聴時間: "almost_none" / "within_30min" / "within_hours" / "more"
4. 時間数: 数値（該当する場合のみ）
5. 睡眠の様子: ["snoring", "bedtime_fuss", "wake_fuss", "night_crying", "frequent_waking", "prone", "supine", "side"]から該当するもの
   - snoring=いびき, bedtime_fuss=寝ぐずり, wake_fuss=起きぐずり, night_crying=夜泣き, frequent_waking=頻回起き, prone=うつ伏せ寝, supine=仰向け, side=横向き寝
6. 就寝時刻: 数値（0-23）
7. 睡眠パターン: ["irregular", "regular", "morning_nap", "afternoon_nap", "evening_nap"]から該当するもの
   - irregular=決まっていない, regular=規則正しい, morning_nap=朝寝, afternoon_nap=昼寝, evening_nap=夕寝
8. 習い事: ["swimming", "gymnastics", "soccer", "baseball", "english", "other"]から該当するもの
   - swimming=スイミング, gymnastics=体操, soccer=サッカー, baseball=野球, english=英語, other=その他
9. 食事の様子: ["picky", "no_chew", "cannot_swallow", "swallow_whole", "large_bite", "fast", "slow", "other"]から該当するもの
   - picky=偏食, no_chew=噛まない, cannot_swallow=飲み込めない, swallow_whole=丸呑み, large_bite=一口量が多い, fast=食べるのが早い, slow=食べるのが遅い, other=その他
10. 嫌いな食べ物: テキスト
11. 好きな食べ物: テキスト
12. 症例写真同意: "yes" または "no"

## 出力形式
JSON形式のみで出力してください。余計な説明は不要です。読み取れなかった項目はnullとしてください。

{
  "childName": "姓 名",
  "furigana": "せい めい",
  "birthday": "YYYY-MM-DD",
  "gender": "male" | "female",
  "prefecture": "都道府県名",
  "questionnaire": {
    "has_siblings": "none" | "has",
    "sibling_order": number | null,
    "screen_time": "almost_none" | "within_30min" | "within_hours" | "more",
    "screen_hours": number | null,
    "sleep_conditions": ["snoring", ...],
    "bedtime": number | null,
    "sleep_pattern": ["regular", ...],
    "lessons": ["swimming", ...],
    "eating_habits": ["fast", ...],
    "disliked_foods": "text" | null,
    "liked_foods": "text" | null,
    "photo_consent": "yes" | "no"
  },
  "confidence": 0.0-1.0
}`

        // Gemini APIを呼び出し
        const result = await model.generateContent([
            {
                inlineData: {
                    mimeType,
                    data: base64Image,
                },
            },
            prompt,
        ])

        const responseText = result.response.text()

        // JSONをパース（コードブロックの除去も試みる）
        let parsedData
        try {
            // ```json ... ``` の形式を処理
            const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/)
            const jsonString = jsonMatch ? jsonMatch[1].trim() : responseText.trim()
            parsedData = JSON.parse(jsonString)
        } catch (parseError) {
            console.error('JSONパースエラー:', parseError)
            console.error('レスポンス:', responseText)
            return NextResponse.json(
                { success: false, error: 'Geminiの応答を解析できませんでした', rawResponse: responseText },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            data: parsedData,
        })

    } catch (error) {
        console.error('画像解析エラー:', error)
        return NextResponse.json(
            { success: false, error: '画像の解析に失敗しました' },
            { status: 500 }
        )
    }
}
