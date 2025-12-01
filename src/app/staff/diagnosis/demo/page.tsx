'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { diagnosisItems, diagnosisItemsByCategory, categoryOrder } from '@/data/staff-diagnosis-items'
import type { DiagnosisItem } from '@/data/staff-diagnosis-items'
import { Camera, X, Check, ChevronLeft, ChevronRight, Sparkles, QrCode, FileText, Eye, Brain, Send, CheckCircle2, Edit2 } from 'lucide-react'
import { cn } from '@/utils'
import { generateStaffDiagnosisSampleData } from '@/utils/staff-sample-data-generator'
import { generateQRCode } from '@/utils'
import { AnimatePresence, motion } from 'framer-motion'

// メインビューの定義（下部メニューで切り替え）
type MainView = 'questionnaire' | 'photos' | 'diagnosis' | 'review' | 'report'

// ステップ定義（後方互換性のため残す）
type DiagnosisStep =
  | 'start'       // QR読み取り・セッションID入力（セッションID未確定時）
  | 'session'     // セッション情報確認（問診票確認）
  | 'photos'      // 写真撮影
  | 'diagnosis'   // 診断項目入力
  | 'review'      // 確認・修正
  | 'analysis'    // AI分析
  | 'report'      // レポート送信

const steps: DiagnosisStep[] = [
  'session',
  'photos',
  'diagnosis',
  'review',
  'analysis',
  'report'
]

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

interface PhotoData {
  id: string
  url: string
  type: 'posture_front' | 'posture_side' | 'oral_front' | 'oral_side' | 'oral_closeup'
  uploaded_at: string
}

