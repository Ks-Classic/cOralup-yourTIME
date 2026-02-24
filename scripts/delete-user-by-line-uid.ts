/**
 * LINE UID ベースでユーザーデータを一括削除
 * 
 * Usage:
 *   npx tsx scripts/delete-user-by-line-uid.ts <LINE_USER_ID>
 *   npx tsx scripts/delete-user-by-line-uid.ts <LINE_USER_ID> --force
 * 
 * Example:
 *   npx tsx scripts/delete-user-by-line-uid.ts Ucc2f14397499ce4aa10b282d97b1b1ae
 */

import { createClient } from '@supabase/supabase-js'
import * as readline from 'readline'

// .env.local を読み込み
import { config } from 'dotenv'
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が .env.local に必要です')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
    const lineUid = process.argv[2]
    const forceFlag = process.argv.includes('--force')

    if (!lineUid) {
        console.log('❌ Usage: npx tsx scripts/delete-user-by-line-uid.ts <LINE_USER_ID>')
        console.log('   Example: npx tsx scripts/delete-user-by-line-uid.ts Ucc2f14397499ce4aa10b282d97b1b1ae')
        process.exit(1)
    }

    console.log(`\n🔍 LINE UID: ${lineUid} のデータを検索中...\n`)

    // --- プロフィール検索 ---
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, last_name, first_name, role, created_at')
        .eq('line_user_id', lineUid)
        .single()

    if (profileError || !profile) {
        console.log(`⚠️  該当するプロフィールが見つかりません: ${lineUid}`)
        process.exit(0)
    }

    const profileId = profile.id
    console.log(`👤 対象ユーザー: ${profile.last_name} ${profile.first_name} (${profile.role})`)
    console.log(`   Profile ID: ${profileId}`)
    console.log(`   作成日: ${profile.created_at}\n`)

    // --- 関連データ件数を表示 ---
    const [children, visitsByProfile, visitsByLineUid, messageLogs] = await Promise.all([
        supabase.from('children').select('id', { count: 'exact', head: true }).eq('parent_profile_id', profileId),
        supabase.from('visits').select('id', { count: 'exact' }).eq('parent_profile_id', profileId),
        supabase.from('visits').select('id', { count: 'exact' }).eq('line_user_id', lineUid),
        supabase.from('line_message_logs').select('id', { count: 'exact', head: true }).eq('line_user_id', lineUid),
    ])

    // visit IDs の統合リスト
    const allVisitIds = [
        ...(visitsByProfile.data?.map(v => v.id) || []),
        ...(visitsByLineUid.data?.map(v => v.id) || []),
    ]
    const uniqueVisitIds = [...new Set(allVisitIds)]

    console.log('📊 関連データ:')
    console.log(`   children:            ${children.count ?? 0}`)
    console.log(`   visits:              ${uniqueVisitIds.length}`)
    console.log(`   line_message_logs:   ${messageLogs.count ?? 0}`)

    // visit 関連データ
    if (uniqueVisitIds.length > 0) {
        const [qr, dr, diag, reports, photos] = await Promise.all([
            supabase.from('questionnaire_responses').select('id', { count: 'exact', head: true }).in('visit_id', uniqueVisitIds),
            supabase.from('diagnosis_responses').select('id', { count: 'exact', head: true }).in('visit_id', uniqueVisitIds),
            supabase.from('diagnoses').select('id', { count: 'exact', head: true }).in('visit_id', uniqueVisitIds),
            supabase.from('reports').select('id', { count: 'exact', head: true }).in('visit_id', uniqueVisitIds),
            supabase.from('visit_photos').select('id', { count: 'exact', head: true }).in('visit_id', uniqueVisitIds),
        ])
        console.log(`   questionnaire_resp:  ${qr.count ?? 0}`)
        console.log(`   diagnosis_responses: ${dr.count ?? 0}`)
        console.log(`   diagnoses:           ${diag.count ?? 0}`)
        console.log(`   reports:             ${reports.count ?? 0}`)
        console.log(`   visit_photos:        ${photos.count ?? 0}`)
    }

    console.log('')

    // --- 確認プロンプト ---
    if (!forceFlag) {
        const confirmed = await askConfirmation('🗑️  上記データをすべて削除しますか？ (y/N): ')
        if (!confirmed) {
            console.log('キャンセルしました')
            process.exit(0)
        }
    }

    // --- 削除実行 (FK制約の深い順に) ---
    console.log('\n🗑️  削除実行中...')

    const deleteSteps: { label: string; fn: () => Promise<{ error: any }> }[] = []

    if (uniqueVisitIds.length > 0) {
        deleteSteps.push(
            { label: 'questionnaire_responses', fn: () => supabase.from('questionnaire_responses').delete().in('visit_id', uniqueVisitIds) },
            { label: 'diagnosis_responses', fn: () => supabase.from('diagnosis_responses').delete().in('visit_id', uniqueVisitIds) },
            { label: 'diagnoses', fn: () => supabase.from('diagnoses').delete().in('visit_id', uniqueVisitIds) },
            { label: 'reports', fn: () => supabase.from('reports').delete().in('visit_id', uniqueVisitIds) },
            { label: 'visit_photos', fn: () => supabase.from('visit_photos').delete().in('visit_id', uniqueVisitIds) },
        )
    }

    deleteSteps.push(
        { label: 'line_message_logs', fn: () => supabase.from('line_message_logs').delete().eq('line_user_id', lineUid) },
    )

    if (uniqueVisitIds.length > 0) {
        deleteSteps.push(
            { label: 'visits (by profile)', fn: () => supabase.from('visits').delete().eq('parent_profile_id', profileId) },
            { label: 'visits (by line_uid)', fn: () => supabase.from('visits').delete().eq('line_user_id', lineUid) },
        )
    }

    deleteSteps.push(
        { label: 'children', fn: () => supabase.from('children').delete().eq('parent_profile_id', profileId) },
        { label: 'profiles', fn: () => supabase.from('profiles').delete().eq('id', profileId) },
    )

    for (const step of deleteSteps) {
        const { error } = await step.fn()
        if (error) {
            console.error(`   ❌ ${step.label}: ${error.message}`)
        } else {
            console.log(`   ✅ ${step.label}`)
        }
    }

    console.log(`\n✅ 削除完了: ${profile.last_name} ${profile.first_name} (${lineUid})`)
    console.log('   LINEから再度友達追加・登録すれば新しいプロファイルが作成されます。\n')
}

function askConfirmation(question: string): Promise<boolean> {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close()
            resolve(answer.toLowerCase() === 'y')
        })
    })
}

main().catch((err) => {
    console.error('❌ Error:', err)
    process.exit(1)
})
