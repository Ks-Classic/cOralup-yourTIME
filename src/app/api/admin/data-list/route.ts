import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getStaffSession } from '@/lib/staff-auth'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET: データ一覧を取得
 * - visits, children, profiles(parent)の一覧
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getStaffSession()
        if (!session) {
            return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type') || 'visits'
        const limit = parseInt(searchParams.get('limit') || '50')

        let data: any[] = []

        if (type === 'visits') {
            const { data: visits, error } = await supabase
                .from('visits')
                .select(`
          id,
          session_id,
          status,
          current_step,
          visit_date,
          is_test_data,
          created_at,
          updated_at,
          children (
            id,
            first_name,
            last_name
          )
        `)
                .order('created_at', { ascending: false })
                .limit(limit)

            if (error) throw error
            data = visits || []
        }

        if (type === 'children') {
            const { data: children, error } = await supabase
                .from('children')
                .select(`
          id,
          first_name,
          last_name,
          birthday,
          gender,
          is_test_data,
          created_at,
          updated_at,
          profiles:parent_profile_id (
            id,
            display_name
          )
        `)
                .order('created_at', { ascending: false })
                .limit(limit)

            if (error) throw error
            data = children || []
        }

        if (type === 'profiles') {
            const { data: profiles, error } = await supabase
                .from('profiles')
                .select(`
          id,
          display_name,
          first_name,
          last_name,
          role,
          line_user_id,
          created_at,
          updated_at
        `)
                .eq('role', 'parent')
                .order('created_at', { ascending: false })
                .limit(limit)

            if (error) throw error
            data = profiles || []
        }

        return NextResponse.json({ success: true, data, count: data.length })
    } catch (error) {
        console.error('[Data List] Error:', error)
        return NextResponse.json({ success: false, error: 'server_error' }, { status: 500 })
    }
}

/**
 * DELETE: 個別レコードを削除
 */
export async function DELETE(request: NextRequest) {
    try {
        const session = await getStaffSession()
        if (!session) {
            return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { type, id } = body

        if (!type || !id) {
            return NextResponse.json({ success: false, error: 'type and id required' }, { status: 400 })
        }

        let deletedCount = 0

        if (type === 'visit') {
            // 関連データも削除
            await supabase.from('questionnaire_responses').delete().eq('visit_id', id)
            await supabase.from('diagnosis_responses').delete().eq('visit_id', id)
            await supabase.from('reports').delete().eq('visit_id', id)
            await supabase.from('visit_photos').delete().eq('visit_id', id)

            const { count } = await supabase
                .from('visits')
                .delete({ count: 'exact' })
                .eq('id', id)
            deletedCount = count || 0
        }

        if (type === 'child') {
            // 関連visitsも削除
            const { data: childVisits } = await supabase
                .from('visits')
                .select('id')
                .eq('child_id', id)

            if (childVisits) {
                for (const v of childVisits) {
                    await supabase.from('questionnaire_responses').delete().eq('visit_id', v.id)
                    await supabase.from('diagnosis_responses').delete().eq('visit_id', v.id)
                    await supabase.from('reports').delete().eq('visit_id', v.id)
                    await supabase.from('visit_photos').delete().eq('visit_id', v.id)
                }
                await supabase.from('visits').delete().in('id', childVisits.map(v => v.id))
            }

            const { count } = await supabase
                .from('children')
                .delete({ count: 'exact' })
                .eq('id', id)
            deletedCount = count || 0
        }

        if (type === 'profile') {
            // 関連children, visitsも削除（カスケード）
            const { data: profileChildren } = await supabase
                .from('children')
                .select('id')
                .eq('parent_profile_id', id)

            if (profileChildren) {
                for (const c of profileChildren) {
                    const { data: childVisits } = await supabase
                        .from('visits')
                        .select('id')
                        .eq('child_id', c.id)

                    if (childVisits) {
                        for (const v of childVisits) {
                            await supabase.from('questionnaire_responses').delete().eq('visit_id', v.id)
                            await supabase.from('diagnosis_responses').delete().eq('visit_id', v.id)
                            await supabase.from('reports').delete().eq('visit_id', v.id)
                            await supabase.from('visit_photos').delete().eq('visit_id', v.id)
                        }
                        await supabase.from('visits').delete().in('id', childVisits.map(v => v.id))
                    }
                }
                await supabase.from('children').delete().in('id', profileChildren.map(c => c.id))
            }

            const { count } = await supabase
                .from('profiles')
                .delete({ count: 'exact' })
                .eq('id', id)
            deletedCount = count || 0
        }

        console.log('[Data Delete]', { type, id, deletedCount })

        return NextResponse.json({ success: true, deletedCount })
    } catch (error) {
        console.error('[Data Delete] Error:', error)
        return NextResponse.json({ success: false, error: 'server_error' }, { status: 500 })
    }
}
