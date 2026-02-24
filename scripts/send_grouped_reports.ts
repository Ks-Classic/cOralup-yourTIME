import { config } from 'dotenv'
// 環境変数を先にロード
config({ path: '.env.local' })

import * as readline from 'readline'

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN

// 家族ごとのレポートデータ
interface FamilyReport {
    parentName: string
    lineUserId: string
    children: Array<{
        name: string
        suffix: string  // くん/ちゃん
        reportUrl: string
    }>
}

// 10家族分のデータ（木幡を除外、南さんに里呼ちゃんを追加）
const FAMILY_REPORTS: FamilyReport[] = [
    {
        parentName: 'みなみ ゆうこ（つやえみ😆👄）',
        lineUserId: 'Uad27737995a25a4783cd1de8dae865cf',
        children: [
            { name: '里呼', suffix: 'ちゃん', reportUrl: 'https://coralup-yourtime.vercel.app/report/04eab84c-dd0a-449c-b07a-9dede64b0edc' },
            { name: '瑛斗', suffix: 'くん', reportUrl: 'https://coralup-yourtime.vercel.app/report/7f4b886d-5c36-43fb-8fcc-4901483e36fc' },
            { name: '伶旺', suffix: 'くん', reportUrl: 'https://coralup-yourtime.vercel.app/report/68a77b45-a44b-46f4-9298-dbba20cde150' },
        ]
    },
    {
        parentName: '冨永ゆかり',
        lineUserId: 'Uc32c4d0399dc820de9085d0b880830a2',
        children: [
            { name: '結仁', suffix: 'くん', reportUrl: 'https://coralup-yourtime.vercel.app/report/e29126b1-f8fb-4ca3-be1f-544ca66f2b5a' },
            { name: '絢仁', suffix: 'くん', reportUrl: 'https://coralup-yourtime.vercel.app/report/12fc43b8-f9d4-4db6-834d-7789532b0fd5' },
        ]
    },
    {
        parentName: '谷川良枝',
        lineUserId: 'U6c6f39c6526c22038bc14ca24f1a3b10',
        children: [
            { name: '奈優', suffix: 'ちゃん', reportUrl: 'https://coralup-yourtime.vercel.app/report/1cadb349-841e-4a83-9764-6d51c12c2013' },
            { name: '竣祐', suffix: 'くん', reportUrl: 'https://coralup-yourtime.vercel.app/report/1e8d36a9-6af9-4bd1-9f45-db77c1a6eb27' },
        ]
    },
    {
        parentName: 'あやの',
        lineUserId: 'U1037079d35342855ae4498067d5a00c8',
        children: [
            { name: '茉叶', suffix: 'ちゃん', reportUrl: 'https://coralup-yourtime.vercel.app/report/89fb36b4-df49-4486-839d-39103996bffe' },
        ]
    },
    {
        parentName: 'もも',
        lineUserId: 'Ue0c8fee5f6f2242235fddd6f03af0d2f',
        children: [
            { name: '蒼太', suffix: 'くん', reportUrl: 'https://coralup-yourtime.vercel.app/report/5ed512c9-c449-4411-9553-b6cce4202fd8' },
        ]
    },
    {
        parentName: '齋藤奈美子',
        lineUserId: 'U3f1ab3c2daf56685e47fc4cdd2a6397a',
        children: [
            { name: '伍希', suffix: 'くん', reportUrl: 'https://coralup-yourtime.vercel.app/report/46e06e76-3def-4265-a0b1-d7d4aef0f6f9' },
        ]
    },
    {
        parentName: '酒井 有香',
        lineUserId: 'Ue95f07a8a6fdfd7261bbf29b4471ef2d',
        children: [
            { name: '絵未', suffix: 'ちゃん', reportUrl: 'https://coralup-yourtime.vercel.app/report/347fbea8-a176-452a-8e2f-66d70497d856' },
        ]
    },
    {
        parentName: 'YURI',
        lineUserId: 'U02c6357a099da0b7963a9ee6d3438d4d',
        children: [
            { name: '創介', suffix: 'くん', reportUrl: 'https://coralup-yourtime.vercel.app/report/75b19e3e-775f-4dca-85d6-517e9cea8041' },
        ]
    },
    {
        parentName: '河内香織',
        lineUserId: 'Ufb74237fb9d5c1da46ce6d43390699ec',
        children: [
            { name: '佑友', suffix: 'くん', reportUrl: 'https://coralup-yourtime.vercel.app/report/6d855cbe-bc8f-4a2b-8095-cf676b39b20e' },
        ]
    },
    {
        parentName: 'さちこ',
        lineUserId: 'U84a815d80d3c093277cf2dc2cfa3d33a',
        children: [
            { name: '浩都', suffix: 'くん', reportUrl: 'https://coralup-yourtime.vercel.app/report/4244b339-7492-43bb-a898-64287f7eab1c' },
        ]
    },
]

