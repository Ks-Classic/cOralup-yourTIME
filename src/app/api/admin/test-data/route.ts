import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getStaffSession } from '@/lib/staff-auth'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST: テスト用データを生成
 * - テスト用の子供レコード作成
 * - テスト用のvisitレコード作成
 * - オプションで問診回答も生成
 */
export async function POST(request: NextRequest) {
    try {
        // 管理者権限チェック（本番では厳格に）
        const session = await getStaffSession()
        if (!session) {
            return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const {
            parentProfileId,
            childName = 'テスト太郎',
            childGender = 'male',
            childBirthday = '2020-01-01',
            withQuestionnaire = false,
        } = body

        // 1. テスト用の子供を作成
        const { data: child, error: childError } = await supabase
            .from('children')
            .insert({
                parent_profile_id: parentProfileId || null,
                first_name: childName,
                last_name: '[TEST]',
                birthday: childBirthday,
                gender: childGender,
                is_test_data: true,
            })
            .select()
            .single()

        if (childError) {
            console.error('[Test Data] Child creation error:', childError)
            return NextResponse.json({ success: false, error: 'child_creation_failed' }, { status: 500 })
        }

        // 2. テスト用のvisitを作成
        const sessionId = `T${Date.now().toString(36).toUpperCase()}`

        const { data: visit, error: visitError } = await supabase
            .from('visits')
            .insert({
                session_id: sessionId,
                child_id: child.id,
                status: 'waiting',
                current_step: 'line_registered',
                visit_date: new Date().toISOString(),
                is_test_data: true,
                event_id: process.env.DEFAULT_EVENT_ID || null,
                organization_id: process.env.CORALUP_ORG_ID || null,
            })
            .select()
            .single()

        if (visitError) {
            console.error('[Test Data] Visit creation error:', visitError)
            return NextResponse.json({ success: false, error: 'visit_creation_failed' }, { status: 500 })
        }

        // 3. オプション: 問診回答も生成
        if (withQuestionnaire) {
            // 問診項目を取得
            const { data: items } = await supabase
                .from('questionnaire_items')
                .select('id')
                .eq('is_active', true)
                .limit(10)

            if (items && items.length > 0) {
                const responses = items.map(item => ({
                    visit_id: visit.id,
                    item_id: item.id,
                    value: 'テスト回答',
                    answered_at: new Date().toISOString(),
                }))

                await supabase.from('questionnaire_responses').insert(responses)

                // ステータスを更新
                await supabase
                    .from('visits')
                    .update({
                        status: 'in_progress',
                        current_step: 'questionnaire_completed'
                    })
                    .eq('id', visit.id)
            }
        }

        console.log('[Test Data] Generated:', { childId: child.id, visitId: visit.id, sessionId })

        return NextResponse.json({
            success: true,
            child: {
                id: child.id,
                name: `${child.last_name} ${child.first_name}`,
            },
            visit: {
                id: visit.id,
                sessionId: visit.session_id,
                status: visit.status,
            },
        })
    } catch (error) {
        console.error('[Test Data] Error:', error)
        return NextResponse.json({ success: false, error: 'server_error' }, { status: 500 })
    }
}

/**
 * DELETE: テストデータを一括削除
 * is_test_data = true のデータをすべて削除
 */
export async function DELETE(request: NextRequest) {
    try {
        // 管理者権限チェック
        const session = await getStaffSession()
        if (!session) {
            return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 })
        }

        const deletedCounts = {
            visits: 0,
            children: 0,
            questionnaireResponses: 0,
            diagnosisResponses: 0,
            reports: 0,
            photos: 0,
        }

        // 1. テスト用visitsに紐づくデータを削除
        const { data: testVisits } = await supabase
            .from('visits')
            .select('id')
            .eq('is_test_data', true)

        if (testVisits && testVisits.length > 0) {
            const visitIds = testVisits.map(v => v.id)

            // 問診回答削除
            const { count: qrCount } = await supabase
                .from('questionnaire_responses')
                .delete({ count: 'exact' })
                .in('visit_id', visitIds)
            deletedCounts.questionnaireResponses = qrCount || 0

            // 診断回答削除
            const { count: drCount } = await supabase
                .from('diagnosis_responses')
                .delete({ count: 'exact' })
                .in('visit_id', visitIds)
            deletedCounts.diagnosisResponses = drCount || 0

            // レポート削除
            const { count: repCount } = await supabase
                .from('reports')
                .delete({ count: 'exact' })
                .in('visit_id', visitIds)
            deletedCounts.reports = repCount || 0

            // 写真削除
            const { count: photoCount } = await supabase
                .from('visit_photos')
                .delete({ count: 'exact' })
                .in('visit_id', visitIds)
            deletedCounts.photos = photoCount || 0

            // visits削除
            const { count: visitCount } = await supabase
                .from('visits')
                .delete({ count: 'exact' })
                .eq('is_test_data', true)
            deletedCounts.visits = visitCount || 0
        }

        // 2. テスト用childrenを削除
        const { count: childCount } = await supabase
            .from('children')
            .delete({ count: 'exact' })
            .eq('is_test_data', true)
        deletedCounts.children = childCount || 0

        console.log('[Test Data] Cleanup completed:', deletedCounts)

        return NextResponse.json({
            success: true,
            deleted: deletedCounts,
        })
    } catch (error) {
        console.error('[Test Data] Cleanup error:', error)
        return NextResponse.json({ success: false, error: 'server_error' }, { status: 500 })
    }
}
