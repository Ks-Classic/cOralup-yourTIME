'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { generateQRCode } from '@/utils'

interface SessionData {
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

interface QuestionnaireData {
  child_name: string
  child_age: number
  child_gender: string
  medical_history: string[]
  concerns: string[]
  ideal_goals: string[]
  notes?: string
}

export default function SessionDetailPage() {
  const router = useRouter()
  const sessionId = 'demo'
  const [session, setSession] = useState<SessionData | null>(null)
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')

  useEffect(() => {
    // モックデータを設定
    const mockSession: SessionData = {
      id: sessionId,
      session_id: sessionId,
      status: 'questionnaire_completed',
      parent_name: '保護者 太郎',
      parent_phone: '090-1234-5678',
      child_name: 'お子様 花子',
      child_age: 8,
      child_gender: 'female',
      created_at: new Date().toISOString(),
    }

    const mockQuestionnaire: QuestionnaireData = {
      child_name: 'お子様 花子',
      child_age: 8,
      child_gender: 'female',
      medical_history: ['アレルギー'],
      concerns: ['歯並びが気になる', '口呼吸をしている'],
      ideal_goals: ['きれいな歯並びになりたい', '正しい姿勢を身につけたい'],
      notes: '特に気になることはありません。',
    }

    setSession(mockSession)
    setQuestionnaire(mockQuestionnaire)
    setIsLoading(false)

    // QRコード生成
    const generateQR = async () => {
      const currentUrl = window.location.origin
      const sessionUrl = `${currentUrl}/parent/questionnaire/${mockSession.session_id}`
      const qrCode = await generateQRCode(sessionUrl)
      setQrCodeUrl(qrCode)
    }
    generateQR()
  }, [])

  const startDiagnosis = () => {
    router.push(`/staff/diagnosis/${sessionId}`)
  }

  const showQRCode = () => {
    if (qrCodeUrl) {
      // QRコードをモーダルで表示するか、新しいウィンドウで開く
      window.open(qrCodeUrl, '_blank')
    }
  }

  const formatGender = (gender: string) => {
    switch (gender) {
      case 'male': return '男'
      case 'female': return '女'
      case 'other': return 'その他'
      default: return gender
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'questionnaire_completed': return 'bg-blue-100 text-blue-800'
      case 'diagnosis_completed': return 'bg-purple-100 text-purple-800'
      case 'completed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return '診断開始待ち'
      case 'questionnaire_completed': return '問診票完了'
      case 'diagnosis_completed': return '診断完了'
      case 'completed': return '完了'
      default: return status
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-coral-500 mx-auto"></div>
          <p className="text-gray-600">データを読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">セッションが見つかりません</p>
          <Button onClick={() => router.push('/staff')}>
            スタッフページに戻る
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* ヘッダー */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            セッション詳細
          </h1>
          <div className="flex items-center space-x-4">
            <Badge className={getStatusColor(session.status)}>
              {getStatusLabel(session.status)}
            </Badge>
            <span className="text-sm text-gray-500">
              セッションID: {session.session_id}
            </span>
          </div>
        </div>
        <Button
          onClick={() => router.push('/staff')}
          variant="outline"
        >
          戻る
        </Button>
      </div>

      {/* QRコード表示（問診票未完了の場合） */}
      {session.status === 'active' && qrCodeUrl && (
        <Card className="border-coral-200 bg-coral-50/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <span className="text-2xl">📱</span>
              <span>保護者用QRコード</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              親御さんにこのQRコードをスキャンしてもらい、問診票を入力してもらってください。
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <button
              type="button"
              className="rounded-xl border border-white bg-white p-3 shadow-sm transition hover:shadow-md"
              onClick={showQRCode}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrCodeUrl}
                alt="Session QR Code"
                className="h-48 w-48 rounded-lg object-contain sm:h-56 sm:w-56"
              />
            </button>
            <p className="text-xs text-gray-600 text-center">
              問診票の入力が完了すると、診断を開始できるようになります。
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* セッション情報 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>📋</span>
              <span>セッション情報</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-600">セッションID:</span>
              <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                {session.session_id}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">ステータス:</span>
              <Badge className={getStatusColor(session.status)}>
                {getStatusLabel(session.status)}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">作成日時:</span>
              <span className="text-sm">
                {new Date(session.created_at).toLocaleString('ja-JP')}
              </span>
            </div>
            {session.parent_name && (
              <div className="flex justify-between">
                <span className="text-gray-600">保護者:</span>
                <span>{session.parent_name}</span>
              </div>
            )}
            {session.parent_phone && (
              <div className="flex justify-between">
                <span className="text-gray-600">電話番号:</span>
                <span>{session.parent_phone}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 問診票情報 */}
        {questionnaire && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>📝</span>
                <span>問診票情報</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">お子様情報</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">お名前:</span>
                    <span>{questionnaire.child_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">年齢:</span>
                    <span>{questionnaire.child_age}歳</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">性別:</span>
                    <span>{formatGender(questionnaire.child_gender)}</span>
                  </div>
                </div>
              </div>

              {questionnaire.concerns.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">気になる症状</h4>
                  <div className="flex flex-wrap gap-1">
                    {questionnaire.concerns.map((concern, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {concern}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {questionnaire.ideal_goals.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">理想とする状態</h4>
                  <div className="flex flex-wrap gap-1">
                    {questionnaire.ideal_goals.map((goal, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {goal}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {questionnaire.medical_history.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">既往歴</h4>
                  <div className="flex flex-wrap gap-1">
                    {questionnaire.medical_history.map((history, index) => (
                      <Badge key={index} variant="destructive" className="text-xs">
                        {history}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {questionnaire.notes && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">スタッフへのメッセージ</h4>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <p className="text-gray-700">{questionnaire.notes}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* アクションセクション */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            {session.status === 'questionnaire_completed' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800">
                  ✅ 問診票の入力が完了しています。診断を開始できます。
                </p>
              </div>
            )}

            {session.status === 'active' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800">
                  ⏳ 問診票の入力待ちです。親御さんにQRコードの読み取りをお願いしてください。
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {session.status === 'questionnaire_completed' && (
                <Button
                  onClick={startDiagnosis}
                  size="lg"
                  className="flex-1 bg-coral-500 hover:bg-coral-600"
                >
                  📸 診断を開始する
                </Button>
              )}

              {session.status === 'active' && (
                <Button
                  onClick={startDiagnosis}
                  size="lg"
                  variant="outline"
                  className="flex-1"
                >
                  📸 診断画面を開く（テスト用）
                </Button>
              )}

              <Button
                variant="outline"
                onClick={() => router.push('/staff')}
                className="flex-1"
              >
                セッション一覧に戻る
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 診断プロセスガイド */}
      <Card>
        <CardHeader>
          <CardTitle>診断プロセスガイド</CardTitle>
          <CardDescription>
            診断の流れを確認してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl mb-2">1</div>
              <div className="font-medium text-blue-900">問診票確認</div>
              <div className="text-sm text-blue-700">入力内容の確認</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl mb-2">2</div>
              <div className="font-medium text-purple-900">写真撮影</div>
              <div className="text-sm text-purple-700">姿勢・口腔写真</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl mb-2">3</div>
              <div className="font-medium text-green-900">診断入力</div>
              <div className="text-sm text-green-700">評価・メモ記入</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl mb-2">4</div>
              <div className="font-medium text-orange-900">LINE送信</div>
              <div className="text-sm text-orange-700">結果通知</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
