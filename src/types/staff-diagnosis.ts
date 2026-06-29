export type StaffDiagnosisMainView =
  | 'questionnaire'
  | 'photos'
  | 'diagnosis'
  | 'review'
  | 'report'
  | 'memo'

export type StaffDiagnosisStep =
  | 'start'
  | 'session'
  | 'photos'
  | 'diagnosis'
  | 'review'
  | 'analysis'
  | 'report'

export const STAFF_DIAGNOSIS_STEPS: StaffDiagnosisStep[] = [
  'session',
  'photos',
  'diagnosis',
  'review',
  'analysis',
  'report',
]

export interface StaffDiagnosisSessionData {
  id: string
  session_id: string
  status: string
  parent_name?: string
  parent_phone?: string
  child_name?: string
  child_age?: number
  child_gender?: string
  created_at: string
}

export interface StaffDiagnosisQuestionnaireData {
  child_name: string
  child_age: number
  child_gender: string
  medical_history: string[]
  concerns: string[]
  ideal_goals: string[]
  notes?: string
}

export type StaffDiagnosisPhotoType =
  | 'posture_front'
  | 'posture_side'
  | 'oral_front'
  | 'oral_side'
  | 'oral_closeup'

export interface StaffDiagnosisPhotoData {
  id: string
  url: string
  type: StaffDiagnosisPhotoType
  uploaded_at: string
}

export interface StaffDiagnosisAnalysisResult {
  postureAnalysis?: {
    overallScore: number
    issues: string[]
    recommendations: string[]
    severity: 'low' | 'medium' | 'high'
    details: {
      headPosition: string
      shoulderBalance: string
      spineCurve: string
      pelvisTilt: string
      footBalance: string
    }
  }
  oralAnalysis?: {
    overallScore: number
    issues: string[]
    recommendations: string[]
    severity: 'low' | 'medium' | 'high'
    details: {
      biteCondition: string
      teethAlignment: string
      tonguePosition: string
      oralCleanliness: string
      functionEstimation: string
    }
  }
  reportSummary?: string
  report?: {
    summary: string
    analysis: string
    recommendations: string[]
    nextSteps: string[]
    encouragingMessage: string
  }
  reportUrl?: string
  hasReport?: boolean
}

export interface StaffDiagnosisPhotoDefinition {
  key: Extract<StaffDiagnosisPhotoType, 'posture_front' | 'posture_side' | 'oral_front'>
  label: string
  description: string
  icon: string
}

export const STAFF_DIAGNOSIS_PHOTO_TYPES: StaffDiagnosisPhotoDefinition[] = [
  { key: 'posture_front', label: '正面姿勢', description: '正面から全身を撮影', icon: '📸' },
  { key: 'posture_side', label: '横向き姿勢', description: '横向きから全身を撮影', icon: '📸' },
  { key: 'oral_front', label: '口腔内（正面）', description: '口を開けて口腔内を撮影', icon: '🦷' },
]
