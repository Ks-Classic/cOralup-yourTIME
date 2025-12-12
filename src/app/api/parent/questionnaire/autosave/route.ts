import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface AutosaveRequest {
  sessionId?: string  // 後方互換用
  visitId?: string    // 推奨
  itemId: string
  value: string
}

/**
 * POST: 問診回答を1件ずつ自動保存
 * ※ visit_id を優先使用、session_id は後方互換
 */
export async function POST(request: NextRequest) {
  try {
    const body: AutosaveRequest = await request.json()
    const { sessionId, visitId, itemId, value } = body

    if (!itemId || (!visitId && !sessionId)) {
      return NextResponse.json(
        { success: false, error: 'itemId and (visitId or sessionId) are required' },
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

    // 既存レコードを確認
    let existingQuery = supabase
      .from('questionnaire_responses')
      .select('id')
      .eq('item_id', itemId)

    if (resolvedVisitId) {
      existingQuery = existingQuery.eq('visit_id', resolvedVisitId)
    } else if (sessionId) {
      existingQuery = existingQuery.eq('session_id', sessionId)
    }

    const { data: existing } = await existingQuery.single()

    if (existing) {
      // 更新
      const { error } = await supabase
        .from('questionnaire_responses')
        .update({
          value,
          answered_at: new Date().toISOString(),
        })
        .eq('id', existing.id)

      if (error) {
        console.error('[Autosave] Update error:', error)
        return NextResponse.json(
          { success: false, error: 'save_failed' },
          { status: 500 }
        )
      }
    } else {
      // 新規挿入
      const { error } = await supabase
        .from('questionnaire_responses')
        .insert({
          visit_id: resolvedVisitId || null,
          session_id: sessionId || null,
          item_id: itemId,
          value,
          answered_at: new Date().toISOString(),
        })

      if (error) {
        console.error('[Autosave] Insert error:', error)
        return NextResponse.json(
          { success: false, error: 'save_failed' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true, visitId: resolvedVisitId })
  } catch (error) {
    console.error('[Autosave] Error:', error)
    return NextResponse.json(
      { success: false, error: 'server_error' },
      { status: 500 }
    )
  }
}

