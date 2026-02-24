import { config } from 'dotenv'
import { db } from '../src/db'
import { children, profiles, visits, reports } from '../src/db/schema'
import { eq, or, ilike } from 'drizzle-orm'

config({ path: '.env.local' })

const APP_URL = 'https://coralup-yourtime.vercel.app'

async function findChildrenByParentName() {
    console.log('🔍 特定の親御さんのお子さんを検索しています...\n')
    console.log('='.repeat(100))

    const searchNames = [
        'みなみ ゆうこ',
        'みなみ　ゆうこ',
        'つやえみ',
        'もも',
        'さちこ'
    ]

    console.log('📌 検索対象の親御さん:')
    searchNames.forEach(name => console.log(`   - ${name}`))
    console.log()

    // 親御さん検索
    const parents = await db
        .select()
        .from(profiles)
        .where(
            or(
                ilike(profiles.displayName, '%みなみ%ゆうこ%'),
                ilike(profiles.displayName, '%つやえみ%'),
                ilike(profiles.displayName, '%もも%'),
                ilike(profiles.displayName, '%さちこ%'),
                ilike(profiles.firstName, '%もも%'),
                ilike(profiles.lastName, '%もも%'),
                ilike(profiles.firstName, '%さちこ%'),
                ilike(profiles.lastName, '%さちこ%')
            )
        )

    console.log(`✅ 見つかった親御さん: ${parents.length}名\n`)
    console.log('='.repeat(100))

    for (const parent of parents) {
        console.log(`\n👤 親御さん: ${parent.displayName || `${parent.lastName} ${parent.firstName}`}`)
        console.log(`   Profile ID: ${parent.id}`)
        console.log(`   LINE User ID: ${parent.lineUserId}`)
        console.log(`   LINE表示名: ${parent.displayName}`)
        console.log()

        // このprofileに紐づくお子さんを全員取得
        const kids = await db
            .select()
            .from(children)
            .where(eq(children.parentProfileId, parent.id))

        if (kids.length === 0) {
            console.log(`   ⚠️  お子さんが見つかりませんでした`)
            console.log()
            continue
        }

        console.log(`   👶 お子さん: ${kids.length}名`)
        console.log()

        for (const [idx, kid] of kids.entries()) {
            console.log(`   [${idx + 1}] ${kid.lastName} ${kid.firstName}（${kid.lastNameKana} ${kid.firstNameKana}）`)
            console.log(`       - Child ID: ${kid.id}`)
            console.log(`       - 誕生日: ${kid.birthday}`)
            console.log(`       - 性別: ${kid.gender}`)

            // このお子さんのvisit情報
            const kidVisits = await db
                .select()
                .from(visits)
                .where(eq(visits.childId, kid.id))

            if (kidVisits.length > 0) {
                console.log(`       - 診断回数: ${kidVisits.length}回`)

                for (const visit of kidVisits) {
                    console.log(`         • Visit: ${visit.visitDate}`)
                    console.log(`           Status: ${visit.status}`)
                    console.log(`           Visit ID: ${visit.id}`)

                    // レポート確認
                    const visitReports = await db
                        .select()
                        .from(reports)
                        .where(eq(reports.visitId, visit.id))

                    if (visitReports.length > 0) {
                        const report = visitReports[0]
                        const reportUrl = `${APP_URL}/report/${visit.id}`
                        console.log(`           ✅ レポートあり: ${reportUrl}`)
                        console.log(`           レポート状態: ${report.status}`)
                        console.log(`           LINE送信済み: ${report.sentToLine}`)
                    } else {
                        console.log(`           ❌ レポートなし`)
                    }
                }
            } else {
                console.log(`       - ⚠️ 診断履歴なし`)
            }
            console.log()
        }

        console.log('   ' + '-'.repeat(96))
    }

    console.log('\n' + '='.repeat(100))
    console.log('✨ 検索完了\n')

    // サマリー出力
    console.log('📊 サマリー:')
    console.log()

    for (const parent of parents) {
        const kids = await db
            .select()
            .from(children)
            .where(eq(children.parentProfileId, parent.id))

        console.log(`• ${parent.displayName || `${parent.lastName} ${parent.firstName}`}`)
        if (kids.length > 0) {
            kids.forEach(kid => {
                console.log(`  └─ ${kid.lastName} ${kid.firstName}（${kid.lastNameKana} ${kid.firstNameKana}）`)
            })
        } else {
            console.log(`  └─ （お子さん情報なし）`)
        }
        console.log()
    }
}

findChildrenByParentName()
    .catch(console.error)
    .finally(() => process.exit(0))
