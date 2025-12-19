import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { questionnaireCategories, questionnaireItems } from '@/db/schema'
import { eq, or, asc } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

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
    const searchParams = request.nextUrl.searchParams
    const targetAge = searchParams.get('target_age') || 'all'
    const eventId = searchParams.get('event_id')

    // 1. カテゴリ取得（Activeなもののみ）
    let categoryRows = await db
      .select()
      .from(questionnaireCategories)
      .where(eq(questionnaireCategories.isActive, true))
      .orderBy(asc(questionnaireCategories.displayOrder))

    // target_age でフィルタ
    if (targetAge !== 'all') {
      categoryRows = categoryRows.filter(c =>
        c.targetAge === targetAge || c.targetAge === 'all'
      )
    }

    // 2. 項目取得（Activeなもののみ）
    const itemRows = await db
      .select()
      .from(questionnaireItems)
      .where(eq(questionnaireItems.isActive, true))
      .orderBy(asc(questionnaireItems.displayOrder))

    // 3. イベント別設定は現時点では単純化（DBテーブルがない場合）
    let eventSettings: Record<string, { is_enabled: boolean; display_order?: number }> = {}
    // event_form_settings テーブルがある場合は追加実装

    // 4. カテゴリごとに項目をグルーピング
    const categoryIds = categoryRows.map(c => c.id)
    const filteredItems = itemRows.filter(item => {
      // カテゴリがActiveでない場合は除外
      if (!item.categoryId || !categoryIds.includes(item.categoryId)) return false

      // イベント設定で無効化されている場合は除外
      if (eventId && eventSettings[item.id]?.is_enabled === false) return false

      return true
    })

    // 5. カテゴリ×項目の構造に整形
    const result = categoryRows.map(category => ({
      id: category.id,
      name: category.name,
      description: category.description,
      target_age: category.targetAge,
      display_order: category.displayOrder,
      items: filteredItems
        .filter(item => item.categoryId === category.id)
        .map(item => ({
          id: item.id,
          question: item.question,
          answer_type: item.answerType,
          options: typeof item.options === 'string' ? JSON.parse(item.options as string) : item.options,
          is_required: item.isRequired,
          placeholder: item.placeholder,
          helper_text: item.helperText,
          validation: item.validation,
          display_order: eventSettings[item.id]?.display_order ?? item.displayOrder,
        }))
        .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
    }))

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