interface AnalysisResult {
  postureAnalysis?: {
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
  oralAnalysis?: {
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
  report?: {
    summary: string
    analysis: string
    recommendations: string[]
    nextSteps: string[]
    encouragingMessage: string
  }
}

export default function IntegratedDiagnosisPage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [sessionId] = useState<string>('demo')

  // メインビューの管理（下部メニューで切り替え）
  const [currentMainView, setCurrentMainView] = useState<MainView>('questionnaire')

  // ステップ管理（後方互換性のため残す）
  const [currentStep, setCurrentStep] = useState<DiagnosisStep>('session')
  const [completedSteps, setCompletedSteps] = useState<Set<DiagnosisStep>>(new Set())

  // データ管理
  const [session, setSession] = useState<SessionData | null>(null)
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireData | null>(null)
  const [photos, setPhotos] = useState<PhotoData[]>([])
  const [diagnosisValues, setDiagnosisValues] = useState<Record<string, any>>({})
  const [staffNotes, setStaffNotes] = useState('')
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [editableReport, setEditableReport] = useState<any>(null)

  // UI状態
  const [currentPhotoType, setCurrentPhotoType] = useState<string>('')
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const isScrollingRef = useRef(false)
  const mainContainerRef = useRef<HTMLElement | null>(null)

  // モックデータの初期化（セッションIDに基づく）
  useEffect(() => {
    if (!sessionId) return

    // TODO: 実際のAPIからセッション情報を取得
    // 現在はモックデータを使用
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
  }, [sessionId])

  // URLハッシュ同期
  useEffect(() => {
    const hash = window.location.hash.replace('#step=', '')
    if (hash && steps.includes(hash as DiagnosisStep)) {
      setCurrentStep(hash as DiagnosisStep)
    }
  }, [])

  const changeStep = useCallback((step: DiagnosisStep) => {
    setCurrentStep(step)
    window.history.replaceState(null, '', `#step=${step}`)
  }, [])

  // ステップ完了状態の管理
  const markStepCompleted = useCallback((step: DiagnosisStep) => {
    setCompletedSteps(prev => new Set([...prev, step]))
  }, [])

  const isStepCompleted = useCallback((step: DiagnosisStep) => {
    return completedSteps.has(step)
  }, [completedSteps])

  // スタッフ用項目のみフィルタリング
  const staffItems = useMemo(() =>
    diagnosisItems.filter(item => item.inputType === 'staff'),
    []
  )

  // カテゴリ別にグループ化（スタッフ用のみ）
  const staffItemsByCategory = useMemo(() => {
    const grouped: Record<string, DiagnosisItem[]> = {}
    staffItems.forEach(item => {
      if (!grouped[item.category]) {
        grouped[item.category] = []
      }
      grouped[item.category].push(item)
    })
    return grouped
  }, [staffItems])

  // カテゴリの順序（スタッフ用のみ）
  const staffCategoryOrder = useMemo(() =>
    categoryOrder.filter(cat => staffItemsByCategory[cat]?.length > 0),
    [staffItemsByCategory]
  )

  // アクティブカテゴリの初期化（デフォルトは「舌」）
  useEffect(() => {
    if (currentMainView === 'diagnosis' && staffCategoryOrder.length > 0 && !activeCategory) {
      // デフォルトで「舌」カテゴリを選択
      const defaultCategory = staffCategoryOrder.includes('舌') ? '舌' : staffCategoryOrder[0]
      setActiveCategory(defaultCategory)
    }
  }, [currentMainView, staffCategoryOrder, activeCategory])

  // Intersection Observerでスクロール位置を監視
  useEffect(() => {
    if (currentMainView !== 'diagnosis') return

    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrollingRef.current) return
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveCategory(entry.target.id.replace('category-', ''))
          }
        })
      },
      {
        root: mainContainerRef.current,
        rootMargin: '-120px 0px -70% 0px',
        threshold: 0
      }
    )

    staffCategoryOrder.forEach((category) => {
      const element = document.getElementById(`category-${category}`)
      if (element) observer.observe(element)
    })

    return () => observer.disconnect()
  }, [currentMainView, staffCategoryOrder])

  // タブクリック時のスクロール処理
  const handleCategoryClick = useCallback((e: React.MouseEvent, category: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    isScrollingRef.current = true
    setActiveCategory(category)

    const element = document.getElementById(`category-${category}`)
    const mainContainer = mainContainerRef.current
    
    if (element && mainContainer) {
      // mainコンテナ内でのスクロール
      const containerRect = mainContainer.getBoundingClientRect()
      const elementRect = element.getBoundingClientRect()
      // ヘッダー分の高さを考慮（カテゴリタブ + 進捗バー）
      const headerOffset = 120
      const offsetTop = elementRect.top - containerRect.top + mainContainer.scrollTop - headerOffset
      
      mainContainer.scrollTo({
        top: Math.max(0, offsetTop),
        behavior: 'smooth'
      })
    }

    // スクロール完了後にフラグを解除（概算時間）
    setTimeout(() => {
      isScrollingRef.current = false
    }, 1000)
  }, [])

  const photoTypes = [
    { key: 'posture_front', label: '正面姿勢', description: '正面から全身を撮影', icon: '📸' },
    { key: 'posture_side', label: '横向き姿勢', description: '横向きから全身を撮影', icon: '📸' },
    { key: 'oral_front', label: '口腔内（正面）', description: '口を開けて口腔内を撮影', icon: '🦷' },
  ]

  // 進捗計算
  const totalItems = staffItems.length
  const completedItems = Object.keys(diagnosisValues).filter(
    key => diagnosisValues[key] !== undefined && diagnosisValues[key] !== null && diagnosisValues[key] !== ''
  ).length
  const diagnosisProgressPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

  // 全体進捗計算（各ステップの完了状況）
  const overallProgressPercentage = useMemo(() => {
    const stepWeights: Record<DiagnosisStep, number> = {
      start: 0,
      session: 10,
      photos: 20,
      diagnosis: 40,
      review: 10,
      analysis: 10,
      report: 10,
    }

    let totalWeight = 0
    let completedWeight = 0

    steps.forEach(step => {
      totalWeight += stepWeights[step]
      if (isStepCompleted(step)) {
        completedWeight += stepWeights[step]
      }
    })

    return totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0
  }, [completedSteps, isStepCompleted])

  // カメラ開始
  const startCamera = async (photoType: string) => {
    try {
      // 既存のストリームを停止
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
        setStream(null)
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      })

      setStream(mediaStream)
      setCurrentPhotoType(photoType)
      setIsCameraOpen(true)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (error) {
      console.error('Error accessing camera:', error)
      stopCamera()
      alert('カメラへのアクセスに失敗しました。他のアプリでカメラを使用していないか確認してください。')
    }
  }

  // カメラ停止
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setIsCameraOpen(false)
    setCurrentPhotoType('')
  }

  // 写真撮影
  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return

    setIsCapturing(true)

    try {
      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')

      if (!context) return

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      context.drawImage(video, 0, 0)

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob)
        }, 'image/jpeg', 0.9)
      })

      const objectUrl = URL.createObjectURL(blob)

      const newPhoto: PhotoData = {
        id: `${currentPhotoType}-${Date.now()}`,
        url: objectUrl,
        type: currentPhotoType as PhotoData['type'],
        uploaded_at: new Date().toISOString(),
      }

      setPhotos(prev => [...prev.filter(p => p.type !== currentPhotoType), newPhoto])
      stopCamera()

      // 全ての写真が撮影済みならステップ完了
      if (photos.filter(p => p.type !== currentPhotoType).length + 1 >= photoTypes.length) {
        markStepCompleted('photos')
      }
    } catch (error) {
      console.error('Error capturing photo:', error)
      alert('写真の撮影に失敗しました')
    } finally {
      setIsCapturing(false)
    }
  }

  // サンプルデータを一括入力
  const handleFillSampleData = useCallback(() => {
    if (currentMainView === 'diagnosis') {
      const sampleData = generateStaffDiagnosisSampleData(staffItems)
      setDiagnosisValues(sampleData)
    } else if (currentMainView === 'review') {
      setStaffNotes('診断時の観察事項：\n・姿勢に軽度の改善点が見られる\n・口腔機能は良好\n・継続的な観察を推奨')
    }
  }, [currentMainView, staffItems])

  // 写真削除
  const deletePhoto = useCallback((photoId: string) => {
    setPhotos(prev => prev.filter(p => p.id !== photoId))
  }, [])

  // ヘッダーのサンプルボタンからのイベントをリッスン
  useEffect(() => {
    const handleFillSample = () => {
      handleFillSampleData()
    }
    window.addEventListener('fillStaffSampleData', handleFillSample)
    return () => {
      window.removeEventListener('fillStaffSampleData', handleFillSample)
    }
  }, [handleFillSampleData])

  // 診断値の更新
  const updateDiagnosisValue = (itemId: string, value: any) => {
    setDiagnosisValues(prev => ({
      ...prev,
      [itemId]: value,
    }))
  }

  // 値から日本語ラベルに変換
  const getDisplayValue = useCallback((item: DiagnosisItem, value: any): string => {
    if (value === undefined || value === null || value === '') return ''

    if (Array.isArray(value)) {
      return value.map(v => {
        const option = item.options?.find(opt => opt.value === v)
        return option ? option.label : v
      }).join(', ')
    }

    if (item.options) {
      const option = item.options.find(opt => opt.value === value)
      return option ? option.label : String(value)
    }

    return String(value)
  }, [])

  // AI分析実行
  const runAnalysis = async () => {
    if (!questionnaire) return

    setIsAnalyzing(true)
    try {
      // モック分析結果
      const mockResult: AnalysisResult = {
        postureAnalysis: {
          overallScore: 7,
          issues: ['肩のバランス', '背骨のカーブ'],
          recommendations: ['姿勢改善エクササイズ', '日常的な姿勢意識'],
          severity: 'medium',
          details: {
            headPosition: '正常',
            shoulderBalance: '左右差あり',
            spineCurve: '軽度の弯曲',
            pelvisTilt: '正常',
            footBalance: '正常',
          },
        },
        oralAnalysis: {
          overallScore: 8,
          issues: ['咬合状態', '舌位置'],
          recommendations: ['口腔機能訓練', '定期的な検診'],
          severity: 'low',
          details: {
            biteCondition: '開咬',
            teethAlignment: '叢生',
            tonguePosition: '低位舌',
            oralCleanliness: '良好',
            functionEstimation: '良好',
          },
        },
      }

      setAnalysisResult(mockResult)
      markStepCompleted('analysis')
    } catch (error) {
      console.error('Error running analysis:', error)
      alert('分析の実行に失敗しました')
    } finally {
      setIsAnalyzing(false)
    }
  }

  // レポート生成
  const generateReport = async () => {
    if (!analysisResult) return

    setIsGeneratingReport(true)
    try {
      const mockReport = {
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

      setAnalysisResult(prev => ({
        ...prev,
        report: mockReport,
      }))
      setEditableReport(mockReport)
    } catch (error) {
      console.error('Error generating report:', error)
      alert('レポートの生成に失敗しました')
    } finally {
      setIsGeneratingReport(false)
    }
  }

  // レポート送信
  const sendReport = async () => {
    if (!editableReport) return

    setIsSending(true)
    try {
      // モックデータ用なので、実際のLINE通知はスキップ
      alert('診断レポートが送信されました（モック）')
      markStepCompleted('report')
      router.push('/staff')
    } catch (error) {
      console.error('Error sending report:', error)
      alert('レポートの送信に失敗しました')
    } finally {
      setIsSending(false)
    }
  }

  // ステップラベル
  const stepLabels: Record<DiagnosisStep, string> = {
    start: '開始',
    session: 'セッション情報',
    photos: '写真撮影',
    diagnosis: '診断入力',
    review: '確認',
    analysis: 'AI分析',
    report: 'レポート送信',
  }

  // ステップアイコン
  const stepIcons: Record<DiagnosisStep, React.ReactNode> = {
    start: <QrCode className="w-4 h-4" />,
    session: <FileText className="w-4 h-4" />,
    photos: <Camera className="w-4 h-4" />,
    diagnosis: <FileText className="w-4 h-4" />,
    review: <Eye className="w-4 h-4" />,
    analysis: <Brain className="w-4 h-4" />,
    report: <Send className="w-4 h-4" />,
  }

  // フィールドレンダリング
  const renderField = (item: DiagnosisItem) => {
    const value = diagnosisValues[item.id]

    switch (item.answerType) {
      case 'radio':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              {item.question}
              {item.required && <span className="text-red-500 ml-1">*</span>}
              {item.analysisUse && (
                <Badge variant="outline" className="ml-2 text-xs bg-blue-50 text-blue-700 border-blue-200">
                  分析利用
                </Badge>
              )}
            </label>
            {item.note && (
              <p className="text-xs text-gray-500 mb-2">{item.note}</p>
            )}
            <div className="grid grid-cols-2 gap-1.5">
              {item.options?.map(option => (
                <div
                  key={option.value}
                  role="radio"
                  aria-checked={value === option.value}
                  tabIndex={0}
                  onClick={() => updateDiagnosisValue(item.id, option.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      updateDiagnosisValue(item.id, option.value)
                    }
                  }}
                  className={cn(
                    'flex items-center justify-center p-2.5 border-2 rounded-lg cursor-pointer transition-all touch-manipulation min-h-[44px] font-medium select-none',
                    value === option.value
                      ? 'border-coral-500 bg-coral-50 text-coral-700'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  )}
                >
                  <span className="text-sm">{option.label}</span>
                </div>
              ))}
            </div>
          </div>
        )

      case 'checkbox':
        const checkboxValue = Array.isArray(value) ? value : []
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              {item.question}
              {item.required && <span className="text-red-500 ml-1">*</span>}
              {item.analysisUse && (
                <Badge variant="outline" className="ml-2 text-xs bg-blue-50 text-blue-700 border-blue-200">
                  分析利用
                </Badge>
              )}
            </label>
            {item.note && (
              <p className="text-xs text-gray-500 mb-2">{item.note}</p>
            )}
            <div className="grid grid-cols-2 gap-1.5">
              {item.options?.map(option => {
                const isChecked = checkboxValue.includes(option.value)
                return (
                  <div
                    key={option.value}
                    role="checkbox"
                    aria-checked={isChecked}
                    tabIndex={0}
                    onClick={() => {
                      const newValue = isChecked
                        ? checkboxValue.filter(v => v !== option.value)
                        : [...checkboxValue, option.value]
                      updateDiagnosisValue(item.id, newValue)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        const newValue = isChecked
                          ? checkboxValue.filter(v => v !== option.value)
                          : [...checkboxValue, option.value]
                        updateDiagnosisValue(item.id, newValue)
                      }
                    }}
                    className={cn(
                      'flex items-center justify-center p-2.5 border-2 rounded-lg cursor-pointer transition-all touch-manipulation min-h-[44px] font-medium select-none',
                      isChecked
                        ? 'border-coral-500 bg-coral-50 text-coral-700'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    )}
                  >
                    <span className="text-sm">{option.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )

      case 'text':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              {item.question}
              {item.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {item.note && (
              <p className="text-xs text-gray-500 mb-2">{item.note}</p>
            )}
            <Input
              value={value || ''}
              onChange={(e) => updateDiagnosisValue(item.id, e.target.value)}
              placeholder={item.placeholder}
              className="h-12 text-base"
            />
          </div>
        )

      case 'number':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              {item.question}
              {item.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {item.note && (
              <p className="text-xs text-gray-500 mb-2">{item.note}</p>
            )}
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={value || ''}
                onChange={(e) => updateDiagnosisValue(item.id, e.target.value ? parseFloat(e.target.value) : '')}
                placeholder={item.placeholder}
                min={item.min}
                max={item.max}
                className="h-12 text-base flex-1"
              />
              {item.unit && (
                <span className="text-sm text-gray-600 whitespace-nowrap">{item.unit}</span>
              )}
            </div>
          </div>
        )

      case 'textarea':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              {item.question}
              {item.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {item.note && (
              <p className="text-xs text-gray-500 mb-2">{item.note}</p>
            )}
            <Textarea
              value={value || ''}
              onChange={(e) => updateDiagnosisValue(item.id, e.target.value)}
              placeholder={item.placeholder}
              rows={4}
              className="resize-none text-base"
            />
          </div>
        )

      default:
        return null
    }
  }

  // 完了状態の判定
  const completedViews = useMemo(() => ({
    questionnaire: !!questionnaire,
    photos: photos.length > 0,
    diagnosis: diagnosisProgressPercentage > 0,
    review: false,
    report: !!analysisResult,
  }), [questionnaire, photos, diagnosisProgressPercentage, analysisResult])

  if (!session || !questionnaire) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-coral-500 mx-auto"></div>
          <p className="text-gray-600">データを読み込み中...</p>
        </div>
      </div>
    )
  }
  return (
    <div className="flex flex-col h-screen bg-gray-50 touch-pan-y">
      {/* ヘッダー */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-3 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-gray-900 truncate">
                {session?.child_name} ({session?.child_age}歳)
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {currentMainView === 'diagnosis' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleFillSampleData}
                  className="bg-coral-50 border-coral-300 text-coral-700 hover:bg-coral-100"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  サンプル入力
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/staff')}
                className="text-gray-600"
              >
                戻る
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツエリア */}
      <main 
        ref={mainContainerRef}
        className="flex-1 overflow-y-auto pb-[72px] overscroll-y-contain touch-pan-y"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentMainView}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="max-w-4xl mx-auto px-3 py-4"
          >
            {/* 問診ビュー */}
            {currentMainView === 'questionnaire' && questionnaire && (
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center space-x-2">
                    <FileText className="w-4 h-4" />
                    <span>セッション情報確認</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    親御さんが入力した問診票内容を確認してください
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <h3 className="text-xs font-medium text-gray-900 mb-2">お子様情報</h3>
                    <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
                      <p className="text-sm"><span className="font-medium">お名前:</span> {questionnaire.child_name}</p>
                      <p className="text-sm"><span className="font-medium">年齢:</span> {questionnaire.child_age}歳</p>
                      <p className="text-sm"><span className="font-medium">性別:</span> {questionnaire.child_gender === 'male' ? '男' : questionnaire.child_gender === 'female' ? '女' : 'その他'}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-medium text-gray-900 mb-2">気になること</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {questionnaire.concerns.map((concern, index) => (
                        <Badge key={index} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {concern}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-medium text-gray-900 mb-2">理想の状態</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {questionnaire.ideal_goals.map((goal, index) => (
                        <Badge key={index} variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {goal}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {questionnaire.medical_history.length > 0 && (
                    <div>
                      <h3 className="text-xs font-medium text-gray-900 mb-2">既往歴</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {questionnaire.medical_history.map((history, index) => (
                          <Badge key={index} variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                            {history}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {questionnaire.notes && (
                    <div>
                      <h3 className="text-xs font-medium text-gray-900 mb-2">スタッフへのメッセージ</h3>
                      <p className="text-xs text-gray-700 bg-gray-50 rounded-lg p-3">{questionnaire.notes}</p>
                    </div>
                  )}

                </CardContent>
              </Card>
            )}

            {/* 写真ビュー */}
            {currentMainView === 'photos' && (
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center space-x-2">
                    <Camera className="w-4 h-4" />
                    <span>写真撮影</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    診断に必要な写真を撮影してください
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4">
                    {photoTypes.map((type) => {
                      const existingPhoto = photos.find(p => p.type === type.key)
                      return (
                        <button
                          key={type.key}
                          onClick={() => startCamera(type.key)}
                          className={cn(
                            'w-full border-2 rounded-xl p-3 transition-all text-left touch-manipulation min-h-[80px]',
                            'active:scale-[0.98] active:bg-gray-50',
                            existingPhoto
                              ? 'border-green-300 bg-green-50'
                              : 'border-gray-200 bg-white'
                          )}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="text-lg">{type.icon}</span>
                                <h3 className="text-sm font-semibold text-gray-900">{type.label}</h3>
                                {existingPhoto && (
                                  <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 text-[10px]">
                                    撮影済み
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-600">{type.description}</p>
                              {!existingPhoto && (
                                <p className="text-[10px] text-coral-600 mt-1.5 font-medium">
                                  👆 タップしてカメラを起動
                                </p>
                              )}
                            </div>
                            {existingPhoto ? (
                              <div className="flex flex-col items-end gap-2">
                                <div className="relative">
                                  <img
                                    src={existingPhoto.url}
                                    alt={type.label}
                                    className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      startCamera(type.key)
                                    }}
                                  />
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      deletePhoto(existingPhoto.id)
                                    }}
                                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                                <span className="text-xs text-gray-500">タップで再撮影</span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-coral-100 text-coral-600">
                                <Camera className="w-6 h-6" />
                              </div>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-800">
                      <strong>📱 カメラの使い方：</strong><br />
                      各写真タイプの枠をタップすると、カメラが起動します。<br />
                      初回はブラウザからカメラへのアクセス許可が必要です。
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 診断ビュー（カテゴリタブ付き） */}
            {currentMainView === 'diagnosis' && (
              <div className="flex flex-col h-full">
                {/* 進捗バー - 固定 */}
                <div className="px-3 py-2 bg-gray-50 border-b sticky top-0 z-20">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">診断入力進捗</span>
                    <span className="text-xs font-medium">{diagnosisProgressPercentage}%</span>
                  </div>
                  <Progress value={diagnosisProgressPercentage} className="h-1.5" />
                </div>

                {/* カテゴリタブ - 固定 */}
                <div className="border-b bg-white overflow-x-auto sticky top-[52px] z-10 scrollbar-hide shadow-sm">
                  <div className="flex">
                    {staffCategoryOrder.map((category) => {
                      const items = staffItemsByCategory[category] || []
                      const completedCount = items.filter(item =>
                        diagnosisValues[item.id] !== undefined &&
                        diagnosisValues[item.id] !== null &&
                        diagnosisValues[item.id] !== ''
                      ).length
                      const isComplete = completedCount === items.length && items.length > 0

                      return (
                        <button
                          key={category}
                          type="button"
                          onClick={(e) => handleCategoryClick(e, category)}
                          className={cn(
                            "px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap touch-manipulation",
                            "active:scale-95 active:bg-gray-100",
                            "[&:active]:outline-none [&:active]:ring-0",
                            activeCategory === category
                              ? "border-blue-500 text-blue-600 bg-blue-50"
                              : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300",
                            isComplete && "text-green-600"
                          )}
                          style={{ WebkitTapHighlightColor: 'transparent' }}
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{category}</span>
                            {isComplete && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                            {!isComplete && completedCount > 0 && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                                {completedCount}/{items.length}
                              </Badge>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* 全カテゴリの診断項目 - スクロール可能 */}
                <div
                  className="flex-1 px-3 py-3"
                >
                  <div className="space-y-6">
                    {staffCategoryOrder.map((category) => {
                      const items = staffItemsByCategory[category] || []
                      if (items.length === 0) return null

                      const completedCount = items.filter(item =>
                        diagnosisValues[item.id] !== undefined &&
                        diagnosisValues[item.id] !== null &&
                        diagnosisValues[item.id] !== ''
                      ).length

                      return (
                        <div
                          key={category}
                          id={`category-${category}`}
                          ref={(el) => {
                            categoryRefs.current[category] = el
                          }}
                          className="scroll-mt-20"
                        >
                          <Card className="shadow-sm">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base">{category}</CardTitle>
                              <CardDescription className="text-xs">
                                {items.length}項目 {completedCount > 0 && `(${completedCount}/${items.length} 完了)`}
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              {items.map(item => (
                                <div key={item.id} className="pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                                  {renderField(item)}
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 確認/分析ビュー */}
            {currentMainView === 'review' && (
              <div className="space-y-4">
                {/* AI分析セクション */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center space-x-2">
                      <Brain className="w-4 h-4" />
                      <span>AI分析</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      AI分析を実行してレポートを生成します
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!analysisResult ? (
                      <div className="text-center py-8">
                        <Button
                          onClick={runAnalysis}
                          disabled={isAnalyzing}
                          className="bg-coral-500 hover:bg-coral-600"
                          size="lg"
                        >
                          {isAnalyzing ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              分析中...
                            </>
                          ) : (
                            <>
                              <Brain className="w-5 h-5 mr-2" />
                              AI分析を実行
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* 姿勢分析結果 */}
                        {analysisResult.postureAnalysis && (
                          <div className="bg-blue-50 rounded-lg p-3">
                            <h3 className="text-xs font-semibold text-gray-900 mb-2">姿勢分析結果</h3>
                            <div className="space-y-1.5 text-xs">
                              <p><span className="font-medium">総合スコア:</span> {analysisResult.postureAnalysis.overallScore}/10</p>
                              <p><span className="font-medium">問題点:</span> {analysisResult.postureAnalysis.issues.join(', ')}</p>
                              <p><span className="font-medium">推奨事項:</span> {analysisResult.postureAnalysis.recommendations.join(', ')}</p>
                            </div>
                          </div>
                        )}

                        {/* 口腔分析結果 */}
                        {analysisResult.oralAnalysis && (
                          <div className="bg-green-50 rounded-lg p-3">
                            <h3 className="text-xs font-semibold text-gray-900 mb-2">口腔機能分析結果</h3>
                            <div className="space-y-1.5 text-xs">
                              <p><span className="font-medium">総合スコア:</span> {analysisResult.oralAnalysis.overallScore}/10</p>
                              <p><span className="font-medium">問題点:</span> {analysisResult.oralAnalysis.issues.join(', ')}</p>
                              <p><span className="font-medium">推奨事項:</span> {analysisResult.oralAnalysis.recommendations.join(', ')}</p>
                            </div>
                          </div>
                        )}

                        {!editableReport && (
                          <Button
                            onClick={generateReport}
                            disabled={isGeneratingReport}
                            className="w-full bg-coral-500 hover:bg-coral-600"
                          >
                            {isGeneratingReport ? 'レポート生成中...' : 'レポートを生成'}
                          </Button>
                        )}

                        {/* レポート編集 */}
                        {editableReport && (
                          <div className="space-y-3">
                            <h3 className="text-xs font-semibold text-gray-900">レポート内容</h3>
                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-900 mb-1.5">要約</label>
                                <Textarea
                                  value={editableReport.summary}
                                  onChange={(e) => setEditableReport({ ...editableReport, summary: e.target.value })}
                                  rows={3}
                                  className="resize-none text-base"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-900 mb-1.5">分析</label>
                                <Textarea
                                  value={editableReport.analysis}
                                  onChange={(e) => setEditableReport({ ...editableReport, analysis: e.target.value })}
                                  rows={4}
                                  className="resize-none text-base"
                                />
                              </div>
                            </div>
                            <Button
                              onClick={() => setCurrentMainView('report')}
                              className="w-full bg-coral-500 hover:bg-coral-600"
                            >
                              レポート送信へ進む
                              <ChevronRight className="w-4 h-4 ml-2" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* レポートビュー */}
            {currentMainView === 'report' && (
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center space-x-2">
                    <Send className="w-4 h-4" />
                    <span>レポート送信</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    最終レポートを確認して送信してください
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {editableReport ? (
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-xs font-semibold text-gray-900 mb-1.5">要約</h3>
                        <p className="text-xs text-gray-700 bg-gray-50 rounded-lg p-3 leading-relaxed">{editableReport.summary}</p>
                      </div>
                      <div>
                        <h3 className="text-xs font-semibold text-gray-900 mb-1.5">分析</h3>
                        <p className="text-xs text-gray-700 bg-gray-50 rounded-lg p-3 leading-relaxed">{editableReport.analysis}</p>
                      </div>
                      <div>
                        <h3 className="text-xs font-semibold text-gray-900 mb-1.5">推奨事項</h3>
                        <ul className="list-disc list-inside text-xs text-gray-700 bg-gray-50 rounded-lg p-3 space-y-1 leading-relaxed">
                          {editableReport.recommendations.map((rec: string, index: number) => (
                            <li key={index}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h3 className="text-xs font-semibold text-gray-900 mb-1.5">次のステップ</h3>
                        <ul className="list-disc list-inside text-xs text-gray-700 bg-gray-50 rounded-lg p-3 space-y-1 leading-relaxed">
                          {editableReport.nextSteps.map((step: string, index: number) => (
                            <li key={index}>{step}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h3 className="text-xs font-semibold text-gray-900 mb-1.5">メッセージ</h3>
                        <p className="text-xs text-gray-700 bg-gray-50 rounded-lg p-3 leading-relaxed">{editableReport.encouragingMessage}</p>
                      </div>
                      <Button
                        onClick={sendReport}
                        disabled={isSending}
                        className="w-full bg-coral-500 hover:bg-coral-600"
                        size="lg"
                      >
                        {isSending ? '送信中...' : (
                          <>
                            <Send className="w-5 h-5 mr-2" />
                            LINEでレポートを送信
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-600 mb-4">レポートを生成してください</p>
                      <Button
                        onClick={() => setCurrentMainView('review')}
                        variant="outline"
                      >
                        確認/分析に戻る
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* 下部ナビゲーションメニュー */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50 safe-area-inset-bottom">
        <div className="flex">
          {[
            { view: 'questionnaire' as MainView, label: '問診', icon: <FileText className="w-4 h-4" /> },
            { view: 'photos' as MainView, label: '写真', icon: <Camera className="w-4 h-4" /> },
            { view: 'diagnosis' as MainView, label: '診断', icon: <CheckCircle2 className="w-4 h-4" /> },
            { view: 'review' as MainView, label: '分析', icon: <Brain className="w-4 h-4" /> },
            { view: 'report' as MainView, label: 'レポート', icon: <Send className="w-4 h-4" /> },
          ].map(({ view, label, icon }) => (
            <button
              key={view}
              type="button"
              onClick={(e) => {
                e.preventDefault()
                setCurrentMainView(view)
              }}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-2.5 px-1 transition-colors min-h-[60px] touch-manipulation",
                currentMainView === view
                  ? "text-blue-600 bg-blue-50"
                  : "text-gray-600 active:bg-gray-50"
              )}
            >
              <div className="relative">
                {icon}
                {completedViews[view] && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
                )}
              </div>
              <span className="text-[10px] mt-0.5 leading-tight">{label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* カメラモーダル（フルスクリーン） */}
      {isCameraOpen && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="flex-1 flex items-center justify-center relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-contain"
            />
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-4 border-2 border-white border-dashed rounded-lg opacity-50" />
            </div>
          </div>

          <div className="bg-black/80 p-6 space-y-4">
            <div className="text-center text-white mb-4">
              <p className="text-lg font-semibold">
                {photoTypes.find(t => t.key === currentPhotoType)?.label}
              </p>
              <p className="text-sm text-gray-300">
                {photoTypes.find(t => t.key === currentPhotoType)?.description}
              </p>
            </div>

            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={stopCamera}
                className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <X className="w-4 h-4 mr-2" />
                キャンセル
              </Button>
              <Button
                onClick={capturePhoto}
                disabled={isCapturing}
                className="flex-1 bg-coral-500 hover:bg-coral-600"
              >
                {isCapturing ? '撮影中...' : '📸 撮影'}
              </Button>
            </div>
          </div>

          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}
    </div>
  )
}
