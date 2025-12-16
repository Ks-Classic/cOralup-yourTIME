import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createStaffSessionToken } from '@/lib/staff-auth'

// 環境変数からPINを取得
const STAFF_PIN = process.env.STAFF_PIN || '0000'

// Supabase クライアント (Service Role)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST: PIN + スタッフIDでログイン
 * Body: { pin: string, staffId: string }
 */
export async function POST(request: NextRequest) {
    try {
        const { pin, staffId } = await request.json()

        if (!pin || !staffId) {
            return NextResponse.json(
                { success: false, error: 'pin and staffId are required' },
                { status: 400 }
            )
        }

        // PIN検証
        if (pin !== STAFF_PIN) {
            return NextResponse.json(
                { success: false, error: 'Invalid PIN' },
                { status: 401 }
            )
        }

        // スタッフ情報取得
        const { data: staff, error } = await supabase
            .from('profiles')
            .select('id, display_name, first_name, last_name, role, secondary_role, is_active')
            .eq('id', staffId)
            .or('role.eq.staff,secondary_role.eq.staff')
            .single()

        if (error || !staff) {
            console.log('[PIN Login] Staff not found:', staffId)
            return NextResponse.json(
                { success: false, error: 'Staff not found' },
                { status: 404 }
            )
        }

        if (staff.is_active === false) {
            return NextResponse.json(
                { success: false, error: 'Account inactive' },
                { status: 403 }
            )
        }

        // スタッフ名を決定
        const staffName =
            staff.display_name ||
            `${staff.last_name || ''}${staff.first_name || ''}`.trim() ||
            'スタッフ'

        // セッショントークン生成
        const token = await createStaffSessionToken({
            staffId: staff.id,
            staffName,
            role: staff.role || 'staff',
        })

        // 最終活動日時を更新
        await supabase
            .from('profiles')
            .update({ last_activity_at: new Date().toISOString() })
            .eq('id', staff.id)

        console.log('[PIN Login] Login successful:', staffName)

        // Cookie設定してレスポンス
        const response = NextResponse.json({
            success: true,
            staff: {
                id: staff.id,
                name: staffName,
            },
        })

        response.cookies.set('staff_session', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60, // 7日
            path: '/',
        })

        return response
    } catch (error) {
        console.error('[PIN Login] Error:', error)
        return NextResponse.json(
            { success: false, error: 'Internal error' },
            { status: 500 }
        )
    }
}
