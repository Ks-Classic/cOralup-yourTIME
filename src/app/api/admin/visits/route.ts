import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getStaffSession } from '@/lib/staff-auth'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET: 管理者向け履歴取得
 * Query params:
 *   - staffId?: 特定スタッフのID（指定しない場合は全スタッフ）
 *   - status?: ステータスフィルタ（diagnosis_completed, report_sent等）
 *   - limit?: 取得件数（デフォルト: 50）
 *   - offset?: オフセット（デフォルト: 0）
 */
export async function GET(request: NextRequest) {
  try {
    // 管理者認証（暫定: ADMIN_API_KEY、将来: role='admin'のセッション）
    const session = await getStaffSession()
    const adminApiKey = process.env.ADMIN_API_KEY
    const authHeader = request.headers.get('authorization') || ''
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    const headerKey = request.headers.get('x-admin-key')

    // 管理者チェック（暫定対応）
    const isAdmin =
      (session && (session.role === 'admin' || session.role === 'staff')) ||
      (adminApiKey && (bearer === adminApiKey || headerKey === adminApiKey)) ||
      !adminApiKey // ADMIN_API_KEY未設定時は許可（開発環境）

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const staffId = searchParams.get('staffId')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // クエリ構築
    let query = supabase
      .from('visits')
      .select(
        `
        id,
        visit_date,
        status,
        session_id,
        staff_profile_id,
        child_id,
        children (
          id,
          first_name,
          last_name,
          birthday,
          gender
        ),
        profiles!visits_staff_profile_id_fkey (
          id,
          first_name,
          last_name,
          display_name
        )
      `,
        { count: 'exact' }
      )
      .order('visit_date', { ascending: false })

    // スタッフフィルタ
    if (staffId) {
      query = query.eq('staff_profile_id', staffId)
    }

    // ステータスフィルタ
    if (status) {
      query = query.eq('status', status)
    } else {
      // デフォルト: 診断完了または送信済みのみ
      query = query.in('status', ['diagnosis_completed', 'report_sent'])
    }

    // ページネーション
    const { data, error, count } = await query.range(offset, offset + limit - 1)

    if (error) {
      console.error('[Admin Visits API] Error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch visits' },
        { status: 500 }
      )
    }

    // スタッフ一覧も取得（フィルタ用）
    const { data: staffList } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, display_name')
      .or('role.eq.staff,secondary_role.eq.staff,role.eq.admin')
      .order('last_name')

    return NextResponse.json({
      data: data || [],
      total: count || 0,
      limit,
      offset,
      staffList: staffList || [],
    })
  } catch (error) {
    console.error('[Admin Visits API] Error:', error)
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
}


