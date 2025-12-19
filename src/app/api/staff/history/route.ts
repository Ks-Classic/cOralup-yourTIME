import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { visits, children } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { getStaffSession } from '@/lib/staff-auth'

export const dynamic = 'force-dynamic'

/**
 * GET: スタッフの対応履歴を取得
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getStaffSession()

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get visits for this staff
    const visitRows = await db
      .select({
        id: visits.id,
        visitDate: visits.visitDate,
        status: visits.status,
        sessionId: visits.sessionId,
        receptionNumber: visits.receptionNumber,
        childId: visits.childId,
      })
      .from(visits)
      .where(eq(visits.staffProfileId, session.staffId))
      .orderBy(desc(visits.visitDate))
      .limit(limit)
      .offset(offset)

    // Get children for each visit
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
            })
            .from(children)
            .where(eq(children.id, v.childId))
            .limit(1)
          childData = childRows[0] || null
        }
        return {
          id: v.id,
          visit_date: v.visitDate,
          status: v.status,
          session_id: v.sessionId,
          reception_number: v.receptionNumber,
          children: childData ? {
            id: childData.id,
            first_name: childData.firstName,
            last_name: childData.lastName,
            birthday: childData.birthday,
          } : null,
        }
      })
    )

    // Get total count
    const countRows = await db
      .select({ id: visits.id })
      .from(visits)
      .where(eq(visits.staffProfileId, session.staffId))

    return NextResponse.json({
      data,
      total: countRows.length,
      limit,
      offset,
    })
  } catch (error) {
    console.error('[Staff History API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch history' },
      { status: 500 }
    )
  }
}
