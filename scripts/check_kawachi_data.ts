import { config } from 'dotenv'
import { db } from '../src/db'
import { profiles, children } from '../src/db/schema'
import { or, like, ilike, sql } from 'drizzle-orm'

config({ path: '.env.local' })

async function searchKawachiData() {
    console.log('🔍 河内さん関連のデータを検索しています...\n')

    // 1. お子さんで「河内」「かわうち」「ゆうと」を検索
    console.log('📌 お子さん (children) の検索:')
    const childResults = await db.select()
        .from(children)
        .where(
            or(
                // 姓が「河内」
                ilike(children.lastName, '%河内%'),
                // 姓カナが「かわうち」
                ilike(children.lastNameKana, '%かわうち%'),
                ilike(children.lastNameKana, '%カワウチ%'),
                // 名前が「佑友」
                ilike(children.firstName, '%佑友%'),
                // 名前カナが「ゆうと」
                ilike(children.firstNameKana, '%ゆうと%'),
                ilike(children.firstNameKana, '%ユウト%'),
            )
        )

    if (childResults.length > 0) {
        console.log(`✅ ${childResults.length}件のお子さんが見つかりました:\n`)
        childResults.forEach((child, idx) => {
            console.log(`[${idx + 1}] ID: ${child.id}`)
            console.log(`    名前: ${child.lastName || ''} ${child.firstName || ''}`)
            console.log(`    カナ: ${child.lastNameKana || ''} ${child.firstNameKana || ''}`)
            console.log(`    親ID: ${child.parentProfileId}`)
            console.log(`    誕生日: ${child.birthday}`)
            console.log(`    性別: ${child.gender}`)
            console.log(`    作成日: ${child.createdAt}`)
            console.log()
        })
    } else {
        console.log('❌ 該当するお子さんは見つかりませんでした。\n')
    }

    // 2. 親御さん (profiles) で「河内」を検索
    console.log('📌 親御さん (profiles) の検索:')
    const profileResults = await db.select()
        .from(profiles)
        .where(
            or(
                // 姓が「河内」
                ilike(profiles.lastName, '%河内%'),
                // 姓カナが「かわうち」
                ilike(profiles.lastNameKana, '%かわうち%'),
                ilike(profiles.lastNameKana, '%カワウチ%'),
                // 表示名に「河内」
                ilike(profiles.displayName, '%河内%'),
            )
        )

    if (profileResults.length > 0) {
        console.log(`✅ ${profileResults.length}件の親御さんが見つかりました:\n`)
        profileResults.forEach((profile, idx) => {
            console.log(`[${idx + 1}] ID: ${profile.id}`)
            console.log(`    名前: ${profile.lastName || ''} ${profile.firstName || ''}`)
            console.log(`    カナ: ${profile.lastNameKana || ''} ${profile.firstNameKana || ''}`)
            console.log(`    表示名: ${profile.displayName}`)
            console.log(`    役割: ${profile.role}`)
            console.log(`    LINE ID: ${profile.lineUserId}`)
            console.log(`    作成日: ${profile.createdAt}`)
            console.log()
        })

        // 親御さんのお子さんも確認
        for (const profile of profileResults) {
            const relatedChildren = await db.select()
                .from(children)
                .where(sql`${children.parentProfileId} = ${profile.id}`)

            if (relatedChildren.length > 0) {
                console.log(`    └─ お子さん: ${relatedChildren.length}人`)
                relatedChildren.forEach(child => {
                    console.log(`       - ${child.lastName || ''} ${child.firstName || ''} (${child.lastNameKana || ''} ${child.firstNameKana || ''})`)
                })
                console.log()
            }
        }
    } else {
        console.log('❌ 該当する親御さんは見つかりませんでした。\n')
    }

    console.log('✨ 検索完了')
}

searchKawachiData()
    .catch(console.error)
    .finally(() => process.exit(0))
