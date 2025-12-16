import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  createStaffSessionToken,
  setStaffSessionCookie,
  clearStaffSessionCookie,
} from '@/lib/staff-auth'

// Supabase クライアント (Service Role)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
    const { data: staff, error } = await supabase
      .from('profiles')
      .select('id, display_name, first_name, last_name, avatar_url, role, secondary_role, is_active')
      .eq('line_user_id', lineUserId)
      .or('role.eq.staff,secondary_role.eq.staff')
      .single()

    if (error || !staff) {
      console.log('[Staff Session] Staff not found:', lineUserId)
      return NextResponse.json(
        { error: 'not_registered' },
        { status: 404 }
      )
    }

    if (staff.is_active === false) {
      console.log('[Staff Session] Staff inactive:', lineUserId)
      return NextResponse.json(
        { error: 'account_inactive' },
        { status: 403 }
      )
    }

    // スタッフ名を決定
    const staffName =
      staff.display_name ||
      `${staff.last_name || ''}${staff.first_name || ''}`.trim() ||
      'スタッフ'

    // セッショントークン生成
    const token = await createStaffSessionToken({
      staffId: staff.id,
      staffName,
      role: staff.role,
      lineUserId,
    })

    // Cookie設定
    await setStaffSessionCookie(token)

    // 最終活動日時を更新
    await supabase
      .from('profiles')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', staff.id)

    console.log('[Staff Session] Session created for:', staffName)

    return NextResponse.json({
      success: true,
      staff: {
        id: staff.id,
        name: staffName,
        avatarUrl: staff.avatar_url,
      },
      // 外部ブラウザ用にトークンも返す
      token,
    })
  } catch (error) {
    console.error('[Staff Session] Error:', error)
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
    console.error('[Staff Session] Logout error:', error)
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
    console.error('[Staff Session] GET error:', error)
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
    console.error('[Staff Session] PUT error:', error)
    return NextResponse.json(
      { error: 'internal_error' },
      { status: 500 }
    )
  }
}

