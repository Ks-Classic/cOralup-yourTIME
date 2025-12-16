import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// サーバーサイド用のSupabaseクライアント
const getSupabase = () => {
    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase環境変数が設定されていません')
    }
    return createClient(supabaseUrl, supabaseServiceKey)
}

// GET: 公開用の診断スキーマを取得（Activeなもののみ）
// スタッフ画面や保護者画面で使用
export async function GET(request: NextRequest) {
    try {
        const supabase = getSupabase()

        // クエリパラメータから入力タイプを取得（staff または parent）
        // 指定がなければ両方取得するが、基本はクライアント側でフィルタリングしても良い
        const searchParams = request.nextUrl.searchParams
        const inputType = searchParams.get('input_type') // 'staff' | 'parent' | null

        // console.log('[/api/diagnosis-schema] リクエスト受信:', { inputType })

        // カテゴリ取得（Activeなもののみ）
        let categoryQuery = supabase
            .from('diagnosis_categories')
            .select('*')
            .eq('is_active', true)
            .order('display_order')

        const { data: categories, error: catError } = await categoryQuery
        if (catError) throw catError

        // console.log('[/api/diagnosis-schema] カテゴリ取得:', categories?.length, '件')

        // 項目取得（Activeなもののみ）
        let itemQuery = supabase
            .from('diagnosis_items')
            .select('*')
            .eq('is_active', true)
            .order('display_order')

        if (inputType) {
            itemQuery = itemQuery.eq('input_type', inputType)
        }

        const { data: items, error: itemError } = await itemQuery
        if (itemError) throw itemError

        // console.log('[/api/diagnosis-schema] 項目取得:', items?.length, '件')

        // 舌カテゴリの項目を確認
        const tongueItems = items?.filter(i => {
            const cat = categories?.find(c => c.id === i.category_id)
            return cat?.name === '舌'
        })
        // console.log('[/api/diagnosis-schema] 舌カテゴリ項目:', tongueItems?.length, '件', tongueItems?.map(i => i.question))

        // フロントエンドで使いやすい形に整形
        // Note: optionsの型変換などはフロントエンド側で行うか、ここで行う

        return NextResponse.json({
            success: true,
            data: {
                categories,
                items
            }
        })

    } catch (error) {
        console.error('診断スキーマ取得エラー:', error)
        return NextResponse.json(
            { success: false, error: 'データの取得に失敗しました' },
            { status: 500 }
        )
    }
}
