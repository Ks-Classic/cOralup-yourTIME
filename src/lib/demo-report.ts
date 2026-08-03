export const DEMO_REPORT_PREFIX = 'demo-'
export const DEMO_REPORT_RETENTION_DAYS = 7
export const MAX_DEMO_REPORT_SUMMARY_LENGTH = 5000

export const DEFAULT_DEMO_REPORT_SUMMARY = `【口腔機能について】
お子さんの歯は噛み合わせが深い過蓋咬合の状態で、舌の位置が低くなる「低位舌」も見られます。口呼吸の傾向があると口まわりの筋肉のバランスが崩れやすく、歯並びにも影響します。口まわりの筋肉の使い方が安定すると、歯並びへの負担も軽減されやすくなります。日常的な口腔トレーニング（あいうべ体操など）を継続することで、改善が期待できます。

【姿勢について】
背中が丸くなりお腹が前に出る「凹円背」の傾向があります。肩のバランスに左右差があり、骨盤のわずかな前傾も確認されました。姿勢の癖は顎の動きや咬合状態にも影響しやすいため、放置すると歯並びの乱れにつながることがあります。日常的な姿勢への意識づけと、軽い体幹トレーニングを取り入れることが効果的です。

【総合評価】
姿勢と歯並びは筋肉・骨格を通じてつながっており、片方だけでなく両方を一緒に見ていくことが大切です。今回の診断結果を参考に、口腔トレーニングと姿勢改善を並行して取り組んでいただくことをお勧めします。ご家庭でできる簡単なケアから始め、定期的なフォローアップを行うことで、お子さんの健やかな成長をサポートします。`

export interface DemoReportSnapshot {
  childName: string
  childAge: number
  eventName: string
  diagnosisDate: string
  summary: string
}

export interface DemoReportRequest {
  childName: string
  childAge: number
  reportSummary: string
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function parseDemoReportRequest(body: unknown): DemoReportRequest | null {
  if (!body || typeof body !== 'object') return null
  const record = body as Record<string, unknown>
  if (!isNonEmptyString(record.childName)) return null
  if (!isNonEmptyString(record.reportSummary)) return null

  const childName = record.childName.trim()
  const reportSummary = record.reportSummary.trim()
  const childAge = record.childAge
  if (childName.length > 100) return null
  if (reportSummary.length > MAX_DEMO_REPORT_SUMMARY_LENGTH) return null
  if (
    typeof childAge !== 'number' ||
    !Number.isInteger(childAge) ||
    childAge < 0 ||
    childAge > 18
  ) {
    return null
  }

  return { childName, childAge, reportSummary }
}

export function parseDemoReportSnapshot(value: unknown): DemoReportSnapshot | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  if (!isNonEmptyString(record.childName)) return null
  if (!isNonEmptyString(record.eventName)) return null
  if (!isNonEmptyString(record.diagnosisDate)) return null
  if (!isNonEmptyString(record.summary)) return null
  if (typeof record.childAge !== 'number') return null

  return {
    childName: record.childName,
    childAge: record.childAge,
    eventName: record.eventName,
    diagnosisDate: record.diagnosisDate,
    summary: record.summary,
  }
}

export function getDemoReportId(slug: string): string | null {
  if (!slug.startsWith(DEMO_REPORT_PREFIX)) return null
  const id = slug.slice(DEMO_REPORT_PREFIX.length)
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    ? id
    : null
}
