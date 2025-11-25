import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')
    const formType = searchParams.get('formType')
    const isActive = searchParams.get('isActive')

    let query = supabase
      .from('form_schemas')
      .select(`
        *,
        events (
          name,
          event_id
        )
      `)
      .order('created_at', { ascending: false })

    if (eventId) {
      query = query.eq('event_id', eventId)
    }

    if (formType) {
      query = query.eq('form_type', formType)
    }

    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true')
    }

    const { data: schemas, error } = await query

    if (error) {
      console.error('Error fetching form schemas:', error)
      return NextResponse.json(
        { error: 'フォームスキーマの取得に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({ schemas })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      schema_id,
      event_id,
      form_type,
      name,
      description,
      config,
      is_active = true,
      version = '1.0',
    } = body

    // バリデーション
    if (!schema_id || !form_type || !name || !config) {
      return NextResponse.json(
        { error: '必須項目が入力されていません' },
        { status: 400 }
      )
    }

    const normalizedConfig = typeof config === 'string' ? JSON.parse(config) : config

    // フォームスキーマの保存（作成 or 更新）
    const { data: upsertedSchemas, error: schemaError } = await supabase
      .from('form_schemas')
      .upsert([
        {
          schema_id,
          event_id,
          form_type,
          name,
          description,
          config: normalizedConfig,
          is_active,
          version,
          updated_at: new Date().toISOString(),
        },
      ], { onConflict: 'schema_id' })
      .select()

    if (schemaError || !upsertedSchemas || upsertedSchemas.length === 0) {
      console.error('Error saving form schema:', schemaError)
      return NextResponse.json(
        { error: 'フォームスキーマの保存に失敗しました' },
        { status: 500 }
      )
    }

    const schemaRecord = upsertedSchemas[0]

    // 既存フィールドを削除
    const { error: deleteFieldsError } = await supabase
      .from('form_fields')
      .delete()
      .eq('schema_id', schemaRecord.id)

    if (deleteFieldsError) {
      console.error('Error clearing old form fields:', deleteFieldsError)
    }

    // フォームフィールドの保存
    if (normalizedConfig.sections && normalizedConfig.sections.length > 0) {
      const fields = [] as any[]

      normalizedConfig.sections.forEach((section: any, sectionIndex: number) => {
        section.fields.forEach((field: any, fieldIndex: number) => {
          fields.push({
            schema_id: schemaRecord.id,
            field_id: field.id,
            field_name: field.name,
            field_type: field.type,
            field_config: field,
            display_order: sectionIndex * 100 + fieldIndex,
            is_required: field.required || false,
            is_active: true,
          })
        })
      })

      if (fields.length > 0) {
        const { error: fieldsError } = await supabase
          .from('form_fields')
          .insert(fields)

        if (fieldsError) {
          console.error('Error saving form fields:', fieldsError)
        }
      }
    }

    return NextResponse.json(schemaRecord, { status: 201 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

