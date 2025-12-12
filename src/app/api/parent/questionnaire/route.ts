import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface QuestionnaireRequest {
  sessionId: string
  visitId?: string
  answers: Record<string, unknown>
}

/**
 * POST: 問診回答を一括保存
 */
export async function POST(request: NextRequest) {
  try {
    const body: QuestionnaireRequest = await request.json()
    const { sessionId, visitId, answers } = body

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'sessionId is required' },
        { status: 400 }
      )
    }

    // 回答をquestionnaire_responsesに保存
    const responsesToInsert = Object.entries(answers).map(([itemId, value]) => ({
      session_id: sessionId,
      item_id: itemId,
      value: typeof value === 'object' ? JSON.stringify(value) : String(value),
      answered_at: new Date().toISOString(),
    }))

    if (responsesToInsert.length > 0) {
      // 既存の回答を削除してから挿入（upsert代わり）
      await supabase
        .from('questionnaire_responses')
        .delete()
        .eq('session_id', sessionId)

      const { error: insertError } = await supabase
        .from('questionnaire_responses')
        .insert(responsesToInsert)

      if (insertError) {
        console.error('[Questionnaire] Insert error:', insertError)
        return NextResponse.json(
          { success: false, error: 'insert_failed' },
          { status: 500 }
        )
      }
    }

    // visitsステータスを更新
    if (visitId) {
      await supabase
        .from('visits')
        .update({
          status: 'questionnaire_completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', visitId)
    } else if (sessionId) {
      await supabase
        .from('visits')
        .update({
          status: 'questionnaire_completed',
          updated_at: new Date().toISOString(),
        })
        .eq('session_id', sessionId)
    }

    // sessionsステータスも更新
    await supabase
      .from('sessions')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('session_id', sessionId)

    console.log('[Questionnaire] Saved:', {
      sessionId,
      visitId,
      answerCount: responsesToInsert.length,
    })

    return NextResponse.json({
      success: true,
      savedCount: responsesToInsert.length,
    })
  } catch (error) {
    console.error('[Questionnaire] Error:', error)
    return NextResponse.json(
      { success: false, error: 'server_error' },
      { status: 500 }
    )
  }
}
