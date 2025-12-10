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

    // DBでスタッフ確認
    const { data: staff, error } = await supabase
      .from('profiles')
      .select('id, display_name, first_name, last_name, avatar_url, role, is_active')
      .eq('line_user_id', lineUserId)
      .eq('role', 'staff')
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
export async function GET() {
  try {
    // 注意: この関数はAPI Routeなので、cookiesを直接使えない
    // クライアントサイドからのセッション確認用
    return NextResponse.json({
      message: 'Use client-side session check or server component',
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'internal_error' },
      { status: 500 }
    )
  }
}


