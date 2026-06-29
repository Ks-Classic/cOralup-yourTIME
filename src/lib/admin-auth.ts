import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const ADMIN_AUTH_COOKIE = 'admin_auth_token'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD

/**
 * 管理画面認証を検証
 * @returns 認証済みならtrue
 */
export async function verifyAdminAuth(): Promise<boolean> {
  if (!ADMIN_PASSWORD) {
    // パスワード未設定: 本番はfail-closed(拒否)、開発のみ許可。
    if (process.env.NODE_ENV === 'production') {
      console.error(
        '[Admin Auth] ADMIN_PASSWORD not set in production — denying access'
      )
      return false
    }
    console.warn(
      '[Admin Auth] ADMIN_PASSWORD not set, allowing access (dev only)'
    )
    return true
  }

  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_AUTH_COOKIE)?.value

  if (!token) {
    return false
  }

  // トークンの検証（単純なハッシュ比較）
  const expectedToken = Buffer.from(ADMIN_PASSWORD).toString('base64')
  return token === expectedToken
}

/**
 * 管理画面認証トークンを設定
 */
export async function setAdminAuthCookie(): Promise<void> {
  if (!ADMIN_PASSWORD) return

  const cookieStore = await cookies()
  const token = Buffer.from(ADMIN_PASSWORD).toString('base64')

  cookieStore.set(ADMIN_AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7日間
    // path: '/' でないと /api/admin/* へのfetchにCookieが付かず、
    // APIゲート(middleware)でadmin Cookie判定ができない。
    path: '/',
  })
}

/**
 * 管理画面認証トークンを削除
 */
export async function clearAdminAuthCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete({ name: ADMIN_AUTH_COOKIE, path: '/' })
}
