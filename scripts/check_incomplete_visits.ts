import { config } from 'dotenv'
import { db } from '../src/db'
import { visits, children, visitPhotos, diagnosisResponses, questionnaireResponses, reports } from '../src/db/schema'
import { eq } from 'drizzle-orm'

config({ path: '.env.local' })

// 対象のVisit ID
const VISIT_IDS = [
    'a6ab4362-1a08-4f41-b08f-4ed3bd07e100', // 中尾 淳人
    '04eab84c-dd0a-449c-b07a-9dede64b0edc'  // 南 里呼
]

async function checkIncompleteVisits() {
    console.log('🔍 診断途中のVisitデータを確認しています...\n')
    console.log('='.repeat(100))

    for (const visitId of VISIT_IDS) {
        console.log(`\n📌 Visit ID: ${visitId}`)

        // Visit情報取得
        const visit = (await db.select().from(visits).where(eq(visits.id, visitId)).limit(1))[0]

        if (!visit) {
            console.log('❌ Visit not found\n')
            continue
        }

        // Child情報取得
        let childName = '不明'
        if (visit.childId) {
            const child = (await db.select().from(children).where(eq(children.id, visit.childId)).limit(1))[0]
            if (child) {
                childName = `${child.lastName} ${child.firstName}（${child.lastNameKana} ${child.firstNameKana}）`
            }
        }

        console.log(`👶 お子さん: ${childName}`)
        console.log(`📅 来場日: ${visit.visitDate}`)
        console.log(`📊 ステータス: ${visit.status}`)
        console.log(`📍 現在のステップ: ${visit.currentStep}`)
        console.log(`🎂 月齢: ${visit.childAgeMonths}ヶ月（${Math.floor((visit.childAgeMonths || 0) / 12)}歳）`)

        // ステップタイムスタンプ
        if (visit.stepTimestamps) {
            console.log(`\n⏱️  ステップタイムスタンプ:`)
            console.log(JSON.stringify(visit.stepTimestamps, null, 2))
        }

        // 写真確認
        console.log(`\n📸 写真データ:`)
        const photos = await db.select().from(visitPhotos).where(eq(visitPhotos.visitId, visitId))

        if (photos.length === 0) {
            console.log(`   ❌ 写真がありません`)
        } else {
            console.log(`   ✅ ${photos.length}枚の写真`)
            photos.forEach((photo, idx) => {
                console.log(`\n   [${idx + 1}] ${photo.photoType}`)
                console.log(`       パス: ${photo.storagePath}`)
                console.log(`       公開URL: ${photo.publicUrl}`)
                console.log(`       アップロード日時: ${photo.createdAt}`)
            })
        }

        // 診断回答確認
        console.log(`\n📝 診断回答データ:`)
        const diagResponses = await db.select().from(diagnosisResponses).where(eq(diagnosisResponses.visitId, visitId))

        if (diagResponses.length === 0) {
            console.log(`   ❌ 診断回答がありません`)
        } else {
            console.log(`   ✅ ${diagResponses.length}件の診断回答`)
            diagResponses.forEach((response, idx) => {
                console.log(`   [${idx + 1}] 項目ID: ${response.itemId}, 値: ${response.value}`)
            })
        }

        // 問診回答確認
        console.log(`\n📋 問診回答データ:`)
        const qResponses = await db.select().from(questionnaireResponses).where(eq(questionnaireResponses.visitId, visitId))

        if (qResponses.length === 0) {
            console.log(`   ❌ 問診回答がありません`)
        } else {
            console.log(`   ✅ ${qResponses.length}件の問診回答`)
            qResponses.forEach((response, idx) => {
                console.log(`   [${idx + 1}] 項目ID: ${response.itemId}, 値: ${response.value}`)
            })
        }

        // レポート確認
        console.log(`\n📄 レポート:`)
        const visitReports = await db.select().from(reports).where(eq(reports.visitId, visitId))

        if (visitReports.length === 0) {
            console.log(`   ❌ レポートなし`)
        } else {
            const report = visitReports[0]
            console.log(`   ✅ レポートあり`)
            console.log(`   - Report ID: ${report.id}`)
            console.log(`   - ステータス: ${report.status}`)
            console.log(`   - 生成日時: ${report.generatedAt}`)
            console.log(`   - LINE送信済み: ${report.sentToLine}`)

            if (report.aiSummary) {
                console.log(`\n   【AIサマリー】`)
                console.log(`   ${report.aiSummary.substring(0, 200)}...`)
            }
        }

        // 判定
        console.log(`\n💡 レポート作成可否:`)

        const hasPhotos = photos.length > 0
        const hasDiagnosisData = diagResponses.length > 0
        const hasQuestionnaireData = qResponses.length > 0
        const hasReport = visitReports.length > 0

        console.log(`   - 写真: ${hasPhotos ? '✅' : '❌'}`)
        console.log(`   - 診断回答: ${hasDiagnosisData ? '✅' : '❌'}`)
        console.log(`   - 問診回答: ${hasQuestionnaireData ? '✅' : '❌'}`)
        console.log(`   - 既存レポート: ${hasReport ? '✅（更新可能）' : '❌（新規作成）'}`)

        if (hasPhotos && hasDiagnosisData) {
            console.log(`\n   ✅ レポート作成可能です！`)
            if (hasReport) {
                console.log(`   ℹ️  既にレポートが存在しますが、再生成できます`)
            }
        } else {
            console.log(`\n   ⚠️  データ不足でレポート作成できません`)
            if (!hasPhotos) {
                console.log(`   - 写真のアップロードが必要です`)
            }
            if (!hasDiagnosisData) {
                console.log(`   - 診断データの入力が必要です`)
            }
        }

        console.log('\n' + '-'.repeat(100))
    }

    console.log('\n' + '='.repeat(100))
    console.log('✨ 確認完了\n')
}

checkIncompleteVisits()
    .catch(console.error)
    .finally(() => process.exit(0))
