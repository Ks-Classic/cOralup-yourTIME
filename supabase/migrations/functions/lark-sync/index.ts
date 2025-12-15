/**
 * Lark Sync Edge Function
 *
 * Supabase Database Webhook から呼び出され、
 * visits テーブルの変更を Lark Base にリアルタイム同期する
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// 環境変数
const LARK_APP_ID = Deno.env.get('LARK_APP_ID') || ''
const LARK_APP_SECRET = Deno.env.get('LARK_APP_SECRET') || ''
const LARK_BASE_APP_TOKEN = Deno.env.get('LARK_BASE_APP_TOKEN') || ''
const LARK_BASE_TABLE_ID = Deno.env.get('LARK_BASE_TABLE_ID') || ''
const LARK_STATS_TABLE_ID = Deno.env.get('LARK_STATS_TABLE_ID') || ''
const LARK_ALERTS_TABLE_ID = Deno.env.get('LARK_ALERTS_TABLE_ID') || ''

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

// Lark API Base URLs
const LARK_API_BASE = 'https://open.larksuite.com/open-apis'
const LARK_TOKEN_URL = `${LARK_API_BASE}/auth/v3/tenant_access_token/internal`
const LARK_BITABLE_URL = `${LARK_API_BASE}/bitable/v1/apps`

// トークンキャッシュ
let cachedToken: { token: string; expiresAt: number } | null = null

/**
 * テナントアクセストークンを取得
 */
async function getTenantAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 5 * 60 * 1000) {
    return cachedToken.token
  }

  const response = await fetch(LARK_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: LARK_APP_ID,
      app_secret: LARK_APP_SECRET,
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to get Lark token: ${response.status}`)
  }

  const data = await response.json()
  if (data.code !== 0) {
    throw new Error(`Lark API Error: ${data.msg}`)
  }

  cachedToken = {
    token: data.tenant_access_token,
    expiresAt: Date.now() + data.expire * 1000,
  }

  return cachedToken.token
}

/**
 * Lark Base にレコードを追加
 */
async function createLarkRecord(
  fields: Record<string, unknown>,
  tableId: string = LARK_BASE_TABLE_ID
): Promise<string> {
  const token = await getTenantAccessToken()

  const response = await fetch(
    `${LARK_BITABLE_URL}/${LARK_BASE_APP_TOKEN}/tables/${tableId}/records`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ fields }),
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to create Lark record: ${errorText}`)
  }

  const data = await response.json()
  if (data.code !== 0) {
    throw new Error(`Lark API Error: ${data.msg}`)
  }

  return data.data.record.record_id
}

/**
 * Lark Base のレコードを更新
 */
async function updateLarkRecord(
  recordId: string,
  fields: Record<string, unknown>,
  tableId: string = LARK_BASE_TABLE_ID
): Promise<void> {
  const token = await getTenantAccessToken()

  const response = await fetch(
    `${LARK_BITABLE_URL}/${LARK_BASE_APP_TOKEN}/tables/${tableId}/records/${recordId}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ fields }),
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to update Lark record: ${errorText}`)
  }

  const data = await response.json()
  if (data.code !== 0) {
    throw new Error(`Lark API Error: ${data.msg}`)
  }
}

/**
 * visit_id で Lark レコードを検索
 */
async function findLarkRecordByVisitId(
  visitId: string,
  tableId: string = LARK_BASE_TABLE_ID
): Promise<{ record_id: string } | null> {
  const token = await getTenantAccessToken()

  const response = await fetch(
    `${LARK_BITABLE_URL}/${LARK_BASE_APP_TOKEN}/tables/${tableId}/records/search`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        filter: {
          conjunction: 'and',
          conditions: [
            {
              field_name: 'visit_id',
              operator: 'is',
              value: [visitId],
            },
          ],
        },
      }),
    }
  )

  if (!response.ok) return null

  const data = await response.json()
  if (data.code !== 0) return null

  const items = data.data?.items || []
  return items.length > 0 ? items[0] : null
}

/**
 * Visit データを取得して関連情報を結合
 */
async function getEnrichedVisitData(visitId: string): Promise<EnrichedVisit | null> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const { data, error } = await supabase
    .from('visits')
    .select(`
      *,
      children (
        first_name,
        last_name,
        parent_profile_id,
        birthday
      ),
      staff:profiles!visits_staff_profile_id_fkey (
        display_name,
        first_name,
        last_name
      ),
      events (
        name
      ),
      oral_diagnoses (
        diagnosis_summary
      )
    `)
    .eq('id', visitId)
    .single()

  if (error || !data) {
    console.error('Failed to fetch visit data:', error)
    return null
  }

  // 親御さん情報を取得
  let parentName = ''
  if (data.children?.parent_profile_id) {
    const { data: parent } = await supabase
      .from('profiles')
      .select('display_name, first_name, last_name')
      .eq('id', data.children.parent_profile_id)
      .single()

    if (parent) {
      parentName = parent.display_name || `${parent.last_name} ${parent.first_name}`
    }
  }

  return {
    id: data.id,
    status: data.status,
    visit_date: data.visit_date,
    reception_number: data.reception_number,
    child_age_months: data.child_age_months,
    child_name: data.children
      ? `${data.children.last_name} ${data.children.first_name}`
      : '',
    parent_name: parentName,
    staff_name: data.staff
      ? data.staff.display_name || `${data.staff.last_name} ${data.staff.first_name}`
      : '',
    event_name: data.events?.name || '',
    diagnosis_summary: data.oral_diagnoses?.diagnosis_summary || '',
  }
}

/**
 * Visit データを Lark フォーマットに変換
 */
