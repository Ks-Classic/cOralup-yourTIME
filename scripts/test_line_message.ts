import { config } from 'dotenv'

config({ path: '.env.local' })

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN

// ⚠️ ここに自分のLINE User IDを入れてください
const TEST_LINE_USER_ID = 'YOUR_LINE_USER_ID_HERE'

// テストデータ
const testCases = [
    {
        type: 'single',
        childName: '佑友くん',
        reportUrl: 'https://coralup-yourtime.vercel.app/report/6d855cbe-bc8f-4a2b-8095-cf676b39b20e'
    },
    {
        type: 'multiple',
        children: [
            {
                name: '結仁くん',
                url: 'https://coralup-yourtime.vercel.app/report/e29126b1-f8fb-4ca3-be1f-544ca66f2b5a'
            },
            {
                name: '絢仁くん',
                url: 'https://coralup-yourtime.vercel.app/report/12fc43b8-f9d4-4db6-834d-7789532b0fd5'
            }
        ]
    }
]

async function sendTestMessages() {
    console.log('🧪 テストメッセージを送信します\n')
    console.log('='.repeat(100))

    if (!LINE_CHANNEL_ACCESS_TOKEN) {
        console.error('❌ LINE_MESSAGING_CHANNEL_ACCESS_TOKEN が設定されていません')
        return
    }

    if (TEST_LINE_USER_ID === 'YOUR_LINE_USER_ID_HERE') {
        console.error('❌ TEST_LINE_USER_ID を設定してください')
        console.log('\n📝 LINE User IDの取得方法:')
        console.log('   1. LINE公式アカウントを自分で友だち追加')
        console.log('   2. 何かメッセージを送信')
        console.log('   3. Webhook URLのログで User ID を確認')
        console.log('   または、以下のコマンドで確認可能:')
        console.log('   - LINE Developersコンソール > Messaging API > "Get user profile"')
        return
    }

    console.log(`📱 送信先LINE User ID: ${TEST_LINE_USER_ID}\n`)

    // テストケース1: お子さん1名の場合
    console.log('📨 テストケース1: お子さん1名の場合\n')
    const message1 = `12/21の大阪YourTIME cOral upブースへのご来場ありがとうございました。
当日の診断レポートが遅くなり、大変申し訳ありません。

【${testCases[0].childName}の診断レポート】
${testCases[0].reportUrl}

上記URLよりご確認いただければと思います。
何か気になる点や追加サポートご希望の場合はお気軽にご連絡ください。`

    console.log('送信内容:')
    console.log('─'.repeat(80))
    console.log(message1)
    console.log('─'.repeat(80))
    console.log()

    try {
        const response1 = await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
            },
            body: JSON.stringify({
                to: TEST_LINE_USER_ID,
                messages: [{
                    type: 'text',
                    text: message1
                }]
            })
        })

        if (response1.ok) {
            console.log('✅ テストケース1の送信成功\n')
        } else {
            const errorData = await response1.json().catch(() => ({}))
            console.error('❌ テストケース1の送信失敗:', JSON.stringify(errorData))
        }
    } catch (error) {
        console.error('❌ エラー:', error)
    }

    // 3秒待機
    console.log('⏳ 3秒待機...\n')
    await new Promise(resolve => setTimeout(resolve, 3000))

    // テストケース2: お子さん2名の場合
    console.log('📨 テストケース2: お子さん2名の場合\n')
    const message2 = `12/21の大阪YourTIME cOral upブースへのご来場ありがとうございました。
当日の診断レポートが遅くなり、大変申し訳ありません。

【${testCases[1].children[0].name}の診断レポート】
${testCases[1].children[0].url}

【${testCases[1].children[1].name}の診断レポート】
${testCases[1].children[1].url}

上記URLよりご確認いただければと思います。
何か気になる点や追加サポートご希望の場合はお気軽にご連絡ください。`

    console.log('送信内容:')
    console.log('─'.repeat(80))
    console.log(message2)
    console.log('─'.repeat(80))
    console.log()

    try {
        const response2 = await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
            },
            body: JSON.stringify({
                to: TEST_LINE_USER_ID,
                messages: [{
                    type: 'text',
                    text: message2
                }]
            })
        })

        if (response2.ok) {
            console.log('✅ テストケース2の送信成功\n')
        } else {
            const errorData = await response2.json().catch(() => ({}))
            console.error('❌ テストケース2の送信失敗:', JSON.stringify(errorData))
        }
    } catch (error) {
        console.error('❌ エラー:', error)
    }

    console.log('='.repeat(100))
    console.log('\n✨ テスト送信完了')
    console.log('\n📱 LINEアプリで受信内容を確認してください！')
    console.log('   - メッセージの見た目')
    console.log('   - URLのクリック動作')
    console.log('   - 改行やフォーマット')
}

sendTestMessages()
    .catch(console.error)
    .finally(() => process.exit(0))
