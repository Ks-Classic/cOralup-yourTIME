import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, isMockMode } from '@/lib/supabase'

// GET: 特定スキーマ取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ schemaId: string }> }
) {
  try {
    const { schemaId } = await params

    if (isMockMode) {
      // モックモードではAPIルートから取得
      const response = await fetch(`${request.nextUrl.origin}/api/admin/schemas?schema_id=${schemaId}`)
      const result = await response.json()
      const schema = result.data?.[0]
      if (!schema) {
        return NextResponse.json({ data: null, error: 'スキーマが見つかりません' }, { status: 404 })
      }
      return NextResponse.json({ data: schema, error: null })
    }

    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from('form_schemas')
      .select('*')
      .eq('schema_id', schemaId)
      .single()

    if (error) {
      return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data, error: null })
  } catch (error) {
    console.error('Schema fetch error:', error)
    return NextResponse.json(
      { data: null, error: 'スキーマの取得に失敗しました' },
      { status: 500 }
    )
  }
}

// PUT: スキーマ更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ schemaId: string }> }
) {
  try {
    const { schemaId } = await params
    const body = await request.json()
    const { name, description, config, version } = body

    if (isMockMode) {
      return NextResponse.json({
        data: {
          schema_id: schemaId,
          name,
          description,
          config,
          version: version || '1.0',
          updated_at: new Date().toISOString(),
        },
        error: null,
      })
    }

    const supabase = createServerSupabaseClient()

    // バージョン履歴を保存
    if (version) {
      const { data: currentSchema } = await supabase
        .from('form_schemas')
        .select('id, config')
        .eq('schema_id', schemaId)
        .single()

      if (currentSchema) {
        await supabase.from('form_schema_versions').insert({
          schema_id: currentSchema.id,
          version: version,
          config: currentSchema.config,
          change_log: `Updated to version ${version}`,
        })
      }
    }

    // スキーマを更新
    const { data, error } = await supabase
      .from('form_schemas')
      .update({
        name,
        description,
        config,
        version: version || '1.0',
        updated_at: new Date().toISOString(),
      })
      .eq('schema_id', schemaId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data, error: null })
  } catch (error) {
    console.error('Schema update error:', error)
    return NextResponse.json(
      { data: null, error: 'スキーマの更新に失敗しました' },
      { status: 500 }
    )
  }
}

// DELETE: スキーマ削除（論理削除）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ schemaId: string }> }
) {
  try {
    const { schemaId } = await params

    if (isMockMode) {
      return NextResponse.json({ data: { deleted: true }, error: null })
    }

    const supabase = createServerSupabaseClient()
    const { error } = await supabase
      .from('form_schemas')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('schema_id', schemaId)

    if (error) {
      return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: { deleted: true }, error: null })
  } catch (error) {
    console.error('Schema delete error:', error)
    return NextResponse.json(
      { data: null, error: 'スキーマの削除に失敗しました' },
      { status: 500 }
    )
  }
}




