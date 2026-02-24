import { config } from 'dotenv'
// 環境変数を先にロードしてからdbをインポート
config({ path: '.env.local' })

import { db } from '../src/db'
import { reports, visits, children, profiles, lineMessageLogs } from '../src/db/schema'
import { eq, and, or, isNull, sql, desc } from 'drizzle-orm'
import * as fs from 'fs'

const APP_URL = 'https://coralup-yourtime.vercel.app'

interface UnsentReport {
    reportId: string
    visitId: string
    sessionId: string | null
    childName: string
    parentName: string
    parentLineUserId: string | null
    parentAvatarUrl: string | null
    childAge: number | null
    reportStatus: string | null
    createdAt: Date | null
    lineStatus: string | null
    lineError: string | null
    reportUrl: string
    sentToLineFlag: boolean | null
}

async function extractUnsentReports() {
    console.log('🔍 LINE未送信レポートを抽出しています...\n')
    console.log('='.repeat(100))
    console.log('\n📝 判定基準:')
    console.log('   - LINE送信ログの最新ステータスが "success" → 送信済み（除外）')
    console.log('   - LINE送信ログの最新ステータスが "failed" → 未送信（抽出）')
    console.log('   - LINE送信ログが存在しない → 未送信（抽出）')
    console.log('   ※ reports.sentToLine フラグは参考情報のみ（同期されていない可能性あり）\n')
    console.log('='.repeat(100))

    // 効率的なクエリ: JOINを使って一度に全データ取得
    // 注意: visits.parentProfileId はNULLなので、children.parentProfileId 経由で親情報を取得
    const results = await db
        .select({
            reportId: reports.id,
            visitId: reports.visitId,
            sessionId: reports.sessionId,
            reportStatus: reports.status,
            sentToLine: reports.sentToLine,
            reportCreatedAt: reports.createdAt,
            childId: children.id,
            childFirstName: children.firstName,
            childLastName: children.lastName,
            childBirthday: children.birthday,
            childAgeMonths: visits.childAgeMonths,
            childParentProfileId: children.parentProfileId,
            parentId: profiles.id,
            parentFirstName: profiles.firstName,
            parentLastName: profiles.lastName,
            parentDisplayName: profiles.displayName,
            parentLineUserId: profiles.lineUserId,
            parentAvatarUrl: profiles.avatarUrl,
        })
        .from(reports)
        .leftJoin(visits, eq(reports.visitId, visits.id))
        .leftJoin(children, eq(visits.childId, children.id))
        .leftJoin(profiles, eq(children.parentProfileId, profiles.id))
        .where(eq(reports.status, 'completed'))

    console.log(`📊 完成済みレポート総数: ${results.length}件`)

    const unsentReports: UnsentReport[] = []
    const sentReports: UnsentReport[] = []

    for (const result of results) {
        if (!result.visitId) {
            console.log(`⚠️  Visit not found for report ${result.reportId}`)
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

        // Parent名の組み立て
        const parentLastName = result.parentLastName || ''
        const parentFirstName = result.parentFirstName || ''
        const parentName = result.parentDisplayName || `${parentLastName} ${parentFirstName}`.trim() || '不明'

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

        const reportData: UnsentReport = {
            reportId: result.reportId!,
            visitId: result.visitId,
            sessionId: result.sessionId,
            childName,
            parentName,
            parentLineUserId: result.parentLineUserId,
            parentAvatarUrl: result.parentAvatarUrl,
            childAge,
            reportStatus: result.reportStatus,
            createdAt: result.reportCreatedAt,
            lineStatus,
            lineError,
            reportUrl: `${APP_URL}/report/${result.visitId}`,
            sentToLineFlag: result.sentToLine,
        }

        // 判定: LINE送信ログの最新ステータスで決定
        if (lineStatus === 'success') {
            sentReports.push(reportData)
        } else {
            // failed または 送信試行なし → 未送信
            unsentReports.push(reportData)
        }

        // 進捗表示
        const processed = unsentReports.length + sentReports.length
        if (processed % 10 === 0) {
            console.log(`   処理中... ${processed}/${results.length}件`)
        }
    }

    console.log('\n' + '='.repeat(100))
    console.log(`\n📊 分類結果:`)
    console.log(`   ✅ 送信済み: ${sentReports.length}件`)
    console.log(`   ❌ 未送信: ${unsentReports.length}件`)
    console.log(`   合計: ${results.length}件`)
    console.log('\n' + '='.repeat(100))

    if (unsentReports.length === 0) {
        console.log('\n✅ すべてのレポートがLINEに送信されています！')
        return
    }

    // 未送信レポートのコンソール出力
    console.log('\n📋 未送信レポート一覧:\n')
    unsentReports.forEach((report, idx) => {
        console.log(`[${idx + 1}] ${report.childName}（${report.childAge || '?'}歳） - 親御さん: ${report.parentName}`)
        if (report.parentLineUserId) {
            console.log(`    LINE ID: ${report.parentLineUserId}`)
        }
        console.log(`    レポートURL: ${report.reportUrl}`)
        console.log(`    作成日: ${report.createdAt}`)
        console.log(`    LINE送信状態: ${report.lineStatus || '未試行'}`)
        console.log(`    sentToLineフラグ: ${report.sentToLineFlag}`)
        if (report.lineError) {
            console.log(`    ⚠️  エラー: ${report.lineError}`)
        }
        console.log()
    })

    // CSV出力
    const csvLines = [
        '番号,お子さん名,年齢,親御さん名,LINE ID,レポートURL,作成日,LINE状態,sentToLineフラグ,エラー内容'
    ]

    unsentReports.forEach((report, idx) => {
        const errorMsg = report.lineError ? report.lineError.replace(/"/g, '""') : ''
        const lineUserId = report.parentLineUserId || ''
        csvLines.push(
            `${idx + 1},"${report.childName}",${report.childAge || ''},"${report.parentName}","${lineUserId}","${report.reportUrl}","${report.createdAt}","${report.lineStatus || '未試行'}","${report.sentToLineFlag}","${errorMsg}"`
        )
    })

    const csvContent = csvLines.join('\n')
    const csvPath = './unsent_reports.csv'
    fs.writeFileSync(csvPath, csvContent, 'utf-8')

    console.log('='.repeat(100))
    console.log(`\n💾 CSV出力完了: ${csvPath}`)
    console.log(`   未送信レポート: ${unsentReports.length}件`)
    console.log('\n📌 次のアクション:')
    console.log('   1. LINE Messaging APIの制限を確認')
    console.log('   2. 必要に応じてプランをアップグレード')
    console.log('   3. 各レポートを手動または一括で再送信')
    console.log('='.repeat(100))

    // Markdown形式でも出力
    const mdLines = [
        '# LINE未送信レポート一覧',
        '',
        `**抽出日時**: ${new Date().toLocaleString('ja-JP')}  `,
        `**未送信件数**: ${unsentReports.length}件  `,
        `**送信済み件数**: ${sentReports.length}件  `,
        `**合計**: ${results.length}件`,
        '',
        '---',
        '',
        '## 📊 判定基準',
        '',
        '- **送信済み**: LINE送信ログの最新ステータスが `success`',
        '- **未送信**: LINE送信ログの最新ステータスが `failed` または送信試行なし',
        '- ⚠️ `reports.sentToLine` フラグは実際の送信状態と同期していない場合あり',
        '',
        '---',
        '',
        '## 📋 未送信レポート一覧',
        '',
        '| No. | お子さん名 | 年齢 | 親御さん名 | LINE ID | レポートURL | 作成日 | LINE状態 | sentToLineフラグ | エラー |',
        '|-----|-----------|------|-----------|---------|------------|--------|---------|----------------|--------|'
    ]

    unsentReports.forEach((report, idx) => {
        const url = report.reportUrl
        const errorMsg = report.lineError ? report.lineError.substring(0, 50) : '-'
        const createdDate = report.createdAt ? new Date(report.createdAt).toLocaleDateString('ja-JP') : '-'
        const lineId = report.parentLineUserId ? report.parentLineUserId.substring(0, 20) + '...' : '-'
        mdLines.push(
            `| ${idx + 1} | ${report.childName} | ${report.childAge || '?'}歳 | ${report.parentName} | ${lineId} | [リンク](${url}) | ${createdDate} | ${report.lineStatus || '未試行'} | ${report.sentToLineFlag} | ${errorMsg} |`
        )
    })

    mdLines.push('')
    mdLines.push('---')
    mdLines.push('')
    mdLines.push('## 💡 推奨アクション')
    mdLines.push('')
    mdLines.push('1. **LINE APIの制限確認**')
    mdLines.push('   - 現在のプランと月次送信制限を確認')
    mdLines.push('   - 必要に応じて上位プランへ移行')
    mdLines.push('')
    mdLines.push('2. **再送信の実施**')
    mdLines.push('   - 手動で各レポートを再送信')
    mdLines.push('   - または一括再送信スクリプトの作成')
    mdLines.push('')
    mdLines.push('3. **親御さんへの連絡**')
    mdLines.push('   - LINE以外の方法（メール等）でレポートURLを共有')
    mdLines.push('   - 診断結果が確認できることをお知らせ')
    mdLines.push('')
    mdLines.push('4. **データ同期の改善**')
    mdLines.push('   - LINE送信成功時に `reports.sentToLine = true` へ確実に更新する処理を追加')
    mdLines.push('   - 定期的にLINE送信ログと reports テーブルの同期を確認')

    const mdPath = './unsent_reports.md'
    fs.writeFileSync(mdPath, mdLines.join('\n'), 'utf-8')
    console.log(`💾 Markdown出力完了: ${mdPath}\n`)

    // 統計情報も出力
    const statsLines = [
        '# LINE送信状態の統計',
        '',
        `**分析日時**: ${new Date().toLocaleString('ja-JP')}`,
        '',
        '## 📊 全体統計',
        '',
        `- **完成済みレポート総数**: ${results.length}件`,
        `- **送信済み**: ${sentReports.length}件 (${((sentReports.length / results.length) * 100).toFixed(1)}%)`,
        `- **未送信**: ${unsentReports.length}件 (${((unsentReports.length / results.length) * 100).toFixed(1)}%)`,
        '',
        '## 🔍 未送信の内訳',
        '',
    ]

    const failedCount = unsentReports.filter(r => r.lineStatus === 'failed').length
    const neverTriedCount = unsentReports.filter(r => !r.lineStatus).length

    statsLines.push(`- **送信試行して失敗**: ${failedCount}件`)
    statsLines.push(`- **送信未試行**: ${neverTriedCount}件`)
    statsLines.push('')
    statsLines.push('## ⚠️ データ整合性の問題')
    statsLines.push('')

    const successButFlagFalse = sentReports.filter(r => r.sentToLineFlag === false).length
    const failedButFlagTrue = unsentReports.filter(r => r.sentToLineFlag === true).length

    statsLines.push(`- **送信成功だが sentToLine=false**: ${successButFlagFalse}件 ⚠️`)
    statsLines.push(`- **未送信だが sentToLine=true**: ${failedButFlagTrue}件 ⚠️`)

    const statsPath = './line_sending_stats.md'
    fs.writeFileSync(statsPath, statsLines.join('\n'), 'utf-8')
    console.log(`💾 統計情報出力: ${statsPath}\n`)
}

extractUnsentReports()
    .catch(console.error)
    .finally(() => process.exit(0))
