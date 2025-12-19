import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { profiles } from '@/db/schema'
import { eq, or, and } from 'drizzle-orm'
import { createStaffSessionToken } from '@/lib/staff-auth'

// 環境変数からPINを取得
const STAFF_PIN = process.env.STAFF_PIN_CODE || process.env.STAFF_PIN || '1234'

export const dynamic = 'force-dynamic'

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
        const staffRows = await db
            .select()
            .from(profiles)
            .where(
                and(
                    eq(profiles.id, staffId),
                    or(eq(profiles.role, 'staff'), eq(profiles.secondaryRole, 'staff'))
                )
            )
            .limit(1)

        const staff = staffRows[0]

        if (!staff) {
            return NextResponse.json(
                { success: false, error: 'Staff not found' },
                { status: 404 }
            )
        }

        if (staff.isActive === false) {
            return NextResponse.json(
                { success: false, error: 'Account inactive' },
                { status: 403 }
            )
        }

        // スタッフ名を決定
        const staffName =
            staff.displayName ||
            `${staff.lastName || ''}${staff.firstName || ''}`.trim() ||
            'スタッフ'

        // セッショントークン生成
        const token = await createStaffSessionToken({
            staffId: staff.id,
            staffName,
            role: (staff.role as string) || 'staff',
        })

        // 最終活動日時を更新
        await db
            .update(profiles)
            .set({ lastActivityAt: new Date() } as Partial<typeof profiles.$inferInsert>)
            .where(eq(profiles.id, staff.id))

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
