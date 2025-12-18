import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabaseClient, isMockMode } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// モック用データ
const mockVisits = [
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    status: 'questionnaire_completed',
    visit_date: new Date().toISOString(),
    child_age_months: 48,
    children: {
      id: 'child-1',
      first_name: '花子',
      last_name: '山田',
      birthday: '2020-03-15',
      gender: 'female',
    },
    profiles: {
      id: 'parent-1',
      display_name: '山田 太郎',
      line_user_id: 'U1234567890',
    },
    medical_interviews: {
      chief_complaint: '歯並びが気になる',
      concerns: ['指しゃぶり', '口呼吸'],
      answers: {
        brushing_frequency: '2回/日',
        snack_frequency: '2回/日',
      },
    },
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440001',
    status: 'questionnaire_completed',
    visit_date: new Date().toISOString(),
    child_age_months: 72,
    children: {
      id: 'child-2',
      first_name: '次郎',
      last_name: '鈴木',
      birthday: '2018-07-20',
      gender: 'male',
    },
    profiles: {
      id: 'parent-2',
      display_name: '鈴木 花子',
      line_user_id: 'U0987654321',
    },
    medical_interviews: {
      chief_complaint: '虫歯が心配',
      concerns: ['甘いもの好き'],
      answers: {
        brushing_frequency: '1回/日',
        snack_frequency: '3回/日',
      },
    },
  },
]

// GET: visit_idまたは受付番号でセッション検索
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const visitId = searchParams.get('visitId')
    const code = searchParams.get('code')

    // console.log('[Staff Session] Request:', { visitId, code })

    // モックモードの場合
    if (isMockMode) {
      if (visitId) {
        const visit = mockVisits.find(v => v.id === visitId)
        if (visit) {
          return NextResponse.json({ success: true, visit })
        }
        return NextResponse.json(
          { success: false, error: 'not_found', message: '該当するセッションが見つかりません' },
          { status: 404 }
        )
      }

      if (code) {
        const visits = mockVisits.filter(v =>
          v.id.toUpperCase().startsWith(code.toUpperCase())
        )
        return NextResponse.json({ success: true, visits })
      }

      return NextResponse.json(
        { success: false, error: 'invalid_params', message: 'visitIdまたはcodeを指定してください' },
        { status: 400 }
      )
    }

    // Supabaseから取得（Service Role Key使用でRLSバイパス）
    const supabase = createServiceSupabaseClient()

    if (visitId) {
      // visit_idで検索
      const { data: visit, error } = await supabase
        .from('visits')
        .select(`
          id,
          status,
          visit_date,
          child_age_months,
          session_id,
          children (
            id,
            first_name,
            last_name,
            first_name_kana,
            last_name_kana,
            birthday,
            gender,
            parent_profile_id
          )
        `)
        .eq('id', visitId)
        .single()

      if (error || !visit) {
        // console.log('[Staff Session] Not found:', { visitId, error })
        return NextResponse.json(
          { success: false, error: 'not_found', message: '該当するセッションが見つかりません' },
          { status: 404 }
        )
      }

      // console.log('[Staff Session] Found:', { visitId: visit.id, status: visit.status })

      // 保護者プロフィールを取得
      let parentProfile = null
      if (visit.children?.parent_profile_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, display_name, first_name, last_name, phone_number, line_user_id')
          .eq('id', visit.children.parent_profile_id)
          .single()
        parentProfile = profile
      }

      // 問診回答を取得（visit_id優先、session_idフォールバック）
      let questionnaireResponses: unknown[] = []
      if (visit.id) {
        const { data: responses } = await supabase
          .from('questionnaire_responses')
          .select(`
            id,
            item_id,
            value,
            answered_at,
            questionnaire_items (
              id,
              question,
              answer_type,
              options,
              category_id,
              questionnaire_categories (
                id,
                name,
                display_order
              )
            )
          `)
          .or(`visit_id.eq.${visit.id}${visit.session_id ? `,session_id.eq.${visit.session_id}` : ''}`)
          .order('answered_at', { ascending: true })

        questionnaireResponses = responses || []

        // #region agent log
        const sampleResponses = (responses || []).slice(0, 3).map((r: any) => ({
          id: r.id,
          value: r.value,
          options: r.questionnaire_items?.options,
          optionsType: typeof r.questionnaire_items?.options,
          question: r.questionnaire_items?.question?.slice(0, 30)
        }));
        fetch('http://127.0.0.1:7245/ingest/23c1c3cb-5ba8-45ac-bbdb-86d5654b9b94', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'staff/session/route.ts:GET', message: 'Questionnaire responses with options', data: { count: responses?.length, sampleResponses }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'C' }) }).catch(() => { });
        // #endregion
      }

      // 互換用 questionnaires テーブルからも取得
      let legacyQuestionnaire = null
      if (visit.session_id) {
        const { data: legacy } = await supabase
          .from('questionnaires')
          .select('*')
          .eq('session_id', visit.session_id)
          .single()
        legacyQuestionnaire = legacy
      }

      return NextResponse.json({
        success: true,
        visit: {
          ...visit,
          parent: parentProfile,
          questionnaire_responses: questionnaireResponses,
          questionnaire: legacyQuestionnaire,
        },
      })
    }

    if (code) {
      // 受付番号（visit_idの先頭8文字）で検索
      const { data: visits, error } = await supabase
        .from('visits')
        .select(`
          id,
          status,
          visit_date,
          children (
            first_name,
            last_name
          )
        `)
        .ilike('id', `${code}%`)
        .eq('status', 'questionnaire_completed')
        .limit(5)

      if (error) {
        return NextResponse.json(
          { success: false, error: 'db_error', message: '検索に失敗しました' },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true, visits: visits || [] })
    }

    return NextResponse.json(
      { success: false, error: 'invalid_params', message: 'visitIdまたはcodeを指定してください' },
      { status: 400 }
    )
  } catch (error) {
    console.error('セッション検索エラー:', error)
    return NextResponse.json(
      { success: false, error: 'server_error', message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

// POST: セッション状態を更新（診断開始）
export async function POST(request: NextRequest) {
  try {
    const { visitId, staffId, action } = await request.json()

    if (!visitId || !staffId) {
      return NextResponse.json(
        { success: false, error: 'invalid_params', message: 'visitIdとstaffIdは必須です' },
        { status: 400 }
      )
    }

    // モックモードの場合
    if (isMockMode) {
      return NextResponse.json({
        success: true,
        visit: {
          id: visitId,
          status: action === 'start_diagnosis' ? 'diagnosis_started' : 'questionnaire_completed',
          staff_profile_id: staffId,
        },
      })
    }

    const supabase = createServiceSupabaseClient()

    // セッション状態を更新
    const currentStep = action === 'start_diagnosis' ? 'diagnosis_started' : 'questionnaire_completed'

    const { data: visit, error } = await supabase
      .from('visits')
      .update({
        status: 'in_progress',
        current_step: currentStep,
        staff_profile_id: staffId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', visitId)
      .select()
      .single()

    if (error) {
      console.error('セッション更新エラー:', error)
      return NextResponse.json(
        { success: false, error: 'db_error', message: 'セッションの更新に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, visit })
  } catch (error) {
    console.error('セッション更新エラー:', error)
    return NextResponse.json(
      { success: false, error: 'server_error', message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

