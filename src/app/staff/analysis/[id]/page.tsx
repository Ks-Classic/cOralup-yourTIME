'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'

interface SessionData {
  id: string
  session_id: string
  status: string
  parent_name?: string
  parent_phone?: string
  created_at: string
}

interface QuestionnaireData {
  child_name: string
  child_age: number
  child_gender: string
  concerns: string[]
  ideal_goals: string[]
}

interface DiagnosisData {
  posture_analysis: any
  oral_analysis: any
  staff_notes: string
  photos: any[]
}

interface AnalysisResult {
  postureAnalysis: {
    overallScore: number
    issues: string[]
    recommendations: string[]
    severity: 'low' | 'medium' | 'high'
    details: {
      headPosition: string
      shoulderBalance: string
      spineCurve: string
      pelvisTilt: string
      footBalance: string
    }
  }
  oralAnalysis: {
    overallScore: number
    issues: string[]
    recommendations: string[]
    severity: 'low' | 'medium' | 'high'
    details: {
      biteCondition: string
      teethAlignment: string
      tonguePosition: string
      oralCleanliness: string
      functionEstimation: string
    }
  }
  report: {
    summary: string
    analysis: string
    recommendations: string[]
    nextSteps: string[]
    encouragingMessage: string
  }
}

export default function AnalysisPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const router = useRouter()
  const [session, setSession] = useState<SessionData | null>(null)
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireData | null>(null)
  const [diagnosis, setDiagnosis] = useState<DiagnosisData | null>(null)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [editableReport, setEditableReport] = useState<any>(null)
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
        // eslint-disable-next-line no-console
        console.error('Error resolving params:', error)
        setSessionId('demo')
      }
    }
    resolveParams()
  }, [params])

  useEffect(() => {
    if (!sessionId) return

    const fetchData = async () => {
      try {
        // セッションデータを取得
        const { data: sessionData, error: sessionError } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', sessionId)
          .single()

        if (sessionError) throw sessionError
        setSession(sessionData)

        // 問診票データを取得
        const { data: questionnaireData, error: questionnaireError } = await supabase
          .from('questionnaires')
          .select('*')
          .eq('session_id', sessionData.session_id)
          .single()

        if (!questionnaireError && questionnaireData) {
          setQuestionnaire(questionnaireData)
        }

        // 診断データを取得
        const { data: diagnosisData, error: diagnosisError } = await supabase
          .from('diagnoses')
          .select('*')
          .eq('session_id', sessionData.session_id)
          .single()

        if (!diagnosisError && diagnosisData) {
          setDiagnosis(diagnosisData)
        }

      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error fetching data:', error)
        alert('データの取得に失敗しました')
        router.push('/staff')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [sessionId, router])

  const runAnalysis = async (type: 'posture' | 'oral') => {
    if (!diagnosis || !questionnaire) return

    setIsAnalyzing(true)
    try {
      const analysisData = type === 'posture' ? diagnosis.posture_analysis : diagnosis.oral_analysis

      const requestBody = {
        imageDescription: `${type === 'posture' ? '姿勢' : '口腔内'}写真の分析`,
        age: questionnaire.child_age,
        medicalHistory: questionnaire.concerns,
        concerns: questionnaire.concerns,
        diagnosisData: analysisData,
      }

      const response = await fetch(`/api/ai/analyze-${type}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) throw new Error('Analysis failed')

      const result = await response.json()

      setAnalysisResult(prev => ({
        ...prev,
        [type === 'posture' ? 'postureAnalysis' : 'oralAnalysis']: result,
      } as AnalysisResult))

    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error running analysis:', error)
      alert('分析の実行に失敗しました')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const generateReport = async () => {
    if (!analysisResult || !questionnaire || !diagnosis) return

    setIsGeneratingReport(true)
    try {
      const reportData = {
        questionnaire,
        postureAnalysis: analysisResult.postureAnalysis,
        oralAnalysis: analysisResult.oralAnalysis,
        staffNotes: diagnosis.staff_notes,
      }

      const response = await fetch('/api/ai/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportData),
      })

      if (!response.ok) throw new Error('Report generation failed')

      const report = await response.json()

      const fullResult: AnalysisResult = {
        ...analysisResult,
        report,
      }

      setAnalysisResult(fullResult)
      setEditableReport(report)

    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error generating report:', error)
      alert('レポートの生成に失敗しました')
    } finally {
      setIsGeneratingReport(false)
    }
  }

  const updateReport = (field: string, value: string) => {
    if (!editableReport) return

    setEditableReport(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  const saveAndSendReport = async () => {
    if (!session || !editableReport) return

    try {
      // レポートを保存
      const { error } = await supabase
        .from('reports')
        .insert([{
          session_id: session.session_id,
          pdf_url: '', // PDF生成後に更新
          status: 'sent',
        }])

      if (error) throw error

      // セッションステータスを更新
      await supabase
        .from('sessions')
        .update({ status: 'completed' })
        .eq('id', sessionId)

      // LINE通知
      await sendLineNotification()

      alert('診断レポートが送信されました')
      router.push('/staff')

    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error saving report:', error)
      alert('レポートの保存に失敗しました')
    }
  }

  const sendLineNotification = async () => {
    if (!session) return

    try {
      const message = {
        type: 'text',
        text: `診断が完了しました。

${questionnaire?.child_name}様の診断結果をお送りします。

【診断サマリー】
• 姿勢評価: ${analysisResult?.postureAnalysis.overallScore || 0}/10点
• 口腔評価: ${analysisResult?.oralAnalysis.overallScore || 0}/10点

詳細な診断レポートはPDF形式でお送りいたします。
ご質問がありましたら、スタッフまでお声かけください。`,
      }

      await fetch('/api/line/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: session.parent_phone,
          messages: [message],
        }),
      })

    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error sending LINE message:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">データを読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!session || !questionnaire || !diagnosis) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">必要なデータが見つかりません</p>
          <Button onClick={() => router.push('/staff')}>
            スタッフページに戻る
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* ヘッダー */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            AI分析・レポート生成
          </h1>
          <div className="flex items-center space-x-4">
            <span className="text-gray-600">👶 {questionnaire.child_name} ({questionnaire.child_age}歳)</span>
            <span className="text-gray-500">セッションID: {session.session_id}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => router.push(`/staff/review/${sessionId}`)}
            variant="outline"
          >
            チェック内容確認に戻る
          </Button>
          <Button
            onClick={() => router.push(`/staff/diagnosis/${sessionId}`)}
            variant="outline"
          >
            診断画面に戻る
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 分析コントロール */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>🤖</span>
              <span>AI分析実行</span>
            </CardTitle>
            <CardDescription>
              診断データを基にAI分析を実行します
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">姿勢分析</h4>
              <Button
                onClick={() => runAnalysis('posture')}
                disabled={isAnalyzing}
                className="w-full"
              >
                {isAnalyzing ? '分析中...' : '姿勢分析を実行'}
              </Button>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">口腔分析</h4>
              <Button
                onClick={() => runAnalysis('oral')}
                disabled={isAnalyzing}
                className="w-full"
              >
                {isAnalyzing ? '分析中...' : '口腔分析を実行'}
              </Button>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">レポート生成</h4>
              <Button
                onClick={generateReport}
                disabled={isGeneratingReport || !analysisResult}
                className="w-full"
              >
                {isGeneratingReport ? '生成中...' : 'レポートを生成'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 分析結果表示 */}
        <Card>
          <CardHeader>
            <CardTitle>分析結果</CardTitle>
          </CardHeader>
          <CardContent>
            {analysisResult ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {analysisResult.postureAnalysis.overallScore}/10
                    </div>
                    <div className="text-sm text-blue-800">姿勢評価</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {analysisResult.oralAnalysis.overallScore}/10
                    </div>
                    <div className="text-sm text-green-800">口腔評価</div>
                  </div>
                </div>

                {editableReport && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        診断サマリー
                      </label>
                      <textarea
                        value={editableReport.summary}
                        onChange={(e) => updateReport('summary', e.target.value)}
                        className="w-full h-20 p-2 border border-gray-300 rounded"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        詳細分析
                      </label>
                      <textarea
                        value={editableReport.analysis}
                        onChange={(e) => updateReport('analysis', e.target.value)}
                        className="w-full h-32 p-2 border border-gray-300 rounded"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        励ましのメッセージ
                      </label>
                      <textarea
                        value={editableReport.encouragingMessage}
                        onChange={(e) => updateReport('encouragingMessage', e.target.value)}
                        className="w-full h-20 p-2 border border-gray-300 rounded"
                      />
                    </div>

                    <Button
                      onClick={saveAndSendReport}
                      className="w-full"
                      size="lg"
                    >
                      レポートを確定・送信
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <p>分析を実行して結果を確認してください</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 写真プレビュー */}
      {diagnosis.photos && diagnosis.photos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>撮影写真</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {diagnosis.photos.map((photo, index) => (
                <div key={index} className="text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-20 object-cover rounded"
                  />
                  <p className="text-xs text-gray-600 mt-1">写真 {index + 1}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

