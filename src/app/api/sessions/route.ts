import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { generateSessionId } from '@/utils'

export async function GET() {
  try {
    // 実際の実装では認証チェックを入れる
    const { data: sessions, error } = await supabase
      .from('visits')
      .select(`
        *,
        questionnaires (
          child_name,
          parent_name
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching sessions:', error)
      return NextResponse.json(
        { error: 'セッションの取得に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId: customSessionId, parentName, parentPhone } = body

    // セッションID生成（カスタムIDが指定されていない場合）
    const sessionId = customSessionId || generateSessionId()

    // セッション作成（visitsテーブルに作成）
    const { data: session, error: sessionError } = await supabase
      .from('visits')
      .insert([
        {
          session_id: sessionId,
          status: 'active',
          visit_date: new Date().toISOString(),
        }
      ])
      .select()
      .single()

    if (sessionError) {
      console.error('Error creating session:', sessionError)
      return NextResponse.json(
        { error: 'セッションの作成に失敗しました' },
        { status: 500 }
      )
    }

    // 親御さん情報をセッションに紐づける
    const { error: updateError } = await supabase
      .from('visits')
      .update({
        parent_name: parentName,
        parent_phone: parentPhone,
      })
      .eq('session_id', sessionId)

    if (updateError) {
      console.error('Error updating session:', updateError)
    }

    return NextResponse.json(session, { status: 201 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

