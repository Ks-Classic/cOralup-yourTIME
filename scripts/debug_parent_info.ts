import { config } from 'dotenv'
import { db } from '../src/db'
import { visits, profiles } from '../src/db/schema'
import { eq } from 'drizzle-orm'

config({ path: '.env.local' })

// 河内さんのVisit ID
const VISIT_ID = '6d855cbe-bc8f-4a2b-8095-cf676b39b20e'

async function debugParentInfo() {
    console.log('🔍 親御さん情報のデバッグ...\n')

    // 1. Visit情報取得
    const visitRecords = await db.select().from(visits).where(eq(visits.id, VISIT_ID)).limit(1)

    if (visitRecords.length === 0) {
        console.log('❌ Visit not found')
        return
    }

    const visit = visitRecords[0]
    console.log('📌 Visit情報:')
    console.log(`   Visit ID: ${visit.id}`)
    console.log(`   Parent Profile ID: ${visit.parentProfileId}`)
    console.log()

    if (!visit.parentProfileId) {
        console.log('⚠️  親御さんのProfile IDが設定されていません')
        return
    }

    // 2. 直接Profile取得
    const profileRecords = await db.select().from(profiles).where(eq(profiles.id, visit.parentProfileId)).limit(1)

    if (profileRecords.length === 0) {
        console.log('❌ Profile not found')
        return
    }

    const profile = profileRecords[0]
    console.log('📌 Profile情報（直接クエリ）:')
    console.log(`   ID: ${profile.id}`)
    console.log(`   Display Name: ${profile.displayName}`)
    console.log(`   Last Name: ${profile.lastName}`)
    console.log(`   First Name: ${profile.firstName}`)
    console.log(`   Last Name Kana: ${profile.lastNameKana}`)
    console.log(`   First Name Kana: ${profile.firstNameKana}`)
    console.log(`   LINE User ID: ${profile.lineUserId}`)
    console.log(`   Avatar URL: ${profile.avatarUrl}`)
    console.log(`   Email: ${profile.email}`)
    console.log(`   Phone: ${profile.phoneNumber}`)
    console.log()

    // 3. JOINで取得（スクリプトと同じ方法）
    const joinResults = await db
        .select({
            visitId: visits.id,
            parentId: profiles.id,
            parentFirstName: profiles.firstName,
            parentLastName: profiles.lastName,
            parentDisplayName: profiles.displayName,
            parentLineUserId: profiles.lineUserId,
        })
        .from(visits)
        .leftJoin(profiles, eq(visits.parentProfileId, profiles.id))
        .where(eq(visits.id, VISIT_ID))

    console.log('📌 JOIN結果:')
    console.log(JSON.stringify(joinResults, null, 2))
    console.log()

    if (joinResults.length > 0) {
        const result = joinResults[0]
        const parentLastName = result.parentLastName || ''
        const parentFirstName = result.parentFirstName || ''
        const parentName = result.parentDisplayName || `${parentLastName} ${parentFirstName}`.trim() || '不明'

        console.log('📌 組み立て結果:')
        console.log(`   親御さん名: ${parentName}`)
        console.log(`   LINE User ID: ${result.parentLineUserId}`)
    }
}

debugParentInfo()
    .catch(console.error)
    .finally(() => process.exit(0))