function convertToLarkFields(visit: EnrichedVisit): Record<string, unknown> {
  return {
    visit_id: visit.id,
    child_name: visit.child_name,
    parent_name: visit.parent_name,
    status: visit.status,
    staff_name: visit.staff_name,
    visit_time: visit.visit_date ? new Date(visit.visit_date).getTime() : null,
    updated_at: Date.now(),
    reception_number: visit.reception_number || '',
    event_name: visit.event_name,
    child_age_months: visit.child_age_months,
    diagnosis_summary: visit.diagnosis_summary,
  }
}

/**
 * リアルタイム統計を更新
 */
async function updateRealtimeStats(): Promise<void> {
  if (!LARK_STATS_TABLE_ID) return

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // 今日の日付
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // 統計を集計
  const { data: visits } = await supabase
    .from('visits')
    .select('status')
    .gte('visit_date', today.toISOString())

  if (!visits) return

  const stats = {
    totalVisits: visits.length,
    waitingCount: visits.filter((v) => v.status === 'waiting').length,
    completedDiagnoses: visits.filter((v) => v.status === 'completed' || v.status === 'report_sent').length,
    reportsSent: visits.filter((v) => v.status === 'report_sent').length,
  }

  // 各統計を Lark に同期
  const metrics = [
    { name: '本日の来場者数', value: stats.totalVisits },
    { name: '待機中の人数', value: stats.waitingCount },
    { name: '診断完了数', value: stats.completedDiagnoses },
    { name: 'レポート送信済み', value: stats.reportsSent },
  ]

  for (const metric of metrics) {
    try {
      await upsertMetric(metric.name, metric.value)
    } catch (e) {
      console.error(`Failed to update metric ${metric.name}:`, e)
    }
  }
}

/**
 * 統計メトリクスを Upsert
 */
async function upsertMetric(metricName: string, value: number): Promise<void> {
  const token = await getTenantAccessToken()

  // 既存レコードを検索
  const response = await fetch(
    `${LARK_BITABLE_URL}/${LARK_BASE_APP_TOKEN}/tables/${LARK_STATS_TABLE_ID}/records/search`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        filter: {
          conjunction: 'and',
          conditions: [
            {
              field_name: 'metric_name',
              operator: 'is',
              value: [metricName],
            },
          ],
        },
      }),
    }
  )

  const data = await response.json()
  const existing = data.data?.items?.[0]

  const fields = {
    metric_name: metricName,
    value: value,
    updated_at: Date.now(),
  }

  if (existing) {
    await updateLarkRecord(existing.record_id, fields, LARK_STATS_TABLE_ID)
  } else {
    await createLarkRecord(fields, LARK_STATS_TABLE_ID)
  }
}

/**
 * アラートを作成
 */
async function createAlert(
  type: string,
  description: string,
  visitId?: string
): Promise<void> {
  if (!LARK_ALERTS_TABLE_ID) return

  await createLarkRecord(
    {
      alert_type: type,
      description: description,
      visit_id: visitId || '',
      created_at: Date.now(),
      resolved: false,
    },
    LARK_ALERTS_TABLE_ID
  )
}

// ============================================
// メインハンドラー
// ============================================

serve(async (req) => {
  // CORS対応
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  try {
    const payload = await req.json()
    console.log('Received webhook payload:', JSON.stringify(payload))

    const { type, table, record, old_record } = payload

    // visits テーブルの変更のみ処理
    if (table !== 'visits') {
      return new Response(JSON.stringify({ success: true, message: 'Ignored non-visits table' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 環境変数チェック
    if (!LARK_APP_ID || !LARK_APP_SECRET || !LARK_BASE_APP_TOKEN || !LARK_BASE_TABLE_ID) {
      console.warn('Lark configuration incomplete, skipping sync')
      return new Response(JSON.stringify({ success: true, message: 'Lark not configured' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const visitId = record?.id || old_record?.id

    if (!visitId) {
      return new Response(JSON.stringify({ success: false, error: 'No visit ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 詳細データを取得
    const enrichedVisit = await getEnrichedVisitData(visitId)

    if (!enrichedVisit) {
      return new Response(JSON.stringify({ success: false, error: 'Visit not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Lark フォーマットに変換
    const larkFields = convertToLarkFields(enrichedVisit)

    // INSERT または UPDATE
    if (type === 'INSERT') {
      await createLarkRecord(larkFields)
      console.log(`Created Lark record for visit: ${visitId}`)
    } else if (type === 'UPDATE') {
      const existing = await findLarkRecordByVisitId(visitId)
      if (existing) {
        await updateLarkRecord(existing.record_id, larkFields)
        console.log(`Updated Lark record for visit: ${visitId}`)
      } else {
        await createLarkRecord(larkFields)
        console.log(`Created Lark record for visit (was missing): ${visitId}`)
      }
    }

    // 統計を更新
    await updateRealtimeStats()

    // タイムアウトアラートチェック (問診完了から30分経過)
    if (type === 'UPDATE' && old_record?.status === 'waiting' && record?.status === 'waiting') {
      const visitDate = new Date(record.visit_date)
      const now = new Date()
      const diffMinutes = (now.getTime() - visitDate.getTime()) / (1000 * 60)

      if (diffMinutes > 30) {
        await createAlert(
          'timeout',
          `来場から30分以上経過: ${enrichedVisit.child_name}`,
          visitId
        )
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        visit_id: visitId,
        action: type,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error processing webhook:', error)

    // エラーアラートを作成
    try {
      await createAlert('error', `Webhook処理エラー: ${error.message}`)
    } catch (e) {
      console.error('Failed to create error alert:', e)
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})

// ============================================
// 型定義
// ============================================

interface EnrichedVisit {
  id: string
  status: string
  visit_date: string | null
  reception_number: string | null
  child_age_months: number | null
  child_name: string
  parent_name: string
  staff_name: string
  event_name: string
  diagnosis_summary: string
}

