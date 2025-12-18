import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Supabase クライアント (Service Role)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET: LINE User IDから既存visitを検索・復元
 * Query: line_user_id (必須)
 * 
 * 用途: LIFF問診画面で途中離脱からの復元、兄弟対応
 * 
 * 返り値:
 * - profile: 親御さん情報
 * - children: 全ての子供とそのvisit情報（兄弟対応）
 * - child: 最新の子供（後方互換）
 * - visit: 最新のvisit（後方互換）
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

    // 1. profilesからparent情報取得（role='parent' または secondary_role='parent'）
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_name, first_name, last_name, first_name_kana, last_name_kana, phone_number')
      .eq('line_user_id', lineUserId)
      .or('role.eq.parent,secondary_role.eq.parent')
      .single()

    if (profileError || !profile) {
      // console.log('[Parent Visit] Profile not found:', lineUserId)
      return NextResponse.json({
        success: true,
        profile: null,
        children: [],
        visit: null,
        child: null,
        questionnaireResponses: [],
      })
    }

    // 2. 全ての子供とその関連visitを取得（兄弟対応）
    const { data: childrenWithVisits, error: childrenError } = await supabase
      .from('children')
      .select(`
        id,
        first_name,
        last_name,
        first_name_kana,
        last_name_kana,
        birthday,
        gender,
        visits (
          id,
          status,
          session_id,
          visit_date,
          child_age_months,
          event_id
        )
      `)
      .eq('parent_profile_id', profile.id)
      .order('created_at', { ascending: false })

    if (childrenError) {
      console.error('[Parent Visit] Children fetch error:', childrenError)
    }

    // 子供データを整形
    const children = (childrenWithVisits || []).map(child => {
      // 各子供の最新visitを取得
      const sortedVisits = (child.visits || []).sort((a: { visit_date: string }, b: { visit_date: string }) =>
        new Date(b.visit_date || 0).getTime() - new Date(a.visit_date || 0).getTime()
      )
      const latestVisit = sortedVisits[0] || null

      return {
        id: child.id,
        firstName: child.first_name,
        lastName: child.last_name,
        firstNameKana: child.first_name_kana,
        lastNameKana: child.last_name_kana,
        birthday: child.birthday,
        gender: child.gender,
        // visitステータスから問診状態を判定
        questionnaireStatus: latestVisit?.status || 'not_started',
        latestVisit: latestVisit ? {
          id: latestVisit.id,
          status: latestVisit.status,
          sessionId: latestVisit.session_id,
          visitDate: latestVisit.visit_date,
          childAgeMonths: latestVisit.child_age_months,
          eventId: latestVisit.event_id,
        } : null,
        // 全てのvisit情報（同じイベントで複数回診断する場合など）
        visits: sortedVisits.map((v: { id: string; status: string; session_id: string; visit_date: string; child_age_months: number; event_id: string }) => ({
          id: v.id,
          status: v.status,
          sessionId: v.session_id,
          visitDate: v.visit_date,
          childAgeMonths: v.child_age_months,
          eventId: v.event_id,
        })),
      }
    })

    // 後方互換: 最新の子供とvisitを取得
    const latestChild = children[0] || null
    const latestVisit = latestChild?.latestVisit || null

    // 3. 問診回答を取得（最新visitがある場合のみ、後方互換用）
    let questionnaireResponses: unknown[] = []
    if (latestVisit?.id) {
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
        .or(`visit_id.eq.${latestVisit.id},session_id.eq.${latestVisit.sessionId}`)
        .order('answered_at', { ascending: true })

      questionnaireResponses = responses || []
    }

    // console.log('[Parent Visit] Found:', { profileId: profile.id, childrenCount: children.length, latestVisitId: latestVisit?.id })

    return NextResponse.json({
      success: true,
      profile: {
        id: profile.id,
        displayName: profile.display_name,
        firstName: profile.first_name,
        lastName: profile.last_name,
        firstNameKana: profile.first_name_kana,
        lastNameKana: profile.last_name_kana,
        phoneNumber: profile.phone_number,
      },
      // 兄弟対応: 全ての子供を返す
      children,
      // 後方互換: 最新の子供
      child: latestChild ? {
        id: latestChild.id,
        firstName: latestChild.firstName,
        lastName: latestChild.lastName,
        firstNameKana: latestChild.firstNameKana,
        lastNameKana: latestChild.lastNameKana,
        birthday: latestChild.birthday,
        gender: latestChild.gender,
      } : null,
      // 後方互換: 最新のvisit
      visit: latestVisit,
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
      .or('role.eq.parent,secondary_role.eq.parent')
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
        current_step: 'line_registered',
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

    // console.log('[Parent Visit] Created:', { visitId: visit.id, sessionId })

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

