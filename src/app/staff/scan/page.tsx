'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { QRScanner } from '@/components/staff/QRScanner'
import { AlertCircle, CheckCircle2, Loader2, Search, QrCode, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface QuestionnaireResponse {
  id: string
  item_id: string
  value: string | string[] | boolean
  questionnaire_items?: {
    id: string
    question: string
    answer_type: string
    options?: Array<{ label: string; value: string }> | string[]
    questionnaire_categories?: {
      id: string
      name: string
      display_order: number
    }
  }
}

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
  questionnaire_responses?: QuestionnaireResponse[]
}

type ScanState = 'scanning' | 'loading' | 'found' | 'not_found' | 'error'

export default function StaffScanPage() {
  const router = useRouter()
  const [scanState, setScanState] = useState<ScanState>('scanning')
  const [visitData, setVisitData] = useState<VisitData | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [manualCode, setManualCode] = useState('')
  const [showManualInput, setShowManualInput] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  // 認証チェック
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/staff-session', {
          method: 'GET',
          credentials: 'include', // Cookieを含める
        })
        const data = await res.json()
        // console.log('[Scan] Auth check:', { ok: res.ok, data })
        
        if (res.ok && data.authenticated) {
          setIsAuthenticated(true)
        } else {
          setIsAuthenticated(false)
          router.push('/staff/login')
        }
      } catch (error) {
        console.error('[Scan] Auth check error:', error)
        setIsAuthenticated(false)
        router.push('/staff/login')
      }
    }
    checkAuth()
  }, [router])

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
      // QRスキャン成功後、直接問診ページに遷移（「診断を開始する」ボタンをスキップ）
      const diagnosisId = sessionData.visit.id
      router.push(`/staff/diagnosis/${diagnosisId}?view=questionnaire`)
    } catch (error) {
      console.error('セッション取得エラー:', error)
      setScanState('error')
      setErrorMessage('データの取得に失敗しました')
    }
  }, [router])

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
      // QRコード読み取り後は直接問診ページに遷移
      const diagnosisId = visitData.id
      router.push(`/staff/diagnosis/${diagnosisId}?view=questionnaire`)
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

  // 認証チェック中
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto" />
          <p className="text-slate-400 mt-4">認証確認中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* ヘッダー */}
      <header className="bg-slate-800/50 backdrop-blur border-b border-slate-700 sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link href="/staff/home" className="text-slate-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-white">QRスキャン</h1>
            <p className="text-xs text-slate-400">親御さんのQRコードを読み取ります</p>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* スキャン中 */}
        {scanState === 'scanning' && (
          <>
            <QRScanner
              onScan={handleScan}
              onError={handleScanError}
              className="w-full rounded-2xl overflow-hidden"
            />

            {/* 手動入力セクション */}
            {showManualInput && (
              <Card className="border-slate-700 bg-slate-800/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-white">
                    <Search className="w-4 h-4" />
                    手動入力
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    QRコードが読み取れない場合は、セッションIDを入力してください
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="セッションID（例: 550e8400-...）"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      className="flex-1 bg-slate-700 border-slate-600 text-white"
                    />
                    <Button
                      onClick={handleManualSearch}
                      disabled={!manualCode.trim()}
                      className="bg-emerald-500 hover:bg-emerald-600"
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
                  className="text-slate-400 hover:text-white"
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
          <Card className="border-slate-700 bg-slate-800/50">
            <CardContent className="py-12 text-center">
              <Loader2 className="w-12 h-12 mx-auto text-emerald-500 animate-spin mb-4" />
              <p className="text-slate-300 font-medium">データを読み込み中...</p>
            </CardContent>
          </Card>
        )}

        {/* セッション見つかった */}
        {scanState === 'found' && visitData && (
          <Card className="border-emerald-500/30 bg-emerald-900/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <CardTitle className="text-lg text-emerald-300">セッションを確認しました</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* お子様情報 */}
              <div className="bg-gradient-to-r from-slate-800/80 to-emerald-900/30 rounded-lg p-4 border border-emerald-500/30">
                <p className="text-xl font-bold text-white mb-2">
                  {visitData.children.first_name}
                  {visitData.children.gender === 'male' ? 'くん' : 'ちゃん'}
                  <span className="text-sm font-normal text-slate-400 ml-2">
                    ({visitData.children.last_name} {visitData.children.first_name})
                  </span>
                </p>
                <div className="flex items-center gap-4 text-sm text-slate-300">
                  <span className="flex items-center gap-1">
                    🎂 <span className="font-medium">{calculateAge(visitData.child_age_months)}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    {visitData.children.gender === 'male' ? '👦' : '👧'}
                    <span className="font-medium">{formatGender(visitData.children.gender)}</span>
                  </span>
                </div>
              </div>

              {/* 保護者情報 */}
              {visitData.parent && (
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <h3 className="text-sm font-semibold text-slate-300 mb-2">👤 保護者情報</h3>
                  <div className="text-sm">
                    <span className="text-slate-500">お名前：</span>
                    <span className="font-medium text-white">
                      {visitData.parent.last_name && visitData.parent.first_name
                        ? `${visitData.parent.last_name} ${visitData.parent.first_name}`
                        : visitData.parent.display_name}
                    </span>
                  </div>
                </div>
              )}

              {/* 問診回答 */}
              {visitData.questionnaire_responses && visitData.questionnaire_responses.length > 0 && (
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <h3 className="text-sm font-semibold text-slate-300 mb-3">
                    📋 {visitData.children.first_name}
                    {visitData.children.gender === 'male' ? 'くん' : 'ちゃん'}
                    の問診回答
                  </h3>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {visitData.questionnaire_responses.map((response) => {
                      // optionsからラベルを取得するヘルパー
                      const getOptionLabel = (value: string, options?: Array<{ label: string; value: string }> | string[]): string => {
                        if (!options || options.length === 0) return value
                        
                        // 配列の最初の要素がオブジェクトかどうかで判定
                        if (typeof options[0] === 'object' && 'value' in options[0]) {
                          // { label, value } 形式の場合
                          const found = (options as Array<{ label: string; value: string }>).find(opt => opt.value === value)
                          return found ? found.label : value
                        } else {
                          // 文字列配列の場合（"ラベル:値" または "値" 形式）
                          const stringOptions = options as string[]
                          for (const opt of stringOptions) {
                            if (opt.includes(':')) {
                              const [label, val] = opt.split(':')
                              if (val === value) return label
                            } else if (opt === value) {
                              return opt
                            }
                          }
                        }
                        return value
                      }
                      
                      // 回答値をラベルに変換
                      const formatAnswerValue = (value: string | string[] | boolean, options?: Array<{ label: string; value: string }> | string[]): string => {
                        if (typeof value === 'boolean') {
                          return value ? 'はい' : 'いいえ'
                        }
                        if (Array.isArray(value)) {
                          return value.map(v => getOptionLabel(v, options)).join('、')
                        }
                        
                        // optionsがあればそこからラベルを取得
                        if (options && options.length > 0) {
                          return getOptionLabel(String(value), options)
                        }
                        
                        // フォールバック
                        const labelMap: Record<string, string> = {
                          'yes': 'はい',
                          'no': 'いいえ',
                          'male': '男の子',
                          'female': '女の子',
                          'often': 'よくある',
                          'sometimes': 'ときどきある',
                          'rarely': 'あまりない',
                          'never': 'ない',
                        }
                        return labelMap[String(value)] || String(value)
                      }
                      
                      return (
                        <div key={response.id} className="border-b border-slate-700 pb-3 last:border-0 last:pb-0">
                          <p className="text-slate-400 text-xs mb-0.5">
                            {response.questionnaire_items?.questionnaire_categories?.name || '質問'}
                          </p>
                          <p className="text-slate-300 text-sm mb-1">
                            {response.questionnaire_items?.question || '質問'}
                          </p>
                          <p className="font-semibold text-emerald-400">
                            → {formatAnswerValue(response.value, response.questionnaire_items?.options)}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* アクションボタン */}
              <div className="flex flex-col gap-2 pt-2">
                <Button
                  onClick={handleStartDiagnosis}
                  className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
                >
                  📸 診断を開始する
                </Button>
                <Button
                  variant="outline"
                  onClick={handleRetry}
                  className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
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
          <Card className="border-amber-500/30 bg-amber-900/20">
            <CardContent className="py-8 text-center space-y-4">
              <AlertCircle className="w-12 h-12 mx-auto text-amber-400" />
              <div>
                <p className="font-semibold text-amber-300">セッションが見つかりません</p>
                <p className="text-sm text-amber-400 mt-1">{errorMessage}</p>
              </div>
              <div className="flex flex-col gap-2">
                <Button onClick={handleRetry} className="w-full bg-emerald-500 hover:bg-emerald-600">
                  再スキャン
                </Button>
                <div className="flex gap-2">
                  <Input
                    placeholder="セッションIDを入力"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    className="flex-1 bg-slate-700 border-slate-600 text-white"
                  />
                  <Button
                    onClick={handleManualSearch}
                    disabled={!manualCode.trim()}
                    variant="outline"
                    className="border-slate-600 text-slate-300"
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
          <Card className="border-red-500/30 bg-red-900/20">
            <CardContent className="py-8 text-center space-y-4">
              <AlertCircle className="w-12 h-12 mx-auto text-red-400" />
              <div>
                <p className="font-semibold text-red-300">エラーが発生しました</p>
                <p className="text-sm text-red-400 mt-1">{errorMessage}</p>
              </div>
              <Button onClick={handleRetry} className="w-full bg-emerald-500 hover:bg-emerald-600">
                再試行
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 使い方ガイド */}
        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-300">📖 使い方</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="text-xs text-slate-400 space-y-1 list-decimal list-inside">
              <li>親御さんのスマホに表示されたQRコードをカメラに向けます</li>
              <li>自動でスキャンされ、お子様の情報が表示されます</li>
              <li>「診断を開始する」ボタンで診断画面に進みます</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

