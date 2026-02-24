import { config } from 'dotenv'
import { db } from '../src/db'
import { children, profiles, visits, reports } from '../src/db/schema'
import { eq, or, ilike, and } from 'drizzle-orm'

config({ path: '.env.local' })

const APP_URL = 'https://coralup-yourtime.vercel.app'

async function findChildAndParent() {
    console.log('🔍 「南穣介」くんの情報を検索しています...\n')
    console.log('='.repeat(100))

    // お子さん検索
    const kids = await db
        .select()
        .from(children)
        .where(
            or(
                ilike(children.firstName, '%穣介%'),
                ilike(children.firstNameKana, '%じょうすけ%'),
                ilike(children.firstNameKana, '%ジョウスケ%'),
                and(
                    ilike(children.lastName, '%南%'),
                    or(
                        ilike(children.firstName, '%穣%'),
                        ilike(children.firstNameKana, '%じょう%')
                    )
                )
            )
        )

    if (kids.length === 0) {
        console.log('❌ 「南穣介」くんが見つかりませんでした')
        console.log('   別の名前で登録されている可能性があります\n')

        // 「南」姓のお子さんを全員表示
        console.log('📋 「南」姓のお子さん一覧:\n')
        const minamiKids = await db
            .select()
            .from(children)
            .where(ilike(children.lastName, '%南%'))

        if (minamiKids.length === 0) {
            console.log('   「南」姓のお子さんも見つかりませんでした')
        } else {
            for (const kid of minamiKids) {
                console.log(`   - ${kid.lastName} ${kid.firstName}（${kid.lastNameKana} ${kid.firstNameKana}）`)
            }
        }

        return
    }

    console.log(`✅ 見つかったお子さん: ${kids.length}名\n`)
    console.log('='.repeat(100))

    for (const kid of kids) {
        console.log(`\n👶 お子さん情報:`)
        console.log(`   名前: ${kid.lastName} ${kid.firstName}`)
        console.log(`   ふりがな: ${kid.lastNameKana} ${kid.firstNameKana}`)
        console.log(`   Child ID: ${kid.id}`)
        console.log(`   誕生日: ${kid.birthday}`)
        console.log(`   性別: ${kid.gender}`)

        // 親御さん情報取得
        if (!kid.parentProfileId) {
            console.log(`\n   ⚠️  親御さんのProfile IDが設定されていません`)
            continue
        }

        const parents = await db
            .select()
            .from(profiles)
            .where(eq(profiles.id, kid.parentProfileId))
            .limit(1)

        if (parents.length === 0) {
            console.log(`\n   ❌ 親御さんの情報が見つかりません`)
            continue
        }

        const parent = parents[0]
        console.log(`\n👤 親御さん情報:`)
        console.log(`   名前: ${parent.lastName || ''} ${parent.firstName || ''}`.trim() || '（名前未登録）')
        console.log(`   ふりがな: ${parent.lastNameKana || ''} ${parent.firstNameKana || ''}`.trim() || '（ふりがな未登録）')
        console.log(`   LINE表示名: ${parent.displayName || '（未設定）'}`)
        console.log(`   LINE User ID: ${parent.lineUserId || '（未設定）'}`)
        console.log(`   Profile ID: ${parent.id}`)
        console.log(`   メール: ${parent.email || '（未設定）'}`)
        console.log(`   電話番号: ${parent.phoneNumber || '（未設定）'}`)

        if (parent.avatarUrl) {
            console.log(`   アバター: ${parent.avatarUrl}`)
        }

        // 診断履歴
        console.log(`\n📋 診断履歴:`)
        const kidVisits = await db
            .select()
            .from(visits)
            .where(eq(visits.childId, kid.id))

        if (kidVisits.length === 0) {
            console.log(`   診断履歴なし`)
        } else {
            console.log(`   診断回数: ${kidVisits.length}回`)

            for (const visit of kidVisits) {
                console.log(`\n   • Visit: ${visit.visitDate}`)
                console.log(`     Visit ID: ${visit.id}`)
                console.log(`     Status: ${visit.status}`)

                // レポート確認
                const visitReports = await db
                    .select()
                    .from(reports)
                    .where(eq(reports.visitId, visit.id))

                if (visitReports.length > 0) {
                    const report = visitReports[0]
                    const reportUrl = `${APP_URL}/report/${visit.id}`
                    console.log(`     ✅ レポート: ${reportUrl}`)
                    console.log(`     レポート状態: ${report.status}`)
                    console.log(`     LINE送信済み: ${report.sentToLine}`)
                } else {
                    console.log(`     ❌ レポートなし`)
                }
            }
        }

        console.log('\n' + '-'.repeat(100))
    }

    console.log('\n' + '='.repeat(100))
    console.log('✨ 検索完了\n')
}

findChildAndParent()
    .catch(console.error)
    .finally(() => process.exit(0))
