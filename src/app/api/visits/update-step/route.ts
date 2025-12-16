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
    const { visitId, step, boothNumber } = body

    if (!visitId || !step) {
      return NextResponse.json(
        { error: 'visitId and step are required' },
        { status: 400 }
      )
    }

    const validSteps = [
      'line_registered',
      'questionnaire_completed',
      'diagnosis_started',
      'photos_uploaded',
      'analysis_completed',
      'report_generated',
      'line_sent',
      'line_confirmed',
    ]

    if (!validSteps.includes(step)) {
      return NextResponse.json(
        { error: 'Invalid step' },
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

    // 現在のステップタイムスタンプを取得
    const { data: currentVisit, error: fetchError } = await supabase
      .from('visits')
      .select('step_timestamps, current_step')
      .eq('id', visitId)
      .single()

    if (fetchError || !currentVisit) {
      return NextResponse.json(
        { error: 'Visit not found' },
        { status: 404 }
      )
    }

    // ステップタイムスタンプを更新
    const timestamps = (currentVisit.step_timestamps as Record<string, string>) || {}
    timestamps[step] = new Date().toISOString()

    // 更新データを準備
    const updateData: Record<string, any> = {
      current_step: step,
      step_timestamps: timestamps,
      updated_at: new Date().toISOString(),
    }

    // ブース番号が指定されている場合は更新
    if (boothNumber !== undefined) {
      updateData.booth_number = boothNumber
    }

    // ステップに応じてstatusも更新（後方互換性）
    if (step === 'line_confirmed') {
      updateData.status = 'diagnosis_completed'
    } else if (step === 'line_sent') {
      updateData.status = 'report_sent'
    } else if (step === 'diagnosis_started') {
      updateData.status = 'in_progress'
    }

    // 更新実行
    const { error: updateError } = await supabase
      .from('visits')
      .update(updateData)
      .eq('id', visitId)

    if (updateError) {
      console.error('Error updating visit step:', updateError)
      return NextResponse.json(
        { error: 'ステップ更新に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in update-step API:', error)
    return NextResponse.json(
      { error: 'サーバーエラー' },
      { status: 500 }
    )
  }
}


