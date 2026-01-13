#!/usr/bin/env npx tsx
/**
 * 子供の性別を修正するCLIスクリプト
 * 使用方法: npx tsx scripts/fix-child-gender.ts <子供の名前または苗字> <新しい性別(male/female)>
 * 例: npx tsx scripts/fix-child-gender.ts 中村 female
 */

import { config } from 'dotenv'
// .env.local から環境変数を読み込む（他のモジュールがインポートされる前に）
config({ path: '.env.local' })

async function main() {
    // 環境変数を読み込んだ後に動的インポート
    const { db } = await import('@/db')
    const { children } = await import('@/db/schema')
    const { or, ilike, eq } = await import('drizzle-orm')

    const args = process.argv.slice(2)

    if (args.length < 1) {
        console.log('使用方法: npx tsx scripts/fix-child-gender.ts <名前> [新しい性別]')
        console.log('例: npx tsx scripts/fix-child-gender.ts 中村 female')
        console.log('    npx tsx scripts/fix-child-gender.ts 芽愛 female')
        console.log('')
        console.log('新しい性別を省略すると、現在の状態を表示します')
        process.exit(1)
    }

    const searchName = args[0]
    const newGender = args[1] as 'male' | 'female' | undefined

    console.log(`検索中: "${searchName}"...`)

    // 子供を検索
    const matchedChildren = await db
        .select({
            id: children.id,
            firstName: children.firstName,
            lastName: children.lastName,
            gender: children.gender,
            birthday: children.birthday,
        })
        .from(children)
        .where(
            or(
                ilike(children.firstName, `%${searchName}%`),
                ilike(children.lastName, `%${searchName}%`)
            )
        )

    if (matchedChildren.length === 0) {
        console.log('該当する子供が見つかりませんでした')
        process.exit(1)
    }

    console.log(`\n${matchedChildren.length}件見つかりました:\n`)

    for (const child of matchedChildren) {
        const genderLabel = child.gender === 'male' ? '男の子' : child.gender === 'female' ? '女の子' : '未設定'
        console.log(`  ID: ${child.id}`)
        console.log(`  名前: ${child.lastName} ${child.firstName}`)
        console.log(`  性別: ${child.gender || 'null'} (${genderLabel})`)
        console.log(`  生年月日: ${child.birthday}`)
        console.log('')
    }

    // 性別更新
    if (newGender && (newGender === 'male' || newGender === 'female')) {
        if (matchedChildren.length > 1) {
            console.log('複数の子供が見つかりました。より具体的な名前で検索してください。')
            process.exit(1)
        }

        const targetChild = matchedChildren[0]
        const newGenderLabel = newGender === 'male' ? '男の子' : '女の子'

        console.log(`性別を "${newGenderLabel}" に更新中...`)

        await db
            .update(children)
            .set({
                gender: newGender,
                updatedAt: new Date()
            })
            .where(eq(children.id, targetChild.id))

        console.log(`✅ ${targetChild.lastName} ${targetChild.firstName} の性別を "${newGenderLabel}" に更新しました`)
        console.log('')
        console.log('注意: 診断画面で正しく反映されるようにするには、ブラウザをリロードしてください。')
    }
}

main().catch(console.error)
