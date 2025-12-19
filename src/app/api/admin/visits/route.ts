import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { visits, children, profiles } from '@/db/schema'
import { eq, or, inArray, desc } from 'drizzle-orm'
import { getStaffSession } from '@/lib/staff-auth'

export const dynamic = 'force-dynamic'

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

    // 基本クエリ構築
    let visitRows = await db
      .select({
        id: visits.id,
        visitDate: visits.visitDate,
        status: visits.status,
        sessionId: visits.sessionId,
        staffProfileId: visits.staffProfileId,
        childId: visits.childId,
      })
      .from(visits)
      .where(
        status
          ? eq(visits.status, status)
          : inArray(visits.status, ['diagnosis_completed', 'report_sent'])
      )
      .orderBy(desc(visits.visitDate))
      .limit(limit)
      .offset(offset)

    // スタッフフィルタ
    if (staffId) {
      visitRows = visitRows.filter(v => v.staffProfileId === staffId)
    }

    // 各visitのchildrenとprofilesを取得
    const data = await Promise.all(
      visitRows.map(async (v) => {
        let childData = null
        if (v.childId) {
          const childRows = await db
            .select({
              id: children.id,
              firstName: children.firstName,
              lastName: children.lastName,
              birthday: children.birthday,
              gender: children.gender,
            })
            .from(children)
            .where(eq(children.id, v.childId))
            .limit(1)
          childData = childRows[0] || null
        }

        let staffData = null
        if (v.staffProfileId) {
          const staffRows = await db
            .select({
              id: profiles.id,
              firstName: profiles.firstName,
              lastName: profiles.lastName,
              displayName: profiles.displayName,
            })
            .from(profiles)
            .where(eq(profiles.id, v.staffProfileId))
            .limit(1)
          staffData = staffRows[0] || null
        }

        return {
          id: v.id,
          visit_date: v.visitDate,
          status: v.status,
          session_id: v.sessionId,
          staff_profile_id: v.staffProfileId,
          child_id: v.childId,
          children: childData ? {
            id: childData.id,
            first_name: childData.firstName,
            last_name: childData.lastName,
            birthday: childData.birthday,
            gender: childData.gender,
          } : null,
          profiles: staffData ? {
            id: staffData.id,
            first_name: staffData.firstName,
            last_name: staffData.lastName,
            display_name: staffData.displayName,
          } : null,
        }
      })
    )

    // 総数を取得
    const countRows = await db
      .select({ id: visits.id })
      .from(visits)
      .where(
        status
          ? eq(visits.status, status)
          : inArray(visits.status, ['diagnosis_completed', 'report_sent'])
      )

    // スタッフ一覧も取得（フィルタ用）
    const staffRows = await db
      .select({
        id: profiles.id,
        firstName: profiles.firstName,
        lastName: profiles.lastName,
        displayName: profiles.displayName,
      })
      .from(profiles)
      .where(
        or(eq(profiles.role, 'staff'), eq(profiles.secondaryRole, 'staff'), eq(profiles.role, 'admin'))
      )
      .orderBy(profiles.lastName)

    const staffList = staffRows.map(s => ({
      id: s.id,
      first_name: s.firstName,
      last_name: s.lastName,
      display_name: s.displayName,
    }))

    return NextResponse.json({
      data,
      total: countRows.length,
      limit,
      offset,
      staffList,
    })
  } catch (error) {
    console.error('[Admin Visits API] Error:', error)
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
}
