import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase クライアント (Service Role)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET: LINE User IDから既存visitを検索・復元
 * Query: line_user_id (必須)
 * 
 * 用途: LIFF問診画面で途中離脱からの復元
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lineUserId = searchParams.get('line_user_id')

    if (!lineUserId) {
      return NextResponse.json(
        { success: false, error: 'line_user_id is required' },
        { status: 400 }
      )
    }

    // 1. profilesからparent情報取得
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_name, first_name, last_name, phone_number')
      .eq('line_user_id', lineUserId)
      .eq('role', 'parent')
      .single()

    if (profileError || !profile) {
      console.log('[Parent Visit] Profile not found:', lineUserId)
      return NextResponse.json({
        success: true,
        profile: null,
        visit: null,
        child: null,
        questionnaireResponses: [],
      })
    }

    // 2. 子供情報を取得
    const { data: children } = await supabase
      .from('children')
      .select('id, first_name, last_name, first_name_kana, last_name_kana, birthday, gender')
      .eq('parent_profile_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(1)

    const child = children?.[0] || null

    // 3. 未完了のvisitを検索（問診途中 or 待機中）
    let visit = null
    let questionnaireResponses: unknown[] = []

    if (child) {
      const { data: visits } = await supabase
        .from('visits')
        .select(`
          id,
          status,
          session_id,
          visit_date,
          child_age_months,
          event_id
        `)
        .eq('child_id', child.id)
        .in('status', ['waiting', 'questionnaire_in_progress', 'questionnaire_completed'])
        .order('created_at', { ascending: false })
        .limit(1)

      visit = visits?.[0] || null

      // 4. 問診回答を取得（visit_id優先、session_idフォールバック）
      if (visit?.id) {
        const { data: responses } = await supabase
          .from('questionnaire_responses')
          .select(`
            id,
            item_id,
            value,
            answered_at,
            questionnaire_items (
              id,
              code,
              question,
              answer_type,
              options
            )
          `)
          .or(`visit_id.eq.${visit.id},session_id.eq.${visit.session_id}`)
          .order('answered_at', { ascending: true })

        questionnaireResponses = responses || []
      }
    }

    console.log('[Parent Visit] Found:', {
      profileId: profile.id,
      childId: child?.id,
      visitId: visit?.id,
      responseCount: questionnaireResponses.length,
    })

    return NextResponse.json({
      success: true,
      profile: {
        id: profile.id,
        displayName: profile.display_name,
        firstName: profile.first_name,
        lastName: profile.last_name,
        phoneNumber: profile.phone_number,
      },
      child: child ? {
        id: child.id,
        firstName: child.first_name,
        lastName: child.last_name,
        firstNameKana: child.first_name_kana,
        lastNameKana: child.last_name_kana,
        birthday: child.birthday,
        gender: child.gender,
      } : null,
      visit: visit ? {
        id: visit.id,
        status: visit.status,
        sessionId: visit.session_id,
        visitDate: visit.visit_date,
        childAgeMonths: visit.child_age_months,
        eventId: visit.event_id,
      } : null,
      questionnaireResponses,
    })
  } catch (error) {
    console.error('[Parent Visit] Error:', error)
    return NextResponse.json(
      { success: false, error: 'server_error' },
      { status: 500 }
    )
  }
}

/**
 * POST: 新規visit作成（LIFF問診開始時）
 * Body: { lineUserId, childId?, eventId? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { lineUserId, childId, eventId } = body

    if (!lineUserId) {
      return NextResponse.json(
        { success: false, error: 'lineUserId is required' },
        { status: 400 }
      )
    }

    // 1. profilesから親情報取得
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('line_user_id', lineUserId)
      .eq('role', 'parent')
      .single()

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'profile_not_found' },
        { status: 404 }
      )
    }

    // 2. セッションID生成（後方互換用）
    const sessionId = `S${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`

    // 3. visitsテーブルに作成（sessionsテーブルは廃止、visit_idを主キーとして使用）
    const { data: visit, error: visitError } = await supabase
      .from('visits')
      .insert({
        session_id: sessionId,
        child_id: childId || null,
        event_id: eventId || process.env.DEFAULT_EVENT_ID || null,
        organization_id: process.env.CORALUP_ORG_ID || null,
        status: 'waiting',
        visit_date: new Date().toISOString(),
      })
      .select()
      .single()

    if (visitError) {
      console.error('[Parent Visit] Visit creation error:', visitError)
      return NextResponse.json(
        { success: false, error: 'visit_creation_failed' },
        { status: 500 }
      )
    }

    console.log('[Parent Visit] Created:', {
      visitId: visit.id,
      sessionId,
    })

    return NextResponse.json({
      success: true,
      visit: {
        id: visit.id,
        sessionId: visit.session_id,
        status: visit.status,
      },
    })
  } catch (error) {
    console.error('[Parent Visit] POST Error:', error)
    return NextResponse.json(
      { success: false, error: 'server_error' },
      { status: 500 }
    )
  }
}

