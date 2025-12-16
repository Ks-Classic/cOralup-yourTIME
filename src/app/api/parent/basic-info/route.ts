import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface BasicInfoRequest {
  lineUserId: string
  sessionId?: string
  childId?: string  // 既存の子供を更新する場合に指定
  parentName: string
  parentLastName?: string
  parentFirstName?: string
  parentLastNameKana?: string
  parentFirstNameKana?: string
  parentPhone: string
  childName: string
  childLastName?: string
  childFirstName?: string
  childFurigana?: string
  childLastNameKana?: string
  childFirstNameKana?: string
  childBirthday: string
  childGender: 'male' | 'female' | 'other'
  childNickname?: string
  prefecture?: string
}

/**
 * POST: 親御さん基本情報を保存
 * - profilesテーブル更新
 * - childrenテーブル作成/更新
 * - visitsテーブル作成/更新
 */
export async function POST(request: NextRequest) {
  try {
    const body: BasicInfoRequest = await request.json()

    const {
      lineUserId,
      sessionId,
      childId,
      parentLastName,
      parentFirstName,
      parentLastNameKana,
      parentFirstNameKana,
      parentPhone,
      childLastName,
      childFirstName,
      childFurigana,
      childLastNameKana,
      childFirstNameKana,
      childBirthday,
      childGender,
      childNickname,
      prefecture,
    } = body

    if (!lineUserId) {
      return NextResponse.json(
        { success: false, error: 'lineUserId is required' },
        { status: 400 }
      )
    }

    // 1. 親プロフィールを取得または作成（role='parent' または secondary_role='parent'）
    let { data: profile } = await supabase
      .from('profiles')
      .select('id, role, secondary_role')
      .eq('line_user_id', lineUserId)
      .or('role.eq.parent,secondary_role.eq.parent')
      .single()

    if (!profile) {
      // 新規作成
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          line_user_id: lineUserId,
          role: 'parent',
          first_name: parentFirstName,
          last_name: parentLastName,
          first_name_kana: parentFirstNameKana,
          last_name_kana: parentLastNameKana,
          phone_number: parentPhone,
          prefecture,
          is_active: true,
        })
        .select()
        .single()

      if (createError) {
        console.error('[Basic Info] Profile create error:', createError)
        return NextResponse.json(
          { success: false, error: 'profile_creation_failed' },
          { status: 500 }
        )
      }

      profile = newProfile
    } else {
      // 更新
      await supabase
        .from('profiles')
        .update({
          first_name: parentFirstName,
          last_name: parentLastName,
          first_name_kana: parentFirstNameKana,
          last_name_kana: parentLastNameKana,
          phone_number: parentPhone,
          prefecture,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)
    }

    // 2. 子供情報を処理
    // childIdが指定されていれば既存の子供を更新、なければ新規作成
    let child: { id: string } | null = null

    // 年齢（月）を計算
    const birthday = new Date(childBirthday)
    const now = new Date()
    const ageMonths = (now.getFullYear() - birthday.getFullYear()) * 12 + (now.getMonth() - birthday.getMonth())

    if (childId) {
      // 既存の子供を更新
      const { data: existingChild, error: fetchError } = await supabase
        .from('children')
        .select('id')
        .eq('id', childId)
        .eq('parent_profile_id', profile.id)
        .single()

      if (fetchError || !existingChild) {
        console.error('[Basic Info] Child not found:', childId)
        return NextResponse.json(
          { success: false, error: 'child_not_found' },
          { status: 404 }
        )
      }

      await supabase
        .from('children')
        .update({
          first_name: childFirstName,
          last_name: childLastName,
          first_name_kana: childFirstNameKana || childFurigana?.split(/\s+/)[1] || childFurigana,
          last_name_kana: childLastNameKana || childFurigana?.split(/\s+/)[0] || '',
          birthday: childBirthday,
          gender: childGender,
          nickname: childNickname,
          updated_at: new Date().toISOString(),
        })
        .eq('id', childId)

      child = existingChild
    } else {
      // 新規作成（常に新しい子供を作成）
      const { data: newChild, error: childError } = await supabase
        .from('children')
        .insert({
          parent_profile_id: profile.id,
          first_name: childFirstName,
          last_name: childLastName,
          first_name_kana: childFirstNameKana || childFurigana?.split(/\s+/)[1] || childFurigana,
          last_name_kana: childLastNameKana || childFurigana?.split(/\s+/)[0] || '',
          birthday: childBirthday,
          gender: childGender,
          nickname: childNickname,
        })
        .select()
        .single()

      if (childError) {
        console.error('[Basic Info] Child create error:', childError)
        return NextResponse.json(
          { success: false, error: 'child_creation_failed' },
          { status: 500 }
        )
      }

      child = newChild
    }

    // 3. セッションとvisitを処理
    let finalSessionId = sessionId
    let visitId: string | null = null

    if (sessionId) {
      // 既存セッションのvisitを更新
      const { data: existingVisit } = await supabase
        .from('visits')
        .select('id')
        .eq('session_id', sessionId)
        .single()

      if (existingVisit) {
        visitId = existingVisit.id
        await supabase
          .from('visits')
          .update({
            child_id: child.id,
            child_age_months: ageMonths,
            status: 'questionnaire_in_progress',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingVisit.id)
      }
    }

    // visitがなければ新規作成
    if (!visitId) {
      // セッションID生成（後方互換用）
      finalSessionId = `S${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`

      // visitsテーブルに作成（sessionsテーブルは廃止、visit_idを主キーとして使用）
      const { data: newVisit, error: visitError } = await supabase
        .from('visits')
        .insert({
          session_id: finalSessionId,
          child_id: child.id,
          child_age_months: ageMonths,
          event_id: process.env.DEFAULT_EVENT_ID || null,
          organization_id: process.env.CORALUP_ORG_ID || null,
          status: 'questionnaire_in_progress',
          visit_date: new Date().toISOString(),
        })
        .select()
        .single()

      if (visitError) {
        console.error('[Basic Info] Visit create error:', visitError)
      } else {
        visitId = newVisit.id
      }
    }

    // console.log('[Basic Info] Saved:', { profileId: profile.id, childId: child.id, visitId, sessionId: finalSessionId })

    return NextResponse.json({
      success: true,
      profileId: profile.id,
      childId: child.id,
      visitId,
      sessionId: finalSessionId,
    })
  } catch (error) {
    console.error('[Basic Info] Error:', error)
    return NextResponse.json(
      { success: false, error: 'server_error' },
      { status: 500 }
    )
  }
}
