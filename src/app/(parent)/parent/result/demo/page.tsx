'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { generateQRCode } from '@/utils'

interface QuestionnaireData {
  child_name: string
  child_age: number
  child_gender: string
  parent_name: string
  parent_phone: string
  medical_history: string[]
  concerns: string[]
  ideal_goals: string[]
  notes?: string
}

interface SessionData {
  id: string
  session_id: string
  status: string
  created_at: string
}

export default function ResultPage() {
  const router = useRouter()
  const sessionId = 'demo'
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireData | null>(null)
  const [session, setSession] = useState<SessionData | null>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  // モックデータ用のセッション情報
  const mockSession: SessionData = useMemo(() => ({
    id: sessionId,
    session_id: sessionId,
    status: 'questionnaire_completed',
    created_at: new Date().toISOString(),
  }), [])

  // モックデータ用の問診票情報
  const mockQuestionnaire: QuestionnaireData = useMemo(() => ({
    child_name: 'お子様 花子',
    child_age: 8,
    child_gender: 'female',
    parent_name: '保護者 太郎',
    parent_phone: '090-1234-5678',
    medical_history: ['アレルギー性鼻炎'],
    concerns: ['姿勢が悪い', '口呼吸', '歯並びが気になる'],
    ideal_goals: ['正しい姿勢を身につける', '鼻呼吸ができるようになる'],
    notes: 'よろしくお願いします。',
  }), [])

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        // モックデータを使用（実際のAPI呼び出しはスキップ）
        // UIUX確認用にコンソールに出力
        console.log('結果画面データ取得（モック）:', {
          sessionId,
          session: mockSession,
          questionnaire: mockQuestionnaire,
        })

        // モックデータを設定
        setSession(mockSession)
        setQuestionnaire(mockQuestionnaire)

        // QRコード生成
        const currentUrl = window.location.origin
        const sessionUrl = `${currentUrl}/staff/session/${mockSession.id}`
        const qrCode = await generateQRCode(sessionUrl)
        setQrCodeUrl(qrCode)

      } catch (error) {
        console.error('Error fetching data:', error)
        // モックデータなので、エラー時もモックデータを表示
        setSession(mockSession)
        setQuestionnaire(mockQuestionnaire)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [mockSession, mockQuestionnaire])

  const regenerateQR = async () => {
    if (!session) return

    try {
      setIsLoading(true)
      const currentUrl = window.location.origin
      const sessionUrl = `${currentUrl}/staff/session/${session.id}`
      const qrCode = await generateQRCode(sessionUrl)
      setQrCodeUrl(qrCode)
      // 成功フィードバック
      console.log('QRコード再生成完了（モック）')
    } catch (error) {
      console.error('Error regenerating QR code:', error)
      alert('QRコードの再生成に失敗しました')
    } finally {
      setIsLoading(false)
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

  if (!questionnaire || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <p className="text-red-600 mb-4">データの取得に失敗しました</p>
          <Button onClick={() => router.push('/')}>
            ホームに戻る
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* ヘッダー */}
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <div className="bg-green-100 text-green-800 rounded-full p-3">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          問診票送信完了
        </h1>
        <p className="text-gray-600">
          ありがとうございます。スタッフがお伺いするまで今しばらくお待ちください。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* QRコードセクション */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>📱</span>
              <span>スタッフ用QRコード</span>
            </CardTitle>
            <CardDescription>
              スタッフの方がこのQRコードを読み取ることで、診断が開始されます。
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="mb-6">
              {qrCodeUrl ? (
                <div className="bg-white border-4 border-gray-200 rounded-lg p-4 inline-block shadow-lg">
                  <img
                    src={qrCodeUrl}
                    alt="診断用QRコード"
                    className="w-64 h-64"
                  />
                </div>
              ) : (
                <div className="bg-gray-100 border-4 border-gray-200 rounded-lg p-4 inline-block w-64 h-64 flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-2"></div>
                    <p className="text-sm">QRコード生成中...</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                <p className="font-medium">セッションID</p>
                <p className="font-mono text-lg">{session.session_id}</p>
              </div>

              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={regenerateQR}
                  className="flex-1"
                >
                  QRコード再生成
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.print()}
                  className="flex-1"
                >
                  QR印刷
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 送信内容確認セクション */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>👶 お子様情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">お名前:</span>
                <span className="font-medium">{questionnaire.child_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">年齢:</span>
                <span className="font-medium">{questionnaire.child_age}歳</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">性別:</span>
                <span className="font-medium">{formatGender(questionnaire.child_gender)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>👨‍👩‍👧‍👦 保護者情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">お名前:</span>
                <span className="font-medium">{questionnaire.parent_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">電話番号:</span>
                <span className="font-medium">{questionnaire.parent_phone}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>📝 問診票内容</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {questionnaire.concerns.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">現在の悩み・気になること</h4>
                  <div className="flex flex-wrap gap-2">
                    {questionnaire.concerns.map((concern, index) => (
                      <Badge key={index} variant="secondary">
                        {concern}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {questionnaire.ideal_goals.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">理想とする状態</h4>
                  <div className="flex flex-wrap gap-2">
                    {questionnaire.ideal_goals.map((goal, index) => (
                      <Badge key={index} variant="outline">
                        {goal}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {questionnaire.medical_history.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">既往歴</h4>
                  <div className="flex flex-wrap gap-2">
                    {questionnaire.medical_history.map((history, index) => (
                      <Badge key={index} variant="destructive">
                        {history}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {questionnaire.notes && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">スタッフへのメッセージ</h4>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                    {questionnaire.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* アクションセクション */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 text-sm">
                📋 <strong>スタッフを呼ぶ際のポイント</strong><br />
                「QRコードを読み取ってください」とスタッフにお伝えください。
                セッションID「{session.session_id}」もお伝えいただけます。
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                variant="outline"
                onClick={() => router.push('/parent')}
                className="flex-1"
              >
                別の問診票を作成する
              </Button>
              <Button
                onClick={() => router.push('/')}
                className="flex-1"
              >
                ホームに戻る
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
