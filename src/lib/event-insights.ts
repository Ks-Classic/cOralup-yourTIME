import type {
  InsightDistribution,
  InsightItemDistribution,
  InsightResponse,
} from '@/types/event-insights'

export interface ResponseRow {
  id: string
  visitId: string | null
  category: string | null
  itemId: string
  label: string
  value: string
  options: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function optionLabels(options: unknown): Map<string, string> {
  const labels = new Map<string, string>()
  if (!Array.isArray(options)) return labels

  for (const option of options) {
    if (!isRecord(option)) continue
    const value = option.value
    const label = option.label
    if (typeof value === 'string' && typeof label === 'string') {
      labels.set(value, label)
    }
  }
  return labels
}

export function splitStoredValue(value: unknown): string[] {
  if (value === null || value === undefined || value === '') return []
  if (Array.isArray(value)) return value.flatMap(splitStoredValue)
  if (isRecord(value)) {
    return Object.entries(value).map(([key, item]) => `${key}: ${formatUnknownValue(item)}`)
  }
  if (typeof value !== 'string') return [String(value)]

  try {
    const parsed: unknown = JSON.parse(value)
    if (parsed !== value) return splitStoredValue(parsed)
  } catch {
    // Plain strings are valid stored answers.
  }
  return [value]
}

export function formatUnknownValue(value: unknown): string {
  const values = splitStoredValue(value)
  return values.length > 0 ? values.join('、') : '未回答'
}

export function formatResponseValue(value: unknown, options: unknown): string {
  const labels = optionLabels(options)
  const values = splitStoredValue(value)
  if (values.length === 0) return '未回答'
  return values.map((item) => labels.get(item) ?? item).join('、')
}

export function groupResponses(rows: ResponseRow[]): Map<string, InsightResponse[]> {
  const grouped = new Map<string, InsightResponse[]>()
  for (const row of rows) {
    if (!row.visitId) continue
    const responses = grouped.get(row.visitId) ?? []
    responses.push({
      id: row.id,
      category: row.category ?? 'その他',
      label: row.label,
      value: formatResponseValue(row.value, row.options),
    })
    grouped.set(row.visitId, responses)
  }
  return grouped
}

export function buildItemDistributions(rows: ResponseRow[]): InsightItemDistribution[] {
  const items = new Map<string, InsightItemDistribution>()
  for (const row of rows) {
    const item = items.get(row.itemId) ?? {
      id: row.itemId,
      category: row.category ?? 'その他',
      label: row.label,
      total: 0,
      values: [],
    }
    item.total += 1
    const label = formatResponseValue(row.value, row.options)
    const existing = item.values.find((entry) => entry.label === label)
    if (existing) existing.count += 1
    else item.values.push({ label, count: 1 })
    items.set(row.itemId, item)
  }

  return [...items.values()]
    .map((item) => ({
      ...item,
      values: item.values.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'ja')),
    }))
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label, 'ja'))
}

export function countDistribution(labels: string[], order: string[] = []): InsightDistribution[] {
  const counts = new Map<string, number>()
  for (const label of labels) counts.set(label, (counts.get(label) ?? 0) + 1)
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => {
      const ai = order.indexOf(a.label)
      const bi = order.indexOf(b.label)
      if (ai >= 0 || bi >= 0) return (ai < 0 ? Number.MAX_SAFE_INTEGER : ai) - (bi < 0 ? Number.MAX_SAFE_INTEGER : bi)
      return a.label.localeCompare(b.label, 'ja', { numeric: true })
    })
}

export function ageBucket(ageMonths: number | null): string {
  if (ageMonths === null || ageMonths < 0) return '不明'
  return `${Math.floor(ageMonths / 12)}歳`
}

export function halfHourBucket(value: Date | string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const hour = parts.find((part) => part.type === 'hour')?.value
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0)
  return hour ? `${hour}:${minute < 30 ? '00' : '30'}` : null
}

export function durationBucket(minutes: number | null): string | null {
  if (minutes === null || minutes < 0) return null
  if (minutes < 10) return '10分未満'
  if (minutes < 20) return '10〜19分'
  if (minutes < 30) return '20〜29分'
  if (minutes < 45) return '30〜44分'
  return '45分以上'
}

export function getStepTimestamp(value: unknown, key: string): Date | null {
  if (!isRecord(value) || typeof value[key] !== 'string') return null
  const date = new Date(value[key])
  return Number.isNaN(date.getTime()) ? null : date
}

export function elapsedMinutes(start: Date | null, end: Date | null): number | null {
  if (!start || !end) return null
  const minutes = Math.round((end.getTime() - start.getTime()) / 60_000)
  return minutes >= 0 && minutes <= 180 ? minutes : null
}

export function addLegacyResponse(
  responses: InsightResponse[],
  idPrefix: string,
  category: string,
  label: string,
  value: unknown
): void {
  const formatted = formatUnknownValue(value)
  if (formatted === '未回答') return
  responses.push({ id: `${idPrefix}-${responses.length}`, category, label, value: formatted })
}
