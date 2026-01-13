import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { visits, children } from '@/db/schema'
import { eq, like } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

/**
 * GET: PAPER-セッションのvisitリストを取得
 * 紙問診票リカバリー用（認証不要の管理者画面内API）
 */
export async function GET(request: NextRequest) {
    try {
        // PAPER-で始まるセッションのみ取得
        const paperVisits = await db
            .select({
                id: visits.id,
                sessionId: visits.sessionId,
                status: visits.status,
                visitDate: visits.visitDate,
                childId: visits.childId,
            })
            .from(visits)
            .where(like(visits.sessionId, 'PAPER-%'))

        // childrenの情報を取得
        const result = await Promise.all(
            paperVisits.map(async (visit) => {
                let childData = null
                if (visit.childId) {
                    const childRows = await db
                        .select({
                            id: children.id,
                            firstName: children.firstName,
                            lastName: children.lastName,
                            birthday: children.birthday,
                        })
                        .from(children)
                        .where(eq(children.id, visit.childId))
                        .limit(1)

                    if (childRows.length > 0) {
                        childData = childRows[0]
                    }
                }

                return {
                    id: visit.id,
                    sessionId: visit.sessionId,
                    status: visit.status,
                    visitDate: visit.visitDate,
                    child: childData,
                }
            })
        )

        return NextResponse.json({
            success: true,
            data: result,
            total: result.length,
        })

    } catch (error) {
        console.error('PAPER-セッション取得エラー:', error)
        return NextResponse.json(
            { success: false, error: 'データの取得に失敗しました' },
            { status: 500 }
        )
    }
}
