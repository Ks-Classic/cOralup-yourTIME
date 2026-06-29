import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { profiles } from '@/db/schema'
import { eq, or, and } from 'drizzle-orm'
import {
  createStaffSessionToken,
  setStaffSessionCookie,
  clearStaffSessionCookie,
  verifyStaffSessionToken,
} from '@/lib/staff-auth'
import { verifyLineIdToken } from '@/lib/line-id-token'
import { logger } from '@/lib/logger'
import { createHash } from 'crypto'

export const dynamic = 'force-dynamic'

// CR-W: ログのPII(lineUserId)はSHA256先頭12桁でハッシュ化して記録する
function hashId(id: string): string {
  return createHash('sha256').update(id).digest('hex').slice(0, 12)
}

/**
 * POST: LIFFからのセッション発行
 * Body: { idToken: string }  // liff.getIDToken() の検証済みIDトークン
 *
 * セキュリティ: 宛先lineUserIdは body から受け取らず、LINEで検証済みの
 * IDトークンの sub だけを採用する（なりすまし防止）。
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'idToken is required' }, { status: 400 })
    }
    const { idToken } = body as { idToken?: unknown }

    if (typeof idToken !== 'string' || idToken.length === 0) {
      return NextResponse.json(
        { error: 'idToken is required' },
        { status: 400 }
      )
    }

    // LINE公式 verify でIDトークンを検証し、検証済みの lineUserId(sub) を取得
    const identity = await verifyLineIdToken(idToken)
    if (!identity) {
      logger.warn('Invalid LINE ID token on staff session', {
        path: '/api/auth/staff-session',
      })
      return NextResponse.json({ error: 'invalid_id_token' }, { status: 401 })
    }

    const lineUserId = identity.lineUserId

    // DBでスタッフ確認（role='staff' または secondary_role='staff'）
    const staffRows = await db
      .select()
      .from(profiles)
      .where(
        and(
          eq(profiles.lineUserId, lineUserId),
          or(eq(profiles.role, 'staff'), eq(profiles.secondaryRole, 'staff'))
        )
      )
      .limit(1)

    const staff = staffRows[0]

    if (!staff) {
      logger.warn('Staff not found in DB', { lineUserIdHash: hashId(lineUserId) })
      return NextResponse.json({ error: 'not_registered' }, { status: 404 })
    }

    if (staff.isActive === false) {
      logger.warn('Staff account is inactive', {
        lineUserIdHash: hashId(lineUserId),
        staffId: staff.id,
      })
      return NextResponse.json({ error: 'account_inactive' }, { status: 403 })
    }

    // スタッフ名を決定
    const staffName =
      staff.displayName ||
      `${staff.lastName || ''}${staff.firstName || ''}`.trim() ||
      'スタッフ'

    // セッショントークン生成
    const token = await createStaffSessionToken({
      staffId: staff.id,
      staffName,
      role: (staff.role as string) || 'staff',
      lineUserId,
    })

    // Cookie設定
    await setStaffSessionCookie(token)

    // 最終活動日時を更新
    await db
      .update(profiles)
      .set({ lastActivityAt: new Date() } as Partial<
        typeof profiles.$inferInsert
      >)
      .where(eq(profiles.id, staff.id))

    logger.info('Staff session created', {
      staffId: staff.id,
      staffName,
      role: staff.role,
    })

    return NextResponse.json({
      success: true,
      staff: {
        id: staff.id,
        name: staffName,
        avatarUrl: staff.avatarUrl,
      },
      // 外部ブラウザ用にトークンも返す
      token,
    })
  } catch (error) {
    logger.error(
      'Error creating staff session',
      { path: '/api/auth/staff-session' },
      error
    )
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

/**
 * DELETE: ログアウト
 */
export async function DELETE() {
  try {
    await clearStaffSessionCookie()
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error(
      'Error during logout',
      { path: '/api/auth/staff-session' },
      error
    )
    return NextResponse.json({ error: 'logout_failed' }, { status: 500 })
  }
}

/**
 * GET: セッション確認
 */
export async function GET(request: NextRequest) {
  try {
    // Cookieからトークンを取得
    const token = request.cookies.get('staff_session')?.value

    if (!token) {
      return NextResponse.json(
        { authenticated: false, error: 'no_session' },
        { status: 401 }
      )
    }

    // トークン検証（鍵はstaff-authに一元化＝デフォルト鍵フォールバックなし）
    const session = await verifyStaffSessionToken(token)
    if (!session) {
      return NextResponse.json(
        { authenticated: false, error: 'invalid_token' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      authenticated: true,
      staff: {
        id: session.staffId,
        name: session.staffName,
        role: session.role,
      },
    })
  } catch (error) {
    logger.error(
      'Error verifying session',
      { path: '/api/auth/staff-session' },
      error
    )
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

/**
 * PUT: トークンからCookieをセット（LIFF→外部ブラウザ引き継ぎ用）
 * Body: { token: string }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'token is required' }, { status: 400 })
    }
    const { token } = body as { token?: unknown }

    if (typeof token !== 'string' || token.length === 0) {
      return NextResponse.json({ error: 'token is required' }, { status: 400 })
    }

    // トークン検証（鍵はstaff-authに一元化＝デフォルト鍵フォールバックなし）
    const session = await verifyStaffSessionToken(token)
    if (!session) {
      return NextResponse.json({ error: 'invalid_token' }, { status: 401 })
    }

    // Cookieをセット（レスポンスヘッダーで設定）
    const response = NextResponse.json({ success: true })
    response.cookies.set('staff_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7日
      path: '/',
    })

    return response
  } catch (error) {
    logger.error(
      'Error transferring session (PUT)',
      { path: '/api/auth/staff-session' },
      error
    )
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
