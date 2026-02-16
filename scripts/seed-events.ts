/**
 * イベントデータ登録 + 既存スタッフ一括紐付けスクリプト
 *
 * 実行方法:
 *   npx tsx scripts/seed-events.ts
 *
 * 動作:
 *   1. イベント3件を登録（大阪, 鹿児島, 大泉学園）
 *   2. 既存スタッフ（role='staff' or secondaryRole='staff'）を全イベントに紐付け
 *
 * 冪等性: onConflictDoNothing / onConflictDoUpdate で何度実行しても安全
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

async function main() {
    const { db } = await import('../src/db')
    const { events, eventStaffs } = await import('../src/db/schema')
    const { profiles } = await import('../src/db/schema')
    const { eq, or, sql } = await import('drizzle-orm')

    console.log('========================================')
    console.log('🦷 イベントデータ登録 + 既存スタッフ紐付け')
    console.log('========================================\n')

    // ----------------------------------------
    // 1. イベント登録（3件）
    // ----------------------------------------
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
                },
            })
        console.log(`✅ イベント登録: ${evt.name} [${evt.status}]`)
    }

    // ----------------------------------------
    // 2. 既存スタッフを全イベントに紐付け
    // ----------------------------------------
    console.log('\n--- 既存スタッフの紐付け ---')

    // 全スタッフ取得
    const allStaff = await db.select({ id: profiles.id, displayName: profiles.displayName })
        .from(profiles)
        .where(or(eq(profiles.role, 'staff'), eq(profiles.secondaryRole, 'staff')))

    console.log(`👥 対象スタッフ: ${allStaff.length}名`)

    // 全イベント取得（登録したばかりのもの含む）
    const allEvents = await db.select({ id: events.id, name: events.name, eventId: events.eventId })
        .from(events)

    let insertCount = 0
    for (const evt of allEvents) {
        for (const staff of allStaff) {
            const result = await db.insert(eventStaffs).values({
                eventId: evt.id,
                profileId: staff.id,
                role: 'staff',
                status: 'confirmed',
            }).onConflictDoNothing()

            if ((result as any).rowCount > 0) {
                insertCount++
            }
        }
        console.log(`✅ ${evt.name}: ${allStaff.length}名を紐付け`)
    }

    console.log(`\n========================================`)
    console.log(`🎉 完了！`)
    console.log(`   イベント: ${allEvents.length}件`)
    console.log(`   スタッフ: ${allStaff.length}名`)
    console.log(`   新規紐付け: ${insertCount}件（既存は重複スキップ）`)
    console.log(`========================================`)

    process.exit(0)
}

main().catch(error => {
    console.error('致命的なエラー:', error)
    process.exit(1)
})
