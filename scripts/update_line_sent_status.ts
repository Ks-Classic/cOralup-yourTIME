import { config } from 'dotenv'
// 環境変数を先にロード
config({ path: '.env.local' })

import { db } from '../src/db'
import { reports, lineMessageLogs, visits } from '../src/db/schema'
import { eq, inArray } from 'drizzle-orm'

// 送信完了したレポートのVisit ID一覧（14件）
const SENT_VISIT_IDS = [
    // 南さん家族（3名）
    '04eab84c-dd0a-449c-b07a-9dede64b0edc', // 南 里呼
    '7f4b886d-5c36-43fb-8fcc-4901483e36fc', // 南 瑛斗
    '68a77b45-a44b-46f4-9298-dbba20cde150', // 南 伶旺

    // 冨永さん家族（2名）
    'e29126b1-f8fb-4ca3-be1f-544ca66f2b5a', // 冨永 結仁
    '12fc43b8-f9d4-4db6-834d-7789532b0fd5', // 冨永 絢仁

    // 谷川さん家族（2名）
    '1cadb349-841e-4a83-9764-6d51c12c2013', // 谷川 奈優
    '1e8d36a9-6af9-4bd1-9f45-db77c1a6eb27', // 谷川 竣祐

    // 1名ずつの家族（7名）
    '89fb36b4-df49-4486-839d-39103996bffe', // 亀石 茉叶
    '5ed512c9-c449-4411-9553-b6cce4202fd8', // 岩井 蒼太
    '46e06e76-3def-4265-a0b1-d7d4aef0f6f9', // 齋藤 伍希
    '347fbea8-a176-452a-8e2f-66d70497d856', // 酒井 絵未
    '75b19e3e-775f-4dca-85d6-517e9cea8041', // 上田 創介
    '6d855cbe-bc8f-4a2b-8095-cf676b39b20e', // 河内 佑友
    '4244b339-7492-43bb-a898-64287f7eab1c', // 中尾 浩都
]

// LINE User IDマッピング（家族単位で1つのIDを共有）
const LINE_USER_ID_MAP: Record<string, string> = {
    // 南さん家族
    '04eab84c-dd0a-449c-b07a-9dede64b0edc': 'Uad27737995a25a4783cd1de8dae865cf',
    '7f4b886d-5c36-43fb-8fcc-4901483e36fc': 'Uad27737995a25a4783cd1de8dae865cf',
    '68a77b45-a44b-46f4-9298-dbba20cde150': 'Uad27737995a25a4783cd1de8dae865cf',
    // 冨永さん家族
    'e29126b1-f8fb-4ca3-be1f-544ca66f2b5a': 'Uc32c4d0399dc820de9085d0b880830a2',
    '12fc43b8-f9d4-4db6-834d-7789532b0fd5': 'Uc32c4d0399dc820de9085d0b880830a2',
    // 谷川さん家族
    '1cadb349-841e-4a83-9764-6d51c12c2013': 'U6c6f39c6526c22038bc14ca24f1a3b10',
    '1e8d36a9-6af9-4bd1-9f45-db77c1a6eb27': 'U6c6f39c6526c22038bc14ca24f1a3b10',
    // 1名ずつ
    '89fb36b4-df49-4486-839d-39103996bffe': 'U1037079d35342855ae4498067d5a00c8',
    '5ed512c9-c449-4411-9553-b6cce4202fd8': 'Ue0c8fee5f6f2242235fddd6f03af0d2f',
    '46e06e76-3def-4265-a0b1-d7d4aef0f6f9': 'U3f1ab3c2daf56685e47fc4cdd2a6397a',
    '347fbea8-a176-452a-8e2f-66d70497d856': 'Ue95f07a8a6fdfd7261bbf29b4471ef2d',
    '75b19e3e-775f-4dca-85d6-517e9cea8041': 'U02c6357a099da0b7963a9ee6d3438d4d',
    '6d855cbe-bc8f-4a2b-8095-cf676b39b20e': 'Ufb74237fb9d5c1da46ce6d43390699ec',
    '4244b339-7492-43bb-a898-64287f7eab1c': 'U84a815d80d3c093277cf2dc2cfa3d33a',
}

async function updateLineSentStatus() {
    console.log('📊 LINE送信ステータス更新スクリプト\n')
    console.log('='.repeat(100))
    console.log(`\n対象件数: ${SENT_VISIT_IDS.length}件\n`)

    const now = new Date()
    let successCount = 0
    let failedCount = 0

    for (const visitId of SENT_VISIT_IDS) {
        console.log(`📝 Visit ID: ${visitId}`)

        try {
            // 1. reports.sentToLine を true に更新
            const reportUpdateResult = await db
                .update(reports)
                .set({
                    sentToLine: true,
                    sentAt: now,
                    status: 'sent',
                    updatedAt: now
                })
                .where(eq(reports.visitId, visitId))

            console.log(`   ✅ reports.sentToLine = true に更新`)

            // 2. visits.reportSentAt を更新
            await db
                .update(visits)
                .set({
                    reportSentAt: now,
                    status: 'report_sent',
                    updatedAt: now
                })
                .where(eq(visits.id, visitId))

            console.log(`   ✅ visits.reportSentAt を更新`)

            // 3. line_message_logs に成功ログを追加
            const lineUserId = LINE_USER_ID_MAP[visitId]

            // まず既存の session_id を取得
            const visitData = await db
                .select({ sessionId: visits.sessionId })
                .from(visits)
                .where(eq(visits.id, visitId))
                .limit(1)

            const sessionId = visitData[0]?.sessionId || null

            await db.insert(lineMessageLogs).values({
                visitId: visitId,
                sessionId: sessionId,
                lineUserId: lineUserId,
                messageType: 'report',
                messageContent: `手動再送信（2026/1/21 一括送信スクリプト）`,
                status: 'success',
                sentAt: now,
                staffConfirmationStatus: 'confirmed',
                staffConfirmedAt: now,
            })

            console.log(`   ✅ line_message_logs に成功ログを追加`)
            successCount++

        } catch (error) {
            console.log(`   ❌ エラー: ${error instanceof Error ? error.message : String(error)}`)
            failedCount++
        }

        console.log()
    }

    console.log('='.repeat(100))
    console.log(`\n📊 更新結果:`)
    console.log(`   ✅ 成功: ${successCount}件`)
    console.log(`   ❌ 失敗: ${failedCount}件`)
    console.log(`   合計: ${SENT_VISIT_IDS.length}件`)
    console.log('\n✨ 完了')
}

updateLineSentStatus()
    .catch(console.error)
    .finally(() => process.exit(0))
