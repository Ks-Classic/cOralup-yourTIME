import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface AutosaveRequest {
  sessionId: string
  itemId: string
  value: string
}

/**
 * POST: 問診回答を1件ずつ自動保存
 */
export async function POST(request: NextRequest) {
  try {
    const body: AutosaveRequest = await request.json()
    const { sessionId, itemId, value } = body

    if (!sessionId || !itemId) {
      return NextResponse.json(
        { success: false, error: 'sessionId and itemId are required' },
        { status: 400 }
      )
    }

    // upsert: 既存があれば更新、なければ挿入
    const { error } = await supabase
      .from('questionnaire_responses')
      .upsert(
        {
          session_id: sessionId,
          item_id: itemId,
          value,
          answered_at: new Date().toISOString(),
        },
        {
          onConflict: 'session_id,item_id',
        }
      )

    if (error) {
      console.error('[Autosave] Error:', error)
      return NextResponse.json(
        { success: false, error: 'save_failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Autosave] Error:', error)
    return NextResponse.json(
      { success: false, error: 'server_error' },
      { status: 500 }
    )
  }
}

