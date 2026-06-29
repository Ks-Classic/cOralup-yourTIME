import { cookies } from 'next/headers'
import { jwtVerify, SignJWT } from 'jose'

const SESSION_COOKIE_NAME = 'staff_session'
const SESSION_EXPIRY_DAYS = 7
const MIN_SECRET_LENGTH = 32

export interface StaffSession {
  staffId: string
  staffName: string
  role: string
  lineUserId?: string
}

/**
 * JWTシークレットをエンコード。
 * CR-S: ハードコードのフォールバックは持たない。未設定/脆弱なら fail-closed で例外。
 * （デフォルト鍵で署名すると任意lineUserIdのJWT偽造→デモ/チャット送信のなりすましが可能になるため）
 */
function getSecret(): Uint8Array {
  const secret = process.env.STAFF_SESSION_SECRET
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `STAFF_SESSION_SECRET is not set or too short (>= ${MIN_SECRET_LENGTH} chars required)`
    )
  }
  return new TextEncoder().encode(secret)
}

/**
 * セッショントークンを検証して StaffSession を返す（無効なら null）。
 * Cookie/外部ブラウザ引き継ぎ等、トークン文字列を直接持つ経路で共用する。
 */
export async function verifyStaffSessionToken(
  token: string
): Promise<StaffSession | null> {
  // 鍵未設定(設定ミス)は「無効トークン」と区別したいので try の外で評価し、
  // getSecret() の例外は呼び出し元へ伝播させる(fail-closed・5xx相当)。
  const secret = getSecret()
  try {
    const { payload } = await jwtVerify(token, secret)
    // jwtVerifyは署名/期限のみ検証。クレームの型はここで実行時に確定する。
    if (
      typeof payload.staffId !== 'string' ||
      typeof payload.staffName !== 'string' ||
      typeof payload.role !== 'string'
    ) {
      return null
    }
    return {
      staffId: payload.staffId,
      staffName: payload.staffName,
      role: payload.role,
      lineUserId:
        typeof payload.lineUserId === 'string' ? payload.lineUserId : undefined,
    }
  } catch (error) {
    // 署名不正・期限切れ等の「無効トークン」のみ null
    console.error('[Staff Auth] Token verification failed:', error)
    return null
  }
}

/**
 * スタッフセッションを取得（nullの場合は未認証）
 */
export async function getStaffSession(): Promise<StaffSession | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (!token) {
    return null
  }

  // 無効トークンは verifyStaffSessionToken が null を返す。
  // 鍵未設定(設定ミス)は例外として伝播 → 呼び出し元で5xx相当(401と区別)。
  return await verifyStaffSessionToken(token)
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
