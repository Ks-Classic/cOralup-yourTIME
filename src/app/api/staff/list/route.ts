import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { profiles } from '@/db/schema'
import { events, eventStaffs } from '@/db/schema/events'
import { or, eq, asc, and, inArray } from 'drizzle-orm'

// キャッシュを無効化して、毎回最新のDBからスタッフを取得
export const dynamic = 'force-dynamic'

/**
 * GET: スタッフ一覧を取得
 * ?eventId=uuid  → そのイベントに紐付いたスタッフのみ返す
 *                  + 大阪YourTIME.(completed) の既存スタッフも全イベントに表示
 * パラメータなし → 全スタッフ返す（従来互換）
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const eventId = searchParams.get('eventId')

        if (eventId) {
            // ── イベントフィルタあり ──
            // 1. 指定イベントに紐付いたスタッフ profile_id を取得
            const eventStaffRows = await db
                .select({ profileId: eventStaffs.profileId })
                .from(eventStaffs)
                .where(eq(eventStaffs.eventId, eventId))

            // 2. 大阪YourTIME. (completed) スタッフ = 全イベントに表示するレガシーメンバー
            const osakaEvent = await db
                .select({ id: events.id })
                .from(events)
                .where(eq(events.status, 'completed'))

            let legacyProfileIds: string[] = []
            if (osakaEvent.length > 0) {
                const osakaIds = osakaEvent.map(e => e.id)
                const legacyRows = await db
                    .select({ profileId: eventStaffs.profileId })
                    .from(eventStaffs)
                    .where(inArray(eventStaffs.eventId, osakaIds))
                legacyProfileIds = legacyRows.map(r => r.profileId)
            }

            // 3. 重複排除して対象スタッフの profile_id リストを生成
            const targetProfileIds = [
                ...new Set([
                    ...eventStaffRows.map(r => r.profileId),
                    ...legacyProfileIds,
                ])
            ]

            if (targetProfileIds.length === 0) {
                return NextResponse.json({ staff: [] })
            }

            // 4. profile 情報を取得
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
                    and(
                        inArray(profiles.id, targetProfileIds),
                        or(eq(profiles.role, 'staff'), eq(profiles.secondaryRole, 'staff'))
                    )
                )
                .orderBy(asc(profiles.displayName))

            const staff = staffRows
                .filter(s => s.isActive !== false)
                .map(s => ({
                    id: s.id,
                    name: s.displayName || `${s.lastName || ''} ${s.firstName || ''}`.trim() || 'スタッフ',
                    avatarUrl: s.avatarUrl,
                }))

            return NextResponse.json({ staff })
        }

        // ── イベントフィルタなし → 全スタッフ（従来互換）──
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

        const activeStaff = staffRows.filter(s => s.isActive !== false)

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
