/**
 * 既存スタッフへイベント選択メッセージを一斉送信するスクリプト
 *
 * 対象: displayName が設定済み（名前登録済み）だが
 *       event_staffs にレコードがない（イベント未選択）のスタッフ
 *
 * 実行方法:
 *   npx tsx scripts/notify-staff-event-selection.ts
 *
 * 動作:
 *   1. 対象スタッフを DB から取得
 *   2. active イベントを取得
 *   3. 各スタッフに Flex Message でイベント選択ボタンを LINE Push
 *
 * 安全性:
 *   - DRY RUN モードあり（--dry-run）
 *   - イベント未選択のスタッフのみ対象
 *   - LINE Rate Limit 対策（1件ずつ 200ms 間隔）
 */

// dotenv を最初に読み込む（static import が解決される前に env を注入）
import { config } from 'dotenv'
config({ path: '.env.local' })

const isDryRun = process.argv.includes('--dry-run')

async function main() {
    // dotenv 後に動的 import（DATABASE_URL が設定された状態で db が初期化される）
    const { db } = await import('../src/db')
    const { profiles, events, eventStaffs } = await import('../src/db/schema')
    const { eq, or, and, isNotNull } = await import('drizzle-orm')

    const LINE_STAFF_CHANNEL_ACCESS_TOKEN = process.env.LINE_STAFF_CHANNEL_ACCESS_TOKEN!
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://coralup-yourtime.vercel.app'

    console.log('========================================')
    console.log('既存スタッフ イベント選択メッセージ送信')
    console.log(`モード: ${isDryRun ? '🔍 DRY RUN（実際には送信しません）' : '🚀 本番送信'}`)
    console.log('========================================\n')


    // 1. active イベントを取得
    const activeEvents = await db.select().from(events)
        .where(or(eq(events.status, 'active'), eq(events.status, 'upcoming')))
        .orderBy(events.startDate)

    if (activeEvents.length === 0) {
        console.log('❌ active なイベントがありません。先にイベントを登録してください。')
        process.exit(1)
    }

    console.log(`📅 対象イベント（${activeEvents.length}件）:`)
    activeEvents.forEach(evt => {
        const dateStr = evt.startDate
            ? new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(evt.startDate))
            : '日程未定'
        console.log(`   - ${evt.name} (${dateStr}) [${evt.status}]`)
    })
    console.log()

    // 2. displayName 登録済み かつ event_staffs にレコードがないスタッフを取得
    const allStaff = await db.select({
        id: profiles.id,
        lineUserId: profiles.lineUserId,
        displayName: profiles.displayName,
        isActive: profiles.isActive,
    }).from(profiles)
        .where(and(
            or(eq(profiles.role, 'staff'), eq(profiles.secondaryRole, 'staff')),
            isNotNull(profiles.displayName),
            isNotNull(profiles.lineUserId),
        ))

    // event_staffs のレコードを持つスタッフを取得
    const staffWithEvents = await db.select({
        profileId: eventStaffs.profileId,
    }).from(eventStaffs)

    const staffWithEventsSet = new Set(staffWithEvents.map(s => s.profileId))

    // event_staffs レコードがないスタッフだけフィルタ
    const targetStaff = allStaff.filter(s => !staffWithEventsSet.has(s.id))

    console.log(`👥 全スタッフ数: ${allStaff.length}`)
    console.log(`✅ イベント登録済み: ${allStaff.length - targetStaff.length}`)
    console.log(`📨 今回の送信対象: ${targetStaff.length}`)

    if (targetStaff.length === 0) {
        console.log('\n✅ 全スタッフがイベント登録済みです。送信対象はありません。')
        process.exit(0)
    }

    console.log('\n--- 送信対象スタッフ ---')
    targetStaff.forEach(s => {
        console.log(`   ${s.displayName} (active: ${s.isActive}, lineUserId: ${s.lineUserId?.slice(0, 8)}...)`)
    })
    console.log()

    if (isDryRun) {
        console.log('🔍 DRY RUN モードのため、送信をスキップします。')
        console.log('   実際に送信するには --dry-run を外して再実行してください。')
        process.exit(0)
    }

    // 3. Flex Message を構築
    const flexMessage = buildEventSelectionFlex(activeEvents)

    // 4. 1人ずつ送信
    let successCount = 0
    let failCount = 0

    for (const staff of targetStaff) {
        if (!staff.lineUserId) continue

        const personalFlex = {
            ...flexMessage,
            contents: {
                ...(flexMessage.contents as any),
                body: {
                    ...(flexMessage.contents as any).body,
                    contents: [
                        {
                            type: 'text',
                            text: `${staff.displayName}さん、新しいイベントが登録されました！\n\n参加予定のイベントを選択してください。`,
                            wrap: true,
                            size: 'sm',
                            color: '#555555'
                        },
                        ...(flexMessage.contents as any).body.contents.slice(1)
                    ]
                }
            }
        }

        try {
            const response = await fetch('https://api.line.me/v2/bot/message/push', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${LINE_STAFF_CHANNEL_ACCESS_TOKEN}`,
                },
                body: JSON.stringify({
                    to: staff.lineUserId,
                    messages: [personalFlex],
                }),
            })

            if (response.ok) {
                console.log(`   ✅ ${staff.displayName} に送信成功`)
                successCount++
            } else {
                const errorText = await response.text()
                console.log(`   ❌ ${staff.displayName} に送信失敗: ${errorText}`)
                failCount++
            }
        } catch (error) {
            console.log(`   ❌ ${staff.displayName} に送信エラー: ${error}`)
            failCount++
        }

        // Rate Limit 対策: 200ms 間隔
        await new Promise(resolve => setTimeout(resolve, 200))
    }

    console.log('\n========================================')
    console.log(`📊 送信結果: 成功 ${successCount} / 失敗 ${failCount} / 合計 ${targetStaff.length}`)
    console.log('========================================')

    process.exit(0)
}

function buildEventSelectionFlex(activeEvents: any[]) {
    const eventButtons: any[] = activeEvents.map(evt => ({
        type: 'button',
        action: {
            type: 'postback',
            label: truncateLabel(evt.name, 20),
            data: `action=select_event&event_id=${evt.id}`,
            displayText: `${evt.name} に参加します`
        },
        style: 'primary',
        color: '#1DB446',
        margin: 'sm',
        height: 'sm'
    }))

    if (activeEvents.length >= 2) {
        const allEventIds = activeEvents.map(e => e.id).join(',')
        eventButtons.push({
            type: 'button',
            action: {
                type: 'postback',
                label: 'すべてに参加',
                data: `action=select_event&event_id=${allEventIds}`,
                displayText: 'すべてのイベントに参加します'
            },
            style: 'primary',
            color: '#0068C9',
            margin: 'sm',
            height: 'sm'
        })
    }

    const eventInfoTexts = activeEvents.map(evt => {
        const dateStr = evt.startDate
            ? new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }).format(new Date(evt.startDate))
            : '日程未定'
        return {
            type: 'box',
            layout: 'vertical',
            margin: 'md',
            contents: [
                { type: 'text', text: evt.name, weight: 'bold', size: 'sm', color: '#333333' },
                { type: 'text', text: `📅 ${dateStr}　📍 ${evt.venue || '未定'}`, size: 'xs', color: '#888888', wrap: true }
            ]
        }
    })

    return {
        type: 'flex',
        altText: '新しいイベントが登録されました！参加イベントを選択してください。',
        contents: {
            type: 'bubble',
            header: {
                type: 'box',
                layout: 'vertical',
                contents: [{ type: 'text', text: '🦷 参加イベント選択', weight: 'bold', size: 'lg', color: '#333333' }],
                paddingBottom: 'none'
            },
            body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    { type: 'text', text: '参加予定のイベントを選択してください。', wrap: true, size: 'sm', color: '#555555' },
                    { type: 'separator', margin: 'lg' },
                    ...eventInfoTexts,
                    { type: 'separator', margin: 'lg' },
                    ...eventButtons
                ]
            }
        }
    }
}

function truncateLabel(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength - 1) + '…'
}

main().catch(error => {
    console.error('致命的なエラー:', error)
    process.exit(1)
})
