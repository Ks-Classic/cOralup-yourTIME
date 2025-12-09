/**
 * Lark API Client
 *
 * Lark Base (Bitable) へのデータ同期用クライアント
 * 展示会当日の監視ダッシュボード連携に使用
 */

// 環境変数
const LARK_APP_ID = process.env.LARK_APP_ID || ''
const LARK_APP_SECRET = process.env.LARK_APP_SECRET || ''
const LARK_BASE_APP_TOKEN = process.env.LARK_BASE_APP_TOKEN || ''
const LARK_BASE_TABLE_ID = process.env.LARK_BASE_TABLE_ID || ''

// Lark API Base URLs
const LARK_API_BASE = 'https://open.larksuite.com/open-apis'
const LARK_TOKEN_URL = `${LARK_API_BASE}/auth/v3/tenant_access_token/internal`
const LARK_BITABLE_URL = `${LARK_API_BASE}/bitable/v1/apps`

// アクセストークンのキャッシュ
let cachedToken: { token: string; expiresAt: number } | null = null

/**
 * テナントアクセストークンを取得
 * トークンは2時間有効、期限切れ前に再取得
 */
export async function getTenantAccessToken(): Promise<string> {
  // キャッシュが有効ならそれを返す (5分前に更新)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 5 * 60 * 1000) {
    return cachedToken.token
  }

  const response = await fetch(LARK_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      app_id: LARK_APP_ID,
      app_secret: LARK_APP_SECRET,
    }),
  })

  if (!response.ok) {
    throw new LarkApiError('Failed to get tenant access token', response.status)
  }

  const data = await response.json()

  if (data.code !== 0) {
    throw new LarkApiError(`Lark API Error: ${data.msg}`, data.code)
  }

  // キャッシュを更新 (expire は秒単位)
  cachedToken = {
    token: data.tenant_access_token,
    expiresAt: Date.now() + data.expire * 1000,
  }

  return cachedToken.token
}

/**
 * Lark Base にレコードを追加
 */
export async function createRecord(
  fields: LarkRecordFields,
  tableId: string = LARK_BASE_TABLE_ID,
  appToken: string = LARK_BASE_APP_TOKEN
): Promise<LarkRecordResponse> {
  const token = await getTenantAccessToken()

  const response = await fetch(
    `${LARK_BITABLE_URL}/${appToken}/tables/${tableId}/records`,
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
    throw new LarkApiError('Failed to create record', response.status)
  }

  const data = await response.json()

  if (data.code !== 0) {
    throw new LarkApiError(`Lark API Error: ${data.msg}`, data.code)
  }

  return data.data.record
}

/**
 * Lark Base のレコードを更新
 */
export async function updateRecord(
  recordId: string,
  fields: LarkRecordFields,
  tableId: string = LARK_BASE_TABLE_ID,
  appToken: string = LARK_BASE_APP_TOKEN
): Promise<LarkRecordResponse> {
  const token = await getTenantAccessToken()

  const response = await fetch(
    `${LARK_BITABLE_URL}/${appToken}/tables/${tableId}/records/${recordId}`,
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
    throw new LarkApiError('Failed to update record', response.status)
  }

  const data = await response.json()

  if (data.code !== 0) {
    throw new LarkApiError(`Lark API Error: ${data.msg}`, data.code)
  }

  return data.data.record
}

/**
 * Lark Base のレコードを検索 (visit_id で)
 */
