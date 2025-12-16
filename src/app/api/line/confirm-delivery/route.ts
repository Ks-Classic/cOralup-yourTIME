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
    const { visitId, confirmationStatus } = body

    if (!visitId || !confirmationStatus) {
      return NextResponse.json(
        { error: 'visitId and confirmationStatus are required' },
        { status: 400 }
      )
    }

    if (!['confirmed', 'not_received', 'unknown'].includes(confirmationStatus)) {
      return NextResponse.json(
        { error: 'Invalid confirmationStatus. Must be: confirmed, not_received, or unknown' },
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

    // 最新のLINE送信ログを取得
    const { data: latestLog, error: logError } = await supabase
      .from('line_message_logs')
      .select('id')
      .eq('visit_id', visitId)
      .eq('message_type', 'report')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (logError || !latestLog) {
      return NextResponse.json(
        { error: 'LINE送信ログが見つかりません' },
        { status: 404 }
      )
    }

    // スタッフ確認結果を更新
    const { error: updateError } = await supabase
      .from('line_message_logs')
      .update({
        staff_confirmation_status: confirmationStatus,
        staff_confirmed_at: new Date().toISOString(),
      })
      .eq('id', latestLog.id)

    if (updateError) {
      console.error('Error updating staff confirmation:', updateError)
      return NextResponse.json(
        { error: '確認結果の保存に失敗しました' },
        { status: 500 }
      )
    }

    // 診断完了としてvisits.statusとステップを更新
    const { data: currentVisit } = await supabase
      .from('visits')
      .select('step_timestamps')
      .eq('id', visitId)
      .single()

    const timestamps = (currentVisit?.step_timestamps as Record<string, string>) || {}
    timestamps.line_confirmed = new Date().toISOString()

    const { error: visitUpdateError } = await supabase
      .from('visits')
      .update({
        status: 'diagnosis_completed',
        current_step: 'line_confirmed',
        step_timestamps: timestamps,
        updated_at: new Date().toISOString(),
      })
      .eq('id', visitId)

    if (visitUpdateError) {
      console.error('Error updating visit status:', visitUpdateError)
      // ログ更新は成功しているので、エラーは返さずに続行
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in confirm-delivery API:', error)
    return NextResponse.json(
      { error: 'サーバーエラー' },
      { status: 500 }
    )
  }
}

