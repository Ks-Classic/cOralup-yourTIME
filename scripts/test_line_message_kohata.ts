import { config } from 'dotenv'
import { db } from '../src/db'
import { profiles } from '../src/db/schema'
import { or, ilike } from 'drizzle-orm'

config({ path: '.env.local' })

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN

async function getKohataLineId() {
    console.log('🔍 木幡靖彦さんのLINE User IDを検索しています...\n')

    const kohataProfiles = await db
        .select()
        .from(profiles)
        .where(
            or(
                ilike(profiles.displayName, '%木幡%靖彦%'),
                ilike(profiles.displayName, '%こはた%やすひこ%'),
                ilike(profiles.lastName, '%木幡%'),
                ilike(profiles.firstName, '%靖彦%')
            )
        )

    if (kohataProfiles.length === 0) {
        console.log('❌ 木幡靖彦さんのプロフィールが見つかりませんでした')
        return null
    }

    console.log(`✅ 見つかりました: ${kohataProfiles.length}件\n`)

    for (const profile of kohataProfiles) {
        console.log(`名前: ${profile.displayName || `${profile.lastName} ${profile.firstName}`}`)
        console.log(`LINE User ID: ${profile.lineUserId}`)
        console.log(`Profile ID: ${profile.id}`)
        console.log()
    }

    // 最初のプロフィールのLINE IDを返す
    return kohataProfiles[0].lineUserId
}

async function sendTestMessages(lineUserId: string) {
    console.log('='.repeat(100))
    console.log('🧪 テストメッセージを送信します\n')
    console.log(`📱 送信先: ${lineUserId}\n`)

    // テストケース1: お子さん1名の場合（河内さんの例）
    console.log('📨 テストケース1: お子さん1名の場合\n')
    const message1 = `12/21の大阪YourTIME cOral upブースへのご来場ありがとうございました。
当日の診断レポートが遅くなり、大変申し訳ありません。

【佑友くんの診断レポート】
https://coralup-yourtime.vercel.app/report/6d855cbe-bc8f-4a2b-8095-cf676b39b20e

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
                to: lineUserId,
                messages: [{
                    type: 'text',
                    text: message1
                }]
            })
        })

        const responseData1 = await response1.json().catch(() => ({}))

        if (response1.ok) {
            console.log('✅ テストケース1の送信成功\n')
        } else {
            console.error('❌ テストケース1の送信失敗:', JSON.stringify(responseData1))
            return // エラーなら2つ目は送らない
        }
    } catch (error) {
        console.error('❌ エラー:', error)
        return
    }

    // 3秒待機
    console.log('⏳ 3秒待機...\n')
    await new Promise(resolve => setTimeout(resolve, 3000))

    // テストケース2: お子さん2名の場合（冨永さんの例）
    console.log('📨 テストケース2: お子さん2名の場合\n')
    const message2 = `12/21の大阪YourTIME cOral upブースへのご来場ありがとうございました。
当日の診断レポートが遅くなり、大変申し訳ありません。

【結仁くんの診断レポート】
https://coralup-yourtime.vercel.app/report/e29126b1-f8fb-4ca3-be1f-544ca66f2b5a

【絢仁くんの診断レポート】
https://coralup-yourtime.vercel.app/report/12fc43b8-f9d4-4db6-834d-7789532b0fd5

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
                to: lineUserId,
                messages: [{
                    type: 'text',
                    text: message2
                }]
            })
        })

        const responseData2 = await response2.json().catch(() => ({}))

        if (response2.ok) {
            console.log('✅ テストケース2の送信成功\n')
        } else {
            console.error('❌ テストケース2の送信失敗:', JSON.stringify(responseData2))
        }
    } catch (error) {
        console.error('❌ エラー:', error)
    }

    console.log('='.repeat(100))
    console.log('\n✨ テスト送信完了')
    console.log('\n📱 LINEアプリで受信内容を確認してください！')
    console.log('   ✅ メッセージの見た目')
    console.log('   ✅ URLのクリック動作')
    console.log('   ✅ 改行やフォーマット')
    console.log('   ✅ 全体の印象（丁寧で分かりやすいか）')
}

async function main() {
    const lineUserId = await getKohataLineId()

    if (!lineUserId) {
        console.error('\n❌ LINE User IDが取得できませんでした')
        console.log('\n📝 対処方法:')
        console.log('   1. cOral upのLINE公式アカウントを友だち追加')
        console.log('   2. 何かメッセージを送信')
        console.log('   3. データベースに登録されているか確認')
        return
    }

    await sendTestMessages(lineUserId)
}

main()
    .catch(console.error)
    .finally(() => process.exit(0))
