// 共通の型定義
export type UserRole = 'parent' | 'staff' | 'admin'

export type SessionStatus = 'active' | 'completed' | 'expired'

export type ReportStatus = 'pending' | 'sent' | 'failed'

export type AnalysisSeverity = 'low' | 'medium' | 'high'

// セッション関連
export interface Session {
  id: string
  sessionId: string
  lineUserId?: string
  status: SessionStatus
  createdAt: string
  updatedAt: string
}

// 問診票関連
export interface Questionnaire {
  id: string
  sessionId: string
  childName: string
  childAge: number
  childGender: 'male' | 'female' | 'other'
  parentName: string
  parentPhone: string
  medicalHistory: string[]
  concerns: string[]
  idealGoals: string[]
  notes?: string
  createdAt: string
  updatedAt: string
}

// 診断関連
export interface Diagnosis {
  id: string
  sessionId: string
  postureAnalysis?: PostureAnalysis
  oralAnalysis?: OralAnalysis
  /**
   * 診断評価項目の回答値
   * キー: DiagnosisItem.id
   * 値: 回答値（文字列、数値、または配列）
   * 
   * 例: { tongue_1: 'yes', lip_4: 2.5, sleep_1: ['grinding_yes', 'apnea_no'] }
   * 
   * @see src/data/staff-diagnosis-items.ts DiagnosisItem
   */
  diagnosisItems: Record<string, any>
  aiAnalysis?: string
  staffNotes?: string
  photos: PhotoInfo[]
  createdAt: string
  updatedAt: string
}

// 姿勢分析結果
export interface PostureAnalysis {
  overallScore: number
  issues: string[]
  recommendations: string[]
  severity: AnalysisSeverity
  details: {
    headPosition: string
    shoulderBalance: string
    spineCurve: string
    pelvisTilt: string
    footBalance: string
  }
}

// 口腔分析結果
export interface OralAnalysis {
  overallScore: number
  issues: string[]
  recommendations: string[]
  severity: AnalysisSeverity
  details: {
    biteCondition: string
    teethAlignment: string
    tonguePosition: string
    oralCleanliness: string
    functionEstimation: string
  }
}

// 写真情報
export interface PhotoInfo {
  id: string
  url: string
  type: 'posture_front' | 'posture_side' | 'oral_front' | 'oral_side' | 'oral_closeup'
  uploadedAt: string
}

// レポート関連
export interface Report {
  id: string
  sessionId: string
  pdfUrl?: string
  lineSentAt?: string
  status: ReportStatus
  createdAt: string
}

// APIレスポンスの型
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
  timestamp: string
}

// フォーム関連の型
export interface FormField {
  name: string
  label: string
  type: 'text' | 'select' | 'radio' | 'checkbox' | 'textarea'
  required?: boolean
  options?: string[]
  validation?: {
    min?: number
    max?: number
    pattern?: string
  }
}

// LINE連携関連
export interface LineUser {
  id: string
  displayName: string
  pictureUrl?: string
  statusMessage?: string
}

export interface LineMessage {
  type: 'text' | 'image' | 'template'
  text?: string
  imageUrl?: string
  template?: any
}

