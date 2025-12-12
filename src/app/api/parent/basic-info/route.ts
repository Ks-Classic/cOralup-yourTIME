import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface BasicInfoRequest {
  lineUserId: string
  sessionId?: string
  parentName: string
  parentLastName?: string
  parentFirstName?: string
  parentPhone: string
  childName: string
  childLastName?: string
  childFirstName?: string
  childFurigana?: string
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
      parentLastName,
      parentFirstName,
      parentPhone,
      childLastName,
      childFirstName,
      childFurigana,
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

    // 1. 親プロフィールを取得または作成
    let { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('line_user_id', lineUserId)
      .eq('role', 'parent')
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
          phone_number: parentPhone,
          prefecture,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)
    }

    // 2. 子供情報を取得または作成
    let { data: child } = await supabase
      .from('children')
      .select('id')
      .eq('parent_profile_id', profile.id)
      .single()

    // 年齢（月）を計算
    const birthday = new Date(childBirthday)
    const now = new Date()
    const ageMonths = (now.getFullYear() - birthday.getFullYear()) * 12 + (now.getMonth() - birthday.getMonth())

    if (!child) {
      // 新規作成
      const { data: newChild, error: childError } = await supabase
        .from('children')
        .insert({
          parent_profile_id: profile.id,
          first_name: childFirstName,
          last_name: childLastName,
          first_name_kana: childFurigana?.split(/\s+/)[1] || childFurigana,
          last_name_kana: childFurigana?.split(/\s+/)[0] || '',
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
    } else {
      // 更新
      await supabase
        .from('children')
        .update({
          first_name: childFirstName,
          last_name: childLastName,
          first_name_kana: childFurigana?.split(/\s+/)[1] || childFurigana,
          last_name_kana: childFurigana?.split(/\s+/)[0] || '',
          birthday: childBirthday,
          gender: childGender,
          nickname: childNickname,
          updated_at: new Date().toISOString(),
        })
        .eq('id', child.id)
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
      // セッションID生成
      finalSessionId = `S${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`

      // sessionsテーブルに作成
      await supabase
        .from('sessions')
        .insert({
          session_id: finalSessionId,
          line_user_id: lineUserId,
          status: 'active',
        })

      // visitsテーブルに作成
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

    console.log('[Basic Info] Saved:', {
      profileId: profile.id,
      childId: child.id,
      visitId,
      sessionId: finalSessionId,
    })

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
