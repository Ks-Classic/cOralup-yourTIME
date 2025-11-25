import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      schema_id,
      session_id,
      user_id,
      event_id,
      response_data,
      metadata = {}
    } = body

    // バリデーション
    if (!schema_id || !response_data) {
      return NextResponse.json(
        { error: '必須項目が入力されていません' },
        { status: 400 }
      )
    }

    // レスポンスID生成
    const responseId = `resp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // フォームスキーマの取得（バリデーション用）
    const { data: schema, error: schemaError } = await supabase
      .from('form_schemas')
      .select('*')
      .eq('id', schema_id)
      .single()

    if (schemaError || !schema) {
      return NextResponse.json(
        { error: 'フォームスキーマが見つかりません' },
        { status: 404 }
      )
    }

    // レスポンスデータの保存
    const { data: response, error } = await supabase
      .from('form_responses')
      .insert([{
        response_id: responseId,
        schema_id,
        session_id,
        user_id,
        event_id,
        response_data,
        metadata,
        submitted_at: new Date().toISOString(),
      }])
      .select()
      .single()

    if (error) {
      console.error('Error saving form response:', error)
      return NextResponse.json(
        { error: 'フォーム回答の保存に失敗しました' },
        { status: 500 }
      )
    }

    // キャッシュのクリア（管理画面でのリアルタイム更新用）
    await supabase
      .from('form_cache')
      .delete()
      .like('cache_key', `%${schema_id}%`)

    return NextResponse.json({
      response_id: responseId,
      message: 'フォーム回答が保存されました',
      schema_id,
      submitted_at: response.submitted_at
    }, { status: 201 })

  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

