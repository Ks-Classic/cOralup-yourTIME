import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { profiles } from '@/db/schema'
import { eq, or, and } from 'drizzle-orm'
import {
  createStaffSessionToken,
  setStaffSessionCookie,
  clearStaffSessionCookie,
} from '@/lib/staff-auth'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/**
 * POST: LIFFからのセッション発行
 * Body: { lineUserId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { lineUserId } = await request.json()

    if (!lineUserId) {
      return NextResponse.json(
        { error: 'lineUserId is required' },
        { status: 400 }
      )
    }

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
      logger.warn('Staff not found in DB', { lineUserId })
      return NextResponse.json(
        { error: 'not_registered' },
        { status: 404 }
      )
    }

    if (staff.isActive === false) {
      logger.warn('Staff account is inactive', { lineUserId, staffId: staff.id })
      return NextResponse.json(
        { error: 'account_inactive' },
        { status: 403 }
      )
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
      .set({ lastActivityAt: new Date() } as Partial<typeof profiles.$inferInsert>)
      .where(eq(profiles.id, staff.id))

    logger.info('Staff session created', {
      staffId: staff.id,
      staffName,
      role: staff.role
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
    logger.error('Error creating staff session', { path: '/api/auth/staff-session' }, error)
    return NextResponse.json(
      { error: 'internal_error' },
      { status: 500 }
    )
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
    logger.error('Error during logout', { path: '/api/auth/staff-session' }, error)
    return NextResponse.json(
      { error: 'logout_failed' },
      { status: 500 }
    )
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

    // トークン検証
    const { jwtVerify } = await import('jose')
    const secret = new TextEncoder().encode(
      process.env.STAFF_SESSION_SECRET || 'default-secret-change-in-production'
    )

    try {
      const { payload } = await jwtVerify(token, secret)
      return NextResponse.json({
        authenticated: true,
        staff: {
          id: payload.staffId,
          name: payload.staffName,
          role: payload.role,
        },
      })
    } catch {
      return NextResponse.json(
        { authenticated: false, error: 'invalid_token' },
        { status: 401 }
      )
    }
  } catch (error) {
    logger.error('Error verifying session', { path: '/api/auth/staff-session' }, error)
    return NextResponse.json(
      { error: 'internal_error' },
      { status: 500 }
    )
  }
}

/**
 * PUT: トークンからCookieをセット（LIFF→外部ブラウザ引き継ぎ用）
 * Body: { token: string }
 */
export async function PUT(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        { error: 'token is required' },
        { status: 400 }
      )
    }

    // トークン検証
    const { jwtVerify } = await import('jose')
    const secret = new TextEncoder().encode(
      process.env.STAFF_SESSION_SECRET || 'default-secret-change-in-production'
    )

    try {
      await jwtVerify(token, secret)

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
    } catch {
      return NextResponse.json(
        { error: 'invalid_token' },
        { status: 401 }
      )
    }
  } catch (error) {
    logger.error('Error transferring session (PUT)', { path: '/api/auth/staff-session' }, error)
    return NextResponse.json(
      { error: 'internal_error' },
      { status: 500 }
    )
  }
}
