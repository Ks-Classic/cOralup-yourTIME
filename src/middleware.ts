import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ADMIN_AUTH_COOKIE = 'admin_auth_token'

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // /admin 配下のみ保護（ただし /admin/login は除外）
    if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
        const adminPassword = process.env.ADMIN_PASSWORD

        // パスワード未設定の場合はスキップ（開発環境）
        if (!adminPassword) {
            return NextResponse.next()
        }

        // Cookie確認
        const token = request.cookies.get(ADMIN_AUTH_COOKIE)?.value
        const expectedToken = Buffer.from(adminPassword).toString('base64')

        if (token !== expectedToken) {
            // 未認証 → ログインページへリダイレクト
            const loginUrl = new URL('/admin-login', request.url)
            return NextResponse.redirect(loginUrl)
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/admin/:path*'],
}
