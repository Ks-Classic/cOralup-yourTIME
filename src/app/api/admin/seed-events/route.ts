import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { events, eventStaffs, profiles } from '@/db/schema'
import { eq, or, sql } from 'drizzle-orm'

/**
 * 管理者用: イベントデータ登録 + 既存スタッフ一括紐付け
 * 
 * POST /api/admin/seed-events
 * Header: Authorization: Bearer <ADMIN_API_KEY>
 * 
 * 冪等: 何度実行しても安全
 */
export async function POST(request: NextRequest) {
    // 認証チェック
    const authHeader = request.headers.get('authorization')
    const adminKey = process.env.ADMIN_API_KEY
    if (!adminKey || authHeader !== `Bearer ${adminKey}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const results: string[] = []

        // 1. イベント登録
        const eventData = [
            {
                eventId: 'osaka-yourtime-2025',
                name: '大阪YourTIME.',
                description: '2025年12月21日 大阪YourTIME. 歯科検診イベント',
                startDate: new Date('2025-12-21T09:00:00+09:00'),
                endDate: new Date('2025-12-21T18:00:00+09:00'),
                venue: '大阪',
                status: 'completed',
            },
            {
                eventId: 'kagoshima-yourtime-2026',
                name: '鹿児島YourTIME.',
                description: '2026年3月1日 鹿児島YourTIME. 歯科検診イベント',
                startDate: new Date('2026-03-01T09:00:00+09:00'),
                endDate: new Date('2026-03-01T18:00:00+09:00'),
                venue: '鹿児島',
                status: 'active',
            },
            {
                eventId: 'oizumigakuen-yourtime-2026',
                name: '大泉学園YourTIME.',
                description: '2026年3月15日 大泉学園YourTIME. 歯科検診イベント',
                startDate: new Date('2026-03-15T09:00:00+09:00'),
                endDate: new Date('2026-03-15T18:00:00+09:00'),
                venue: '大泉学園',
                status: 'active',
            },
        ]

        for (const evt of eventData) {
            await db.insert(events).values(evt)
                .onConflictDoUpdate({
                    target: events.eventId,
                    set: {
                        name: sql`EXCLUDED.name`,
                        description: sql`EXCLUDED.description`,
                        venue: sql`EXCLUDED.venue`,
                        status: sql`EXCLUDED.status`,
                    } as Record<string, any>,
                })
            results.push(`✅ イベント登録: ${evt.name} [${evt.status}]`)
        }

        // 2. 既存スタッフを全イベントに紐付け
        const allStaff = await db.select({ id: profiles.id, displayName: profiles.displayName })
            .from(profiles)
            .where(or(eq(profiles.role, 'staff'), eq(profiles.secondaryRole, 'staff')))

        results.push(`👥 対象スタッフ: ${allStaff.length}名`)

        const allEvents = await db.select({ id: events.id, name: events.name })
            .from(events)

        let insertCount = 0
        for (const evt of allEvents) {
            for (const staff of allStaff) {
                const result = await db.insert(eventStaffs).values({
                    eventId: evt.id,
                    profileId: staff.id,
                } as typeof eventStaffs.$inferInsert).onConflictDoNothing()

                if ((result as any).rowCount > 0) {
                    insertCount++
                }
            }
            results.push(`✅ ${evt.name}: ${allStaff.length}名を紐付け`)
        }

        results.push(`🎉 完了！ 新規紐付け: ${insertCount}件`)

        return NextResponse.json({
            success: true,
            results,
            summary: {
                events: allEvents.length,
                staff: allStaff.length,
                newAssignments: insertCount,
            }
        })
    } catch (error) {
        console.error('[seed-events] Error:', error)
        return NextResponse.json(
            { error: 'Internal server error', details: String(error) },
            { status: 500 }
        )
    }
}
