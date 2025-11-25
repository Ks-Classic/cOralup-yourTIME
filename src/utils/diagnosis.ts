import type { DiagnosisStep, DiagnosisFormData } from '@/types/diagnosis'
import type { DiagnosisItem } from '@/data/staff-diagnosis-items'

/**
 * ステップの重み付け（進捗計算用）
 */
export const stepWeights: Record<DiagnosisStep, number> = {
    start: 0,
    session: 10,
    photos: 20,
    diagnosis: 40,
    review: 20,
    analysis: 5,
    report: 5
}

/**
 * 診断項目の入力完了率を計算
 */
export function calculateCompletionRate(
    items: DiagnosisItem[],
    formData: DiagnosisFormData
): number {
    if (items.length === 0) return 0

    const completedCount = items.filter(item => {
        const value = formData[item.id]

        if (value === undefined || value === null || value === '') {
            return false
        }

        if (Array.isArray(value) && value.length === 0) {
            return false
        }

        return true
    }).length

    return Math.round((completedCount / items.length) * 100)
}

/**
 * カテゴリーごとの入力完了率を計算
 */
export function calculateCategoryProgress(
    itemsByCategory: Record<string, DiagnosisItem[]>,
    formData: DiagnosisFormData
): Record<string, number> {
    const progress: Record<string, number> = {}

    Object.entries(itemsByCategory).forEach(([category, items]) => {
        progress[category] = calculateCompletionRate(items, formData)
    })

    return progress
}

/**
 * 必須項目がすべて入力されているかチェック
 */
export function validateRequiredFields(
    items: DiagnosisItem[],
    formData: DiagnosisFormData
): { isValid: boolean; missingFields: string[] } {
    const missingFields: string[] = []

    items.forEach(item => {
        if (!item.required) return

        const value = formData[item.id]

        if (value === undefined || value === null || value === '') {
            missingFields.push(item.question)
            return
        }

        if (Array.isArray(value) && value.length === 0) {
            missingFields.push(item.question)
        }
    })

    return {
        isValid: missingFields.length === 0,
        missingFields
    }
}

/**
 * ステップのラベルを取得
 */
export function getStepLabel(step: DiagnosisStep): string {
    const labels: Record<DiagnosisStep, string> = {
        start: '開始',
        session: 'セッション情報',
        photos: '写真撮影',
        diagnosis: '診断入力',
        review: '確認・修正',
        analysis: 'AI分析',
        report: 'レポート送信'
    }
    return labels[step]
}

/**
 * ステップのアイコン絵文字を取得
 */
export function getStepIcon(step: DiagnosisStep): string {
    const icons: Record<DiagnosisStep, string> = {
        start: '🚀',
        session: '📋',
        photos: '📷',
        diagnosis: '🩺',
        review: '👀',
        analysis: '🤖',
        report: '📤'
    }
    return icons[step]
}

/**
 * 次のステップを取得
 */
export function getNextStep(currentStep: DiagnosisStep): DiagnosisStep | null {
    const stepOrder: DiagnosisStep[] = [
        'start',
        'session',
        'photos',
        'diagnosis',
        'review',
        'analysis',
        'report'
    ]

    const currentIndex = stepOrder.indexOf(currentStep)
    if (currentIndex === -1 || currentIndex === stepOrder.length - 1) {
        return null
    }

    return stepOrder[currentIndex + 1]
}

/**
 * 前のステップを取得
 */
export function getPreviousStep(currentStep: DiagnosisStep): DiagnosisStep | null {
    const stepOrder: DiagnosisStep[] = [
        'start',
        'session',
        'photos',
        'diagnosis',
        'review',
        'analysis',
        'report'
    ]

    const currentIndex = stepOrder.indexOf(currentStep)
    if (currentIndex <= 0) {
        return null
    }

    return stepOrder[currentIndex - 1]
}
