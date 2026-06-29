/**
 * Visit ステップ管理ユーティリティ
 * 
 * 診断フローの各ステップを記録・更新する
 */

export type DiagnosisStep =
  | 'line_registered'        // LINE友だち登録完了
  | 'questionnaire_started'  // 問診開始
  | 'questionnaire_completed' // 問診完了
  | 'diagnosis_started'      // QR読み込み（診断スタート）
  | 'photos_uploaded'       // 写真撮影・保存成功
  | 'analysis_completed'     // AI分析完了
  | 'report_generated'       // レポート生成完了
  | 'line_sent'             // LINE送信完了
  | 'line_confirmed'        // LINE通知確認完了（診断完了）

export interface StepTimestamps {
  line_registered?: string
  questionnaire_started?: string
  questionnaire_completed?: string
  diagnosis_started?: string
  photos_uploaded?: string
  analysis_completed?: string
  report_generated?: string
  line_sent?: string
  line_confirmed?: string
}

/**
 * ステップを更新するAPI呼び出し
 */
export async function updateVisitStep(
  visitId: string,
  step: DiagnosisStep,
  boothNumber?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/visits/update-step', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitId,
        step,
        boothNumber,
      }),
    })

    if (!response.ok) {
      const data = await response.json()
      return { success: false, error: data.error || 'ステップ更新に失敗しました' }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

/**
 * エラー情報を記録
 */
export async function recordVisitError(
  visitId: string,
  errorType: string,
  errorMessage: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/visits/record-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitId,
        errorType,
        errorMessage,
      }),
    })

    if (!response.ok) {
      const data = await response.json()
      return { success: false, error: data.error || 'エラー記録に失敗しました' }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

/**
 * ステップの表示名を取得
 */
export function getStepDisplayName(step: DiagnosisStep): string {
  const names: Record<DiagnosisStep, string> = {
    line_registered: 'LINE友だち登録',
    questionnaire_started: '問診開始',
    questionnaire_completed: '問診完了',
    diagnosis_started: '診断スタート',
    photos_uploaded: '写真撮影完了',
    analysis_completed: '分析完了',
    report_generated: 'レポート生成',
    line_sent: 'LINE送信',
    line_confirmed: '診断完了',
  }
  return names[step] || step
}

/**
 * ステップの順序を取得
 */
export function getStepOrder(step: DiagnosisStep): number {
  const order: Record<DiagnosisStep, number> = {
    line_registered: 1,
    questionnaire_started: 2,
    questionnaire_completed: 3,
    diagnosis_started: 4,
    photos_uploaded: 5,
    analysis_completed: 6,
    report_generated: 7,
    line_sent: 8,
    line_confirmed: 9,
  }
  return order[step] || 0
}

