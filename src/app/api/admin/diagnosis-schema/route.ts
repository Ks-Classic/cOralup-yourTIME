import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// サーバーサイド用のSupabaseクライアント
const getSupabaseAdmin = () => {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase環境変数が設定されていません')
  }
  return createClient(supabaseUrl, supabaseServiceKey)
}

interface DiagnosisItemPayload {
  id: string
  category: string
  question: string
  answerType: string
  options?: { value: string; label: string }[]
  required: boolean
  inputType: string
  note?: string
  isVisible: boolean
}

interface SavePayload {
  categoryOrder: string[]
  items: DiagnosisItemPayload[]
}

// POST: 診断スキーマを保存
export async function POST(request: NextRequest) {
  try {
    const body: SavePayload = await request.json()
    const { categoryOrder, items } = body

    const supabase = getSupabaseAdmin()

    // 1. カテゴリの順序と項目を並列で処理するための準備
    const categoryUpdatePromises = categoryOrder.map(async (categoryName, i) => {
      // カテゴリが存在するか確認して更新または作成
      const { data: existingCategory } = await supabase
        .from('diagnosis_categories')
        .select('id')
        .eq('name', categoryName)
        .single()

      if (existingCategory) {
        return supabase
          .from('diagnosis_categories')
          .update({ display_order: i })
          .eq('id', existingCategory.id)
      } else {
        return supabase
          .from('diagnosis_categories')
          .insert({
            name: categoryName,
            display_order: i,
            is_active: true
          })
      }
    })

    // カテゴリ更新を並列実行
    await Promise.all(categoryUpdatePromises)

    // 2. 項目の更新を並列実行
    // まずカテゴリIDマップを作成して高速化
    const { data: allCategories } = await supabase
      .from('diagnosis_categories')
      .select('id, name')

    const categoryMap = new Map(allCategories?.map(c => [c.name, c.id]))

    const itemUpdatePromises = items.map(async (item) => {
      const categoryId = categoryMap.get(item.category)

      if (!categoryId) {
        console.warn(`カテゴリが見つかりません: ${item.category}`)
        return null
      }

      const itemData = {
        category_id: categoryId,
        question: item.question,
        answer_type: item.answerType,
        options: item.options || null,
        is_required: item.required,
        input_type: item.inputType,
        note: item.note || null,
        is_active: item.isVisible
      }

      // IDがUUID形式（既存）なら更新、そうでなければ（新規）挿入
      // item.idがUUIDかどうかの簡易チェック
      const isExisting = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id)

      if (isExisting) {
        return supabase
          .from('diagnosis_items')
          .update(itemData)
          .eq('id', item.id)
      } else {
        // 新規作成（IDは自動生成させるので含めない）
        return supabase
          .from('diagnosis_items')
          .insert(itemData)
      }
    })

    // 全項目の更新を並列実行
    await Promise.all(itemUpdatePromises)

    return NextResponse.json({ success: true, message: '診断スキーマを保存しました' })

  } catch (error) {
    console.error('診断スキーマ保存エラー:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '保存に失敗しました' },
      { status: 500 }
    )
  }
}

// GET: 診断スキーマを取得
export async function GET() {
  try {
    const supabase = getSupabaseAdmin()

    // カテゴリと項目を取得
    const { data: categories, error: catError } = await supabase
      .from('diagnosis_categories')
      .select('*')
      .order('display_order')

    if (catError) throw catError

    const { data: items, error: itemError } = await supabase
      .from('diagnosis_items')
      .select('*')
      .order('display_order')

    if (itemError) throw itemError

    // カテゴリ順序を生成
    const categoryOrder = categories?.map(c => c.name) || []

    // カテゴリ別に整理
    const categorized: Record<string, any[]> = {}
    for (const item of items || []) {
      const category = categories?.find(c => c.id === item.category_id)
      if (category) {
        if (!categorized[category.name]) {
          categorized[category.name] = []
        }
        categorized[category.name].push({
          id: item.id,
          category: category.name,
          question: item.question,
          answerType: item.answer_type,
          options: item.options,
          required: item.is_required,
          inputType: item.input_type,
          note: item.note,
          isVisible: item.is_active
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: { categoryOrder, categorized }
    })

  } catch (error) {
    console.error('診断スキーマ取得エラー:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '取得に失敗しました' },
      { status: 500 }
    )
  }
}




