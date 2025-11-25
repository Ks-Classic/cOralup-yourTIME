// 診断関連の型定義

export type DiagnosisStep =
    | 'start'       // QR読み取り・セッションID入力（セッションID未確定時）
    | 'session'     // セッション情報確認（問診票確認）
    | 'photos'      // 写真撮影
    | 'diagnosis'   // 診断項目入力
    | 'review'      // 確認・修正
    | 'analysis'    // AI分析
    | 'report'      // レポート送信

export type MainView = 'questionnaire' | 'photos' | 'diagnosis' | 'review' | 'report'

export interface SessionData {
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

export interface QuestionnaireData {
    child_name: string
    child_age: number
    child_gender: string
    medical_history: string[]
    concerns: string[]
    ideal_goals: string[]
    notes?: string
}

export type PhotoType = 'posture_front' | 'posture_side' | 'oral_front' | 'oral_side' | 'oral_closeup' | 'custom'

export interface PhotoData {
    id: string
    url: string
    type: PhotoType
    uploaded_at: string
    customTitle?: string  // カスタム写真用のタイトル
}

export interface AnalysisDetails {
    headPosition: string
    shoulderBalance: string
    spineCurve: string
    pelvisTilt: string
    footBalance: string
}

export interface OralAnalysisDetails {
    biteCondition: string
    teethAlignment: string
    tonguePosition: string
    oralCleanliness: string
    functionEstimation: string
}

export type SeverityLevel = 'low' | 'medium' | 'high'

export interface PostureAnalysis {
    overallScore: number
    issues: string[]
    recommendations: string[]
    severity: SeverityLevel
    details: AnalysisDetails
}

export interface OralAnalysis {
    overallScore: number
    issues: string[]
    recommendations: string[]
    severity: SeverityLevel
    details: OralAnalysisDetails
}

export interface AnalysisReport {
    summary: string
    analysis: string
    recommendations: string[]
    nextSteps: string[]
}

export interface AnalysisResult {
    postureAnalysis?: PostureAnalysis
    oralAnalysis?: OralAnalysis
    report?: AnalysisReport
}

export interface DiagnosisFormData {
    [key: string]: string | string[] | number | boolean | undefined
}
