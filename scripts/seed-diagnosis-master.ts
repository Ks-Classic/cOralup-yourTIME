/**
 * 診断項目マスタのシードスクリプト
 * staff-diagnosis-items.ts のデータをDBに投入
 * 
 * 実行: npx tsx scripts/seed-diagnosis-master.ts
 */

import { createClient } from '@supabase/supabase-js'
import { diagnosisItems, categoryOrder } from '../src/data/staff-diagnosis-items'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('環境変数が設定されていません: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function seedDiagnosisMaster() {
  console.log('🌱 診断項目マスタのシードを開始...')

  try {
    // 1. カテゴリを挿入
    console.log('📁 カテゴリを挿入中...')
    const categoryMap = new Map<string, string>() // name -> id

    for (let i = 0; i < categoryOrder.length; i++) {
      const categoryName = categoryOrder[i]
      
      // 既存チェック
      const { data: existing } = await supabase
        .from('diagnosis_categories')
        .select('id')
        .eq('name', categoryName)
        .single()

      if (existing) {
        categoryMap.set(categoryName, existing.id)
        console.log(`  ✓ ${categoryName} (既存)`)
        continue
      }

      const { data, error } = await supabase
        .from('diagnosis_categories')
        .insert({
          name: categoryName,
          display_order: i,
          is_active: true
        })
        .select('id')
        .single()

      if (error) {
        console.error(`  ✗ ${categoryName}: ${error.message}`)
        continue
      }

      categoryMap.set(categoryName, data.id)
      console.log(`  ✓ ${categoryName} (新規)`)
    }

    // 2. 項目を挿入
    console.log('\n📝 診断項目を挿入中...')
    let insertedCount = 0
    let skippedCount = 0

    for (const item of diagnosisItems) {
      const categoryId = categoryMap.get(item.category)
      if (!categoryId) {
        console.error(`  ✗ ${item.question}: カテゴリ "${item.category}" が見つかりません`)
        continue
      }

      // 既存チェック（questionで判定）
      const { data: existing } = await supabase
        .from('diagnosis_items')
        .select('id')
        .eq('question', item.question)
        .eq('category_id', categoryId)
        .single()

      if (existing) {
        skippedCount++
        continue
      }

      // カテゴリ内での表示順を計算
      const itemsInCategory = diagnosisItems.filter(i => i.category === item.category)
      const displayOrder = itemsInCategory.indexOf(item)

      const { error } = await supabase
        .from('diagnosis_items')
        .insert({
          category_id: categoryId,
          question: item.question,
          answer_type: item.answerType,
          options: item.options || null,
          is_required: item.required,
          input_type: item.inputType,
          note: item.note || null,
          placeholder: item.placeholder || null,
          unit: item.unit || null,
          min_value: item.min || null,
          max_value: item.max || null,
          display_order: displayOrder,
          is_active: true
        })

      if (error) {
        console.error(`  ✗ ${item.question}: ${error.message}`)
        continue
      }

      insertedCount++
    }

    console.log(`\n✅ シード完了!`)
    console.log(`   カテゴリ: ${categoryMap.size}件`)
    console.log(`   項目: ${insertedCount}件 新規, ${skippedCount}件 スキップ`)

  } catch (error) {
    console.error('❌ エラー:', error)
    process.exit(1)
  }
}

seedDiagnosisMaster()

