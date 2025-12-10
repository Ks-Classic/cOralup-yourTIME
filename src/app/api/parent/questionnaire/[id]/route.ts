import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params

    if (!sessionId) {
      return NextResponse.json(
        { error: 'セッションIDが指定されていません' },
        { status: 400 }
      )
    }

    // セッションデータを取得
    const { data: session, error: sessionError } = await supabase
      .from('visits')
      .select('*')
      .eq('session_id', sessionId)
      .single()

    // セッションが存在しない場合は新規作成として扱う（404ではなく空のデータを返す）
    if (sessionError && sessionError.code === 'PGRST116') {
      return NextResponse.json({
        session: null,
        questionnaire: null,
      })
    }

    if (sessionError) {
      console.error('Error fetching session:', sessionError)
      // エラーが発生しても新規作成として扱う
      return NextResponse.json({
        session: null,
        questionnaire: null,
      })
    }

    // 問診票データを取得（存在する場合）
    const { data: questionnaire, error: questionnaireError } = await supabase
      .from('questionnaires')
      .select('*')
      .eq('session_id', sessionId)
      .single()

    // 問診票が存在しない場合はnullを返す（新規作成の場合）
    if (questionnaireError && questionnaireError.code === 'PGRST116') {
      return NextResponse.json({
        session,
        questionnaire: null,
      })
    }

    if (questionnaireError) {
      console.error('Error fetching questionnaire:', questionnaireError)
      // エラーが発生してもセッションデータだけ返す
      return NextResponse.json({
        session,
        questionnaire: null,
      })
    }

    return NextResponse.json({
      session,
      questionnaire: questionnaire || null,
    })
  } catch (error) {
    console.error('Error:', error)
    // エラーが発生しても新規作成として扱う
    return NextResponse.json({
      session: null,
      questionnaire: null,
    })
  }
}

