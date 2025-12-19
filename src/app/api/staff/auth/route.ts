import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { profiles } from '@/db/schema'
import { or, eq } from 'drizzle-orm'
import { isMockMode } from '@/lib/supabase'

// キャッシュを無効化して、毎回最新のDBからスタッフを取得
export const dynamic = 'force-dynamic'

// モック用スタッフデータ
const mockStaffList = [
  { id: 'staff-1', first_name: '太郎', last_name: '山田', avatar_url: null },
  { id: 'staff-2', first_name: '花子', last_name: '鈴木', avatar_url: null },
  { id: 'staff-3', first_name: '次郎', last_name: '佐藤', avatar_url: null },
]

export async function POST(request: NextRequest) {
  try {
    const { pin } = await request.json()

    // PIN未入力チェック
    if (!pin) {
      return NextResponse.json(
        { success: false, error: 'pin_required', message: 'PINを入力してください' },
        { status: 400 }
      )
    }

    // 環境変数からPINを取得（デフォルト: 1234）
    const staffPinCode = process.env.STAFF_PIN_CODE || '1234'

    // PIN照合
    if (pin !== staffPinCode) {
      return NextResponse.json(
        { success: false, error: 'invalid_pin', message: 'PINが正しくありません' },
        { status: 401 }
      )
    }

    // モックモードの場合
    if (isMockMode) {
      return NextResponse.json({
        success: true,
        staffList: mockStaffList,
      })
    }

    // DBからスタッフ一覧を取得（role='staff' または secondary_role='staff'）
    const staffRows = await db
      .select({
        id: profiles.id,
        firstName: profiles.firstName,
        lastName: profiles.lastName,
        avatarUrl: profiles.avatarUrl,
        role: profiles.role,
        secondaryRole: profiles.secondaryRole,
      })
      .from(profiles)
      .where(
        or(eq(profiles.role, 'staff'), eq(profiles.secondaryRole, 'staff'))
      )
      .orderBy(profiles.lastName)

    // スタッフが登録されていない場合はモックデータを返す
    if (!staffRows || staffRows.length === 0) {
      return NextResponse.json({
        success: true,
        staffList: mockStaffList,
        isMock: true,
      })
    }

    // Supabase形式に変換
    const staffList = staffRows.map(s => ({
      id: s.id,
      first_name: s.firstName,
      last_name: s.lastName,
      avatar_url: s.avatarUrl,
      role: s.role,
      secondary_role: s.secondaryRole,
    }))

    return NextResponse.json({
      success: true,
      staffList,
    })
  } catch (error) {
    console.error('PIN認証エラー:', error)
    return NextResponse.json(
      { success: false, error: 'server_error', message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
