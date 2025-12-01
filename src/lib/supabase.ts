import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

// 環境変数が未設定の場合はダミー値を使用（モックモード）
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-anon-key'

// モックモードかどうかを判定
export const isMockMode = !process.env.NEXT_PUBLIC_SUPABASE_URL

// ブラウザ用クライアント（モックモードでもエラーを出さない）
export const supabase = isMockMode
  ? null as any // モックモードではnullを返す
  : createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)

// サーバー用クライアント（モックモード対応）
export const createServerSupabaseClient = () => {
  if (isMockMode) return null as any

  return createClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

// データベースヘルパー関数
export const dbHelpers = {
  // セッション管理
  sessions: {
    async create(data: {
      sessionId: string
      lineUserId?: string
      status?: string
    }) {
      return await supabase
        .from('sessions')
        .insert([data])
        .select()
        .single()
    },

    async findBySessionId(sessionId: string) {
      return await supabase
        .from('sessions')
        .select('*')
        .eq('session_id', sessionId)
        .single()
    },

    async update(id: string, data: any) {
      return await supabase
        .from('sessions')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
    },
  },

  // 問診票管理
  questionnaires: {
    async create(data: any) {
      return await supabase
        .from('questionnaires')
        .insert([data])
        .select()
        .single()
    },

    async findBySessionId(sessionId: string) {
      return await supabase
        .from('questionnaires')
        .select('*')
        .eq('session_id', sessionId)
        .single()
    },

    async update(id: string, data: any) {
      return await supabase
        .from('questionnaires')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
    },
  },

  // 診断管理
  diagnoses: {
    async create(data: any) {
      return await supabase
        .from('diagnoses')
        .insert([data])
        .select()
        .single()
    },

    async findBySessionId(sessionId: string) {
      return await supabase
        .from('diagnoses')
        .select('*')
        .eq('session_id', sessionId)
        .single()
    },

    async update(id: string, data: any) {
      return await supabase
        .from('diagnoses')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
    },
  },

  // レポート管理
  reports: {
    async create(data: any) {
      return await supabase
        .from('reports')
        .insert([data])
        .select()
        .single()
    },

    async findBySessionId(sessionId: string) {
      return await supabase
        .from('reports')
        .select('*')
        .eq('session_id', sessionId)
        .single()
    },

    async update(id: string, data: any) {
      return await supabase
        .from('reports')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
    },
  },

  // イベント管理
  events: {
    async create(data: any) {
      return await supabase
        .from('events')
        .insert([data])
        .select()
        .single()
    },

    async findByEventId(eventId: string) {
      return await supabase
        .from('events')
        .select('*')
        .eq('event_id', eventId)
        .single()
    },

    async update(id: string, data: any) {
      return await supabase
        .from('events')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
    },

    async getAll() {
      return await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false })
    },

    async getActiveEvents() {
      return await supabase
        .from('events')
        .select('*')
        .eq('status', 'active')
        .order('start_date', { ascending: true })
    },
  },

  // 動的フォーム管理
  formSchemas: {
    async create(data: any) {
      return await supabase
        .from('form_schemas')
        .insert([data])
        .select()
        .single()
    },

    async findBySchemaId(schemaId: string) {
      return await supabase
        .from('form_schemas')
        .select('*')
        .eq('schema_id', schemaId)
        .single()
    },

    async findByEventId(eventId: string) {
      return await supabase
        .from('form_schemas')
        .select(`
          *,
          form_fields (*)
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })
    },

    async update(id: string, data: any) {
      return await supabase
        .from('form_schemas')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
    },

    async getActiveSchemas() {
      return await supabase
        .from('form_schemas')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
    },

    async findBySessionId(sessionId: string) {
      return await supabase
        .from('form_responses')
        .select(`
          *,
          form_schemas (
            id,
            schema_id,
            form_type,
            name,
            config,
            settings:config->settings,
            sections:config->sections
          )
        `)
        .eq('session_id', sessionId)
        .order('submitted_at', { ascending: false })
    },
  },

  // フォーム回答管理
  formResponses: {
    async create(data: any) {
      return await supabase
        .from('form_responses')
        .insert([data])
        .select()
        .single()
    },

    async findByResponseId(responseId: string) {
      return await supabase
        .from('form_responses')
        .select(`
          *,
          form_schemas (
            name,
            form_type,
            config
          )
        `)
        .eq('response_id', responseId)
        .single()
    },

    async findBySessionId(sessionId: string) {
      return await supabase
        .from('form_responses')
        .select(`
          *,
          form_schemas (
            name,
            form_type,
            config
          )
        `)
        .eq('session_id', sessionId)
        .order('submitted_at', { ascending: false })
    },

    async getResponsesBySchema(schemaId: string, limit?: number) {
      let query = supabase
        .from('form_responses')
        .select(`
          *,
          sessions (
            parent_name,
            parent_phone
          )
        `)
        .eq('schema_id', schemaId)
        .order('submitted_at', { ascending: false })

      if (limit) {
        query = query.limit(limit)
      }

      return await query
    },

    async getAggregatedData(schemaId: string, dateFrom?: string, dateTo?: string) {
      let query = supabase
        .from('form_responses')
        .select('submitted_at, created_at')
        .eq('schema_id', schemaId)

      if (dateFrom) {
        query = query.gte('submitted_at', dateFrom)
      }

      if (dateTo) {
        query = query.lte('submitted_at', dateTo)
      }

      return await query
    },
  },
}

// ストレージヘルパー
export const storageHelpers = {
  async uploadPhoto(
    sessionId: string,
    file: File,
    type: 'posture_front' | 'posture_side' | 'oral_front' | 'oral_side' | 'oral_closeup'
  ) {
    const fileName = `${sessionId}/${type}/${Date.now()}-${file.name}`

    const { data, error } = await supabase.storage
      .from('photos')
      .upload(fileName, file)

    if (error) throw error

    const { data: { publicUrl } } = supabase.storage
      .from('photos')
      .getPublicUrl(fileName)

    return {
      id: fileName,
      url: publicUrl,
      type,
      uploadedAt: new Date().toISOString(),
    }
  },

  async deletePhoto(path: string) {
    return await supabase.storage
      .from('photos')
      .remove([path])
  },
}

// リアルタイムサブスクリプション
export const realtimeHelpers = {
  subscribeToSession(sessionId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`session_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
          filter: `session_id=eq.${sessionId}`,
        },
        callback
      )
      .subscribe()
  },

  subscribeToQuestionnaire(sessionId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`questionnaire_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'questionnaires',
          filter: `session_id=eq.${sessionId}`,
        },
        callback
      )
      .subscribe()
  },
}
