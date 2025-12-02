'use client'

import { useState, useEffect, useCallback } from 'react'

// localStorage キー
const STAFF_SESSION_KEY = 'coralup_staff_session'

// セッション有効期限: 12時間
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000

export interface StaffSession {
  staffId: string
  staffName: string
  authenticatedAt: number
  expiresAt: number
}

export interface StaffMember {
  id: string
  first_name: string
  last_name: string
  avatar_url: string | null
}

export interface UseStaffAuthReturn {
  session: StaffSession | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  verifyPin: (pin: string) => Promise<StaffMember[]>
  login: (staffId: string, staffName: string) => void
  logout: () => void
  clearError: () => void
}

export function useStaffAuth(): UseStaffAuthReturn {
  const [session, setSession] = useState<StaffSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 初期化: localStorageからセッションを復元
  useEffect(() => {
    const stored = localStorage.getItem(STAFF_SESSION_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as StaffSession
        // セッション有効期限チェック
        if (parsed.expiresAt > Date.now()) {
          setSession(parsed)
        } else {
          // 期限切れの場合は削除
          localStorage.removeItem(STAFF_SESSION_KEY)
        }
      } catch {
        // パースエラーの場合は削除
        localStorage.removeItem(STAFF_SESSION_KEY)
      }
    }
    setIsLoading(false)
  }, [])

  // PIN認証
  const verifyPin = useCallback(async (pin: string): Promise<StaffMember[]> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/staff/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        const errorMessage = data.message || 'PINが正しくありません'
        setError(errorMessage)
        throw new Error(errorMessage)
      }

      return data.staffList as StaffMember[]
    } catch (err) {
      const message = err instanceof Error ? err.message : '認証に失敗しました'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  // ログイン（スタッフ選択後）
  const login = useCallback((staffId: string, staffName: string) => {
    const now = Date.now()
    const newSession: StaffSession = {
      staffId,
      staffName,
      authenticatedAt: now,
      expiresAt: now + SESSION_DURATION_MS,
    }
    localStorage.setItem(STAFF_SESSION_KEY, JSON.stringify(newSession))
    setSession(newSession)
    setError(null)
  }, [])

  // ログアウト
  const logout = useCallback(() => {
    localStorage.removeItem(STAFF_SESSION_KEY)
    setSession(null)
    setError(null)
  }, [])

  // エラークリア
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    session,
    isAuthenticated: !!session,
    isLoading,
    error,
    verifyPin,
    login,
    logout,
    clearError,
  }
}

