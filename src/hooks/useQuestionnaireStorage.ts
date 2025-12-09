'use client'

import { useState, useEffect, useCallback } from 'react'

// localStorage保存データの型
export interface QuestionnaireStorageData {
  visitId: string
  sessionId?: string
  basicInfo: {
    furigana?: string
    childName: string
    birthYear: number
    birthMonth: number
    birthDay: number
    prefecture?: string
    childGender: 'male' | 'female' | 'other'
    nickname?: string
    parentName: string
    parentPhone: string
  }
  questionnaireData?: Record<string, unknown>
  currentStep: number
  formType: 'preschooler' | 'elementary' | null
  updatedAt: string
}

const STORAGE_KEY_PREFIX = 'coralup_questionnaire_'
const STORAGE_EXPIRY_HOURS = 24

/**
 * 問診入力途中データのlocalStorage連携Hook
 * - ブラウザを閉じてもデータが復元される
 * - セッション再開時に続きから入力できる
 */
export function useQuestionnaireStorage(visitId: string) {
  const [data, setData] = useState<QuestionnaireStorageData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const storageKey = `${STORAGE_KEY_PREFIX}${visitId}`

  // データの読み込み
  useEffect(() => {
    if (!visitId) {
      setIsLoading(false)
      return
    }

    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored) as QuestionnaireStorageData
        
        // 有効期限チェック
        const updatedAt = new Date(parsed.updatedAt)
        const now = new Date()
        const hoursDiff = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60)
        
        if (hoursDiff < STORAGE_EXPIRY_HOURS) {
          setData(parsed)
        } else {
          // 期限切れの場合は削除
          localStorage.removeItem(storageKey)
          setData(null)
        }
      }
    } catch (err) {
      console.error('Failed to load questionnaire data from localStorage:', err)
      setError('保存データの読み込みに失敗しました')
    } finally {
      setIsLoading(false)
    }
  }, [visitId, storageKey])

  // データの保存
  const saveData = useCallback((newData: Partial<QuestionnaireStorageData>) => {
    if (!visitId) return

    try {
      setData((prevData) => {
        const updatedData: QuestionnaireStorageData = {
          visitId,
          sessionId: newData.sessionId,
          basicInfo: newData.basicInfo || prevData?.basicInfo || {
            childName: '',
            birthYear: new Date().getFullYear() - 5,
            birthMonth: 1,
            birthDay: 1,
            childGender: 'male',
            parentName: '',
            parentPhone: '',
          },
          questionnaireData: newData.questionnaireData || prevData?.questionnaireData,
          currentStep: newData.currentStep ?? prevData?.currentStep ?? 1,
          formType: newData.formType ?? prevData?.formType ?? null,
          updatedAt: new Date().toISOString(),
        }

        localStorage.setItem(storageKey, JSON.stringify(updatedData))
        return updatedData
      })
      setError(null)
    } catch (err) {
      console.error('Failed to save questionnaire data to localStorage:', err)
      setError('データの保存に失敗しました')
    }
  }, [visitId, storageKey])

  // 基本情報の保存
  const saveBasicInfo = useCallback((basicInfo: QuestionnaireStorageData['basicInfo']) => {
    saveData({ basicInfo })
  }, [saveData])

  // 問診データの保存
  const saveQuestionnaireData = useCallback((questionnaireData: Record<string, unknown>) => {
    saveData({ questionnaireData })
  }, [saveData])

  // 現在のステップを保存
  const saveCurrentStep = useCallback((step: number) => {
    saveData({ currentStep: step })
  }, [saveData])

  // フォームタイプを保存
  const saveFormType = useCallback((formType: 'preschooler' | 'elementary' | null) => {
    saveData({ formType })
  }, [saveData])

  // データのクリア
  const clearData = useCallback(() => {
    try {
      localStorage.removeItem(storageKey)
      setData(null)
      setError(null)
    } catch (err) {
      console.error('Failed to clear questionnaire data from localStorage:', err)
      setError('データの削除に失敗しました')
    }
  }, [storageKey])

  // 保存データがあるかどうか
  const hasStoredData = data !== null

  // 復元可能かどうか（有効な基本情報があるか）
  const canRestore = hasStoredData && data?.basicInfo?.childName

  return {
    data,
    isLoading,
    error,
    hasStoredData,
    canRestore,
    saveData,
    saveBasicInfo,
    saveQuestionnaireData,
    saveCurrentStep,
    saveFormType,
    clearData,
  }
}

/**
 * 全ての問診データをクリアする（デバッグ用）
 */
export function clearAllQuestionnaireStorage() {
  if (typeof window === 'undefined') return

  const keysToRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(STORAGE_KEY_PREFIX)) {
      keysToRemove.push(key)
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key))
}
