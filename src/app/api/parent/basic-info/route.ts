import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * 基本情報保存API
 * 
 * 処理フロー:
 * 1. profiles を UPDATE（実名情報追加）
 * 2. children を INSERT
 * 3. visits を INSERT
 * 4. sessions を UPDATE（互換用）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      line_user_id,
      session_id,
      // 保護者情報
      parent_last_name,
      parent_first_name,
      parent_last_name_kana,
      parent_first_name_kana,
      parent_phone,
      // 子供情報
      child_last_name,
      child_first_name,
      child_last_name_kana,
      child_first_name_kana,
      child_birthday,
      child_gender,
      prefecture,
    } = body

    // バリデーション
    if (!session_id) {
      return NextResponse.json(
        { error: 'session_id は必須です' },
        { status: 400 }
      )
    }

    let profileId: string | null = null

    // 1. profiles を UPDATE（LINE連携済みの場合）
    if (line_user_id) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .update({
          last_name: parent_last_name,
          first_name: parent_first_name,
          last_name_kana: parent_last_name_kana,
          first_name_kana: parent_first_name_kana,
          phone_number: parent_phone,
          last_activity_at: new Date().toISOString(),
        })
        .eq('line_user_id', line_user_id)
        .select('id')
        .single()

      if (profileError) {
        console.error('Error updating profile:', profileError)
        // LINE連携なしでも続行可能
      } else {
        profileId = profile?.id
      }
    }

    // LINE連携なしの場合、新規profileを作成
    if (!profileId) {
      const { data: newProfile, error: newProfileError } = await supabase
        .from('profiles')
        .insert({
          last_name: parent_last_name,
          first_name: parent_first_name,
          last_name_kana: parent_last_name_kana,
          first_name_kana: parent_first_name_kana,
          phone_number: parent_phone,
          role: 'parent',
          last_activity_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (newProfileError) {
        console.error('Error creating profile:', newProfileError)
        return NextResponse.json(
          { error: 'プロフィールの作成に失敗しました' },
          { status: 500 }
        )
      }
      profileId = newProfile?.id
    }

    // 2. children を INSERT
    const { data: child, error: childError } = await supabase
      .from('children')
      .insert({
        parent_profile_id: profileId,
        last_name: child_last_name,
        first_name: child_first_name,
        last_name_kana: child_last_name_kana,
        first_name_kana: child_first_name_kana,
        birthday: child_birthday,
        gender: child_gender,
        notes: prefecture ? `都道府県: ${prefecture}` : null,
      })
      .select('id')
      .single()

    if (childError) {
      console.error('Error creating child:', childError)
      return NextResponse.json(
        { error: 'お子様情報の登録に失敗しました' },
        { status: 500 }
      )
    }

    // 月齢を計算
    const childAgeMonths = calculateAgeInMonths(child_birthday)

    // 3. visits を INSERT
    const { data: visit, error: visitError } = await supabase
      .from('visits')
      .insert({
        child_id: child.id,
        session_id: session_id,
        status: 'questionnaire_in_progress',
        visit_date: new Date().toISOString(),
        child_age_months: childAgeMonths,
      })
      .select('id')
      .single()

    if (visitError) {
      console.error('Error creating visit:', visitError)
      return NextResponse.json(
        { error: '来場セッションの作成に失敗しました' },
        { status: 500 }
      )
    }

    // 4. sessions テーブルも更新（互換用）
    const { error: sessionError } = await supabase
      .from('sessions')
      .update({
        parent_name: `${parent_last_name} ${parent_first_name}`,
        parent_phone: parent_phone,
        line_user_id: line_user_id || null,
      })
      .eq('session_id', session_id)

    if (sessionError) {
      console.error('Error updating session:', sessionError)
      // 互換テーブルなので続行
    }

    console.log('Basic info saved:', {
      profile_id: profileId,
      child_id: child.id,
      visit_id: visit.id,
      session_id,
    })

    return NextResponse.json({
      success: true,
      profile_id: profileId,
      child_id: child.id,
      visit_id: visit.id,
    })
  } catch (error) {
    console.error('Error in basic-info API:', error)
    return NextResponse.json(
      { error: '基本情報の保存中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

/**
 * 生年月日から月齢を計算
 */
function calculateAgeInMonths(birthday: string): number {
  const birthDate = new Date(birthday)
  const today = new Date()
  
  let months = (today.getFullYear() - birthDate.getFullYear()) * 12
  months -= birthDate.getMonth()
  months += today.getMonth()
  
  // 日が来ていない場合は1ヶ月引く
  if (today.getDate() < birthDate.getDate()) {
    months--
  }
  
  return Math.max(0, months)
}

