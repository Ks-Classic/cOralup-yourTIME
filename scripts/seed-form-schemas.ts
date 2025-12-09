/**
 * form_schemasテーブルに既存のハードコードデータをシードするスクリプト
 * 
 * 使用方法:
 * npx tsx scripts/seed-form-schemas.ts
 */

import { createClient } from '@supabase/supabase-js'
import { preschoolerFormSchema } from '../src/data/preschooler-form-schema'
import { elementaryFormSchema } from '../src/data/elementary-form-schema'
import { diagnosisItems, categoryOrder } from '../src/data/staff-diagnosis-items'
import type { DiagnosisItem } from '../src/data/staff-diagnosis-items'

// 環境変数から接続情報を取得
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 環境変数が設定されていません')
  console.log('必要な環境変数:')
  console.log('  - NEXT_PUBLIC_SUPABASE_URL')
  console.log('  - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 診断項目をカテゴリ別に整理してスキーマ形式に変換
function convertDiagnosisItemsToSchema(items: DiagnosisItem[]) {
  const categorizedItems: Record<string, DiagnosisItem[]> = {}
  
  items.forEach(item => {
    if (!categorizedItems[item.category]) {
      categorizedItems[item.category] = []
    }
    categorizedItems[item.category].push(item)
  })

  const categories = categoryOrder.map((categoryName, index) => ({
    id: categoryName.toLowerCase().replace(/[・]/g, '_'),
    name: categoryName,
    order: index + 1,
    items: (categorizedItems[categoryName] || []).map(item => ({
      id: item.id,
      question: item.question,
      answerType: item.answerType,
      options: item.options,
      required: item.required,
      inputType: item.inputType,
      analysisUse: item.analysisUse,
      note: item.note,
      placeholder: item.placeholder,
      unit: item.unit,
      min: item.min,
      max: item.max,
    }))
  })).filter(cat => cat.items.length > 0)

  return {
    categories,
    settings: {
      showProgress: true,
      allowBackNavigation: true,
    },
    metadata: {
      createdFrom: 'seed-script',
      originalFile: 'src/data/staff-diagnosis-items.ts',
    }
  }
}

async function seedFormSchemas() {
  console.log('🌱 form_schemasテーブルへのシード開始...\n')

  const schemas = [
    {
      schema_id: 'preschooler_v1',
      form_type: 'questionnaire',
      name: '未就学児用問診票',
      description: '未就学児（0〜6歳）向けの問診票フォーム',
      version: '1.0',
      is_active: true,
      config: preschoolerFormSchema,
    },
    {
      schema_id: 'elementary_v1',
      form_type: 'questionnaire',
      name: '小学生以上用問診票',
      description: '小学生以上向けの問診票フォーム',
      version: '1.0',
      is_active: true,
      config: elementaryFormSchema,
    },
    {
      schema_id: 'diagnosis_v1',
      form_type: 'diagnosis',
      name: 'スタッフ診断評価項目',
      description: 'スタッフが入力する診断評価項目',
      version: '1.0',
      is_active: true,
      config: convertDiagnosisItemsToSchema(diagnosisItems),
    },
  ]

  for (const schema of schemas) {
    console.log(`📝 ${schema.name} をシード中...`)
    
    // 既存データを確認
    const { data: existing } = await supabase
      .from('form_schemas')
      .select('id')
      .eq('schema_id', schema.schema_id)
      .single()

    if (existing) {
      // 更新
      const { error } = await supabase
        .from('form_schemas')
        .update({
          ...schema,
          updated_at: new Date().toISOString(),
        })
        .eq('schema_id', schema.schema_id)

      if (error) {
        console.error(`❌ ${schema.name} の更新に失敗:`, error.message)
      } else {
        console.log(`✅ ${schema.name} を更新しました`)
      }
    } else {
      // 新規作成
      const { error } = await supabase
        .from('form_schemas')
        .insert(schema)

      if (error) {
        console.error(`❌ ${schema.name} の作成に失敗:`, error.message)
      } else {
        console.log(`✅ ${schema.name} を作成しました`)
      }
    }
  }

  console.log('\n🎉 シード完了!')
}

// 実行
seedFormSchemas().catch(console.error)




