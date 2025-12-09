import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/staff/report?sessionId=xxx
 * セッションデータを取得
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionIdが必要です' },
        { status: 400 }
      )
    }

    // セッションデータを取得
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError) {
      return NextResponse.json(
        { error: 'セッションが見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      session,
    })
  } catch (error) {
    console.error('[Report GET] エラー:', error)
    return NextResponse.json(
      { error: 'データの取得に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/staff/report
 * レポートを保存
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, session_id } = body

    if (!session_id) {
      return NextResponse.json(
        { error: 'session_idが必要です' },
        { status: 400 }
      )
    }

    // レポートを保存
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .insert([{
        session_id: session_id,
        status: 'sent',
      }])
      .select()
      .single()

    if (reportError) {
      console.error('[Report POST] レポート保存エラー:', reportError)
      return NextResponse.json(
        { error: 'レポートの保存に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      report,
    })
  } catch (error) {
    console.error('[Report POST] エラー:', error)
    return NextResponse.json(
      { error: 'レポートの保存に失敗しました' },
      { status: 500 }
    )
  }
}

