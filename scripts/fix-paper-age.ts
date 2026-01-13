/**
 * CSVインポートされたPAPERセッションの月齢を修正するスクリプト
 * 
 * 実行方法: npx tsx scripts/fix-paper-age.ts
 */

import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { eq, like } from 'drizzle-orm'
import * as schema from '../src/db/schema'

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set')
    process.exit(1)
}

const client = postgres(DATABASE_URL, { max: 1, prepare: false })
const db = drizzle(client, { schema })

/**
 * 生年月日から月齢を計算
 */
function calculateAgeInMonths(birthday: string, referenceDate: Date): number {
    if (!birthday || !/^\d{4}-\d{2}-\d{2}$/.test(birthday)) {
        console.warn('  ⚠️ Invalid birthday format:', birthday)
        return 0
    }

    const birthDate = new Date(birthday)
    if (isNaN(birthDate.getTime())) {
        console.warn('  ⚠️ Failed to parse birthday:', birthday)
        return 0
    }

    const years = referenceDate.getFullYear() - birthDate.getFullYear()
    const months = referenceDate.getMonth() - birthDate.getMonth()
    const days = referenceDate.getDate() - birthDate.getDate()

    let totalMonths = years * 12 + months
    if (days < 0) {
        totalMonths -= 1
    }

    return Math.max(0, totalMonths)
}

async function main() {
    console.log('🔍 PAPERセッションを検索中...')

    // PAPERセッション（CSVインポート分）を取得
    const paperVisits = await db
        .select({
            visitId: schema.visits.id,
            sessionId: schema.visits.sessionId,
            childId: schema.visits.childId,
            currentAgeMonths: schema.visits.childAgeMonths,
        })
        .from(schema.visits)
        .where(like(schema.visits.sessionId, 'PAPER-%'))

    console.log(`📋 ${paperVisits.length}件のPAPERセッションを発見`)

    if (paperVisits.length === 0) {
        console.log('✅ 修正対象のデータはありません')
        process.exit(0)
    }

    const eventDate = new Date('2025-12-21')
    let updatedCount = 0
    let skippedCount = 0

    for (const visit of paperVisits) {
        // 子供の生年月日を取得
        if (!visit.childId) {
            console.log(`  ⚠️ ${visit.sessionId}: childIdがありません`)
            skippedCount++
            continue
        }

        const childData = await db
            .select({ birthday: schema.children.birthday })
            .from(schema.children)
            .where(eq(schema.children.id, visit.childId))
            .limit(1)

        if (childData.length === 0 || !childData[0].birthday) {
            console.log(`  ⚠️ ${visit.sessionId}: 生年月日が見つかりません`)
            skippedCount++
            continue
        }

        const birthday = childData[0].birthday
        const newAgeMonths = calculateAgeInMonths(birthday, eventDate)
        const oldAgeMonths = visit.currentAgeMonths || 0

        if (newAgeMonths === oldAgeMonths) {
            console.log(`  ✓ ${visit.sessionId}: 既に正しい月齢 (${newAgeMonths}ヶ月)`)
            continue
        }

        // 月齢を更新
        await db
            .update(schema.visits)
            .set({ childAgeMonths: newAgeMonths })
            .where(eq(schema.visits.id, visit.visitId))

        const years = Math.floor(newAgeMonths / 12)
        const months = newAgeMonths % 12
        const ageDisplay = months > 0 ? `${years}歳${months}ヶ月` : `${years}歳`

        console.log(`  ✅ ${visit.sessionId}: ${oldAgeMonths}ヶ月 → ${newAgeMonths}ヶ月 (${ageDisplay})`)
        updatedCount++
    }

    console.log('')
    console.log('='.repeat(50))
    console.log(`🎉 完了！`)
    console.log(`   更新: ${updatedCount}件`)
    console.log(`   スキップ: ${skippedCount}件`)
    console.log('='.repeat(50))

    await client.end()
    process.exit(0)
}

main().catch((err) => {
    console.error('❌ エラー:', err)
    process.exit(1)
})
