'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { QRScanner } from '@/components/staff/QRScanner'
import { AlertCircle, CheckCircle2, Loader2, Search, QrCode } from 'lucide-react'

interface VisitData {
  id: string
  status: string
  visit_date: string
  child_age_months: number
  session_id: string
  children: {
    id: string
    first_name: string
    last_name: string
    birthday: string
    gender: string
  }
  parent?: {
    id: string
    display_name: string
    first_name?: string
    last_name?: string
    phone_number?: string
  }
}

type ScanState = 'scanning' | 'loading' | 'found' | 'not_found' | 'error'

export default function StaffScanPage() {
  const router = useRouter()
  const [scanState, setScanState] = useState<ScanState>('scanning')
  const [visitData, setVisitData] = useState<VisitData | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [manualCode, setManualCode] = useState('')
  const [showManualInput, setShowManualInput] = useState(false)

  // QRスキャン成功時
  const handleScan = useCallback(async (visitId: string) => {
    setScanState('loading')
    setErrorMessage('')

    try {
      // 1. セッションデータ取得
      const sessionResponse = await fetch(`/api/staff/session?visitId=${encodeURIComponent(visitId)}`)
      const sessionData = await sessionResponse.json()

      if (!sessionData.success || !sessionData.visit) {
        setScanState('not_found')
        setErrorMessage(sessionData.message || '該当するセッションが見つかりません')
        return
      }

      // 2. スタッフ紐付け（Cookie認証で自動識別）
      const assignResponse = await fetch('/api/staff/session/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitId }),
      })

      const assignData = await assignResponse.json()

      if (!assignData.success) {
        console.error('[Scan] Staff assignment failed:', assignData.error)
        // 紐付け失敗してもセッションデータは表示
      }

      setVisitData(sessionData.visit)
      setScanState('found')
    } catch (error) {
      console.error('セッション取得エラー:', error)
      setScanState('error')
      setErrorMessage('データの取得に失敗しました')
    }
  }, [])

  // QRスキャンエラー時
  const handleScanError = useCallback((error: string) => {
    console.error('QRスキャンエラー:', error)
    // カメラエラーの場合は手動入力を促す
    setShowManualInput(true)
  }, [])

  // 手動入力で検索
  const handleManualSearch = async () => {
    if (!manualCode.trim()) return
    await handleScan(manualCode.trim())
  }

  // 診断開始
  const handleStartDiagnosis = () => {
    if (visitData) {
      // visitIdを使用（APIはvisitIdで検索するため）
      const diagnosisId = visitData.id
      router.push(`/staff/diagnosis/${diagnosisId}`)
    }
  }

  // 再スキャン
  const handleRetry = () => {
    setScanState('scanning')
    setVisitData(null)
    setErrorMessage('')
    setManualCode('')
  }

  // 年齢計算
  const calculateAge = (ageMonths: number) => {
    const years = Math.floor(ageMonths / 12)
    const months = ageMonths % 12
    if (months === 0) return `${years}歳`
    return `${years}歳${months}ヶ月`
  }

  // 性別表示
  const formatGender = (gender: string) => {
    switch (gender) {
      case 'male': return '男の子'
      case 'female': return '女の子'
      default: return gender
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* ヘッダー */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">QRコードスキャン</h1>
        <p className="text-sm text-gray-600 mt-1">
          親御さんのQRコードを読み取って診断を開始します
        </p>
      </div>

      {/* スキャン中 */}
      {scanState === 'scanning' && (
        <>
          <QRScanner
            onScan={handleScan}
            onError={handleScanError}
            className="w-full"
          />

          {/* 手動入力セクション */}
          {showManualInput && (
            <Card className="border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  手動入力
                </CardTitle>
                <CardDescription className="text-xs">
                  QRコードが読み取れない場合は、セッションIDを入力してください
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="セッションID（例: 550e8400-...）"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleManualSearch}
                    disabled={!manualCode.trim()}
                  >
                    検索
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {!showManualInput && (
            <div className="text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowManualInput(true)}
                className="text-gray-500"
              >
                <Search className="w-4 h-4 mr-2" />
                手動で入力する
              </Button>
            </div>
          )}
        </>
      )}

      {/* 読み込み中 */}
      {scanState === 'loading' && (
        <Card className="border-coral-200">
          <CardContent className="py-12 text-center">
            <Loader2 className="w-12 h-12 mx-auto text-coral-500 animate-spin mb-4" />
            <p className="text-gray-600 font-medium">データを読み込み中...</p>
          </CardContent>
        </Card>
      )}

      {/* セッション見つかった */}
      {scanState === 'found' && visitData && (
        <Card className="border-green-200 bg-green-50/30">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <CardTitle className="text-lg text-green-800">セッションを確認しました</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* お子様情報 */}
            <div className="bg-white rounded-lg p-4 border border-green-100">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">👶 お子様情報</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">お名前：</span>
                  <span className="font-medium">
                    {visitData.children.last_name} {visitData.children.first_name}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">年齢：</span>
                  <span className="font-medium">{calculateAge(visitData.child_age_months)}</span>
                </div>
                <div>
                  <span className="text-gray-500">性別：</span>
                  <span className="font-medium">{formatGender(visitData.children.gender)}</span>
                </div>
              </div>
            </div>

            {/* 保護者情報 */}
            {visitData.parent && (
              <div className="bg-white rounded-lg p-4 border border-green-100">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">👤 保護者情報</h3>
                <div className="text-sm">
                  <span className="text-gray-500">お名前：</span>
                  <span className="font-medium">
                    {visitData.parent.last_name && visitData.parent.first_name
                      ? `${visitData.parent.last_name} ${visitData.parent.first_name}`
                      : visitData.parent.display_name}
                  </span>
                </div>
              </div>
            )}

            {/* アクションボタン */}
            <div className="flex flex-col gap-2 pt-2">
              <Button
                onClick={handleStartDiagnosis}
                className="w-full h-12 bg-coral-500 hover:bg-coral-600 text-white font-bold"
              >
                📸 診断を開始する
              </Button>
              <Button
                variant="outline"
                onClick={handleRetry}
                className="w-full"
              >
                <QrCode className="w-4 h-4 mr-2" />
                別のQRコードをスキャン
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 見つからなかった */}
      {scanState === 'not_found' && (
        <Card className="border-yellow-200 bg-yellow-50/30">
          <CardContent className="py-8 text-center space-y-4">
            <AlertCircle className="w-12 h-12 mx-auto text-yellow-600" />
            <div>
              <p className="font-semibold text-yellow-800">セッションが見つかりません</p>
              <p className="text-sm text-yellow-700 mt-1">{errorMessage}</p>
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={handleRetry} className="w-full">
                再スキャン
              </Button>
              <div className="flex gap-2">
                <Input
                  placeholder="セッションIDを入力"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={handleManualSearch}
                  disabled={!manualCode.trim()}
                  variant="outline"
                >
                  検索
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* エラー */}
      {scanState === 'error' && (
        <Card className="border-red-200 bg-red-50/30">
          <CardContent className="py-8 text-center space-y-4">
            <AlertCircle className="w-12 h-12 mx-auto text-red-600" />
            <div>
              <p className="font-semibold text-red-800">エラーが発生しました</p>
              <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
            </div>
            <Button onClick={handleRetry} className="w-full">
              再試行
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 使い方ガイド */}
      <Card className="border-gray-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-gray-700">📖 使い方</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
            <li>親御さんのスマホに表示されたQRコードをカメラに向けます</li>
            <li>自動でスキャンされ、お子様の情報が表示されます</li>
            <li>「診断を開始する」ボタンで診断画面に進みます</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}

