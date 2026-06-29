export type VisitStatus =
  | 'waiting'
  | 'in_progress'
  | 'completed'
  | 'published'
  | 'cancelled'

export type VisitStep =
  | 'line_registered'
  | 'questionnaire_started'
  | 'questionnaire_completed'
  | 'diagnosis_started'
  | 'photos_uploaded'
  | 'analysis_completed'
  | 'report_generated'
  | 'line_sent'
  | 'line_confirmed'

export const VISIT_STATUSES: readonly VisitStatus[] = [
  'waiting',
  'in_progress',
  'completed',
  'published',
  'cancelled',
] as const

export const VISIT_STEPS: readonly VisitStep[] = [
  'line_registered',
  'questionnaire_started',
  'questionnaire_completed',
  'diagnosis_started',
  'photos_uploaded',
  'analysis_completed',
  'report_generated',
  'line_sent',
  'line_confirmed',
] as const

export const STEP_TO_STATUS: Record<VisitStep, VisitStatus> = {
  line_registered: 'waiting',
  questionnaire_started: 'in_progress',
  questionnaire_completed: 'in_progress',
  diagnosis_started: 'in_progress',
  photos_uploaded: 'in_progress',
  analysis_completed: 'completed',
  report_generated: 'completed',
  line_sent: 'published',
  line_confirmed: 'published',
}

export const VISIT_STATUS_LABELS: Record<VisitStatus, string> = {
  waiting: '待機中',
  in_progress: '対応中',
  completed: '完了',
  published: '送信済',
  cancelled: '中止',
}

export const VISIT_STEP_LABELS: Record<VisitStep, string> = {
  line_registered: 'LINE登録',
  questionnaire_started: '問診中',
  questionnaire_completed: '問診完了',
  diagnosis_started: '診断中',
  photos_uploaded: '写真完了',
  analysis_completed: '分析完了',
  report_generated: 'レポート作成済',
  line_sent: 'LINE送信済',
  line_confirmed: '到達確認済',
}

export function isVisitStep(value: unknown): value is VisitStep {
  return typeof value === 'string' && (VISIT_STEPS as readonly string[]).includes(value)
}

export function isVisitStatus(value: unknown): value is VisitStatus {
  return typeof value === 'string' && (VISIT_STATUSES as readonly string[]).includes(value)
}
