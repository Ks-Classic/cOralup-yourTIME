import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isMockMode } from '@/lib/supabase'
import { preschoolerFormSchema } from '@/data/preschooler-form-schema'
import { elementaryFormSchema } from '@/data/elementary-form-schema'
import { diagnosisItems, categoryOrder } from '@/data/staff-diagnosis-items'
import type { DiagnosisItem } from '@/data/staff-diagnosis-items'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const adminApiKey = process.env.ADMIN_API_KEY

const getAdminSupabase = () => {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase環境変数が設定されていません')
  }
  return createClient(supabaseUrl, supabaseServiceKey)
}

const assertAdminAuthorized = (request: NextRequest) => {
  // 暫定: 管理画面URLを知っている人のみアクセス可能
  // TODO: 将来的にはログイン機能を実装してセッションベースで認証
  if (isMockMode) return
  if (!adminApiKey) return // ADMIN_API_KEY未設定時は認証スキップ

  const authHeader = request.headers.get('authorization') || ''
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  const headerKey = request.headers.get('x-admin-key')
  
  // ヘッダーがない場合も許可（暫定対応）
  if (!bearer && !headerKey) return
  
  if (bearer === adminApiKey || headerKey === adminApiKey) return
  throw new Error('unauthorized')
}

// 診断項目をスキーマ形式に変換
function convertDiagnosisItemsToSchema(items: DiagnosisItem[]) {
  const categorized: Record<string, DiagnosisItem[]> = {}
  items.forEach(item => {
    if (!categorized[item.category]) {
      categorized[item.category] = []
    }
    categorized[item.category].push(item)
  })

  const categories = categoryOrder.map((categoryName, index) => ({
    id: categoryName.toLowerCase().replace(/[・]/g, '_'),
    name: categoryName,
    order: index + 1,
    items: (categorized[categoryName] || []).map(item => ({
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

  return { categories, settings: { showProgress: true, allowBackNavigation: true } }
}

// モックデータ
const mockSchemas = [
  {
    id: 'mock-1',
    schema_id: 'preschooler_v1',
    form_type: 'questionnaire',
    name: '未就学児用問診票',
    description: '未就学児（0〜6歳）向けの問診票フォーム',
    version: '1.0',
    is_active: true,
    config: preschoolerFormSchema,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'mock-2',
    schema_id: 'elementary_v1',
    form_type: 'questionnaire',
    name: '小学生以上用問診票',
    description: '小学生以上向けの問診票フォーム',
    version: '1.0',
    is_active: true,
    config: elementaryFormSchema,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'mock-3',
    schema_id: 'diagnosis_v1',
    form_type: 'diagnosis',
    name: 'スタッフ診断評価項目',
    description: 'スタッフが入力する診断評価項目',
    version: '1.0',
    is_active: true,
    config: convertDiagnosisItemsToSchema(diagnosisItems),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]


// 問診項目をスキーマ形式に変換
async function convertQuestionnaireToSchema(supabase: any, targetAge: 'preschool' | 'elementary') {
  // カテゴリ取得（is_activeも保持）
  const { data: categories, error: catError } = await supabase
    .from('questionnaire_categories')
    .select('*')
    .or(`target_age.eq.${targetAge},target_age.eq.all`)
    .order('display_order')

  if (catError) throw catError

  // 項目取得（is_activeも保持）
  const { data: items, error: itemError } = await supabase
    .from('questionnaire_items')
    .select('*')
    .order('display_order')

  if (itemError) throw itemError

  // カテゴリごとにセクションを構築（管理画面用に isActive を持たせる）
  const sections = categories
    .map((cat: any) => {
      const catItems = items.filter((item: any) => item.category_id === cat.id)
      return {
        id: cat.id,
        title: cat.name,
        description: cat.description,
        order: cat.display_order,
        isActive: cat.is_active,
        fields: catItems.map((item: any) => ({
          id: item.id,
          name: item.question,
          type: item.answer_type,
          required: item.is_required,
          placeholder: item.placeholder,
          helperText: item.helper_text,
          options: typeof item.options === 'string' ? JSON.parse(item.options) : item.options,
          validation: item.validation,
          isActive: item.is_active,
        })),
      }
    })
    .filter((section: any) => section.fields.length > 0)

  return { sections, settings: { showProgress: true, allowBackNavigation: true } }
}

// GET: スキーマ一覧取得
export async function GET(request: NextRequest) {
  try {
    assertAdminAuthorized(request)
    const { searchParams } = new URL(request.url)
    const formType = searchParams.get('form_type')
    const schemaId = searchParams.get('schema_id')

    // Supabase接続
    const supabase = getAdminSupabase()

    // 問診票の正規化テーブルからデータ取得する場合
    if (schemaId && (schemaId.startsWith('preschooler') || schemaId.startsWith('elementary'))) {
      const targetAge = schemaId.startsWith('preschooler') ? 'preschool' : 'elementary'
      try {
        const config = await convertQuestionnaireToSchema(supabase, targetAge)

        // FormSchemaの形式で返す
        const schemaData = {
          id: schemaId, // 仮想ID
          schema_id: schemaId,
          form_type: 'questionnaire',
          name: targetAge === 'preschool' ? '未就学児用問診票' : '小学生以上用問診票',
          description: '',
          version: '1.0',
          is_active: true,
          config,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        return NextResponse.json({ data: [schemaData], error: null })
      } catch (err) {
        console.error('Failed to convert questionnaire schema:', err)
        // エラー時はフォールバックとしてform_schemasを見に行くかエラーを返す
      }
    }

    // デフォルト: form_schemasテーブルから取得 (JSON保存版 or Mock)
    let query = supabase
      .from('form_schemas')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (formType) {
      query = query.eq('form_type', formType)
    }
    if (schemaId) {
      query = query.eq('schema_id', schemaId)
    }

    const { data, error } = await query

    if (error) {
      // テーブルがまだ空かもしれないので、エラーではなく空配列を返す手もあるが、一旦エラーを返す
      // ただし、もしseedしてないだけなら form_schemas は空配列を返すべき。
      if (error.code === 'PGRST116') { // data not found equivalent
        return NextResponse.json({ data: [], error: null })
      }
      return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data, error: null })
  } catch (error) {
    if ((error as Error).message === 'unauthorized') {
      return NextResponse.json({ data: null, error: 'unauthorized' }, { status: 401 })
    }
    console.error('Schema fetch error:', error)
    return NextResponse.json(
      { data: null, error: 'スキーマの取得に失敗しました' },
      { status: 500 }
    )
  }
}


// POST: スキーマ保存（正規化テーブルへの反映）
export async function POST(request: NextRequest) {
  try {
    assertAdminAuthorized(request)
    const body = await request.json()
    const {
      schema_id,
      form_type,
      name,
      description,
      config,
      hardDeleteCategoryIds = [],
      hardDeleteItemIds = [],
    } = body

    // 必須チェック
    if (!schema_id || !form_type || !config) {
      return NextResponse.json(
        { data: null, error: '必須パラメータが不足しています' },
        { status: 400 }
      )
    }

    const supabase = getAdminSupabase()

    // 問診票の更新（正規化テーブル）
    if (form_type === 'questionnaire') {
      const targetAge = schema_id.startsWith('preschooler') ? 'preschool' : 'elementary' // 'preschool', 'elementary'
      const usedCategoryIds: string[] = []
      const usedItemIds: string[] = []

      // セクション（カテゴリ）の保存
      for (const section of config.sections) {
        let categoryId = section.id

        // IDがUUIDでない（一時ID）場合は、名前で既存チェックするか新規作成
        const isTempId = !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(categoryId)

        if (isTempId) {
          // 名前で既存検索
          const { data: existingCat } = await supabase
            .from('questionnaire_categories')
            .select('id')
            .eq('name', section.title)
            .single()

          if (existingCat) {
            categoryId = existingCat.id
          } else {
            // 新規作成
            const { data: newCat, error: createError } = await supabase
              .from('questionnaire_categories')
              .insert({
                name: section.title,
                description: section.description,
                target_age: targetAge, // 新規作成時は現在のモードの年齢を設定
                display_order: section.order,
                is_active: true
              })
              .select('id')
              .single()

            if (createError) throw createError
            categoryId = newCat.id
          }
        } else {
          // 既存更新
          await supabase
            .from('questionnaire_categories')
            .update({
              name: section.title,
              description: section.description,
              display_order: section.order,
              // target_ageは変更しない（共有されている可能性があるため）
            })
            .eq('id', categoryId)
        }

        usedCategoryIds.push(categoryId)

        // 項目（フィールド）の保存
        for (const field of section.fields) {
          let itemId = field.id
        const isTempItemId = !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(itemId)

          const itemData = {
            category_id: categoryId,
            question: field.name,
            answer_type: field.type,
            is_required: field.required || false,
            placeholder: field.placeholder,
            options: field.options ? JSON.stringify(field.options) : null, // JSONとして保存
            display_order: section.fields.indexOf(field) + 1,
            is_active: field.isActive !== false
          }

          if (isTempItemId) {
            // 新規作成
            await supabase
              .from('questionnaire_items')
              .insert(itemData)
          } else {
            // 更新
            await supabase
              .from('questionnaire_items')
              .update(itemData)
              .eq('id', itemId)
          }

          usedItemIds.push(itemId)
        }
      }

      // 今回送信に含まれないカテゴリ/項目をsoft delete（is_active=false）
      try {
        const { data: existingCats } = await supabase
          .from('questionnaire_categories')
          .select('id')
          .eq('target_age', targetAge)
          .eq('is_active', true)

        const existingCatIds = existingCats?.map((c: any) => c.id) || []
        const catSoftDelete = existingCatIds.filter((id: string) => !usedCategoryIds.includes(id))

        if (catSoftDelete.length > 0) {
          await supabase
            .from('questionnaire_categories')
            .update({ is_active: false })
            .in('id', catSoftDelete)
        }

        const categoryScope = Array.from(new Set([...existingCatIds, ...usedCategoryIds]))
        if (categoryScope.length > 0) {
          const { data: existingItems } = await supabase
            .from('questionnaire_items')
            .select('id')
            .in('category_id', categoryScope)
            .eq('is_active', true)

          const existingItemIds = existingItems?.map((i: any) => i.id) || []
          const itemSoftDelete = existingItemIds.filter((id: string) => !usedItemIds.includes(id))

          if (itemSoftDelete.length > 0) {
            await supabase
              .from('questionnaire_items')
              .update({ is_active: false })
              .in('id', itemSoftDelete)
          }
        }
      } catch (err) {
        console.error('soft delete update failed:', err)
      }

      // ハード削除
      console.log('[schemas POST] hardDeleteItemIds:', hardDeleteItemIds)
      console.log('[schemas POST] hardDeleteCategoryIds:', hardDeleteCategoryIds)

      // 1. 指定された項目を削除
      if (hardDeleteItemIds.length > 0) {
        const { error: delItemErr } = await supabase
          .from('questionnaire_items')
          .delete()
          .in('id', hardDeleteItemIds)
        if (delItemErr) console.error('[schemas POST] item delete error:', delItemErr)
      }

      // 2. カテゴリ削除時は、そのカテゴリ配下の全項目を先に削除（FK制約対応）
      if (hardDeleteCategoryIds.length > 0) {
        // カテゴリに属する全項目を削除
        const { error: delCatItemsErr } = await supabase
          .from('questionnaire_items')
          .delete()
          .in('category_id', hardDeleteCategoryIds)
        if (delCatItemsErr) console.error('[schemas POST] category items delete error:', delCatItemsErr)

        // カテゴリを削除
        const { error: delCatErr } = await supabase
          .from('questionnaire_categories')
          .delete()
          .in('id', hardDeleteCategoryIds)
        if (delCatErr) console.error('[schemas POST] category delete error:', delCatErr)
      }

      return NextResponse.json({ success: true, message: '問診票データを保存しました' })
    }

    // デフォルト: レガシー/JSON形式での保存（互換性維持）
    if (isMockMode) {
      // Mock logic omited for brevity, essentially just return success
      return NextResponse.json({ data: { id: 'mock', ...body }, error: null })
    }

    const { data, error } = await supabase
      .from('form_schemas')
      .upsert({
        schema_id,
        form_type,
        name,
        description,
        version: '1.0',
        is_active: true,
        config,
      }, { onConflict: 'schema_id' })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data, error: null })
  } catch (error) {
    if ((error as Error).message === 'unauthorized') {
      return NextResponse.json({ data: null, error: 'unauthorized' }, { status: 401 })
    }
    console.error('Schema create error:', error)
    return NextResponse.json(
      { data: null, error: 'スキーマの作成に失敗しました' },
      { status: 500 }
    )
  }
}




