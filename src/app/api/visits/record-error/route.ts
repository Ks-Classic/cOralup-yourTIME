import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return null
  }
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { visitId, errorType, errorMessage } = body

    if (!visitId || !errorType || !errorMessage) {
      return NextResponse.json(
        { error: 'visitId, errorType, and errorMessage are required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseClient()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      )
    }

    // 現在のエラー情報を取得
    const { data: currentVisit, error: fetchError } = await supabase
      .from('visits')
      .select('error_info')
      .eq('id', visitId)
      .single()

    if (fetchError) {
      return NextResponse.json(
        { error: 'Visit not found' },
        { status: 404 }
      )
    }

    // エラー情報を更新
    const errorInfo = {
      type: errorType,
      message: errorMessage,
      occurred_at: new Date().toISOString(),
    }

    // 既存のエラー情報がある場合は配列に追加、なければ新規作成
    const existingErrors = currentVisit?.error_info
      ? (Array.isArray(currentVisit.error_info) 
          ? currentVisit.error_info 
          : [currentVisit.error_info])
      : []

    const updatedErrors = [...existingErrors, errorInfo]

    // 更新実行
    const { error: updateError } = await supabase
      .from('visits')
      .update({
        error_info: updatedErrors,
        updated_at: new Date().toISOString(),
      })
      .eq('id', visitId)

    if (updateError) {
      console.error('Error recording visit error:', updateError)
      return NextResponse.json(
        { error: 'エラー記録に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in record-error API:', error)
    return NextResponse.json(
      { error: 'サーバーエラー' },
      { status: 500 }
    )
  }
}


