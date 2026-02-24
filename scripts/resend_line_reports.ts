import { config } from 'dotenv'
import * as fs from 'fs'
import * as readline from 'readline'

config({ path: '.env.local' })

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://coralup-yourtime.vercel.app'
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN

// 未送信レポートのCSVを読み込む
interface UnsentReport {
    no: number
    childName: string
    age: string
    parentName: string
    lineUserId: string
    reportUrl: string
    createdAt: string
    lineStatus: string
    sentToLineFlag: string
    error: string
}

async function resendReports() {
    console.log('🔄 LINE未送信レポートの再送信スクリプト\n')
    console.log('='.repeat(100))

    // アクセストークン確認
    if (!LINE_CHANNEL_ACCESS_TOKEN) {
        console.error('❌ LINE_MESSAGING_CHANNEL_ACCESS_TOKEN が設定されていません')
        console.error('   .env.local を確認してください')
        process.exit(1)
    }

    // CSVファイル読み込み
    const csvPath = './unsent_reports.csv'
    if (!fs.existsSync(csvPath)) {
        console.error(`❌ ${csvPath} が見つかりません`)
        console.error('   先に extract_unsent_reports.ts を実行してください')
        process.exit(1)
    }

    const fileContent = fs.readFileSync(csvPath, 'utf-8')
    const lines = fileContent.split('\n').slice(1) // ヘッダーをスキップ

    const reports: UnsentReport[] = []
    for (const line of lines) {
        if (!line.trim()) continue

        // CSVパース（簡易版）
        const match = line.match(/^(\d+),"([^"]+)",(\d*|),"([^"]*)","([^"]*)","([^"]+)","([^"]+)","([^"]+)","([^"]+)","([^"]*)"/)
        if (match) {
            reports.push({
                no: parseInt(match[1]),
                childName: match[2],
                age: match[3],
                parentName: match[4],
                lineUserId: match[5],
                reportUrl: match[6],
                createdAt: match[7],
                lineStatus: match[8],
                sentToLineFlag: match[9],
                error: match[10],
            })
        }
    }

    console.log(`📋 未送信レポート: ${reports.length}件\n`)

    if (reports.length === 0) {
        console.log('✅ 未送信レポートはありません')
        return
    }

    // LINE IDがないレポートを除外
    const sendableReports = reports.filter(r => r.lineUserId && r.lineUserId.startsWith('U'))
    const unsendableReports = reports.filter(r => !r.lineUserId || !r.lineUserId.startsWith('U'))

    if (unsendableReports.length > 0) {
        console.log(`⚠️ LINE IDがないため送信不可: ${unsendableReports.length}件`)
        unsendableReports.forEach(r => {
            console.log(`   - ${r.childName}（親御さん: ${r.parentName}）`)
        })
        console.log()
    }

    console.log(`✅ 送信可能: ${sendableReports.length}件\n`)
    console.log('='.repeat(100))

    // 確認プロンプト
    console.log(`\n📨 以下のメッセージで ${sendableReports.length}件のレポートを送信します:\n`)
    console.log('─'.repeat(80))
    console.log(`12/21の大阪YourTIME cOral upブースへのご来場ありがとうございました。`)
    console.log(`当日の診断レポートが遅くなり、大変申し訳ありません。`)
    console.log(`以下URLよりご確認いただければと思います。`)
    console.log(`何か気になる点や追加サポートご希望の場合はお気軽にご連絡ください。`)
    console.log()
    console.log(`[レポートURL]`)
    console.log('─'.repeat(80))
    console.log()

    // ユーザー確認
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    })

    const answer = await new Promise<string>((resolve) => {
        rl.question('実行してよろしいですか？ (yes/no): ', resolve)
    })
    rl.close()

    if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
        console.log('\n❌ キャンセルしました')
        return
    }

    console.log('\n' + '='.repeat(100))
    console.log('🚀 送信開始...\n')

    let successCount = 0
    let failedCount = 0
    const results: Array<{ report: UnsentReport; success: boolean; error?: string }> = []

    for (const report of sendableReports) {
        const visitId = report.reportUrl.split('/').pop() || ''

        console.log(`[${report.no}/${sendableReports.length}] ${report.childName}さん（親御さん: ${report.parentName}）`)
        console.log(`   LINE ID: ${report.lineUserId}`)
        console.log(`   URL: ${report.reportUrl}`)

        try {
            // カスタムメッセージ作成
            const messages = [
                {
                    type: 'text',
                    text: `12/21の大阪YourTIME cOral upブースへのご来場ありがとうございました。\n当日の診断レポートが遅くなり、大変申し訳ありません。\n以下URLよりご確認いただければと思います。\n何か気になる点や追加サポートご希望の場合はお気軽にご連絡ください。\n\n${report.reportUrl}`
                }
            ]

            const response = await fetch('https://api.line.me/v2/bot/message/push', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
                },
                body: JSON.stringify({
                    to: report.lineUserId,
                    messages
                })
            })

            const responseData = await response.json().catch(() => ({}))

            if (response.ok) {
                console.log(`   ✅ 送信成功`)
                successCount++
                results.push({ report, success: true })
            } else {
                const errorMsg = JSON.stringify(responseData)
                console.log(`   ❌ 送信失敗: ${errorMsg}`)
                failedCount++
                results.push({ report, success: false, error: errorMsg })
            }

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error)
            console.log(`   ❌ エラー: ${errorMsg}`)
            failedCount++
            results.push({ report, success: false, error: errorMsg })
        }

        console.log()

        // レート制限対策: 1秒待機
        await new Promise(resolve => setTimeout(resolve, 1000))
    }

    console.log('='.repeat(100))
    console.log(`\n📊 送信結果:`)
    console.log(`   ✅ 成功: ${successCount}件`)
    console.log(`   ❌ 失敗: ${failedCount}件`)
    console.log(`   合計: ${sendableReports.length}件`)

    // 結果をファイルに保存
    const resultLines = [
        '# LINE再送信結果',
        '',
        `**実行日時**: ${new Date().toLocaleString('ja-JP')}`,
        `**送信成功**: ${successCount}件`,
        `**送信失敗**: ${failedCount}件`,
        '',
        '---',
        '',
        '## ✅ 送信成功',
        '',
    ]

    const successReports = results.filter(r => r.success)
    if (successReports.length > 0) {
        successReports.forEach(({ report }) => {
            resultLines.push(`- ${report.childName}（${report.parentName}） - ${report.reportUrl}`)
        })
    } else {
        resultLines.push('なし')
    }

    resultLines.push('')
    resultLines.push('## ❌ 送信失敗')
    resultLines.push('')

    const failedReports = results.filter(r => !r.success)
    if (failedReports.length > 0) {
        failedReports.forEach(({ report, error }) => {
            resultLines.push(`- ${report.childName}（${report.parentName}）`)
            resultLines.push(`  - URL: ${report.reportUrl}`)
            resultLines.push(`  - エラー: ${error}`)
            resultLines.push('')
        })
    } else {
        resultLines.push('なし')
    }

    const resultPath = './resend_results.md'
    fs.writeFileSync(resultPath, resultLines.join('\n'), 'utf-8')
    console.log(`\n💾 結果を保存しました: ${resultPath}`)
    console.log('='.repeat(100))
}

resendReports()
    .catch(console.error)
    .finally(() => process.exit(0))
