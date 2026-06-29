import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const ADMIN_AUTH_COOKIE = 'admin_auth_token'
const STAFF_SESSION_COOKIE = 'staff_session'
const MIN_SECRET_LENGTH = 32

const isProd = process.env.NODE_ENV === 'production'

/**
 * 管理画面パスワードから期待Cookie値を生成。未設定ならnull。
 */
function expectedAdminToken(): string | null {
  const pw = process.env.ADMIN_PASSWORD
  if (!pw) return null
  return Buffer.from(pw).toString('base64')
}

/** サーバ間呼び出し用: ADMIN_API_KEY */
function hasValidApiKey(request: NextRequest): boolean {
  const apiKey = process.env.ADMIN_API_KEY
  if (!apiKey) return false
  const authHeader = request.headers.get('authorization') || ''
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  const headerKey = request.headers.get('x-admin-key')
  return bearer === apiKey || headerKey === apiKey
}

/** 管理画面ログイン(ADMIN_PASSWORD)のCookie */
function hasValidAdminCookie(request: NextRequest): boolean {
  const expected = expectedAdminToken()
  if (!expected) return false
  return request.cookies.get(ADMIN_AUTH_COOKIE)?.value === expected
}

/** スタッフセッション(staff_session JWT)。edge上でjose検証。 */
async function hasValidStaffSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(STAFF_SESSION_COOKIE)?.value
  if (!token) return false
  const secret = process.env.STAFF_SESSION_SECRET
  if (!secret || secret.length < MIN_SECRET_LENGTH) return false
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret))
    // C-1: role の存在だけでなく値を検証。任意のスタッフJWT(role:'staff')で
    // admin API に昇格できる穴を塞ぐ。admin権限のセッションのみ許可。
    return typeof payload.staffId === 'string' && payload.role === 'admin'
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // --- /api/admin/* : APIゲート(fail-closed) ---
  // 当初schemas等の各ルートが個別に(かつfail-openで)認証していた穴を、
  // ここ一箇所に集約する。許可条件: admin Cookie / スタッフセッション / API鍵。
  if (pathname.startsWith('/api/admin')) {
    // ログインエンドポイントはCookie発行のため公開
    // H-2: startsWith だと将来の /api/admin/authorize 等を巻き込み認証を素通り
    // させてしまう。完全一致＋末尾スラッシュ配下に限定する。
    if (
      pathname === '/api/admin/auth' ||
      pathname.startsWith('/api/admin/auth/')
    ) {
      return NextResponse.next()
    }

    const adminPasswordSet = !!process.env.ADMIN_PASSWORD
    const apiKeySet = !!process.env.ADMIN_API_KEY

    // シークレットが一つも無い場合:
    //  - 本番: 致命的な設定ミス。全拒否(fail-closed)。
    //  - 開発: 従来どおり許可。
    if (!adminPasswordSet && !apiKeySet) {
      if (isProd) {
        return NextResponse.json(
          { error: 'admin auth not configured' },
          { status: 503 }
        )
      }
      return NextResponse.next()
    }

    if (
      hasValidApiKey(request) ||
      hasValidAdminCookie(request) ||
      (await hasValidStaffSession(request))
    ) {
      return NextResponse.next()
    }
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // --- /admin/* ページ : 既存のCookieゲート(fail-closed化) ---
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const adminPassword = process.env.ADMIN_PASSWORD

    if (!adminPassword) {
      // 本番でパスワード未設定 → ログインへ(fail-closed)。開発のみ素通り。
      if (isProd) {
        return NextResponse.redirect(new URL('/admin-login', request.url))
      }
      return NextResponse.next()
    }

    const token = request.cookies.get(ADMIN_AUTH_COOKIE)?.value
    const expectedToken = Buffer.from(adminPassword).toString('base64')

    if (token !== expectedToken) {
      return NextResponse.redirect(new URL('/admin-login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
