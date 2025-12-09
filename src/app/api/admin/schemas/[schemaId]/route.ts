import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isMockMode } from '@/lib/supabase'

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

// GET: 特定スキーマ取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ schemaId: string }> }
) {
  try {
    assertAdminAuthorized(request)
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

    const supabase = getAdminSupabase()
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

// PUT: スキーマ更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ schemaId: string }> }
) {
  try {
    assertAdminAuthorized(request)
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

    const supabase = getAdminSupabase()

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
    if ((error as Error).message === 'unauthorized') {
      return NextResponse.json({ data: null, error: 'unauthorized' }, { status: 401 })
    }
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
    assertAdminAuthorized(request)
    const { schemaId } = await params

    if (isMockMode) {
      return NextResponse.json({ data: { deleted: true }, error: null })
    }

    const supabase = getAdminSupabase()
    const { error } = await supabase
      .from('form_schemas')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('schema_id', schemaId)

    if (error) {
      return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: { deleted: true }, error: null })
  } catch (error) {
    if ((error as Error).message === 'unauthorized') {
      return NextResponse.json({ data: null, error: 'unauthorized' }, { status: 401 })
    }
    console.error('Schema delete error:', error)
    return NextResponse.json(
      { data: null, error: 'スキーマの削除に失敗しました' },
      { status: 500 }
    )
  }
}




