import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * 問診回答保存API
 * 
 * 処理フロー:
 * 1. questionnaire_responses に正規化保存
 * 2. visits.status を 'questionnaire_completed' に更新
 * 3. questionnaires テーブルにも保存（互換用）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { visit_id, session_id, responses, child_info } = body

    // バリデーション
    if (!session_id) {
      return NextResponse.json(
        { error: 'session_id は必須です' },
        { status: 400 }
      )
    }

    if (!responses || !Array.isArray(responses)) {
      return NextResponse.json(
        { error: 'responses は配列で指定してください' },
        { status: 400 }
      )
    }

    // 1. questionnaire_responses に正規化保存
    const responsesToInsert = responses.map((r: { item_id: string; value: string }) => ({
      session_id,
      item_id: r.item_id,
      value: r.value,
      answered_at: new Date().toISOString(),
    }))

    // 既存回答を削除してから挿入（UPSERT の代わり）
    await supabase
      .from('questionnaire_responses')
      .delete()
      .eq('session_id', session_id)

    const { error: responsesError } = await supabase
      .from('questionnaire_responses')
      .insert(responsesToInsert)

    if (responsesError) {
      console.error('Error saving questionnaire_responses:', responsesError)
      return NextResponse.json(
        { error: '問診回答の保存に失敗しました' },
        { status: 500 }
      )
    }

    // 2. visits.status を更新（visit_id がある場合）
    if (visit_id) {
      const { error: visitError } = await supabase
        .from('visits')
        .update({ status: 'questionnaire_completed' })
        .eq('id', visit_id)

      if (visitError) {
        console.error('Error updating visit status:', visitError)
        // 続行可能
      }
    }

    // 3. questionnaires テーブルにも保存（互換用）
    // responses を JSONB 形式に変換
    const rawResponses = responses.reduce(
      (acc: Record<string, string>, r: { item_id: string; value: string }) => {
        acc[r.item_id] = r.value
        return acc
      },
      {}
    )

    // 互換テーブル用のデータ構築
    const questionnaireData: Record<string, unknown> = {
      session_id,
      updated_at: new Date().toISOString(),
    }

    // child_info が渡された場合は互換フィールドにマッピング
    if (child_info) {
      questionnaireData.child_name = child_info.child_name || `${child_info.child_last_name || ''} ${child_info.child_first_name || ''}`.trim()
      questionnaireData.child_age = child_info.child_age
      questionnaireData.child_gender = child_info.child_gender
      questionnaireData.parent_name = child_info.parent_name || `${child_info.parent_last_name || ''} ${child_info.parent_first_name || ''}`.trim()
      questionnaireData.parent_phone = child_info.parent_phone
    }

    // 既存レコードがあるか確認
    const { data: existing } = await supabase
      .from('questionnaires')
      .select('id')
      .eq('session_id', session_id)
      .single()

    if (existing) {
      // UPDATE
      await supabase
        .from('questionnaires')
        .update(questionnaireData)
        .eq('session_id', session_id)
    } else {
      // INSERT（child_info 必須）
      if (child_info) {
        await supabase.from('questionnaires').insert({
          ...questionnaireData,
          created_at: new Date().toISOString(),
        })
      }
    }

    console.log('Questionnaire saved:', {
      session_id,
      visit_id,
      responses_count: responses.length,
    })

    return NextResponse.json({
      success: true,
      visit_id,
      responses_count: responses.length,
    })
  } catch (error) {
    console.error('Error in questionnaire API:', error)
    return NextResponse.json(
      { error: '問診回答の保存中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

/**
 * 問診回答取得API
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session_id')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'session_id は必須です' },
        { status: 400 }
      )
    }

    // questionnaire_responses を取得（item 情報含む）
    const { data: responses, error } = await supabase
      .from('questionnaire_responses')
      .select(`
        *,
        questionnaire_items (
          id,
          question,
          answer_type,
          options,
          category_id,
          questionnaire_categories (
            id,
            name
          )
        )
      `)
      .eq('session_id', sessionId)

    if (error) {
      console.error('Error fetching questionnaire responses:', error)
      return NextResponse.json(
        { error: '問診回答の取得に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      session_id: sessionId,
      responses: responses || [],
    })
  } catch (error) {
    console.error('Error in questionnaire GET API:', error)
    return NextResponse.json(
      { error: '問診回答の取得中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

