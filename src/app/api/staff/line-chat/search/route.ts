import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { profiles, children } from '@/db/schema'
import { or, ilike, eq, isNotNull, sql } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

/**
 * GET /api/staff/line-chat/search?q=検索キーワード
 * LINE登録済みユーザーを検索（表示名、姓名、かな、子ども名で検索）
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const query = searchParams.get('q')?.trim()

        if (!query || query.length < 1) {
            return NextResponse.json(
                { error: 'Search query is required (at least 1 character)' },
                { status: 400 }
            )
        }

        const pattern = `%${query}%`

        // LINE User IDを持つプロフィールのみ対象
        const results = await db
            .select({
                id: profiles.id,
                lineUserId: profiles.lineUserId,
                displayName: profiles.displayName,
                lastName: profiles.lastName,
                firstName: profiles.firstName,
                lastNameKana: profiles.lastNameKana,
                firstNameKana: profiles.firstNameKana,
                avatarUrl: profiles.avatarUrl,
                role: profiles.role,
                lastActivityAt: profiles.lastActivityAt,
                childFirstName: children.firstName,
                childLastName: children.lastName,
            })
            .from(profiles)
            .leftJoin(children, eq(children.parentProfileId, profiles.id))
            .where(
                sql`${profiles.lineUserId} IS NOT NULL AND (
                    ${profiles.displayName} ILIKE ${pattern}
                    OR ${profiles.lastName} ILIKE ${pattern}
                    OR ${profiles.firstName} ILIKE ${pattern}
                    OR ${profiles.lastNameKana} ILIKE ${pattern}
                    OR ${profiles.firstNameKana} ILIKE ${pattern}
                    OR ${children.firstName} ILIKE ${pattern}
                    OR ${children.lastName} ILIKE ${pattern}
                )`
            )
            .limit(20)

        // 重複プロフィール排除（childrenとのjoinで重複する場合がある）
        const uniqueMap = new Map<string, any>()
        for (const row of results) {
            if (!uniqueMap.has(row.id)) {
                const childName = row.childLastName || row.childFirstName
                    ? `${row.childLastName || ''} ${row.childFirstName || ''}`.trim()
                    : null
                uniqueMap.set(row.id, {
                    profileId: row.id,
                    lineUserId: row.lineUserId,
                    displayName: row.displayName,
                    fullName: row.lastName || row.firstName
                        ? `${row.lastName || ''} ${row.firstName || ''}`.trim()
                        : null,
                    kanaName: row.lastNameKana || row.firstNameKana
                        ? `${row.lastNameKana || ''} ${row.firstNameKana || ''}`.trim()
                        : null,
                    avatarUrl: row.avatarUrl,
                    childName,
                    role: row.role,
                    lastActivityAt: row.lastActivityAt,
                })
            }
        }

        return NextResponse.json({
            results: Array.from(uniqueMap.values()),
            totalCount: uniqueMap.size,
        })
    } catch (error) {
        console.error('[LINE Chat Search] Error:', error)
        return NextResponse.json(
            { error: 'Failed to search users' },
            { status: 500 }
        )
    }
}
