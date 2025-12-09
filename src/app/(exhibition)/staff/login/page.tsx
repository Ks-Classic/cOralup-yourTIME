'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useStaffAuth, type StaffMember } from '@/hooks/useStaffAuth'

export default function StaffLoginPage() {
  const router = useRouter()
  const { session, isAuthenticated, isLoading, error, verifyPin, login, clearError } = useStaffAuth()

  const [pin, setPin] = useState<string[]>(['', '', '', ''])
  const [step, setStep] = useState<'pin' | 'select'>('pin')
  const [staffList, setStaffList] = useState<StaffMember[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // 認証済みの場合はダッシュボードへリダイレクト
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/')
    }
  }, [isLoading, isAuthenticated, router])

  // PIN入力ハンドラー
  const handlePinChange = (index: number, value: string) => {
    // 数字のみ許可
    if (value && !/^\d$/.test(value)) return

    clearError()

    const newPin = [...pin]
    newPin[index] = value
    setPin(newPin)

    // 次の入力欄へフォーカス
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus()
    }

    // 4桁入力完了時に自動認証
    if (value && index === 3) {
      const fullPin = newPin.join('')
      if (fullPin.length === 4) {
        handlePinSubmit(fullPin)
      }
    }
  }

  // バックスペースハンドラー
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  // PIN認証
  const handlePinSubmit = async (pinCode?: string) => {
    const fullPin = pinCode || pin.join('')
    if (fullPin.length !== 4) return

    setIsSubmitting(true)
    try {
      const staff = await verifyPin(fullPin)
      setStaffList(staff)
      setStep('select')
    } catch {
      // エラーはuseStaffAuthで処理される
      setPin(['', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setIsSubmitting(false)
    }
  }

  // スタッフ選択
  const handleStaffSelect = (staff: StaffMember) => {
    const staffName = `${staff.last_name} ${staff.first_name}`
    login(staff.id, staffName)
    router.push('/')
  }

  // ローディング中
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-gray-500">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-coral-50 to-white p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 w-16 h-16 bg-coral-100 rounded-full flex items-center justify-center">
            <span className="text-3xl">🔐</span>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            {step === 'pin' ? 'スタッフログイン' : 'スタッフを選択'}
          </CardTitle>
          <CardDescription className="text-gray-600">
            {step === 'pin'
              ? '4桁のPINコードを入力してください'
              : 'あなたの名前を選択してください'
            }
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {step === 'pin' ? (
            <>
              {/* PIN入力フォーム */}
              <div className="flex justify-center gap-3">
                {pin.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el }}
                    type="tel"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handlePinChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-14 h-16 text-center text-2xl font-bold border-2 rounded-xl 
                             focus:border-coral-500 focus:ring-2 focus:ring-coral-200 
                             outline-none transition-all
                             disabled:bg-gray-100 disabled:cursor-not-allowed"
                    disabled={isSubmitting}
                    autoFocus={index === 0}
                  />
                ))}
              </div>

              {/* エラー表示 */}
              {error && (
                <div className="text-center text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                  {error}
                </div>
              )}

              {/* 認証ボタン */}
              <Button
                onClick={() => handlePinSubmit()}
                disabled={pin.join('').length !== 4 || isSubmitting}
                className="w-full h-12 text-lg bg-coral-500 hover:bg-coral-600"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⏳</span>
                    認証中...
                  </span>
                ) : (
                  'ログイン'
                )}
              </Button>

              <p className="text-center text-xs text-gray-500">
                展示会スタッフ専用のログイン画面です
              </p>
            </>
          ) : (
            <>
              {/* スタッフ選択リスト */}
              <div className="space-y-3">
                {staffList.map((staff) => (
                  <button
                    key={staff.id}
                    onClick={() => handleStaffSelect(staff)}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200
                             hover:border-coral-300 hover:bg-coral-50 transition-all text-left"
                  >
                    <div className="w-12 h-12 bg-coral-100 rounded-full flex items-center justify-center text-xl">
                      {staff.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={staff.avatar_url}
                          alt={`${staff.last_name} ${staff.first_name}`}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        '👤'
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {staff.last_name} {staff.first_name}
                      </p>
                      <p className="text-sm text-gray-500">スタッフ</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* 戻るボタン */}
              <Button
                variant="outline"
                onClick={() => {
                  setStep('pin')
                  setPin(['', '', '', ''])
                  setStaffList([])
                  clearError()
                }}
                className="w-full"
              >
                ← PINを再入力
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

