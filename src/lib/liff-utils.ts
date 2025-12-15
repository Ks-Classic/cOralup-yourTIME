/**
 * LIFF (LINE Front-end Framework) ユーティリティ
 */

import type { Liff } from '@line/liff'

let liffInstance: Liff | null = null
let liffModulePromise: Promise<typeof import('@line/liff')> | null = null

/**
 * LIFF SDKをプリロード（初期化前に呼び出し可能）
 * 動的インポートを事前に開始して初期化を高速化
 */
export function preloadLiffSdk(): void {
  if (typeof window === 'undefined') return
  if (!liffModulePromise) {
    liffModulePromise = import('@line/liff')
  }
}

export interface LiffProfile {
  userId: string
  displayName: string
  pictureUrl?: string
  statusMessage?: string
}

export interface LiffInitResult {
  success: boolean
  isInClient: boolean
  isLoggedIn: boolean
  profile?: LiffProfile
  error?: string
}

/**
 * LIFFを初期化
 * @param liffId LIFF ID
 * @returns 初期化結果
 */
export async function initLiff(liffId: string): Promise<LiffInitResult> {
  try {
    // 動的インポート（プリロード済みなら即座に解決）
    if (!liffModulePromise) {
      liffModulePromise = import('@line/liff')
    }
    const liff = (await liffModulePromise).default
    liffInstance = liff

    await liff.init({ liffId })

    const isInClient = liff.isInClient()
    const isLoggedIn = liff.isLoggedIn()

    // LINEアプリ外で開かれた場合
    if (!isInClient) {
      return {
        success: true,
        isInClient: false,
        isLoggedIn: false,
        error: 'not_in_line_app',
      }
    }

    // ログインしていない場合
    if (!isLoggedIn) {
      return {
        success: true,
        isInClient: true,
        isLoggedIn: false,
      }
    }

    // プロフィール取得
    const profile = await liff.getProfile()

    return {
      success: true,
      isInClient: true,
      isLoggedIn: true,
      profile: {
        userId: profile.userId,
        displayName: profile.displayName,
        pictureUrl: profile.pictureUrl,
        statusMessage: profile.statusMessage,
      },
    }
  } catch (error) {
    console.error('[LIFF] Init error:', error)
    return {
      success: false,
      isInClient: false,
      isLoggedIn: false,
      error: error instanceof Error ? error.message : 'unknown_error',
    }
  }
}

/**
 * LIFFログインを実行
 * @param redirectUri リダイレクト先URL
 */
export function liffLogin(redirectUri?: string): void {
  if (!liffInstance) {
    console.error('[LIFF] Not initialized')
    return
  }

  liffInstance.login({ redirectUri: redirectUri || window.location.href })
}

/**
 * LIFFログアウトを実行
 */
export function liffLogout(): void {
  if (!liffInstance) {
    console.error('[LIFF] Not initialized')
    return
  }

  liffInstance.logout()
}

/**
 * LIFFウィンドウを閉じる
 */
export function closeLiff(): void {
  if (!liffInstance) {
    console.error('[LIFF] Not initialized')
    return
  }

  liffInstance.closeWindow()
}

/**
 * LIFFインスタンスを取得
 */
export function getLiff(): Liff | null {
  return liffInstance
}

/**
 * LINEアプリ内で実行中かどうか
 */
export function isInLineApp(): boolean {
  if (!liffInstance) return false
  return liffInstance.isInClient()
}

/**
 * ログイン済みかどうか
 */
export function isLiffLoggedIn(): boolean {
  if (!liffInstance) return false
  return liffInstance.isLoggedIn()
}





