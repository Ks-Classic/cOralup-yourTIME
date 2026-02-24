import { config } from 'dotenv'
import { db } from '../src/db'
import {
    children,
    visits,
    reports,
    diagnoses,
    questionnaires,
    visitPhotos,
    lineMessageLogs,
    questionnaireResponses,
    diagnosisResponses
} from '../src/db/schema'
import { eq, sql } from 'drizzle-orm'

config({ path: '.env.local' })

const CHILD_ID = '089b183f-29a3-4096-875e-c588e2ebabe3' // 河内 佑友くん

async function analyzeKawachiRecords() {
    console.log('📊 河内 佑友くんの診断記録を分析しています...\n')
    console.log('='.repeat(80))

    // 1. 基本情報
    const child = await db.select().from(children).where(eq(children.id, CHILD_ID)).limit(1)
    if (child.length === 0) {
        console.log('❌ お子さんが見つかりません')
        return
    }

    console.log('\n👶 お子さん情報:')
    console.log(`   名前: ${child[0].lastName} ${child[0].firstName} (${child[0].lastNameKana} ${child[0].firstNameKana})`)
    console.log(`   誕生日: ${child[0].birthday}`)
    console.log(`   性別: ${child[0].gender}`)
    console.log(`   作成日: ${child[0].createdAt}`)

    // 2. Visits（診断セッション）
    console.log('\n\n' + '='.repeat(80))
    console.log('📅 診断セッション (visits):')
    console.log('='.repeat(80))

    const visitRecords = await db.select().from(visits).where(eq(visits.childId, CHILD_ID))

    if (visitRecords.length === 0) {
        console.log('❌ 診断セッションの記録がありません')
    } else {
        console.log(`✅ ${visitRecords.length}件の診断セッションが見つかりました:\n`)

        for (const [idx, visit] of visitRecords.entries()) {
            console.log(`\n[セッション ${idx + 1}]`)
            console.log(`  Session ID: ${visit.sessionId}`)
            console.log(`  Visit ID: ${visit.id}`)
            console.log(`  来場日: ${visit.visitDate}`)
            console.log(`  ステータス: ${visit.status}`)
            console.log(`  現在のステップ: ${visit.currentStep}`)
            console.log(`  お子さんの月齢: ${visit.childAgeMonths}ヶ月`)
            console.log(`  受付番号: ${visit.receptionNumber}`)
            console.log(`  ブース番号: ${visit.boothNumber}`)
            console.log(`  レポート送信日時: ${visit.reportSentAt || '未送信'}`)
            console.log(`  作成日: ${visit.createdAt}`)

            if (visit.stepTimestamps) {
                console.log(`  ステップタイムスタンプ:`)
                console.log(`    ${JSON.stringify(visit.stepTimestamps, null, 4).replace(/^/gm, '    ')}`)
            }

            if (visit.errorInfo) {
                console.log(`  ⚠️  エラー情報: ${JSON.stringify(visit.errorInfo)}`)
            }

            // 3. このvisitに関連するレポート
            console.log(`\n  📄 関連レポート:`)
            const visitReports = await db.select().from(reports).where(eq(reports.visitId, visit.id))

            if (visitReports.length === 0) {
                console.log(`     ❌ レポートが作成されていません`)
            } else {
                for (const report of visitReports) {
                    console.log(`\n     [レポート]`)
                    console.log(`     - ID: ${report.id}`)
                    console.log(`     - タイプ: ${report.reportType}`)
                    console.log(`     - ステータス: ${report.status}`)
                    console.log(`     - 生成日時: ${report.generatedAt}`)
                    console.log(`     - LINE送信済み: ${report.sentToLine ? 'はい' : 'いいえ'}`)
                    console.log(`     - 送信日時: ${report.sentAt || '未送信'}`)

                    if (report.aiSummary) {
                        console.log(`\n     【AIサマリー】`)
                        console.log(`     ${report.aiSummary.replace(/^/gm, '     ')}`)
                    }

                    if (report.ageConsideration) {
                        console.log(`\n     【年齢考慮】`)
                        console.log(`     ${report.ageConsideration.replace(/^/gm, '     ')}`)
                    }

                    if (report.postureAnalysis) {
                        console.log(`\n     【姿勢分析】`)
                        console.log(`     ${JSON.stringify(report.postureAnalysis, null, 2).replace(/^/gm, '     ')}`)
                    }

                    if (report.oralAnalysis) {
                        console.log(`\n     【口腔分析】`)
                        console.log(`     ${JSON.stringify(report.oralAnalysis, null, 2).replace(/^/gm, '     ')}`)
                    }
                }
            }

            // 4. 診断データ（レガシー形式）
            console.log(`\n  🔍 診断データ (diagnoses):`)
            const diagnosisRecords = await db.select().from(diagnoses).where(eq(diagnoses.visitId, visit.id))

            if (diagnosisRecords.length === 0) {
                console.log(`     ❌ 診断データがありません`)
            } else {
                for (const diagnosis of diagnosisRecords) {
                    console.log(`\n     [診断]`)
                    console.log(`     - ID: ${diagnosis.id}`)
                    console.log(`     - Session ID: ${diagnosis.sessionId}`)
                    console.log(`     - 作成日: ${diagnosis.createdAt}`)

                    if (diagnosis.aiAnalysis) {
                        console.log(`\n     【AI分析】`)
                        console.log(`     ${diagnosis.aiAnalysis.replace(/^/gm, '     ')}`)
                    }

                    if (diagnosis.staffNotes) {
                        console.log(`\n     【スタッフメモ】`)
                        console.log(`     ${diagnosis.staffNotes.replace(/^/gm, '     ')}`)
                    }

                    if (diagnosis.postureAnalysis) {
                        console.log(`\n     【姿勢分析（診断）】`)
                        console.log(`     ${JSON.stringify(diagnosis.postureAnalysis, null, 2).replace(/^/gm, '     ')}`)
                    }

                    if (diagnosis.oralAnalysis) {
                        console.log(`\n     【口腔分析（診断）】`)
                        console.log(`     ${JSON.stringify(diagnosis.oralAnalysis, null, 2).replace(/^/gm, '     ')}`)
                    }

                    if (diagnosis.diagnosisItems) {
                        console.log(`\n     【診断項目】`)
                        console.log(`     ${JSON.stringify(diagnosis.diagnosisItems, null, 2).replace(/^/gm, '     ')}`)
                    }

                    if (diagnosis.photos) {
                        console.log(`\n     【写真情報】`)
                        console.log(`     ${JSON.stringify(diagnosis.photos, null, 2).replace(/^/gm, '     ')}`)
                    }
                }
            }

            // 5. 診断回答（新形式）
            console.log(`\n  📝 診断回答 (diagnosis_responses):`)
            const diagResponses = await db.select().from(diagnosisResponses).where(eq(diagnosisResponses.visitId, visit.id))

            if (diagResponses.length === 0) {
                console.log(`     ❌ 診断回答がありません`)
            } else {
                console.log(`     ✅ ${diagResponses.length}件の診断回答`)
                for (const response of diagResponses) {
                    console.log(`     - 項目ID: ${response.itemId}, 値: ${response.value}`)
                }
            }

            // 6. 問診票データ（レガシー形式）
            console.log(`\n  📋 問診票 (questionnaires):`)
            const questionnaireRecords = await db.select().from(questionnaires).where(eq(questionnaires.visitId, visit.id))

            if (questionnaireRecords.length === 0) {
                console.log(`     ❌ 問診票データがありません`)
            } else {
                for (const questionnaire of questionnaireRecords) {
                    console.log(`\n     [問診票]`)
                    console.log(`     - お子さん名: ${questionnaire.childName}`)
                    console.log(`     - お子さん年齢: ${questionnaire.childAge}歳`)
                    console.log(`     - 性別: ${questionnaire.childGender}`)
                    console.log(`     - 保護者名: ${questionnaire.parentName}`)
                    console.log(`     - 電話番号: ${questionnaire.parentPhone}`)
                    console.log(`     - 既往歴: ${questionnaire.medicalHistory}`)
                    console.log(`     - 気になること: ${questionnaire.concerns}`)
                    console.log(`     - 理想の状態: ${questionnaire.idealGoals}`)
                    console.log(`     - 備考: ${questionnaire.notes || 'なし'}`)
                }
            }

            // 7. 問診回答（新形式）
            console.log(`\n  ✍️  問診回答 (questionnaire_responses):`)
            const questionnaireResps = await db.select().from(questionnaireResponses).where(eq(questionnaireResponses.visitId, visit.id))

            if (questionnaireResps.length === 0) {
                console.log(`     ❌ 問診回答がありません`)
            } else {
                console.log(`     ✅ ${questionnaireResps.length}件の問診回答`)
                for (const response of questionnaireResps) {
                    console.log(`     - 項目ID: ${response.itemId}, 値: ${response.value}`)
                }
            }

            // 8. 写真
            console.log(`\n  📸 写真 (visit_photos):`)
            const photos = await db.select().from(visitPhotos).where(eq(visitPhotos.visitId, visit.id))

            if (photos.length === 0) {
                console.log(`     ❌ 写真がアップロードされていません`)
            } else {
                console.log(`     ✅ ${photos.length}枚の写真`)
                for (const photo of photos) {
                    console.log(`     - タイプ: ${photo.photoType}`)
                    console.log(`       パス: ${photo.storagePath}`)
                    console.log(`       URL: ${photo.publicUrl}`)
                    if (photo.metadata) {
                        console.log(`       メタデータ: ${JSON.stringify(photo.metadata)}`)
                    }
                }
            }

            // 9. LINE送信ログ
            console.log(`\n  📱 LINE送信ログ (line_message_logs):`)
            const lineLogs = await db.select().from(lineMessageLogs).where(eq(lineMessageLogs.visitId, visit.id))

            if (lineLogs.length === 0) {
                console.log(`     ❌ LINE送信履歴がありません`)
            } else {
                console.log(`     ✅ ${lineLogs.length}件のLINE送信履歴`)
                for (const log of lineLogs) {
                    console.log(`\n     [LINE送信]`)
                    console.log(`     - タイプ: ${log.messageType}`)
                    console.log(`     - ステータス: ${log.status}`)
                    console.log(`     - 送信日時: ${log.sentAt}`)
                    console.log(`     - スタッフ確認: ${log.staffConfirmationStatus || '未確認'}`)
                    if (log.errorMessage) {
                        console.log(`     - ⚠️  エラー: ${log.errorMessage}`)
                    }
                }
            }

            console.log('\n' + '-'.repeat(80))
        }
    }

    console.log('\n\n' + '='.repeat(80))
    console.log('✨ 分析完了')
    console.log('='.repeat(80))
}

analyzeKawachiRecords()
    .catch(console.error)
    .finally(() => process.exit(0))
