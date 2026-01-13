// PAPER-セッションのデータを削除するスクリプト
import { db } from '../src/db'
import { visits, children, profiles } from '../src/db/schema'
import { eq, like, inArray } from 'drizzle-orm'

async function deletePaperSessions() {
    console.log('PAPER-セッションの削除を開始...')

    // 1. PAPER-で始まるvisitsを取得
    const paperVisits = await db
        .select({
            id: visits.id,
            sessionId: visits.sessionId,
            childId: visits.childId,
            parentProfileId: visits.parentProfileId,
        })
        .from(visits)
        .where(like(visits.sessionId, 'PAPER-%'))

    console.log(`削除対象visits: ${paperVisits.length}件`)

    if (paperVisits.length === 0) {
        console.log('削除対象がありません')
        process.exit(0)
    }

    // 2. 紐づくchildIdとprofileIdを収集
    const childIds = [...new Set(paperVisits.map(v => v.childId).filter(Boolean))]
    const profileIds = [...new Set(paperVisits.map(v => v.parentProfileId).filter(Boolean))]

    console.log(`紐づくchildren: ${childIds.length}件`)
    console.log(`紐づくprofiles: ${profileIds.length}件`)

    // 3. visitsを削除
    const visitIds = paperVisits.map(v => v.id)
    await db.delete(visits).where(inArray(visits.id, visitIds))
    console.log(`visits削除完了: ${visitIds.length}件`)

    // 4. childrenを削除（他のvisitsで使われていないもののみ）
    if (childIds.length > 0) {
        for (const childId of childIds) {
            // このchildIdを使っている他のvisitsがあるかチェック
            const otherVisits = await db
                .select({ id: visits.id })
                .from(visits)
                .where(eq(visits.childId, childId))
                .limit(1)

            if (otherVisits.length === 0) {
                await db.delete(children).where(eq(children.id, childId))
                console.log(`child削除: ${childId}`)
            } else {
                console.log(`child保持（他で使用中）: ${childId}`)
            }
        }
    }

    // 5. profilesを削除（他のchildrenやvisitsで使われていないもののみ）
    if (profileIds.length > 0) {
        for (const profileId of profileIds) {
            // このprofileIdを使っている他のchildrenがあるかチェック
            const otherChildren = await db
                .select({ id: children.id })
                .from(children)
                .where(eq(children.parentProfileId, profileId))
                .limit(1)

            if (otherChildren.length === 0) {
                await db.delete(profiles).where(eq(profiles.id, profileId))
                console.log(`profile削除: ${profileId}`)
            } else {
                console.log(`profile保持（他で使用中）: ${profileId}`)
            }
        }
    }

    console.log('削除完了!')
    process.exit(0)
}

deletePaperSessions().catch(err => {
    console.error('エラー:', err)
    process.exit(1)
})