// メッセージ生成関数
function generateMessage(family: FamilyReport): string {
    const header = `12/21の大阪YourTIME cOral upブースへのご来場ありがとうございました。
当日の診断レポートが遅くなり、大変申し訳ありません。`

    const reportLines = family.children.map(child =>
        `【${child.name}${child.suffix}の診断レポート】\n${child.reportUrl}`
    ).join('\n\n')

    const footer = `上記URLよりご確認いただければと思います。
何か気になる点や追加サポートご希望の場合はお気軽にご連絡ください。`

    return `${header}\n\n${reportLines}\n\n${footer}`
}

async function sendGroupedReports() {
    console.log('📨 家族単位レポート一括送信スクリプト\n')
    console.log('='.repeat(100))

    // アクセストークン確認
    if (!LINE_CHANNEL_ACCESS_TOKEN) {
        console.error('❌ LINE_MESSAGING_CHANNEL_ACCESS_TOKEN が設定されていません')
        process.exit(1)
    }

    // 送信内容のプレビュー
    console.log('\n📋 送信内容プレビュー:\n')

    for (let i = 0; i < FAMILY_REPORTS.length; i++) {
        const family = FAMILY_REPORTS[i]
        const childrenNames = family.children.map(c => `${c.name}${c.suffix}`).join('、')

        console.log(`[${i + 1}/${FAMILY_REPORTS.length}] ${family.parentName}`)
        console.log(`   お子さん: ${childrenNames}`)
        console.log(`   LINE ID: ${family.lineUserId}`)
        console.log()
    }

    console.log('='.repeat(100))
    console.log('\n📝 メッセージ例（南さん家族）:\n')
    console.log('─'.repeat(80))
    console.log(generateMessage(FAMILY_REPORTS[0]))
    console.log('─'.repeat(80))

    // ユーザー確認
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    })

    const answer = await new Promise<string>((resolve) => {
        rl.question('\n実行してよろしいですか？ (yes/no): ', resolve)
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
    const results: Array<{ family: FamilyReport; success: boolean; error?: string }> = []

    for (let i = 0; i < FAMILY_REPORTS.length; i++) {
        const family = FAMILY_REPORTS[i]
        const childrenNames = family.children.map(c => `${c.name}${c.suffix}`).join('、')
        const message = generateMessage(family)

        console.log(`[${i + 1}/${FAMILY_REPORTS.length}] ${family.parentName}（${childrenNames}）`)

        try {
            const response = await fetch('https://api.line.me/v2/bot/message/push', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
                },
                body: JSON.stringify({
                    to: family.lineUserId,
                    messages: [{
                        type: 'text',
                        text: message
                    }]
                })
            })

            const responseData = await response.json().catch(() => ({}))

            if (response.ok) {
                console.log(`   ✅ 送信成功`)
                successCount++
                results.push({ family, success: true })
            } else {
                const errorMsg = JSON.stringify(responseData)
                console.log(`   ❌ 送信失敗: ${errorMsg}`)
                failedCount++
                results.push({ family, success: false, error: errorMsg })
            }

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error)
            console.log(`   ❌ エラー: ${errorMsg}`)
            failedCount++
            results.push({ family, success: false, error: errorMsg })
        }

        console.log()

        // レート制限対策: 1秒待機
        if (i < FAMILY_REPORTS.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000))
        }
    }

    console.log('='.repeat(100))
    console.log(`\n📊 送信結果:`)
    console.log(`   ✅ 成功: ${successCount}件`)
    console.log(`   ❌ 失敗: ${failedCount}件`)
    console.log(`   合計: ${FAMILY_REPORTS.length}件`)

    // 結果をMarkdownファイルに保存
    const timestamp = new Date().toLocaleString('ja-JP')
    const resultLines = [
        '# 家族単位レポート送信結果',
        '',
        `**実行日時**: ${timestamp}`,
        `**送信成功**: ${successCount}件`,
        `**送信失敗**: ${failedCount}件`,
        '',
        '---',
        '',
        '## ✅ 送信成功',
        '',
    ]

    const successResults = results.filter(r => r.success)
    if (successResults.length > 0) {
        for (const { family } of successResults) {
            const childrenNames = family.children.map(c => `${c.name}${c.suffix}`).join('、')
            resultLines.push(`- ${family.parentName}（${childrenNames}）`)
        }
    } else {
        resultLines.push('なし')
    }

    resultLines.push('')
    resultLines.push('## ❌ 送信失敗')
    resultLines.push('')

    const failedResults = results.filter(r => !r.success)
    if (failedResults.length > 0) {
        for (const { family, error } of failedResults) {
            const childrenNames = family.children.map(c => `${c.name}${c.suffix}`).join('、')
            resultLines.push(`- ${family.parentName}（${childrenNames}）`)
            resultLines.push(`  - エラー: ${error}`)
            resultLines.push('')
        }
    } else {
        resultLines.push('なし')
    }

    const fs = await import('fs')
    const resultPath = './grouped_send_results.md'
    fs.writeFileSync(resultPath, resultLines.join('\n'), 'utf-8')
    console.log(`\n💾 結果を保存しました: ${resultPath}`)
    console.log('='.repeat(100))
}

sendGroupedReports()
    .catch(console.error)
    .finally(() => process.exit(0))
