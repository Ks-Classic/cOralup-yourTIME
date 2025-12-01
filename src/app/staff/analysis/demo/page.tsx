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

export default function AnalysisPage() {
  const router = useRouter()
  const sessionId = 'demo'
  const [session, setSession] = useState<SessionData | null>(null)
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireData | null>(null)
  const [diagnosis, setDiagnosis] = useState<DiagnosisData | null>(null)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [editableReport, setEditableReport] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // モックデータを設定
    const mockSession: SessionData = {
      id: sessionId,
      session_id: sessionId,
      status: 'diagnosis_completed',
      parent_name: '保護者 太郎',
      created_at: new Date().toISOString(),
    }

    const mockQuestionnaire: QuestionnaireData = {
      child_name: 'お子様 花子',
      child_age: 8,
      child_gender: 'female',
      concerns: ['姿勢が悪い', '口呼吸'],
      ideal_goals: ['正しい姿勢を身につける'],
    }

    const mockDiagnosis: DiagnosisData = {
      posture_analysis: {},
      oral_analysis: {},
      staff_notes: '',
      photos: [],
    }

    setSession(mockSession)
    setQuestionnaire(mockQuestionnaire)
    setDiagnosis(mockDiagnosis)
    setIsLoading(false)
  }, [])

  const runAnalysis = async (type: 'posture' | 'oral') => {
    if (!diagnosis || !questionnaire) return

    setIsAnalyzing(true)
    try {
      // モック分析結果
      const mockResult = type === 'posture' ? {
        overallScore: 7,
        issues: ['肩のバランス', '背骨のカーブ'],
        recommendations: ['姿勢改善エクササイズ', '日常的な姿勢意識'],
        severity: 'medium' as const,
        details: {
          headPosition: '正常',
          shoulderBalance: '左右差あり',
          spineCurve: '軽度の弯曲',
          pelvisTilt: '正常',
          footBalance: '正常',
        },
      } : {
        overallScore: 8,
        issues: ['咬合状態', '舌位置'],
        recommendations: ['口腔機能訓練', '定期的な検診'],
        severity: 'low' as const,
        details: {
          biteCondition: '開咬',
          teethAlignment: '叢生',
          tonguePosition: '低位舌',
          oralCleanliness: '良好',
          functionEstimation: '良好',
        },
      }

      setAnalysisResult(prev => ({
        ...prev,
        [type === 'posture' ? 'postureAnalysis' : 'oralAnalysis']: mockResult,
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
      // モックレポート生成
      const mockReport = {
        summary: '診断が完了しました。',
        analysis: '総合的な評価を行いました。',
        recommendations: ['改善提案1', '改善提案2'],
        nextSteps: ['次のステップ1', '次のステップ2'],
        encouragingMessage: '励ましのメッセージ',
      }

      const fullResult: AnalysisResult = {
        ...analysisResult,
        report: mockReport,
      }

      setAnalysisResult(fullResult)
      setEditableReport(mockReport)

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
      alert('診断レポートが送信されました（モック）')
      router.push(`/staff/report/demo`)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error saving report:', error)
      alert('レポートの保存に失敗しました')
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
    <div className="max-w-6xl mx-auto space-y-8 px-4 py-8">
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
            onClick={() => router.push(`/staff/review/demo`)}
            variant="outline"
          >
            チェック内容確認に戻る
          </Button>
          <Button
            onClick={() => router.push(`/staff/diagnosis/demo`)}
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
                      {analysisResult.postureAnalysis?.overallScore || 0}/10
                    </div>
                    <div className="text-sm text-blue-800">姿勢評価</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {analysisResult.oralAnalysis?.overallScore || 0}/10
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

