import { NextRequest, NextResponse } from 'next/server'
import { setAdminAuthCookie } from '@/lib/admin-auth'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD

// H-1 暫定: レート制限基盤(Upstash等)導入までのストッパー。
// 失敗時に固定遅延を挟み、総当たりを wire-speed → ~1req/s 程度に落とす。
// 恒久対策(IP単位レート制限/ロックアウト)は次スプリント。
const FAILED_LOGIN_DELAY_MS = 800
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * POST: 管理画面ログイン
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { password } = body

    if (!ADMIN_PASSWORD) {
      // パスワード未設定: 本番はfail-closed(設定ミスとして拒否)、開発のみ成功扱い。
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { success: false, error: 'admin_not_configured' },
          { status: 503 }
        )
      }
      return NextResponse.json({ success: true })
    }

    if (password !== ADMIN_PASSWORD) {
      await sleep(FAILED_LOGIN_DELAY_MS)
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
