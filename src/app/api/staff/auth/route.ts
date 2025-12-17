import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, isMockMode } from '@/lib/supabase'

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

    // Supabaseからスタッフ一覧を取得（role='staff' または secondary_role='staff'）
    const supabase = createServerSupabaseClient()
    const { data: staffList, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, avatar_url, role, secondary_role')
      .or('role.eq.staff,secondary_role.eq.staff')
      .order('last_name')

    if (error) {
      console.error('スタッフ一覧取得エラー:', error)
      return NextResponse.json(
        { success: false, error: 'db_error', message: 'スタッフ情報の取得に失敗しました' },
        { status: 500 }
      )
    }

    // スタッフが登録されていない場合はモックデータを返す
    if (!staffList || staffList.length === 0) {
      return NextResponse.json({
        success: true,
        staffList: mockStaffList,
        isMock: true,
      })
    }

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

