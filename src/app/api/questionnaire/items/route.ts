import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const getSupabase = () => {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase環境変数が設定されていません')
  }
  return createClient(supabaseUrl, supabaseServiceKey)
}

/**
 * 問診項目取得API
 * 
 * 管理画面で編集した項目がリアルタイムで反映される
 * 
 * @query target_age - 'preschool' | 'elementary' | 'all'
 * @query event_id - (オプション) イベント別設定を適用
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase()

    const searchParams = request.nextUrl.searchParams
    const targetAge = searchParams.get('target_age') || 'all'
    const eventId = searchParams.get('event_id')

    console.log('[/api/questionnaire/items] リクエスト:', { targetAge, eventId })

    // 1. カテゴリ取得（Activeなもののみ）
    let categoryQuery = supabase
      .from('questionnaire_categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order')

    // target_age でフィルタ
    if (targetAge !== 'all') {
      categoryQuery = categoryQuery.or(`target_age.eq.${targetAge},target_age.eq.all`)
    }

    const { data: categories, error: catError } = await categoryQuery

    if (catError) {
      console.error('カテゴリ取得エラー:', catError)
      throw catError
    }

    console.log('[/api/questionnaire/items] カテゴリ取得:', categories?.length, '件')

    // 2. 項目取得（Activeなもののみ）
    const { data: items, error: itemError } = await supabase
      .from('questionnaire_items')
      .select('*')
      .eq('is_active', true)
      .order('display_order')

    if (itemError) {
      console.error('項目取得エラー:', itemError)
      throw itemError
    }

    console.log('[/api/questionnaire/items] 項目取得:', items?.length, '件')

    // 3. イベント別設定がある場合は適用
    let eventSettings: Record<string, { is_enabled: boolean; display_order?: number }> = {}
    if (eventId) {
      const { data: settings } = await supabase
        .from('event_form_settings')
        .select('item_id, is_enabled, display_order')
        .eq('event_id', eventId)
        .eq('item_type', 'questionnaire')

      if (settings) {
        eventSettings = settings.reduce((acc, s) => {
          acc[s.item_id] = { is_enabled: s.is_enabled, display_order: s.display_order }
          return acc
        }, {} as Record<string, { is_enabled: boolean; display_order?: number }>)
      }
    }

    // 4. カテゴリごとに項目をグルーピング
    const categoryIds = categories?.map(c => c.id) || []
    const filteredItems = items?.filter(item => {
      // カテゴリがActiveでない場合は除外
      if (!categoryIds.includes(item.category_id)) return false

      // イベント設定で無効化されている場合は除外
      if (eventId && eventSettings[item.id]?.is_enabled === false) return false

      return true
    }) || []

    // 5. カテゴリ×項目の構造に整形
    const result = categories?.map(category => ({
      id: category.id,
      name: category.name,
      description: category.description,
      target_age: category.target_age,
      display_order: category.display_order,
      items: filteredItems
        .filter(item => item.category_id === category.id)
        .map(item => ({
          id: item.id,
          question: item.question,
          answer_type: item.answer_type,
          options: typeof item.options === 'string' ? JSON.parse(item.options) : item.options,
          is_required: item.is_required,
          placeholder: item.placeholder,
          helper_text: item.helper_text,
          validation: item.validation,
          display_order: eventSettings[item.id]?.display_order ?? item.display_order,
        }))
        .sort((a, b) => a.display_order - b.display_order)
    })) || []

    // 項目がないカテゴリは除外
    const nonEmptyCategories = result.filter(c => c.items.length > 0)

    return NextResponse.json({
      success: true,
      data: {
        categories: nonEmptyCategories,
        meta: {
          target_age: targetAge,
          event_id: eventId,
          total_categories: nonEmptyCategories.length,
          total_items: filteredItems.length,
        }
      }
    })

  } catch (error) {
    console.error('問診項目取得エラー:', error)
    return NextResponse.json(
      { success: false, error: 'データの取得に失敗しました' },
      { status: 500 }
    )
  }
}

