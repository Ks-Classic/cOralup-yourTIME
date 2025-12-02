/**
 * 診断データの自動保存・復元フック
 *
 * - localStorage にデバウンス保存
 * - ページリロード時に復元
 * - セッションID単位で管理
 */

import { useState, useEffect, useCallback, useRef } from 'react'

const STORAGE_KEY_PREFIX = 'coralup_diagnosis_'
const DEBOUNCE_MS = 500

interface DiagnosisStorageData {
  diagnosisValues: Record<string, any>
  staffNotes: string
  photos: Array<{
    id: string
    url: string
    type: string
    uploaded_at: string
    customTitle?: string
  }>
  lastSaved: string
}

export function useDiagnosisStorage(sessionId: string | null) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const storageKey = sessionId ? `${STORAGE_KEY_PREFIX}${sessionId}` : null

  /**
   * localStorage からデータを復元
   */
  const loadFromStorage = useCallback((): DiagnosisStorageData | null => {
    if (!storageKey) return null

    try {
      const stored = localStorage.getItem(storageKey)
      if (!stored) return null

      const data = JSON.parse(stored) as DiagnosisStorageData
      return data
    } catch (error) {
      console.error('Failed to load diagnosis data from storage:', error)
      return null
    }
  }, [storageKey])

  /**
   * localStorage にデータを保存（デバウンス付き）
   */
  const saveToStorage = useCallback(
    (data: Omit<DiagnosisStorageData, 'lastSaved'>) => {
      if (!storageKey) return

      // 既存のデバウンスをクリア
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }

      // デバウンス保存
      debounceRef.current = setTimeout(() => {
        try {
          const saveData: DiagnosisStorageData = {
            ...data,
            lastSaved: new Date().toISOString(),
          }
          localStorage.setItem(storageKey, JSON.stringify(saveData))
          setLastSaved(new Date())
        } catch (error) {
          console.error('Failed to save diagnosis data to storage:', error)
        }
      }, DEBOUNCE_MS)
    },
    [storageKey]
  )

  /**
   * 即時保存（送信前など）
   */
  const saveImmediately = useCallback(
    (data: Omit<DiagnosisStorageData, 'lastSaved'>) => {
      if (!storageKey) return

      // デバウンスをクリア
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }

      try {
        const saveData: DiagnosisStorageData = {
          ...data,
          lastSaved: new Date().toISOString(),
        }
        localStorage.setItem(storageKey, JSON.stringify(saveData))
        setLastSaved(new Date())
      } catch (error) {
        console.error('Failed to save diagnosis data to storage:', error)
      }
    },
    [storageKey]
  )

  /**
   * localStorage からデータを削除
   */
  const clearStorage = useCallback(() => {
    if (!storageKey) return

    try {
      localStorage.removeItem(storageKey)
      setLastSaved(null)
    } catch (error) {
      console.error('Failed to clear diagnosis data from storage:', error)
    }
  }, [storageKey])

  /**
   * 初回ロード完了を通知
   */
  useEffect(() => {
    if (sessionId) {
      setIsLoaded(true)
    }
  }, [sessionId])

  /**
   * クリーンアップ
   */
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  return {
    isLoaded,
    lastSaved,
    loadFromStorage,
    saveToStorage,
    saveImmediately,
    clearStorage,
  }
}

/**
 * 古い診断データをクリーンアップ（7日以上前のデータ）
 */
export function cleanupOldDiagnosisData() {
  const CLEANUP_DAYS = 7
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - CLEANUP_DAYS)

  try {
    const keysToRemove: string[] = []

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(STORAGE_KEY_PREFIX)) {
        const stored = localStorage.getItem(key)
        if (stored) {
          try {
            const data = JSON.parse(stored) as DiagnosisStorageData
            const lastSaved = new Date(data.lastSaved)
            if (lastSaved < cutoffDate) {
              keysToRemove.push(key)
            }
          } catch {
            // パースエラーの場合も削除対象
            keysToRemove.push(key)
          }
        }
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key))

    if (keysToRemove.length > 0) {
      console.log(`Cleaned up ${keysToRemove.length} old diagnosis data entries`)
    }
  } catch (error) {
    console.error('Failed to cleanup old diagnosis data:', error)
  }
}

