/**
 * 診断スキーマの型定義
 * 管理画面からの編集に対応したスキーマ構造
 */

export type DiagnosisAnswerType = 'checkbox' | 'radio' | 'text' | 'number' | 'textarea'

export type DiagnosisInputType = 'parent' | 'staff'

export interface DiagnosisItemOption {
  value: string
  label: string
}

export interface DiagnosisItemConfig {
  id: string
  question: string
  answerType: DiagnosisAnswerType
  options?: DiagnosisItemOption[]
  required: boolean
  inputType: DiagnosisInputType
  analysisUse?: boolean
  note?: string
  placeholder?: string
  unit?: string
  min?: number
  max?: number
}

export interface DiagnosisCategoryConfig {
  id: string
  name: string
  order: number
  items: DiagnosisItemConfig[]
}

export interface DiagnosisSettings {
  showProgress?: boolean
  allowBackNavigation?: boolean
  autoSave?: boolean
}

export interface DiagnosisSchemaConfig {
  categories: DiagnosisCategoryConfig[]
  settings?: DiagnosisSettings
  metadata?: Record<string, unknown>
}

// DB保存用の型
export interface DiagnosisSchema {
  id: string
  schema_id: string
  event_id?: string
  form_type: 'diagnosis'
  name: string
  description?: string
  version: string
  is_active: boolean
  config: DiagnosisSchemaConfig
  created_at: string
  updated_at: string
}




