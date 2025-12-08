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

// GET: 公開用の問診票スキーマを取得
// 保護者画面で使用
export async function GET(request: NextRequest) {
    try {
        const supabase = getSupabase()

        // クエリパラメータからスキーマIDを取得
        const searchParams = request.nextUrl.searchParams
        const schemaId = searchParams.get('schema_id') // 'preschooler_v1' | 'elementary_v1'

        if (!schemaId) {
            return NextResponse.json(
                { success: false, error: 'schema_id が必要です' },
                { status: 400 }
            )
        }

        // questionnaire_schemas テーブルからスキーマを取得
        const { data, error } = await supabase
            .from('questionnaire_schemas')
            .select('*')
            .eq('schema_id', schemaId)
            .eq('is_active', true)
            .order('version', { ascending: false })
            .limit(1)
            .single()

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
            throw error
        }

        if (!data) {
            return NextResponse.json(
                { success: false, error: 'スキーマが見つかりません' },
                { status: 404 }
            )
        }

        return NextResponse.json({
            success: true,
            data: data.config
        })

    } catch (error) {
        console.error('問診票スキーマ取得エラー:', error)
        return NextResponse.json(
            { success: false, error: 'データの取得に失敗しました' },
            { status: 500 }
        )
    }
}
