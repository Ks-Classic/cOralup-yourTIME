import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      sessionId,
      childName,
      childAge,
      childGender,
      parentName,
      parentPhone,
      medicalHistory = [],
      concerns = [],
      idealGoals = [],
      notes,
    } = body

    // バリデーション
    if (!sessionId || !childName || !parentName || !parentPhone) {
      return NextResponse.json(
        { error: '必須項目が入力されていません' },
        { status: 400 }
      )
    }

    // 問診票データの保存
    const { data: questionnaire, error } = await supabase
      .from('questionnaires')
      .insert([
        {
          session_id: sessionId,
          child_name: childName,
          child_age: childAge,
          child_gender: childGender,
          parent_name: parentName,
          parent_phone: parentPhone,
          medical_history: medicalHistory,
          concerns: concerns,
          ideal_goals: idealGoals,
          notes: notes || '',
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('Error saving questionnaire:', error)
      return NextResponse.json(
        { error: '問診票の保存に失敗しました' },
        { status: 500 }
      )
    }

    // セッションのステータスを更新
    await supabase
      .from('sessions')
      .update({ status: 'questionnaire_completed' })
      .eq('session_id', sessionId)

    return NextResponse.json(questionnaire, { status: 201 })
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

    const { data: questionnaire, error } = await supabase
      .from('questionnaires')
      .select('*')
      .eq('session_id', sessionId)
      .single()

    if (error) {
      console.error('Error fetching questionnaire:', error)
      return NextResponse.json(
        { error: '問診票の取得に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json(questionnaire)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

