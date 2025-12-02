'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { QrCode, CheckCircle2, AlertCircle } from 'lucide-react'
import { QRScanner, ManualVisitSearch } from '@/components/staff'
import { useStaffAuth } from '@/hooks/useStaffAuth'

interface VisitData {
  id: string
  status: string
  visit_date: string
  child_age_months?: number
  children?: {
    id: string
    first_name: string
    last_name: string
    birthday?: string
    gender?: string
  }
  profiles?: {
    id: string
    display_name: string
    line_user_id?: string
  }
  medical_interviews?: {
    chief_complaint?: string
    concerns?: string[]
    answers?: Record<string, unknown>
  }
}

export default function DiagnosisStartPage() {
  const router = useRouter()
  const { session, isAuthenticated, isLoading: authLoading } = useStaffAuth()
  
  const [mode, setMode] = useState<'scan' | 'manual'>('scan')
  const [scannedVisitId, setScannedVisitId] = useState<string | null>(null)
  const [visitData, setVisitData] = useState<VisitData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 未認証の場合はログインページへリダイレクト
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/staff/login')
    }
  }, [authLoading, isAuthenticated, router])

  // QRスキャン成功時
  const handleScan = async (visitId: string) => {
    setScannedVisitId(visitId)
    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch(`/api/staff/session?visitId=${encodeURIComponent(visitId)}`)
      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.message || 'セッション情報の取得に失敗しました')
        return
      }

      setVisitData(data.visit)
    } catch {
      setError('セッション情報の取得中にエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  // 診断開始
  const handleStartDiagnosis = async () => {
    if (!visitData || !session) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/staff/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitId: visitData.id,
          staffId: session.staffId,
          action: 'start_diagnosis',
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.message || '診断の開始に失敗しました')
        return
      }

      // 診断ページへ遷移
      router.push(`/staff/diagnosis/${visitData.id}`)
    } catch {
      setError('診断の開始中にエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  // リセット
  const handleReset = () => {
    setScannedVisitId(null)
    setVisitData(null)
    setError(null)
  }

  // 認証チェック中
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-gray-500">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-coral-50 to-white px-3 py-4 touch-pan-y">
      <div className="max-w-2xl mx-auto pt-6">
        {/* ヘッダー */}
        <Card className="border-coral-200 shadow-lg mb-4">
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 bg-coral-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <QrCode className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl text-gray-900">診断開始</CardTitle>
            <CardDescription className="text-base mt-2">
              親御さんのQRコードをスキャンして診断を開始します
            </CardDescription>
            {session && (
              <p className="text-sm text-coral-600 mt-2">
                ログイン中: {session.staffName}
              </p>
            )}
          </CardHeader>
        </Card>

        {/* スキャン結果表示 */}
        {visitData ? (
          <Card className="border-green-200 shadow-lg mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-green-700">
                <CheckCircle2 className="w-5 h-5" />
                セッション確認
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* お子様情報 */}
              <div className="bg-green-50 p-4 rounded-lg space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">👧</span>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {visitData.children?.last_name} {visitData.children?.first_name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {visitData.child_age_months 
                        ? `${Math.floor(visitData.child_age_months / 12)}歳${visitData.child_age_months % 12}ヶ月`
                        : '年齢不明'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* 保護者情報 */}
              {visitData.profiles && (
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <span className="text-lg">👩‍👦</span>
                  <span>保護者: {visitData.profiles.display_name}</span>
                </div>
              )}

              {/* 主訴 */}
              {visitData.medical_interviews?.chief_complaint && (
                <div className="text-sm">
                  <p className="font-medium text-gray-700">主訴:</p>
                  <p className="text-gray-600">{visitData.medical_interviews.chief_complaint}</p>
                </div>
              )}

              {/* 気になること */}
              {visitData.medical_interviews?.concerns && visitData.medical_interviews.concerns.length > 0 && (
                <div className="text-sm">
                  <p className="font-medium text-gray-700">気になること:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {visitData.medical_interviews.concerns.map((concern, index) => (
                      <span 
                        key={index}
                        className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs"
                      >
                        {concern}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 受付番号 */}
              <div className="text-xs text-gray-500">
                受付番号: {visitData.id.slice(0, 8).toUpperCase()}
              </div>

              {/* アクションボタン */}
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleStartDiagnosis}
                  className="flex-1 bg-coral-500 hover:bg-coral-600"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin">⏳</span>
                      処理中...
                    </span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      診断を開始
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleReset}
                  variant="outline"
                  disabled={isLoading}
                >
                  キャンセル
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* モード切り替え */}
            <div className="flex gap-2 mb-4">
              <Button
                onClick={() => setMode('scan')}
                variant={mode === 'scan' ? 'default' : 'outline'}
                className={mode === 'scan' ? 'bg-coral-500 hover:bg-coral-600' : ''}
              >
                📷 QRスキャン
              </Button>
              <Button
                onClick={() => setMode('manual')}
                variant={mode === 'manual' ? 'default' : 'outline'}
                className={mode === 'manual' ? 'bg-coral-500 hover:bg-coral-600' : ''}
              >
                🔍 手動検索
              </Button>
            </div>

            {/* QRスキャナー */}
            {mode === 'scan' && (
              <QRScanner
                onScan={handleScan}
                onError={(err) => setError(err)}
                className="mb-4"
              />
            )}

            {/* 手動検索 */}
            {mode === 'manual' && (
              <ManualVisitSearch
                onFound={handleScan}
                className="mb-4"
              />
            )}
          </>
        )}

        {/* エラー表示 */}
        {error && (
          <Card className="border-red-200 bg-red-50 mb-4">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                <p>{error}</p>
              </div>
              <Button
                onClick={handleReset}
                variant="outline"
                size="sm"
                className="mt-3"
              >
                やり直す
              </Button>
            </CardContent>
          </Card>
        )}

        {/* デモ用リンク */}
        <Card className="border-gray-200">
          <CardContent className="py-4">
            <p className="text-xs text-gray-500 text-center mb-2">
              デモ用: テストセッションで試す
            </p>
            <Button
              onClick={() => router.push('/staff/diagnosis/demo')}
              variant="outline"
              className="w-full"
            >
              デモページを開く
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
