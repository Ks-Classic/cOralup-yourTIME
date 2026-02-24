import { config } from 'dotenv'
import { db } from '../src/db'
import { reports, visits, children, profiles, lineMessageLogs } from '../src/db/schema'
import { eq, and, or, isNull, desc } from 'drizzle-orm'
import * as fs from 'fs'

config({ path: '.env.local' })

const APP_URL = 'https://coralup-yourtime.vercel.app'

interface UnsentReportWithStaff {
    reportId: string
    visitId: string
    childName: string
    childAge: number | null
    parentName: string
    parentLineUserId: string | null
    staffName: string | null
    staffProfileId: string | null
    lineStatus: string | null
    lineError: string | null
    reportUrl: string
    createdAt: Date | null
}

async function extractUnsentReportsWithStaff() {
    console.log('🔍 LINE未送信レポート（スタッフ情報付き）を抽出しています...\n')
    console.log('='.repeat(100))

    // 効率的なクエリ
    const results = await db
        .select({
            reportId: reports.id,
            visitId: reports.visitId,
            sessionId: reports.sessionId,
            reportStatus: reports.status,
            sentToLine: reports.sentToLine,
            reportCreatedAt: reports.createdAt,
            visitStaffProfileId: visits.staffProfileId,
            childId: children.id,
            childFirstName: children.firstName,
            childLastName: children.lastName,
            childBirthday: children.birthday,
            childAgeMonths: visits.childAgeMonths,
            childParentProfileId: children.parentProfileId,
        })
        .from(reports)
        .leftJoin(visits, eq(reports.visitId, visits.id))
        .leftJoin(children, eq(visits.childId, children.id))
        .where(eq(reports.status, 'completed'))

    console.log(`📊 完成済みレポート総数: ${results.length}件`)

    const unsentReports: UnsentReportWithStaff[] = []

    for (const result of results) {
        if (!result.visitId) {
            continue
        }

        // Child名の組み立て
        const childLastName = result.childLastName || ''
        const childFirstName = result.childFirstName || ''
        const childName = `${childLastName} ${childFirstName}`.trim() || '不明'

        // 年齢計算
        let childAge: number | null = null
        if (result.childAgeMonths) {
            childAge = Math.floor(result.childAgeMonths / 12)
        } else if (result.childBirthday) {
            const birthDate = new Date(result.childBirthday)
            const today = new Date()
            childAge = today.getFullYear() - birthDate.getFullYear()
            const monthDiff = today.getMonth() - birthDate.getMonth()
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                childAge--
            }
        }

        // Parent情報取得
        let parentName = '不明'
        let parentLineUserId: string | null = null
        if (result.childParentProfileId) {
            const parentProfiles = await db
                .select()
                .from(profiles)
                .where(eq(profiles.id, result.childParentProfileId))
                .limit(1)

            if (parentProfiles.length > 0) {
                const parent = parentProfiles[0]
                const parentLastName = parent.lastName || ''
                const parentFirstName = parent.firstName || ''
                parentName = parent.displayName || `${parentLastName} ${parentFirstName}`.trim() || '不明'
                parentLineUserId = parent.lineUserId
            }
        }

        // Staff情報取得
        let staffName: string | null = null
        if (result.visitStaffProfileId) {
            const staffProfiles = await db
                .select()
                .from(profiles)
                .where(eq(profiles.id, result.visitStaffProfileId))
                .limit(1)

            if (staffProfiles.length > 0) {
                const staff = staffProfiles[0]
                const staffLastName = staff.lastName || ''
                const staffFirstName = staff.firstName || ''
                staffName = staff.displayName || `${staffLastName} ${staffFirstName}`.trim() || null
            }
        }

        // LINE送信ログ確認（最新のもののみ）
        let lineStatus: string | null = null
        let lineError: string | null = null

        const lineLogs = await db
            .select()
            .from(lineMessageLogs)
            .where(and(
                eq(lineMessageLogs.visitId, result.visitId),
                eq(lineMessageLogs.messageType, 'report')
            ))
            .orderBy(desc(lineMessageLogs.createdAt))
            .limit(1)

        if (lineLogs.length > 0) {
            const latestLog = lineLogs[0]
            lineStatus = latestLog.status || null
            lineError = latestLog.errorMessage || null
        }

        // 判定: LINE送信ログの最新ステータスで決定
        if (lineStatus !== 'success') {
            // failed または 送信試行なし → 未送信
            unsentReports.push({
                reportId: result.reportId!,
                visitId: result.visitId,
                childName,
                childAge,
                parentName,
                parentLineUserId,
                staffName,
                staffProfileId: result.visitStaffProfileId,
                lineStatus,
                lineError,
                reportUrl: `${APP_URL}/report/${result.visitId}`,
                createdAt: result.reportCreatedAt,
            })
        }

        // 進捗表示
        if (unsentReports.length % 5 === 0 && unsentReports.length > 0) {
            console.log(`   処理中... 未送信${unsentReports.length}件検出`)
        }
    }

    console.log('\n' + '='.repeat(100))
    console.log(`\n🚨 LINE未送信レポート: ${unsentReports.length}件\n`)
    console.log('='.repeat(100))

    // コンソール出力
    console.log('\n📋 未送信レポート一覧（スタッフ情報付き）:\n')
    unsentReports.forEach((report, idx) => {
        console.log(`[${idx + 1}] ${report.childName}（${report.childAge || '?'}歳）`)
        console.log(`    親御さん: ${report.parentName}`)
        if (report.parentLineUserId) {
            console.log(`    LINE ID: ${report.parentLineUserId}`)
        }
        console.log(`    担当スタッフ: ${report.staffName || '不明'}`)
        console.log(`    レポートURL: ${report.reportUrl}`)
        console.log(`    作成日: ${report.createdAt}`)
        console.log(`    LINE送信状態: ${report.lineStatus || '未試行'}`)
        if (report.lineError) {
            console.log(`    ⚠️  エラー: ${report.lineError}`)
        }
        console.log()
    })

    // CSV出力
    const csvLines = [
        '番号,お子さん名,年齢,親御さん名,LINE ID,担当スタッフ,レポートURL,作成日,LINE状態,エラー内容'
    ]

    unsentReports.forEach((report, idx) => {
        const errorMsg = report.lineError ? report.lineError.replace(/"/g, '""') : ''
        const lineUserId = report.parentLineUserId || ''
        const staffName = report.staffName || '不明'
        csvLines.push(
            `${idx + 1},"${report.childName}",${report.childAge || ''},"${report.parentName}","${lineUserId}","${staffName}","${report.reportUrl}","${report.createdAt}","${report.lineStatus || '未試行'}","${errorMsg}"`
        )
    })

    const csvContent = csvLines.join('\n')
    const csvPath = './unsent_reports_with_staff.csv'
    fs.writeFileSync(csvPath, csvContent, 'utf-8')

    console.log('='.repeat(100))
    console.log(`\n💾 CSV出力完了: ${csvPath}`)
    console.log(`   未送信レポート: ${unsentReports.length}件`)
    console.log('='.repeat(100))

    // Markdown形式でも出力
    const mdLines = [
        '# LINE未送信レポート一覧（スタッフ情報付き）',
        '',
        `**抽出日時**: ${new Date().toLocaleString('ja-JP')}  `,
        `**未送信件数**: ${unsentReports.length}件`,
        '',
        '---',
        '',
        '## 📋 未送信レポート一覧',
        '',
        '| No. | お子さん名 | 年齢 | 親御さん名 | LINE ID | 担当スタッフ | レポートURL | 作成日 | LINE状態 | エラー |',
        '|-----|-----------|------|-----------|---------|------------|------------|--------|---------|--------|'
    ]

    unsentReports.forEach((report, idx) => {
        const url = report.reportUrl
        const errorMsg = report.lineError ? report.lineError.substring(0, 40) : '-'
        const createdDate = report.createdAt ? new Date(report.createdAt).toLocaleDateString('ja-JP') : '-'
        const lineId = report.parentLineUserId ? report.parentLineUserId.substring(0, 15) + '...' : '-'
        const staffName = report.staffName || '不明'
        mdLines.push(
            `| ${idx + 1} | ${report.childName} | ${report.childAge || '?'}歳 | ${report.parentName} | ${lineId} | ${staffName} | [リンク](${url}) | ${createdDate} | ${report.lineStatus || '未試行'} | ${errorMsg} |`
        )
    })

    mdLines.push('')
    mdLines.push('---')
    mdLines.push('')
    mdLines.push('## 📊 スタッフ別の未送信件数')
    mdLines.push('')

    // スタッフ別集計
    const staffCounts = new Map<string, number>()
    unsentReports.forEach(report => {
        const staff = report.staffName || '不明'
        staffCounts.set(staff, (staffCounts.get(staff) || 0) + 1)
    })

    const sortedStaff = Array.from(staffCounts.entries()).sort((a, b) => b[1] - a[1])
    sortedStaff.forEach(([staff, count]) => {
        mdLines.push(`- **${staff}**: ${count}件`)
    })

    const mdPath = './unsent_reports_with_staff.md'
    fs.writeFileSync(mdPath, mdLines.join('\n'), 'utf-8')
    console.log(`💾 Markdown出力完了: ${mdPath}\n`)

    // スタッフ別サマリーの表示
    console.log('\n📊 スタッフ別の未送信件数:\n')
    sortedStaff.forEach(([staff, count]) => {
        console.log(`   ${staff}: ${count}件`)
    })
    console.log()
}

extractUnsentReportsWithStaff()
    .catch(console.error)
    .finally(() => process.exit(0))
