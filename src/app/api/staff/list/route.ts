import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase クライアント (Service Role)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET: スタッフ一覧を取得
 */
export async function GET() {
    try {
        // role='staff' または secondary_role='staff' かつ is_active=true のスタッフを取得
        const { data: staffList, error } = await supabase
            .from('profiles')
            .select('id, display_name, first_name, last_name, avatar_url')
            .or('role.eq.staff,secondary_role.eq.staff')
            .eq('is_active', true)
            .order('display_name', { ascending: true })

        if (error) {
            console.error('[Staff List] Error:', error)
            return NextResponse.json(
                { error: 'Failed to fetch staff list' },
                { status: 500 }
            )
        }

        // 表示名を整形
        const staff = (staffList || []).map(s => ({
            id: s.id,
            name: s.display_name || `${s.last_name || ''} ${s.first_name || ''}`.trim() || 'スタッフ',
            avatarUrl: s.avatar_url,
        }))

        console.log('[Staff List] Fetched:', staff.length, 'staff members')

        return NextResponse.json({ staff })
    } catch (error) {
        console.error('[Staff List] Error:', error)
        return NextResponse.json(
            { error: 'Internal error' },
            { status: 500 }
        )
    }
}