export async function findRecordByVisitId(
  visitId: string,
  tableId: string = LARK_BASE_TABLE_ID,
  appToken: string = LARK_BASE_APP_TOKEN
): Promise<LarkRecordResponse | null> {
  const token = await getTenantAccessToken()

  const response = await fetch(
    `${LARK_BITABLE_URL}/${appToken}/tables/${tableId}/records/search`,
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

  if (!response.ok) {
    throw new LarkApiError('Failed to search records', response.status)
  }

  const data = await response.json()

  if (data.code !== 0) {
    throw new LarkApiError(`Lark API Error: ${data.msg}`, data.code)
  }

  const items = data.data?.items || []
  return items.length > 0 ? items[0] : null
}

/**
 * Lark Base にレコードを追加または更新 (Upsert)
 */
export async function upsertRecord(
  visitId: string,
  fields: LarkRecordFields,
  tableId: string = LARK_BASE_TABLE_ID,
  appToken: string = LARK_BASE_APP_TOKEN
): Promise<LarkRecordResponse> {
  // 既存レコードを検索
  const existing = await findRecordByVisitId(visitId, tableId, appToken)

  if (existing) {
    // 更新
    return updateRecord(existing.record_id, fields, tableId, appToken)
  } else {
    // 新規作成
    return createRecord({ ...fields, visit_id: visitId }, tableId, appToken)
  }
}

// ============================================
// Visit データを Lark フォーマットに変換
// ============================================

/**
 * Supabase の visit データを Lark Base フォーマットに変換
 */
export function convertVisitToLarkFields(visit: VisitData): LarkRecordFields {
  return {
    visit_id: visit.id,
    child_name: visit.child_name || '',
    parent_name: visit.parent_name || '',
    status: visit.status,
    staff_name: visit.staff_name || '',
    visit_time: visit.visit_date ? toJSTString(visit.visit_date) : '',
    updated_at: nowJST(),
    reception_number: visit.reception_number || '',
    event_name: visit.event_name || '',
    child_age_months: visit.child_age_months || null,
    diagnosis_summary: visit.diagnosis_summary || '',
  }
}

/**
 * Visit の INSERT/UPDATE イベントを処理して Lark に同期
 */
export async function syncVisitToLark(visit: VisitData): Promise<void> {
  const fields = convertVisitToLarkFields(visit)
  await upsertRecord(visit.id, fields)
}

// ============================================
// 統計データ同期
// ============================================

/**
 * リアルタイム統計を Lark Base に同期
 */
export async function syncRealtimeStats(
  stats: RealtimeStats,
  statsTableId: string
): Promise<void> {
  const token = await getTenantAccessToken()

  // 各統計項目を個別レコードとして更新
  const metricsToSync = [
    { metric_name: '本日の来場者数', value: stats.totalVisits },
    { metric_name: '診断完了数', value: stats.completedDiagnoses },
    { metric_name: '待機中の人数', value: stats.waitingCount },
    { metric_name: 'レポート送信済み', value: stats.reportsSent },
  ]

  for (const metric of metricsToSync) {
    // 既存レコードを検索して更新、なければ作成
    const existing = await findMetricRecord(metric.metric_name, statsTableId)

    if (existing) {
      await updateRecord(
        existing.record_id,
        {
          metric_name: metric.metric_name,
          value: metric.value,
          updated_at: nowJST(),
        },
        statsTableId
      )
    } else {
      await createRecord(
        {
          metric_name: metric.metric_name,
          value: metric.value,
          updated_at: nowJST(),
        },
        statsTableId
      )
    }
  }
}

async function findMetricRecord(
  metricName: string,
  tableId: string
): Promise<LarkRecordResponse | null> {
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
              field_name: 'metric_name',
              operator: 'is',
              value: [metricName],
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

// ============================================
// アラート同期
// ============================================

/**
 * アラートを Lark Base に追加
 */
export async function createAlert(
  alert: AlertData,
  alertsTableId: string
): Promise<void> {
  await createRecord(
    {
      alert_type: alert.type,
      description: alert.description,
      visit_id: alert.visitId || '',
      created_at: nowJST(),
      resolved: false,
    },
    alertsTableId
  )
}

// ============================================
// エラークラス
// ============================================

export class LarkApiError extends Error {
  constructor(
    message: string,
    public code: number
  ) {
    super(message)
    this.name = 'LarkApiError'
  }
}

// ============================================
// 日時ヘルパー (JST変換)
// ============================================

/**
 * Date を JST 文字列に変換
 * @param date Date オブジェクトまたは ISO 文字列
 * @returns "2024/12/09 14:30:00" 形式の JST 文字列
 */
export function toJSTString(date: Date | string | number | null | undefined): string {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
}

/**
 * 現在時刻を JST 文字列で取得
 */
export function nowJST(): string {
  return toJSTString(new Date())
}

// ============================================
// 型定義
// ============================================

export interface LarkRecordFields {
  [key: string]: string | number | boolean | null | undefined
}

export interface LarkRecordResponse {
  record_id: string
  fields: LarkRecordFields
}

export interface VisitData {
  id: string
  child_name?: string
  parent_name?: string
  status: string
  staff_name?: string
  visit_date?: string
  reception_number?: string
  event_name?: string
  child_age_months?: number
  diagnosis_summary?: string
}

export interface RealtimeStats {
  totalVisits: number
  completedDiagnoses: number
  waitingCount: number
  reportsSent: number
}

export interface AlertData {
  type: 'timeout' | 'error' | 'data_mismatch'
  description: string
  visitId?: string
}

// ============================================
// ヘルパー関数 (モックモード対応)
// ============================================

export const isMockMode = !LARK_APP_ID || !LARK_APP_SECRET

/**
 * Lark 連携が有効かどうか
 */
export function isLarkEnabled(): boolean {
  return !isMockMode && !!LARK_BASE_APP_TOKEN && !!LARK_BASE_TABLE_ID
}

