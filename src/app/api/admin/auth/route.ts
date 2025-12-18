import { NextRequest, NextResponse } from 'next/server'
import { setAdminAuthCookie } from '@/lib/admin-auth'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD

/**
 * POST: 管理画面ログイン
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { password } = body

        if (!ADMIN_PASSWORD) {
            // パスワード未設定の場合は成功扱い（開発環境）
            return NextResponse.json({ success: true })
        }

        if (password !== ADMIN_PASSWORD) {
            return NextResponse.json(
                { success: false, error: 'パスワードが違います' },
                { status: 401 }
            )
        }

        // 認証成功 → Cookie設定
        await setAdminAuthCookie()

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[Admin Login] Error:', error)
        return NextResponse.json(
            { success: false, error: 'server_error' },
            { status: 500 }
        )
    }
}
