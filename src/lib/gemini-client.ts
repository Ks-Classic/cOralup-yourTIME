/**
 * Gemini API 統一クライアント
 * 
 * 全てのGemini API呼び出しをこのモジュール経由で行う。
 * - マルチAPIキーフォールバック（GEMINI_API_KEY → GEMINI_API_KEY_2）
 * - 429/503 の指数バックオフリトライ
 * - モックモード（APIキー未設定時）
 * - 構造化ログ
 */

import { GoogleGenerativeAI, GenerativeModel, Part } from '@google/generative-ai'

// ─── APIキー管理 ───────────────────────────────────────
function getApiKeys(): string[] {
    const keys: string[] = []
    const key1 = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY
    const key2 = process.env.GEMINI_API_KEY_2
    if (key1) keys.push(key1)
    if (key2) keys.push(key2)
    return keys
}

/** APIキーが1つも設定されていない = モックモード */
export function isGeminiAvailable(): boolean {
    return getApiKeys().length > 0
}

// ─── リトライ設定 ──────────────────────────────────────
interface RetryConfig {
    maxRetries: number
    baseDelayMs: number
    maxDelayMs: number
}

const DEFAULT_RETRY: RetryConfig = {
    maxRetries: 3,
    baseDelayMs: 2000,
    maxDelayMs: 15000,
}

// ─── エラー分類 ────────────────────────────────────────
function isRetryableError(error: any): boolean {
    const status = error?.status || error?.statusCode || error?.httpStatusCode
    if (status === 429 || status === 503) return true
    const msg = error?.message || ''
    if (msg.includes('429') || msg.includes('Resource has been exhausted')) return true
    if (msg.includes('503') || msg.includes('Service Unavailable')) return true
    if (msg.includes('UNAVAILABLE') || msg.includes('RESOURCE_EXHAUSTED')) return true
    return false
}

function isKeyExhaustedError(error: any): boolean {
    const status = error?.status || error?.statusCode || error?.httpStatusCode
    if (status === 429) return true
    const msg = error?.message || ''
    return msg.includes('429') || msg.includes('Resource has been exhausted') || msg.includes('RESOURCE_EXHAUSTED')
}

// ─── テキスト生成（リトライ+マルチキー） ───────────────
export interface GenerateOptions {
    /** Gemini モデル名 (default: 'gemini-2.5-flash-lite') */
    model?: string
    /** リトライ設定 */
    retry?: Partial<RetryConfig>
    /** ログプレフィックス */
    logTag?: string
}

/**
 * テキストプロンプトでGemini APIを呼び出す（リトライ+マルチキーフォールバック）
 */
export async function generateText(
    prompt: string,
    options: GenerateOptions = {}
): Promise<string> {
    const {
        model: modelName = 'gemini-2.5-flash-lite',
        retry: retryOverride = {},
        logTag = 'gemini-client',
    } = options

    const retryConfig: RetryConfig = { ...DEFAULT_RETRY, ...retryOverride }
    const apiKeys = getApiKeys()

    if (apiKeys.length === 0) {
        throw new Error('GEMINI_API_KEY is not configured')
    }

    let lastError: Error | null = null

    // キーごとにリトライ
    for (let keyIdx = 0; keyIdx < apiKeys.length; keyIdx++) {
        const genAI = new GoogleGenerativeAI(apiKeys[keyIdx])
        const keyLabel = apiKeys.length > 1 ? ` (key ${keyIdx + 1}/${apiKeys.length})` : ''

        for (let attempt = 0; attempt < retryConfig.maxRetries; attempt++) {
            try {
                const geminiModel = genAI.getGenerativeModel({ model: modelName })
                const result = await geminiModel.generateContent(prompt)
                return result.response.text()
            } catch (error: any) {
                lastError = error
                const retriable = isRetryableError(error)
                console.error(
                    `[${logTag}] Gemini attempt ${attempt + 1}/${retryConfig.maxRetries}${keyLabel} failed` +
                    ` (retryable: ${retriable}):`,
                    error?.message || error
                )

                // リトライ不可能なエラー → 即座に失敗
                if (!retriable) {
                    throw error
                }

                // このキーが枯渇 → 次のキーへ
                if (isKeyExhaustedError(error) && keyIdx < apiKeys.length - 1) {
                    console.warn(`[${logTag}] Key ${keyIdx + 1} exhausted, switching to key ${keyIdx + 2}`)
                    break
                }

                // 最後のリトライなら待たない
                if (attempt >= retryConfig.maxRetries - 1) break

                // 指数バックオフ
                const waitMs = Math.min(
                    retryConfig.baseDelayMs * Math.pow(2, attempt),
                    retryConfig.maxDelayMs
                )
                console.warn(`[${logTag}] Retrying in ${waitMs}ms...`)
                await new Promise(resolve => setTimeout(resolve, waitMs))
            }
        }
    }

    throw lastError || new Error('Gemini API failed after all retries')
}

