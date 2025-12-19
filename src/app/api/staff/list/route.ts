import { NextResponse } from 'next/server'
import { db } from '@/db'
import { profiles } from '@/db/schema'
import { or, eq, asc } from 'drizzle-orm'

// キャッシュを無効化して、毎回最新のDBからスタッフを取得
export const dynamic = 'force-dynamic'

/**
 * GET: スタッフ一覧を取得
 */
export async function GET() {
    try {
        // role='staff' または secondary_role='staff' かつ is_active=true のスタッフを取得
        const staffRows = await db
            .select({
                id: profiles.id,
                displayName: profiles.displayName,
                firstName: profiles.firstName,
                lastName: profiles.lastName,
                avatarUrl: profiles.avatarUrl,
                isActive: profiles.isActive,
            })
            .from(profiles)
            .where(
                or(eq(profiles.role, 'staff'), eq(profiles.secondaryRole, 'staff'))
            )
            .orderBy(asc(profiles.displayName))

        // isActiveでフィルタリング
        const activeStaff = staffRows.filter(s => s.isActive !== false)

        // 表示名を整形
        const staff = activeStaff.map(s => ({
            id: s.id,
            name: s.displayName || `${s.lastName || ''} ${s.firstName || ''}`.trim() || 'スタッフ',
            avatarUrl: s.avatarUrl,
        }))

        return NextResponse.json({ staff })
    } catch (error) {
        console.error('[Staff List] Error:', error)
        return NextResponse.json(
            { error: 'Internal error' },
            { status: 500 }
        )
    }
}
