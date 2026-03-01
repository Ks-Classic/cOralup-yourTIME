/**
 * Gemini API ラッパー（後方互換レイヤー）
 * 
 * 既存コードが import { analyzeWithRetry, extractJSON } from '@/lib/gemini' で
 * 参照しているため、シグネチャを維持しつつ内部を gemini-client.ts に委譲する。
 */

import {
  generateText,
  generateWithImages,
  extractJSON as extractJSONFromClient,
  isGeminiAvailable,
} from '@/lib/gemini-client'

// ─── 後方互換エクスポート ──────────────────────────────

/** モックモード判定（後方互換） */
export const isGeminiMockMode = !isGeminiAvailable()

/**
 * テキストのみの分析を実行（後方互換）
 */
export async function analyzeWithText(prompt: string): Promise<string> {
  if (!isGeminiAvailable()) {
    console.warn('[Gemini] Mock mode: returning default response')
    return JSON.stringify({
      summary: 'B',
      findings: [{ category: 'テスト', observation: 'モックモードです', severity: 'normal' }],
      recommendations: ['実際のAPIキーを設定してください'],
      parentComment: 'これはテスト用のモックレスポンスです。'
    })
  }

  return generateText(prompt, {
    model: process.env.GOOGLE_GEMINI_MODEL || 'gemini-2.5-pro-preview-05-06',
    logTag: 'gemini-compat',
  })
}

/**
 * 画像付きの分析を実行（後方互換）
 */
export async function analyzeWithImages(
  prompt: string,
  images: { data: string; mimeType: string }[]
): Promise<string> {
  if (!isGeminiAvailable()) {
    console.warn('[Gemini] Mock mode: returning default response')
    return JSON.stringify({
      summary: 'B',
      findings: [{ category: 'テスト', observation: 'モックモードです', severity: 'normal' }],
      recommendations: ['実際のAPIキーを設定してください'],
      parentComment: 'これはテスト用のモックレスポンスです。'
    })
  }

  return generateWithImages(prompt, images, {
    model: process.env.GOOGLE_GEMINI_MODEL || 'gemini-2.5-pro-preview-05-06',
    logTag: 'gemini-compat',
  })
}

/**
 * リトライ付きでGemini分析を実行（後方互換）
 */
export async function analyzeWithRetry(
  prompt: string,
  images?: { data: string; mimeType: string }[],
  maxRetries = 3
): Promise<string> {
  if (!isGeminiAvailable()) {
    if (images && images.length > 0) {
      return analyzeWithImages(prompt, images)
    }
    return analyzeWithText(prompt)
  }

  const model = process.env.GOOGLE_GEMINI_MODEL || 'gemini-2.5-pro-preview-05-06'

  if (images && images.length > 0) {
    return generateWithImages(prompt, images, {
      model,
      retry: { maxRetries },
      logTag: 'gemini-compat',
    })
  }

  return generateText(prompt, {
    model,
    retry: { maxRetries },
    logTag: 'gemini-compat',
  })
}

/**
 * JSONレスポンスを抽出してパース（後方互換）
 */
export function extractJSON<T>(text: string): T {
  return extractJSONFromClient<T>(text)
}

/**
 * Geminiモデルを取得（後方互換 — 非推奨、generateText推奨）
 * @deprecated Use generateText() or generateWithImages() instead
 */
export function getGeminiModel(): null {
  console.warn('[gemini] getGeminiModel() is deprecated. Use generateText() from gemini-client.ts')
  return null
}
