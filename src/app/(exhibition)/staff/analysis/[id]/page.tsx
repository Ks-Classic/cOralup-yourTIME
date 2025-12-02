'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { OralDiagnosisOutput } from '@/agents/oral-diagnosis/schema'

interface AnalysisPageProps {
  params: Promise<{ id: string }> | { id: string }
}

export default function AnalysisPage({ params }: AnalysisPageProps) {
  const router = useRouter()
  const resolvedParams = 'then' in params ? use(params) : params
  const visitId = resolvedParams.id

  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<OralDiagnosisOutput | null>(null)
  const [analysisId, setAnalysisId] = useState<string | null>(null)
  const [editedComment, setEditedComment] = useState('')
  const [feedbackScore, setFeedbackScore] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isMock, setIsMock] = useState(false)

  // 既存の分析結果を取得
  useEffect(() => {
    const fetchExistingAnalysis = async () => {
      try {
        const res = await fetch(`/api/analysis?visitId=${visitId}`)
        if (res.ok) {
          const data = await res.json()
          if (data.analysis) {
            setAnalysisId(data.analysis.id)
            setEditedComment(data.analysis.final_content || '')
            setFeedbackScore(data.analysis.feedback_score)
          }
        }
      } catch {
        // 分析結果がなくてもOK
      }
    }
    fetchExistingAnalysis()
  }, [visitId])

  // AI分析実行
  const runAnalysis = async () => {
    setIsAnalyzing(true)
    setError(null)

    try {
      const res = await fetch('/api/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitId })
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'AI分析に失敗しました')
      }

      const data = await res.json()
      setAnalysisResult(data.result)
      setAnalysisId(data.analysisId)
      setEditedComment(data.result.parentComment)
      setIsMock(data.isMock || false)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsAnalyzing(false)
    }
  }

  // コメント保存
  const saveComment = async () => {
    if (!analysisId) return

    setIsSaving(true)
    try {
      const res = await fetch('/api/analysis', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisId,
          finalContent: editedComment,
          feedbackScore
        })
      })

      if (!res.ok) throw new Error('保存に失敗しました')
      
      alert('保存しました')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsSaving(false)
    }
  }

  // LINE送信
  const sendToLine = async () => {
    setIsSending(true)
    try {
      const res = await fetch('/api/line/send-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitId,
          message: editedComment
        })
      })

      if (!res.ok) throw new Error('LINE送信に失敗しました')

      alert('LINEに送信しました')
      router.push('/staff')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsSending(false)
    }
  }

  // 重症度バッジの色
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'normal': return 'bg-green-100 text-green-800'
      case 'mild': return 'bg-yellow-100 text-yellow-800'
      case 'moderate': return 'bg-orange-100 text-orange-800'
      case 'severe': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // 総合評価バッジ
  const getSummaryBadge = (summary: string) => {
    switch (summary) {
      case 'A': return <Badge className="bg-green-500 text-white text-lg px-4 py-1">A 良好</Badge>
      case 'B': return <Badge className="bg-yellow-500 text-white text-lg px-4 py-1">B 要観察</Badge>
      case 'C': return <Badge className="bg-red-500 text-white text-lg px-4 py-1">C 要相談</Badge>
      default: return null
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">AI分析・レポート編集</h1>
          <p className="text-gray-600 text-sm">Visit ID: {visitId}</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          戻る
        </Button>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* モックモード警告 */}
      {isMock && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
          ⚠️ モックモードで動作しています。実際のAI分析結果ではありません。
        </div>
      )}

      {/* 分析実行ボタン */}
      {!analysisResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>🤖</span>
              AI分析
            </CardTitle>
            <CardDescription>
              診断データを基にAIが分析を行い、保護者向けコメントを生成します
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={runAnalysis} 
              disabled={isAnalyzing}
              className="w-full"
              size="lg"
            >
              {isAnalyzing ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  分析中...
                </>
              ) : (
                'AI分析を実行'
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 分析結果 */}
      {analysisResult && (
        <>
          {/* 総合評価 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>総合評価</span>
                {getSummaryBadge(analysisResult.summary)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">
                {analysisResult.summaryDescription || '評価の詳細は下記をご確認ください'}
              </p>
            </CardContent>
          </Card>

          {/* 所見一覧 */}
          <Card>
            <CardHeader>
              <CardTitle>診断所見</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {analysisResult.findings.map((finding, idx) => (
                <div key={idx} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{finding.category}</span>
                    <Badge className={getSeverityColor(finding.severity)}>
                      {finding.severity === 'normal' && '正常'}
                      {finding.severity === 'mild' && '軽度'}
                      {finding.severity === 'moderate' && '中等度'}
                      {finding.severity === 'severe' && '重度'}
                    </Badge>
                  </div>
                  <p className="text-gray-600 text-sm">{finding.observation}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 推奨事項 */}
          <Card>
            <CardHeader>
              <CardTitle>推奨事項</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-1">
                {analysisResult.recommendations.map((rec, idx) => (
                  <li key={idx} className="text-gray-700">{rec}</li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* 保護者向けコメント編集 */}
          <Card>
            <CardHeader>
              <CardTitle>保護者向けコメント</CardTitle>
              <CardDescription>
                AIが生成したコメントを編集できます。このコメントがLINEで送信されます。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <textarea
                value={editedComment}
                onChange={(e) => setEditedComment(e.target.value)}
                className="w-full h-40 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="保護者向けのコメントを入力..."
              />
              
              {/* AIフィードバック */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  AI生成品質の評価（任意）
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((score) => (
                    <button
                      key={score}
                      onClick={() => setFeedbackScore(score)}
                      className={`w-10 h-10 rounded-full border-2 transition-all ${
                        feedbackScore === score
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-blue-300'
                      }`}
                    >
                      {score}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={saveComment} 
                  disabled={isSaving}
                  variant="outline"
                  className="flex-1"
                >
                  {isSaving ? '保存中...' : '保存'}
                </Button>
                <Button 
                  onClick={sendToLine} 
                  disabled={isSending || !editedComment}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {isSending ? '送信中...' : 'LINEで送信'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 専門家メモ */}
          {analysisResult.professionalNote && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-gray-500">専門家向けメモ</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm">{analysisResult.professionalNote}</p>
              </CardContent>
            </Card>
          )}

          {/* 再分析ボタン */}
          <div className="text-center">
            <Button 
              variant="ghost" 
              onClick={runAnalysis}
              disabled={isAnalyzing}
            >
              🔄 再分析する
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

