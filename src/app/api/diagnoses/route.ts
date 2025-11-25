import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      sessionId,
      postureAnalysis,
      oralAnalysis,
      diagnosisItems,
      staffNotes,
      photos = [],
    } = body

    // バリデーション
    if (!sessionId) {
      return NextResponse.json(
        { error: 'セッションIDが指定されていません' },
        { status: 400 }
      )
    }

    // 診断結果の保存
    const { data: diagnosis, error } = await supabase
      .from('diagnoses')
      .insert([
        {
          session_id: sessionId,
          posture_analysis: postureAnalysis,
          oral_analysis: oralAnalysis,
          diagnosis_items: diagnosisItems,
          staff_notes: staffNotes,
          photos: photos,
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('Error saving diagnosis:', error)
      return NextResponse.json(
        { error: '診断結果の保存に失敗しました' },
        { status: 500 }
      )
    }

    // セッションのステータスを更新
    await supabase
      .from('sessions')
      .update({ status: 'diagnosis_completed' })
      .eq('session_id', sessionId)

    return NextResponse.json(diagnosis, { status: 201 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'セッションIDが指定されていません' },
        { status: 400 }
      )
    }

    const { data: diagnosis, error } = await supabase
      .from('diagnoses')
      .select('*')
      .eq('session_id', sessionId)
      .single()

    if (error) {
      console.error('Error fetching diagnosis:', error)
      return NextResponse.json(
        { error: '診断結果の取得に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json(diagnosis)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'セッションIDが指定されていません' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { postureAnalysis, oralAnalysis, diagnosisItems, staffNotes, photos } = body

    const { data: diagnosis, error } = await supabase
      .from('diagnoses')
      .update({
        posture_analysis: postureAnalysis,
        oral_analysis: oralAnalysis,
        diagnosis_items: diagnosisItems,
        staff_notes: staffNotes,
        photos: photos,
        updated_at: new Date().toISOString(),
      })
      .eq('session_id', sessionId)
      .select()
      .single()

    if (error) {
      console.error('Error updating diagnosis:', error)
      return NextResponse.json(
        { error: '診断結果の更新に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json(diagnosis)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

