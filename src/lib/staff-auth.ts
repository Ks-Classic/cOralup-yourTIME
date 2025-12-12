import { cookies } from 'next/headers'
import { jwtVerify, SignJWT } from 'jose'

const STAFF_SESSION_SECRET = process.env.STAFF_SESSION_SECRET || 'default-secret-change-in-production'
const SESSION_COOKIE_NAME = 'staff_session'
const SESSION_EXPIRY_DAYS = 7

export interface StaffSession {
  staffId: string
  staffName: string
  role: string
  lineUserId?: string
}

/**
 * JWTシークレットをエンコード
 */
function getSecret() {
  return new TextEncoder().encode(STAFF_SESSION_SECRET)
}

/**
 * スタッフセッションを取得（nullの場合は未認証）
 */
export async function getStaffSession(): Promise<StaffSession | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

    if (!token) {
      return null
    }

    const { payload } = await jwtVerify(token, getSecret())

    return {
      staffId: payload.staffId as string,
      staffName: payload.staffName as string,
      role: payload.role as string,
      lineUserId: payload.lineUserId as string | undefined,
    }
  } catch (error) {
    // トークンが無効または期限切れ
    console.error('[Staff Auth] Session verification failed:', error)
    return null
  }
}

/**
 * スタッフセッションを必須で取得（未認証の場合はエラー）
 */
export async function requireStaffSession(): Promise<StaffSession> {
  const session = await getStaffSession()
  if (!session) {
    throw new Error('Unauthorized: Staff session required')
  }
  return session
}

/**
 * スタッフセッショントークンを生成
 */
export async function createStaffSessionToken(payload: {
  staffId: string
  staffName: string
  role: string
  lineUserId?: string
}): Promise<string> {
  const token = await new SignJWT({
    staffId: payload.staffId,
    staffName: payload.staffName,
    role: payload.role,
    lineUserId: payload.lineUserId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_EXPIRY_DAYS}d`)
    .sign(getSecret())

  return token
}

/**
 * スタッフセッションCookieを設定
 */
export async function setStaffSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60,
    path: '/',
  })
}

/**
 * スタッフセッションCookieを削除（ログアウト）
 */
export async function clearStaffSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}

/**
 * セッションが有効かどうかを確認
 */
export async function isStaffAuthenticated(): Promise<boolean> {
  const session = await getStaffSession()
  return session !== null
}





