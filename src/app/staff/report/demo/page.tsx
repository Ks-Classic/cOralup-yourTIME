'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface SessionData {
  id: string
  session_id: string
  status: string
  parent_name?: string
  created_at: string
}

interface ReportData {
  summary: string
  analysis: string
  recommendations: string[]
  nextSteps: string[]
  encouragingMessage: string
}

export default function ReportPage() {
  const router = useRouter()
  const sessionId = 'demo'
  const [session, setSession] = useState<SessionData | null>(null)
  const [report, setReport] = useState<ReportData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    // モックデータを設定
    const mockSession: SessionData = {
      id: sessionId,
      session_id: sessionId,
      status: 'completed',
      parent_name: '保護者 太郎',
      created_at: new Date().toISOString(),
    }

    const mockReport: ReportData = {
      summary: '保護者様のお子様の口腔・姿勢診断が完了いたしました。',
      analysis: '今回の診断では、姿勢と口腔機能の総合的な評価を行いました。姿勢については肩のバランスと背骨のカーブに軽度の改善点が見られましたが、全体的には良好な状態です。口腔機能については、歯並びと咬合状態が良好で、口腔内の清潔度も保たれています。',
      recommendations: [
        '日常的に正しい姿勢を意識するよう指導してください',
        '定期的な歯科検診を継続してください',
        '食事の際の姿勢にも注意を払いましょう',
        '口腔内の清潔を保つための習慣を身につけましょう'
      ],
      nextSteps: [
        '3ヶ月後のフォローアップ診断を予定してください',
        '気になる症状が出た場合は早めにご相談ください',
        '家庭での姿勢改善エクササイズを実践してください'
      ],
      encouragingMessage: 'お子様の健康な成長を一緒にサポートしていきましょう。何か気になることがありましたら、いつでもご相談ください。'
    }

    setSession(mockSession)
    setReport(mockReport)
    setIsLoading(false)
  }, [])

  const sendReport = async () => {
    if (!session || !report) return

    setIsSending(true)
    try {
      // モックデータ用なので、実際のLINE通知はスキップ
      alert('診断レポートが送信されました（モック）')
      router.push('/staff')
    } catch (error) {
      console.error('Error sending report:', error)
      alert('レポートの送信に失敗しました')
    } finally {
      setIsSending(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">レポートを準備中...</p>
        </div>
      </div>
    )
  }

  if (!session || !report) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">レポートが見つかりません</p>
          <Button onClick={() => router.push('/staff')}>
            スタッフページに戻る
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 px-4 py-8">
      {/* ヘッダー */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            診断レポート確認
          </h1>
          <div className="flex items-center space-x-4">
            <span className="text-gray-600">👶 {session.parent_name}様のお子様</span>
            <span className="text-gray-500">セッションID: {session.session_id}</span>
          </div>
        </div>
        <Button
          onClick={() => router.push(`/staff/analysis/demo`)}
          variant="outline"
        >
          戻る
        </Button>
      </div>

      {/* レポート内容 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>📋 診断レポート</span>
            <Badge className="bg-green-100 text-green-800">
              送信準備完了
            </Badge>
          </CardTitle>
          <CardDescription>
            生成された診断レポートの内容を確認してください
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* サマリー */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">診断サマリー</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700 leading-relaxed">
                {report.summary}
              </p>
            </div>
          </div>

          {/* 詳細分析 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">詳細分析</h3>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-blue-800 leading-relaxed">
                {report.analysis}
              </p>
            </div>
          </div>

          {/* 改善提案 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">改善提案</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {report.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                  <div className="flex-shrink-0 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                    <span className="text-xs font-semibold text-yellow-900">{index + 1}</span>
                  </div>
                  <p className="text-sm text-yellow-800">{recommendation}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 次のステップ */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">次のステップ</h3>
            <div className="space-y-3">
              {report.nextSteps.map((step, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-400 rounded-full flex items-center justify-center">
                    <span className="text-xs font-semibold text-green-900">→</span>
                  </div>
                  <p className="text-sm text-green-800">{step}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 励ましのメッセージ */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">メッセージ</h3>
            <div className="bg-purple-50 p-4 rounded-lg border-l-4 border-purple-400">
              <p className="text-purple-800 italic">
                "{report.encouragingMessage}"
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 送信アクション */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800">
                📱 このレポートを保護者の方のLINEアカウントに送信します。
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                variant="outline"
                onClick={() => router.push(`/staff/analysis/demo`)}
                className="flex-1"
              >
                レポートを修正する
              </Button>
              <Button
                onClick={sendReport}
                disabled={isSending}
                className="flex-1"
                size="lg"
              >
                {isSending ? '送信中...' : 'LINEで送信する'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 診断情報サマリー */}
      <Card>
        <CardHeader>
          <CardTitle>診断情報サマリー</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">7/10</div>
              <div className="text-sm text-blue-800">姿勢評価</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">8/10</div>
              <div className="text-sm text-green-800">口腔評価</div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">良好</div>
              <div className="text-sm text-purple-800">総合評価</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
