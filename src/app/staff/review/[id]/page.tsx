'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CheckCircle2, XCircle, Camera, Edit2, ArrowRight } from 'lucide-react'

interface SessionData {
  id: string
  session_id: string
  status: string
  parent_name?: string
  child_name?: string
  child_age?: number
  created_at: string
}

interface PhotoData {
  id: string
  url: string
  type: 'posture_front' | 'posture_side' | 'oral_front' | 'oral_side' | 'oral_closeup'
  uploaded_at: string
}

interface DiagnosisItem {
  id: string
  category: string
  question: string
  value: any
}

export default function ReviewPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const router = useRouter()
  const [session, setSession] = useState<SessionData | null>(null)
  const [photos, setPhotos] = useState<PhotoData[]>([])
  const [diagnosisItems, setDiagnosisItems] = useState<DiagnosisItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sessionId, setSessionId] = useState<string>('')

  // パラメータの解決（Next.js 14対応）
  useEffect(() => {
    const resolveParams = async () => {
      try {
        const resolvedParams = 'then' in params ? await params : params
        const id = resolvedParams.id
        setSessionId(id || 'demo')
      } catch (error) {
        console.error('Error resolving params:', error)
        setSessionId('demo')
      }
    }
    resolveParams()
  }, [params])

  useEffect(() => {
    if (!sessionId) return

    // モックデータを設定
    const mockSession: SessionData = {
      id: sessionId,
      session_id: sessionId,
      status: 'diagnosis_in_progress',
      parent_name: '保護者 太郎',
      child_name: 'お子様 花子',
      child_age: 8,
      created_at: new Date().toISOString(),
    }

    // モック写真データ
    const mockPhotos: PhotoData[] = [
      {
        id: '1',
        url: '/placeholder-posture-side.jpg',
        type: 'posture_side',
        uploaded_at: new Date().toISOString(),
      },
      {
        id: '2',
        url: '/placeholder-posture-front.jpg',
        type: 'posture_front',
        uploaded_at: new Date().toISOString(),
      },
      {
        id: '3',
        url: '/placeholder-oral-front.jpg',
        type: 'oral_front',
        uploaded_at: new Date().toISOString(),
      },
    ]

    // モック診断項目データ
    const mockDiagnosisItems: DiagnosisItem[] = [
      { id: '1', category: '姿勢評価', question: '頭部位置', value: '正常' },
      { id: '2', category: '姿勢評価', question: '肩バランス', value: '左右差あり' },
      { id: '3', category: '姿勢評価', question: '背骨カーブ', value: '正常' },
      { id: '4', category: '口腔機能評価', question: '咬合状態', value: '開咬' },
      { id: '5', category: '口腔機能評価', question: '歯並び', value: '叢生' },
      { id: '6', category: '口腔機能評価', question: '舌位置', value: '低位舌' },
    ]

    setSession(mockSession)
    setPhotos(mockPhotos)
    setDiagnosisItems(mockDiagnosisItems)
    setIsLoading(false)
  }, [sessionId])

  const getPhotoTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      posture_front: '正面姿勢',
      posture_side: '横向き姿勢',
      oral_front: '口腔内（正面）',
      oral_side: '口腔内（横向き）',
      oral_closeup: '口腔内（クローズアップ）',
    }
    return labels[type] || type
  }

  const handleEdit = () => {
    router.push(`/staff/diagnosis/${sessionId}`)
  }

  const handleProceedToAnalysis = () => {
    router.push(`/staff/analysis/${sessionId}`)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-coral-500 mx-auto mb-4"></div>
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

  // カテゴリ別に診断項目をグループ化
  const itemsByCategory = diagnosisItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = []
    }
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, DiagnosisItem[]>)

  return (
    <div className="min-h-screen bg-gradient-to-br from-coral-50 via-white to-blue-50">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              チェック内容・写真確認
            </h1>
            <p className="text-gray-600">
              {session.child_name}様 ({session.child_age}歳) の診断内容を確認してください
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleEdit}
            className="flex items-center gap-2"
          >
            <Edit2 className="w-4 h-4" />
            内容を修正
          </Button>
        </div>

        {/* 進捗表示 */}
        <Card className="border-coral-200 bg-white shadow-sm">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">診断進捗</span>
                <span className="font-medium text-coral-600">
                  写真: {photos.length}/3 | 診断項目: {diagnosisItems.length}件
                </span>
              </div>
              <Progress value={100} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* 診断項目チェック内容 */}
        <Card className="border-gray-200 bg-white shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-xl">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              診断項目チェック内容
            </CardTitle>
            <CardDescription>
              入力した診断項目を確認してください
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {Object.entries(itemsByCategory).map(([category, items]) => (
              <div key={category} className="space-y-3">
                <h3 className="font-semibold text-gray-900 text-lg border-b border-gray-200 pb-2">
                  {category}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <span className="text-sm text-gray-700">{item.question}</span>
                      <Badge
                        variant={item.value === '正常' ? 'default' : 'secondary'}
                        className="ml-2"
                      >
                        {item.value}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 撮影した写真 */}
        <Card className="border-gray-200 bg-white shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Camera className="w-5 h-5 text-blue-500" />
              撮影した写真
            </CardTitle>
            <CardDescription>
              診断に使用する写真を確認してください
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="relative group border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-100 aspect-square"
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Camera className="w-12 h-12 text-gray-400" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                    <p className="text-white text-sm font-medium">
                      {getPhotoTypeLabel(photo.type)}
                    </p>
                    <p className="text-white/80 text-xs">
                      {new Date(photo.uploaded_at).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                  <div className="absolute top-2 right-2">
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      済み
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            {photos.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Camera className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>写真がまだ撮影されていません</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* アクションボタン */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <Button
            variant="outline"
            onClick={handleEdit}
            className="flex-1 h-12 text-base"
          >
            内容を修正する
          </Button>
          <Button
            onClick={handleProceedToAnalysis}
            className="flex-1 h-12 text-base bg-coral-500 hover:bg-coral-600"
          >
            AI分析へ進む
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  )
}

