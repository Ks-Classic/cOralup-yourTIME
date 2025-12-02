import { GoogleGenerativeAI, GenerativeModel, Part } from '@google/generative-ai'

// 環境変数チェック
const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY
const modelName = process.env.GOOGLE_GEMINI_MODEL || 'gemini-2.0-flash'

// モックモード判定
export const isGeminiMockMode = !apiKey

// Gemini APIクライアント初期化
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null

/**
 * Geminiモデルを取得
 */
export function getGeminiModel(): GenerativeModel | null {
  if (!genAI) return null
  return genAI.getGenerativeModel({ model: modelName })
}

/**
 * テキストのみの分析を実行
 */
export async function analyzeWithText(prompt: string): Promise<string> {
  const model = getGeminiModel()
  
  if (!model) {
    console.warn('[Gemini] Mock mode: returning default response')
    return JSON.stringify({
      summary: 'B',
      findings: [{ category: 'テスト', observation: 'モックモードです', severity: 'normal' }],
      recommendations: ['実際のAPIキーを設定してください'],
      parentComment: 'これはテスト用のモックレスポンスです。'
    })
  }
  
  const result = await model.generateContent(prompt)
  const response = await result.response
  return response.text()
}

/**
 * 画像付きの分析を実行
 */
export async function analyzeWithImages(
  prompt: string,
  images: { data: string; mimeType: string }[]
): Promise<string> {
  const model = getGeminiModel()
  
  if (!model) {
    console.warn('[Gemini] Mock mode: returning default response')
    return JSON.stringify({
      summary: 'B',
      findings: [{ category: 'テスト', observation: 'モックモードです', severity: 'normal' }],
      recommendations: ['実際のAPIキーを設定してください'],
      parentComment: 'これはテスト用のモックレスポンスです。'
    })
  }
  
  const imageParts: Part[] = images.map(img => ({
    inlineData: {
      data: img.data,
      mimeType: img.mimeType
    }
  }))
  
  const result = await model.generateContent([prompt, ...imageParts])
  const response = await result.response
  return response.text()
}

/**
 * JSONレスポンスを抽出してパース
 */
export function extractJSON<T>(text: string): T {
  // マークダウンコードブロックからJSON抽出
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/)
  
  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from response')
  }
  
  const jsonStr = jsonMatch[1] || jsonMatch[0]
  return JSON.parse(jsonStr) as T
}

/**
 * リトライ付きでGemini分析を実行
 */
export async function analyzeWithRetry(
  prompt: string,
  images?: { data: string; mimeType: string }[],
  maxRetries = 3
): Promise<string> {
  let lastError: Error | null = null
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      if (images && images.length > 0) {
        return await analyzeWithImages(prompt, images)
      }
      return await analyzeWithText(prompt)
    } catch (error) {
      lastError = error as Error
      console.error(`[Gemini] Attempt ${i + 1} failed:`, error)
      
      // 最後のリトライでなければ待機
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
      }
    }
  }
  
  throw lastError || new Error('Gemini analysis failed after retries')
}

