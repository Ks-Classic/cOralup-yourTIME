import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface QuestionnaireRequest {
  sessionId?: string  // 後方互換用
  visitId?: string    // 推奨
  answers: Record<string, unknown>
}

/**
 * POST: 問診回答を一括保存
 * ※ visit_id を優先使用、session_id は後方互換
 */
export async function POST(request: NextRequest) {
  try {
    const body: QuestionnaireRequest = await request.json()
    const { sessionId, visitId, answers } = body

    if (!visitId && !sessionId) {
      return NextResponse.json(
        { success: false, error: 'visitId or sessionId is required' },
        { status: 400 }
      )
    }

    // visit_idを取得（session_idからフォールバック）
    let resolvedVisitId = visitId
    if (!resolvedVisitId && sessionId) {
      const { data: visit } = await supabase
        .from('visits')
        .select('id')
        .eq('session_id', sessionId)
        .single()
      resolvedVisitId = visit?.id
    }

    // 回答をquestionnaire_responsesに保存（visit_id優先）
    const responsesToInsert = Object.entries(answers).map(([itemId, value]) => ({
      visit_id: resolvedVisitId || null,
      session_id: sessionId || null,  // 後方互換
      item_id: itemId,
      value: typeof value === 'object' ? JSON.stringify(value) : String(value),
      answered_at: new Date().toISOString(),
    }))

    if (responsesToInsert.length > 0) {
      // 既存の回答を削除してから挿入（upsert代わり）
      if (resolvedVisitId) {
        await supabase
          .from('questionnaire_responses')
          .delete()
          .eq('visit_id', resolvedVisitId)
      } else if (sessionId) {
        await supabase
          .from('questionnaire_responses')
          .delete()
          .eq('session_id', sessionId)
      }

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
    if (resolvedVisitId) {
      await supabase
        .from('visits')
        .update({
          status: 'questionnaire_completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', resolvedVisitId)
    }

    console.log('[Questionnaire] Saved:', {
      visitId: resolvedVisitId,
      sessionId,
      answerCount: responsesToInsert.length,
    })

    return NextResponse.json({
      success: true,
      savedCount: responsesToInsert.length,
      visitId: resolvedVisitId,
    })
  } catch (error) {
    console.error('[Questionnaire] Error:', error)
    return NextResponse.json(
      { success: false, error: 'server_error' },
      { status: 500 }
    )
  }
}