/**
 * 画像付きでGemini APIを呼び出す（リトライ+マルチキーフォールバック）
 */
export async function generateWithImages(
    prompt: string,
    images: { data: string; mimeType: string }[],
    options: GenerateOptions = {}
): Promise<string> {
    const {
        model: modelName = 'gemini-2.5-flash-lite',
        retry: retryOverride = {},
        logTag = 'gemini-client',
    } = options

    const retryConfig: RetryConfig = { ...DEFAULT_RETRY, ...retryOverride }
    const apiKeys = getApiKeys()

    if (apiKeys.length === 0) {
        throw new Error('GEMINI_API_KEY is not configured')
    }

    const imageParts: Part[] = images.map(img => ({
        inlineData: { data: img.data, mimeType: img.mimeType },
    }))

    let lastError: Error | null = null

    for (let keyIdx = 0; keyIdx < apiKeys.length; keyIdx++) {
        const genAI = new GoogleGenerativeAI(apiKeys[keyIdx])
        const keyLabel = apiKeys.length > 1 ? ` (key ${keyIdx + 1}/${apiKeys.length})` : ''

        for (let attempt = 0; attempt < retryConfig.maxRetries; attempt++) {
            try {
                const geminiModel = genAI.getGenerativeModel({ model: modelName })
                const result = await geminiModel.generateContent([prompt, ...imageParts])
                return result.response.text()
            } catch (error: any) {
                lastError = error
                const retriable = isRetryableError(error)
                console.error(
                    `[${logTag}] Gemini attempt ${attempt + 1}/${retryConfig.maxRetries}${keyLabel} failed` +
                    ` (retryable: ${retriable}):`,
                    error?.message || error
                )

                if (!retriable) throw error

                if (isKeyExhaustedError(error) && keyIdx < apiKeys.length - 1) {
                    console.warn(`[${logTag}] Key ${keyIdx + 1} exhausted, switching to key ${keyIdx + 2}`)
                    break
                }

                if (attempt >= retryConfig.maxRetries - 1) break

                const waitMs = Math.min(
                    retryConfig.baseDelayMs * Math.pow(2, attempt),
                    retryConfig.maxDelayMs
                )
                console.warn(`[${logTag}] Retrying in ${waitMs}ms...`)
                await new Promise(resolve => setTimeout(resolve, waitMs))
            }
        }
    }

    throw lastError || new Error('Gemini API failed after all retries')
}

// ─── JSONレスポンス抽出 ────────────────────────────────
/**
 * Geminiのテキスト応答からJSONを抽出してパースする
 */
export function extractJSON<T>(text: string): T {
    // マークダウンコードブロックからJSON抽出
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (codeBlockMatch) {
        return JSON.parse(codeBlockMatch[1]) as T
    }

    // 生のJSONオブジェクト抽出
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as T
    }

    throw new Error('Failed to extract JSON from Gemini response')
}
