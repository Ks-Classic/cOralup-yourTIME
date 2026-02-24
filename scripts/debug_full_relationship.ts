import { config } from 'dotenv'
import { db } from '../src/db'
import { visits, children, profiles } from '../src/db/schema'
import { eq } from 'drizzle-orm'

config({ path: '.env.local' })

const VISIT_ID = '6d855cbe-bc8f-4a2b-8095-cf676b39b20e'

async function debugFullRelationship() {
    console.log('🔍 完全なリレーションシップをデバッグ...\n')

    // 1. Visit取得
    const visit = (await db.select().from(visits).where(eq(visits.id, VISIT_ID)).limit(1))[0]

    if (!visit) {
        console.log('❌ Visit not found')
        return
    }

    console.log('📌 Visit情報:')
    console.log(`   Visit ID: ${visit.id}`)
    console.log(`   Child ID: ${visit.childId}`)
    console.log(`   Parent Profile ID (visits): ${visit.parentProfileId}`)
    console.log()

    if (!visit.childId) {
        console.log('⚠️  Child IDが設定されていません')
        return
    }

    // 2. Child取得
    const child = (await db.select().from(children).where(eq(children.id, visit.childId)).limit(1))[0]

    if (!child) {
        console.log('❌ Child not found')
        return
    }

    console.log('📌 Child情報:')
    console.log(`   Child ID: ${child.id}`)
    console.log(`   Name: ${child.lastName} ${child.firstName}`)
    console.log(`   Parent Profile ID (children): ${child.parentProfileId}`)
    console.log()

    if (!child.parentProfileId) {
        console.log('⚠️  Child.parentProfileId が設定されていません')
        return
    }

    // 3. Parent取得（childから）
    const parent = (await db.select().from(profiles).where(eq(profiles.id, child.parentProfileId)).limit(1))[0]

    if (!parent) {
        console.log('❌ Parent not found')
        return
    }

    console.log('📌 Parent情報（childから取得）:')
    console.log(`   Profile ID: ${parent.id}`)
    console.log(`   Display Name: ${parent.displayName}`)
    console.log(`   Full Name: ${parent.lastName} ${parent.firstName}`)
    console.log(`   Full Name Kana: ${parent.lastNameKana} ${parent.firstNameKana}`)
    console.log(`   LINE User ID: ${parent.lineUserId}`)
    console.log(`   Avatar URL: ${parent.avatarUrl}`)
    console.log()

    console.log('✅ 結論:')
    console.log(`   - visits.parentProfileId: ${visit.parentProfileId || 'NULL ❌'}`)
    console.log(`   - children.parentProfileId: ${child.parentProfileId} ✅`)
    console.log(`   - 親御さんの情報は children.parentProfileId 経由で取得する必要がある`)
}

debugFullRelationship()
    .catch(console.error)
    .finally(() => process.exit(0))
