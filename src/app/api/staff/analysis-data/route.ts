import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/staff/analysis-data?sessionId=xxx
 * 分析画面用データを取得（セッション、問診、診断）
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
      .from('visits')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError) {
      return NextResponse.json(
        { error: 'セッションが見つかりません' },
        { status: 404 }
      )
    }

    // 問診票データを取得
    const { data: questionnaire } = await supabase
      .from('questionnaires')
      .select('*')
      .eq('session_id', session.session_id)
      .single()

    // 診断データを取得
    const { data: diagnosis } = await supabase
      .from('diagnoses')
      .select('*')
      .eq('session_id', session.session_id)
      .single()

    return NextResponse.json({
      success: true,
      session,
      questionnaire: questionnaire || null,
      diagnosis: diagnosis || null,
    })
  } catch (error) {
    console.error('[AnalysisData GET] エラー:', error)
    return NextResponse.json(
      { error: 'データの取得に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/staff/analysis-data
 * レポート保存 + セッションステータス更新
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, session_id } = body

    if (!session_id || !sessionId) {
      return NextResponse.json(
        { error: 'sessionIdとsession_idが必要です' },
        { status: 400 }
      )
    }

    // レポートを保存
    const { error: reportError } = await supabase
      .from('reports')
      .insert([{
        session_id: session_id,
        pdf_url: '',
        status: 'sent',
      }])

    if (reportError) {
      console.error('[AnalysisData POST] レポート保存エラー:', reportError)
      return NextResponse.json(
        { error: 'レポートの保存に失敗しました' },
        { status: 500 }
      )
    }

    // セッションステータスを更新
    const { error: sessionError } = await supabase
      .from('visits')
      .update({ status: 'completed' })
      .eq('id', sessionId)

    if (sessionError) {
      console.error('[AnalysisData POST] セッション更新エラー:', sessionError)
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error('[AnalysisData POST] エラー:', error)
    return NextResponse.json(
      { error: 'データの保存に失敗しました' },
      { status: 500 }
    )
  }
}

