'use client'

import { useState, useEffect, useMemo, use } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { QRDisplay } from '@/components/parent/QRDisplay'
import { useQuestionnaireStorage } from '@/hooks/useQuestionnaireStorage'

interface QuestionnaireData {
  child_name: string
  child_age: number
  child_gender: string
  parent_name: string
  parent_phone: string
  questionnaire_data?: Record<string, unknown>
}

interface SessionData {
  id: string
  session_id: string
  status: string
  created_at: string
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default function ResultPage({ params }: PageProps) {
  const resolvedParams = use(params)
  const router = useRouter()
  const sessionId = resolvedParams?.id || 'demo'

  const [questionnaire, setQuestionnaire] = useState<QuestionnaireData | null>(null)
  const [session, setSession] = useState<SessionData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // localStorageから問診データを復元
  const { data: storedData, isLoading: isStorageLoading } = useQuestionnaireStorage(sessionId)

  // モックデータ用のセッション情報
  const mockSession: SessionData = useMemo(() => ({
    id: sessionId,
    session_id: sessionId,
    status: 'in_progress',
    created_at: new Date().toISOString(),
  }), [sessionId])

  // モックデータ用の問診票情報
  const mockQuestionnaire: QuestionnaireData = useMemo(() => ({
    child_name: 'お子様 花子',
    child_age: 8,
    child_gender: 'female',
    parent_name: '保護者 太郎',
    parent_phone: '090-1234-5678',
  }), [])

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        // localStorageにデータがある場合はそれを使用
        if (storedData?.basicInfo) {
          const birthDate = new Date(
            storedData.basicInfo.birthYear,
            storedData.basicInfo.birthMonth - 1,
            storedData.basicInfo.birthDay
          )
          const today = new Date()
          const age = today.getFullYear() - birthDate.getFullYear() -
            (today < new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate()) ? 1 : 0)

          setQuestionnaire({
            child_name: storedData.basicInfo.childName,
            child_age: age,
            child_gender: storedData.basicInfo.childGender,
            parent_name: storedData.basicInfo.parentName,
            parent_phone: storedData.basicInfo.parentPhone,
            questionnaire_data: storedData.questionnaireData,
          })
          setSession(mockSession)
        } else {
          // モックデータを使用
          setSession(mockSession)
          setQuestionnaire(mockQuestionnaire)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        setSession(mockSession)
        setQuestionnaire(mockQuestionnaire)
      } finally {
        setIsLoading(false)
      }
    }

    if (!isStorageLoading) {
      fetchData()
    }
  }, [sessionId, mockSession, mockQuestionnaire, storedData, isStorageLoading])

  const formatGender = (gender: string) => {
    switch (gender) {
      case 'male': return '男'
      case 'female': return '女'
      case 'other': return 'その他'
      default: return gender
    }
  }

  if (isLoading || isStorageLoading) {
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
          <Button onClick={() => router.push('/parent')}>
            問診票入力に戻る
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* QRコード表示 */}
      <QRDisplay
        visitId={session.id}
        childName={questionnaire.child_name}
        className="mb-8"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* お子様情報 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>👶</span>
              <span>お子様情報</span>
            </CardTitle>
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

        {/* 保護者情報 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>👨‍👩‍👧‍👦</span>
              <span>保護者情報</span>
            </CardTitle>
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
      </div>

      {/* フッターアクション */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <p className="text-blue-800 text-sm">
              📋 診断完了後、LINEでレポートをお送りします。<br />
              この画面は閉じずにお待ちください。
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                variant="outline"
                onClick={() => router.push('/parent/questionnaire/demo')}
                className="flex-1 max-w-xs"
              >
                別の問診票を作成する
              </Button>
              <Button
                onClick={() => router.push('/parent')}
                className="flex-1 max-w-xs"
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

