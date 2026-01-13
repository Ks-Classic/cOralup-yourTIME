// questionnaireItemsにcodeを設定するスクリプト
import { db } from '../src/db'
import { questionnaireItems } from '../src/db/schema'
import { eq, like, or, ilike } from 'drizzle-orm'

// 問診項目コードのマッピング（question内容からコードを推測）
const codeMapping: { pattern: string; code: string }[] = [
    { pattern: 'きょうだい', code: 'has_siblings' },
    { pattern: '何人目', code: 'sibling_order' },
    { pattern: 'スマホ', code: 'screen_time' },
    { pattern: 'TV', code: 'screen_time' },
    { pattern: '視聴時間', code: 'screen_hours' },
    { pattern: 'いびき', code: 'sleep_conditions' },
    { pattern: '睡眠', code: 'sleep_conditions' },
    { pattern: '就寝', code: 'bedtime' },
    { pattern: '習い事', code: 'lessons' },
    { pattern: '食事', code: 'eating_habits' },
    { pattern: '好き嫌い', code: 'disliked_foods' },
    { pattern: '嫌いな', code: 'disliked_foods' },
    { pattern: '好きな', code: 'liked_foods' },
    { pattern: '写真', code: 'photo_consent' },
    { pattern: '規則正しい', code: 'regular_lifestyle' },
]

async function setQuestionnaireItemCodes() {
    console.log('questionnaireItemsにcodeを設定...')

    const items = await db.select().from(questionnaireItems)
    console.log(`Total items: ${items.length}`)

    let updatedCount = 0

    for (const item of items) {
        if (item.code) {
            console.log(`Already has code: ${item.question} -> ${item.code}`)
            continue
        }

        // questionからコードを推測
        let matchedCode: string | null = null
        for (const mapping of codeMapping) {
            if (item.question?.includes(mapping.pattern)) {
                matchedCode = mapping.code
                break
            }
        }

        if (matchedCode) {
            await db
                .update(questionnaireItems)
                .set({ code: matchedCode })
                .where(eq(questionnaireItems.id, item.id))

            console.log(`Updated: ${item.question} -> ${matchedCode}`)
            updatedCount++
        } else {
            console.log(`No match: ${item.question}`)
        }
    }

    console.log(`\nUpdated ${updatedCount} items`)
    process.exit(0)
}

setQuestionnaireItemCodes().catch(err => {
    console.error('Error:', err)
    process.exit(1)
})
