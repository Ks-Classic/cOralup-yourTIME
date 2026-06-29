'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { StaffDiagnosisBottomNav } from '@/components/staff/StaffDiagnosisBottomNav'
import {
  StaffDiagnosisPhotoPreviewModal,
  StaffDiagnosisPhotoViewerModal,
} from '@/components/staff/StaffDiagnosisPhotoModals'
import {
  diagnosisItems as staticDiagnosisItems,
  diagnosisItemsByCategory as staticItemsByCategory,
  categoryOrder as staticCategoryOrder,
} from '@/data/staff-diagnosis-items'
import type { DiagnosisItem } from '@/data/staff-diagnosis-items'
import {
  Camera,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  QrCode,
  FileText,
  Eye,
  Brain,
  Send,
  CheckCircle2,
  Edit2,
  ExternalLink,
  StickyNote,
  Save,
  AlertCircle,
} from 'lucide-react'
import { ReportPreview } from '@/components/staff/ReportPreview'
import { cn } from '@/utils'
import {
  calculateDiagnosisProgressPercentage,
  calculateOverallProgressPercentage,
} from '@/lib/staff-diagnosis-progress'
import { generateStaffDiagnosisSampleData } from '@/utils/staff-sample-data-generator'
import { generateQRCode } from '@/utils'
import { AnimatePresence, motion } from 'framer-motion'
import {
  STAFF_DIAGNOSIS_PHOTO_TYPES,
  STAFF_DIAGNOSIS_STEPS,
  type StaffDiagnosisAnalysisResult as AnalysisResult,
  type StaffDiagnosisMainView as MainView,
  type StaffDiagnosisPhotoData as PhotoData,
  type StaffDiagnosisQuestionnaireData as QuestionnaireData,
  type StaffDiagnosisSessionData as SessionData,
  type StaffDiagnosisStep as DiagnosisStep,
} from '@/types/staff-diagnosis'

export default function IntegratedDiagnosisPage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [sessionId] = useState<string>('demo')

  // メインビューの管理（下部メニューで切り替え）
  const [currentMainView, setCurrentMainView] =
    useState<MainView>('questionnaire')

  // ステップ管理（後方互換性のため残す）
  const [currentStep, setCurrentStep] = useState<DiagnosisStep>('session')
  const [completedSteps, setCompletedSteps] = useState<Set<DiagnosisStep>>(
    new Set()
  )

  // データ管理
  const [session, setSession] = useState<SessionData | null>(null)
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireData | null>(
    null
  )
  const [photos, setPhotos] = useState<PhotoData[]>([])
  const [diagnosisValues, setDiagnosisValues] = useState<Record<string, any>>(
    {}
  )
  const [staffNotes, setStaffNotes] = useState('')
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null
  )
  const [editableReport, setEditableReport] = useState<any>(null)
  const [editableSummary, setEditableSummary] = useState('')
  const [isReportConfirmed, setIsReportConfirmed] = useState(false)
  const [showLineSendConfirm, setShowLineSendConfirm] = useState(false)
  const [lineSendConfirmed, setLineSendConfirmed] = useState(false)
  const [viewingPhotoInMenu, setViewingPhotoInMenu] = useState<{
    url: string
    type: string
    label: string
  } | null>(null)
  const [showLineDeliveryCheck, setShowLineDeliveryCheck] = useState(false)
  const [lineDeliveryConfirmed, setLineDeliveryConfirmed] = useState(false)
  const [isDiagnosisComplete, setIsDiagnosisComplete] = useState(false)
  const [isEditingQuestionnaire, setIsEditingQuestionnaire] = useState(false)
  const [editingQuestionnaire, setEditingQuestionnaire] =
    useState<QuestionnaireData | null>(null)

  // スキーマデータ（動的取得）
  const [diagnosisItems, setDiagnosisItems] = useState<DiagnosisItem[]>([])
  const [categoryList, setCategoryList] = useState<any[]>([])
  const [isSchemaLoading, setIsSchemaLoading] = useState(true)

  // APIから診断スキーマを取得
  useEffect(() => {
    const fetchSchema = async () => {
      // console.log('[DemoPage] スキーマ取得開始...')
      try {
        const res = await fetch('/api/diagnosis-schema?input_type=staff')
        // console.log('[DemoPage] API応答ステータス:', res.status)
        if (!res.ok) throw new Error('スキーマ取得失敗')
        const json = await res.json()
        // console.log('[DemoPage] 取得データ:', json.data?.items?.length, '項目')

        if (json.success && json.data) {
          // APIデータをアプリケーションの形式に変換
          const apiItems = json.data.items.map((item: any) => ({
            id: item.id,
            category:
              json.data.categories.find((c: any) => c.id === item.categoryId)
                ?.name || '未分類',
            question: item.question,
            answerType: item.answerType,
            options: item.options,
            required: item.isRequired,
            inputType: item.inputType,
            note: item.note,
            min: item.minValue,
            max: item.maxValue,
            unit: item.unit,
            placeholder: item.placeholder,
            analysisUse: item.analysisUse,
          }))

          // 舌カテゴリの確認
          const tongueItems = apiItems.filter((i: any) => i.category === '舌')
          // console.log('[DemoPage] 舌カテゴリ:', tongueItems.length, '件', tongueItems.map((i: any) => i.question))

          setDiagnosisItems(apiItems)
          setCategoryList(json.data.categories)
        }
      } catch (e) {
        console.error('[DemoPage] スキーマ取得エラー:', e)
        // エラー時は静的データにフォールバック
        // console.log('[DemoPage] 静的データにフォールバック')
        setDiagnosisItems(staticDiagnosisItems)
      } finally {
        setIsSchemaLoading(false)
      }
    }
    fetchSchema()
  }, [])

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
  const categoryTabRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const categoryTabContainerRef = useRef<HTMLDivElement | null>(null)
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
      status: 'in_progress',
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
    if (hash && STAFF_DIAGNOSIS_STEPS.includes(hash as DiagnosisStep)) {
      setCurrentStep(hash as DiagnosisStep)
    }
  }, [])

  const changeStep = useCallback((step: DiagnosisStep) => {
    setCurrentStep(step)
    window.history.replaceState(null, '', `#step=${step}`)
  }, [])

  // ステップ完了状態の管理
  const markStepCompleted = useCallback((step: DiagnosisStep) => {
    setCompletedSteps((prev) => new Set([...prev, step]))
  }, [])

  const isStepCompleted = useCallback(
    (step: DiagnosisStep) => {
      return completedSteps.has(step)
    },
    [completedSteps]
  )

  // スタッフ用項目のみフィルタリング（動的データ使用）
  const staffItems = useMemo(
    () => diagnosisItems.filter((item) => item.inputType === 'staff'),
    [diagnosisItems]
  )

  // カテゴリ別にグループ化（スタッフ用のみ）
  const staffItemsByCategory = useMemo(() => {
    const grouped: Record<string, DiagnosisItem[]> = {}
    staffItems.forEach((item) => {
      if (!grouped[item.category]) {
        grouped[item.category] = []
      }
      grouped[item.category].push(item)
    })
    return grouped
  }, [staffItems])

  // カテゴリの順序（動的カテゴリ使用）
  const staffCategoryOrder = useMemo(() => {
    // 動的にロードしたカテゴリ順序を使用
    if (categoryList.length > 0) {
      return categoryList
        .sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0))
        .map((c: any) => c.name)
        .filter((cat: string) => staffItemsByCategory[cat]?.length > 0)
    }
    // フォールバック: 静的カテゴリ順序
    return staticCategoryOrder.filter(
      (cat) => staffItemsByCategory[cat]?.length > 0
    )
  }, [staffItemsByCategory, categoryList])

  // アクティブカテゴリの初期化（デフォルトは「舌」）
  useEffect(() => {
    if (
      currentMainView === 'diagnosis' &&
      staffCategoryOrder.length > 0 &&
      !activeCategory
    ) {
      // デフォルトで「舌」カテゴリを選択
      const defaultCategory = staffCategoryOrder.includes('舌')
        ? '舌'
        : staffCategoryOrder[0]
      setActiveCategory(defaultCategory)
    }
  }, [currentMainView, staffCategoryOrder, activeCategory])

  // アクティブカテゴリが変わった時にタブを中央にスクロール
  useEffect(() => {
    if (!activeCategory || currentMainView !== 'diagnosis') return

    const tabElement = categoryTabRefs.current[activeCategory]
    const container = categoryTabContainerRef.current

    if (tabElement && container) {
      const containerRect = container.getBoundingClientRect()
      const tabRect = tabElement.getBoundingClientRect()

      // タブを中央に配置するためのスクロール位置を計算
      const scrollLeft =
        tabElement.offsetLeft - containerRect.width / 2 + tabRect.width / 2

      container.scrollTo({
        left: Math.max(0, scrollLeft),
        behavior: 'smooth',
      })
    }
  }, [activeCategory, currentMainView])

  // Intersection Observerでスクロール位置を監視（スクロール時のカテゴリハイライト）
  useEffect(() => {
    if (currentMainView !== 'diagnosis') return
    if (!mainContainerRef.current || staffCategoryOrder.length === 0) return

    let observer: IntersectionObserver | null = null

    // AnimatePresenceのアニメーション完了を待つ
    const timeoutId = setTimeout(() => {
      observer = new IntersectionObserver(
        (entries) => {
          if (isScrollingRef.current) return

          // 最も上に表示されているカテゴリを検出
          const visibleEntries = entries.filter((entry) => entry.isIntersecting)
          if (visibleEntries.length > 0) {
            // 最も上に近いカテゴリを選択
            const topEntry = visibleEntries.reduce((prev, current) => {
              const prevTop = prev.boundingClientRect.top
              const currentTop = current.boundingClientRect.top
              return currentTop < prevTop ? current : prev
            })

            const categoryId = topEntry.target.id.replace('category-', '')
            setActiveCategory(categoryId)
          }
        },
        {
          root: mainContainerRef.current,
          rootMargin: '-140px 0px -60% 0px', // ヘッダー分のオフセットを調整
          threshold: [0, 0.1, 0.5, 1.0], // 複数の閾値でより正確に検出
        }
      )

      // カテゴリ要素を検索して監視
      staffCategoryOrder.forEach((category) => {
        const element = document.getElementById(`category-${category}`)
        if (element) {
          observer?.observe(element)
        }
      })
    }, 300) // アニメーション完了を待つ（300ms）

    return () => {
      clearTimeout(timeoutId)
      if (observer) {
        observer.disconnect()
      }
    }
  }, [currentMainView, staffCategoryOrder])

  // タブクリック時のスクロール処理
  const handleCategoryClick = useCallback(
    (e: React.MouseEvent, category: string) => {
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
        const offsetTop =
          elementRect.top -
          containerRect.top +
          mainContainer.scrollTop -
          headerOffset

        mainContainer.scrollTo({
          top: Math.max(0, offsetTop),
          behavior: 'smooth',
        })
      }

      // スクロール完了後にフラグを解除（概算時間）
      setTimeout(() => {
        isScrollingRef.current = false
      }, 1000)
    },
    []
  )

  const photoTypes = STAFF_DIAGNOSIS_PHOTO_TYPES

  // 進捗計算
  const diagnosisProgressPercentage = calculateDiagnosisProgressPercentage(
    diagnosisValues,
    staffItems.length
  )

  // 全体進捗計算（各ステップの完了状況）
  const overallProgressPercentage = useMemo(() => {
    return calculateOverallProgressPercentage(completedSteps)
  }, [completedSteps])

  // 写真プレビュー状態
  const [previewPhoto, setPreviewPhoto] = useState<{
    url: string
    type: string
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // カメラ開始（input file経由でネイティブカメラを起動）
  const startCamera = (photoType: string) => {
    setCurrentPhotoType(photoType)
    // hidden inputをクリックしてカメラを起動
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  // ファイル選択時の処理（カメラ撮影後）
  const handleFileCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !currentPhotoType) return

    // ファイルをプレビュー用URLに変換
    const objectUrl = URL.createObjectURL(file)
    setPreviewPhoto({ url: objectUrl, type: currentPhotoType })

    // inputをリセット（同じファイルを再選択可能にする）
    event.target.value = ''
  }

  // プレビューから保存
  const savePreviewPhoto = () => {
    if (!previewPhoto) return

    const newPhoto: PhotoData = {
      id: `${previewPhoto.type}-${Date.now()}`,
      url: previewPhoto.url,
      type: previewPhoto.type as PhotoData['type'],
      uploaded_at: new Date().toISOString(),
    }

    setPhotos((prev) => [
      ...prev.filter((p) => p.type !== previewPhoto.type),
      newPhoto,
    ])

    // 全ての写真が撮影済みならステップ完了
    const newPhotoCount =
      photos.filter((p) => p.type !== previewPhoto.type).length + 1
    if (newPhotoCount >= photoTypes.length) {
      markStepCompleted('photos')
    }

    setPreviewPhoto(null)
    setCurrentPhotoType('')
  }

  // プレビューをキャンセル（取り直し）
  const retakePhoto = () => {
    if (previewPhoto) {
      URL.revokeObjectURL(previewPhoto.url)
    }
    setPreviewPhoto(null)
    // 再度カメラを起動
    setTimeout(() => {
      if (fileInputRef.current) {
        fileInputRef.current.click()
      }
    }, 100)
  }

  // プレビューを閉じる
  const closePreview = () => {
    if (previewPhoto) {
      URL.revokeObjectURL(previewPhoto.url)
    }
    setPreviewPhoto(null)
    setCurrentPhotoType('')
  }

  // カメラ停止（後方互換性のため残す）
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
    setIsCameraOpen(false)
    setCurrentPhotoType('')
  }

  // レガシー：ビデオストリームからの撮影（フォールバック用）
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
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob)
          },
          'image/jpeg',
          0.9
        )
      })

      const objectUrl = URL.createObjectURL(blob)

      const newPhoto: PhotoData = {
        id: `${currentPhotoType}-${Date.now()}`,
        url: objectUrl,
        type: currentPhotoType as PhotoData['type'],
        uploaded_at: new Date().toISOString(),
      }

      setPhotos((prev) => [
        ...prev.filter((p) => p.type !== currentPhotoType),
        newPhoto,
      ])
      stopCamera()

      // 全ての写真が撮影済みならステップ完了
      if (
        photos.filter((p) => p.type !== currentPhotoType).length + 1 >=
        photoTypes.length
      ) {
        markStepCompleted('photos')
      }
    } catch (error) {
      // eslint-disable-next-line no-console
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
    } else if (currentMainView === 'photos') {
      // サンプル写真を設定（プレースホルダー画像）
      const samplePhotos: PhotoData[] = [
        {
          id: 'posture_side-sample',
          url: 'https://placehold.co/400x600/e2e8f0/64748b?text=横向き姿勢',
          type: 'posture_side',
          uploaded_at: new Date().toISOString(),
        },
        {
          id: 'posture_front-sample',
          url: 'https://placehold.co/400x600/e2e8f0/64748b?text=正面姿勢',
          type: 'posture_front',
          uploaded_at: new Date().toISOString(),
        },
        {
          id: 'oral_front-sample',
          url: 'https://placehold.co/400x600/e2e8f0/64748b?text=口腔内',
          type: 'oral_front',
          uploaded_at: new Date().toISOString(),
        },
      ]
      setPhotos(samplePhotos)
    } else if (currentMainView === 'memo') {
      setStaffNotes(
        '診断時の観察事項：\n・姿勢に軽度の改善点が見られる\n・口腔機能は良好\n・継続的な観察を推奨\n\n保護者への伝達事項：\n・日常的な姿勢意識の重要性\n・定期的な検診の推奨'
      )
    }
  }, [currentMainView, staffItems])

  // 写真削除
  const deletePhoto = useCallback((photoId: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId))
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
    setDiagnosisValues((prev) => ({
      ...prev,
      [itemId]: value,
    }))
  }

  // 値から日本語ラベルに変換
  const getDisplayValue = useCallback(
    (item: DiagnosisItem, value: any): string => {
      if (value === undefined || value === null || value === '') return ''

      if (Array.isArray(value)) {
        return value
          .map((v) => {
            const option = item.options?.find((opt) => opt.value === v)
            return option ? option.label : v
          })
          .join(', ')
      }

      if (item.options) {
        const option = item.options.find((opt) => opt.value === value)
        return option ? option.label : String(value)
      }

      return String(value)
    },
    []
  )

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
        reportSummary: `【口腔機能について】
お子さんの歯は噛み合わせが深い過蓋咬合の状態で、舌の位置が低くなる「低位舌」も見られます。口呼吸の傾向があると口まわりの筋肉のバランスが崩れやすく、歯並びにも影響します。口まわりの筋肉の使い方が安定すると、歯並びへの負担も軽減されやすくなります。日常的な口腔トレーニング（あいうべ体操など）を継続することで、改善が期待できます。

【姿勢について】
背中が丸くなりお腹が前に出る「凹円背」の傾向があります。肩のバランスに左右差があり、骨盤のわずかな前傾も確認されました。姿勢の癖は顎の動きや咬合状態にも影響しやすいため、放置すると歯並びの乱れにつながることがあります。日常的な姿勢への意識づけと、軽い体幹トレーニングを取り入れることが効果的です。

【総合評価】
姿勢と歯並びは筋肉・骨格を通じてつながっており、片方だけでなく両方を一緒に見ていくことが大切です。今回の診断結果を参考に、口腔トレーニングと姿勢改善を並行して取り組んでいただくことをお勧めします。ご家庭でできる簡単なケアから始め、定期的なフォローアップを行うことで、お子さんの健やかな成長をサポートします。`,
      }

      setAnalysisResult(mockResult)
      setEditableSummary(mockResult.reportSummary || '')
      setIsReportConfirmed(false)
      markStepCompleted('analysis')
    } catch (error) {
      // eslint-disable-next-line no-console
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
        analysis:
          '今回の診断では、姿勢と口腔機能の総合的な評価を行いました。姿勢については肩のバランスと背骨のカーブに軽度の改善点が見られましたが、全体的には良好な状態です。口腔機能については、歯並びと咬合状態が良好で、口腔内の清潔度も保たれています。',
        recommendations: [
          '日常的に正しい姿勢を意識するよう指導してください',
          '定期的な歯科検診を継続してください',
          '食事の際の姿勢にも注意を払いましょう',
          '口腔内の清潔を保つための習慣を身につけましょう',
        ],
        nextSteps: [
          '3ヶ月後のフォローアップ診断を予定してください',
          '気になる症状が出た場合は早めにご相談ください',
          '家庭での姿勢改善エクササイズを実践してください',
        ],
        encouragingMessage:
          'お子様の健康な成長を一緒にサポートしていきましょう。何か気になることがありましたら、いつでもご相談ください。',
      }

      setAnalysisResult((prev) => ({
        ...prev,
        report: mockReport,
      }))
      setEditableReport(mockReport)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error generating report:', error)
      alert('レポートの生成に失敗しました')
    } finally {
      setIsGeneratingReport(false)
    }
  }

  // レポート送信
  const sendReport = async () => {
    setIsSending(true)
    try {
      const response = await fetch('/api/line/send-demo-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childName: questionnaire?.child_name || session?.child_name || 'デモ',
          reportSummary:
            editableReport?.summary || analysisResult?.reportSummary,
        }),
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw new Error(errorBody.error || 'デモLINE送信に失敗しました')
      }

      // LINE送信後、配信確認ダイアログを表示
      setShowLineDeliveryCheck(true)
      setLineDeliveryConfirmed(false)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error sending report:', error)
      // サーバが返した具体的な理由(LINE未登録 等)をそのまま表示する
      const message =
        error instanceof Error ? error.message : 'レポートの送信に失敗しました'
      alert(message)
    } finally {
      setIsSending(false)
    }
  }

  // LINE配信確認後の完了処理
  const completeDiagnosis = async (
    confirmationStatus: 'confirmed' | 'not_received' | 'unknown'
  ) => {
    try {
      // 状態に応じたメッセージ表示
      if (confirmationStatus === 'not_received') {
        alert('親御さんに「近日中にレポートをお送りします」とお伝えください。')
      } else if (confirmationStatus === 'unknown') {
        alert('確認できなかった場合は、後日再送信できます。')
      }

      markStepCompleted('report')
      setIsDiagnosisComplete(true)
      setShowLineDeliveryCheck(false)
    } catch (error) {
      console.error('Error confirming delivery:', error)
      alert('完了処理に失敗しました: ' + (error as Error).message)
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
    start: <QrCode className="h-4 w-4" />,
    session: <FileText className="h-4 w-4" />,
    photos: <Camera className="h-4 w-4" />,
    diagnosis: <FileText className="h-4 w-4" />,
    review: <Eye className="h-4 w-4" />,
    analysis: <Brain className="h-4 w-4" />,
    report: <Send className="h-4 w-4" />,
  }

  // フィールドレンダリング
  const renderField = (item: DiagnosisItem) => {
    const value = diagnosisValues[item.id]

    switch (item.answerType) {
      case 'radio':
        return (
          <div className="space-y-2">
            <label className="mb-2 block text-sm font-medium text-gray-900">
              {item.question}
              {item.required && <span className="ml-1 text-red-500">*</span>}
              {item.analysisUse && (
                <Badge
                  variant="outline"
                  className="ml-2 border-blue-200 bg-blue-50 text-xs text-blue-700"
                >
                  分析利用
                </Badge>
              )}
            </label>
            {item.note && (
              <p className="mb-2 text-xs text-gray-500">{item.note}</p>
            )}
            <div className="grid grid-cols-2 gap-1.5">
              {item.options?.map((option) => (
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
                    'flex min-h-[44px] cursor-pointer touch-manipulation select-none items-center justify-center rounded-lg border-2 p-2.5 font-medium transition-all',
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
            <label className="mb-2 block text-sm font-medium text-gray-900">
              {item.question}
              {item.required && <span className="ml-1 text-red-500">*</span>}
              {item.analysisUse && (
                <Badge
                  variant="outline"
                  className="ml-2 border-blue-200 bg-blue-50 text-xs text-blue-700"
                >
                  分析利用
                </Badge>
              )}
            </label>
            {item.note && (
              <p className="mb-2 text-xs text-gray-500">{item.note}</p>
            )}
            <div className="grid grid-cols-2 gap-1.5">
              {item.options?.map((option) => {
                const isChecked = checkboxValue.includes(option.value)
                return (
                  <div
                    key={option.value}
                    role="checkbox"
                    aria-checked={isChecked}
                    tabIndex={0}
                    onClick={() => {
                      const newValue = isChecked
                        ? checkboxValue.filter((v) => v !== option.value)
                        : [...checkboxValue, option.value]
                      updateDiagnosisValue(item.id, newValue)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        const newValue = isChecked
                          ? checkboxValue.filter((v) => v !== option.value)
                          : [...checkboxValue, option.value]
                        updateDiagnosisValue(item.id, newValue)
                      }
                    }}
                    className={cn(
                      'flex min-h-[44px] cursor-pointer touch-manipulation select-none items-center justify-center rounded-lg border-2 p-2.5 font-medium transition-all',
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
            <label className="mb-2 block text-sm font-medium text-gray-900">
              {item.question}
              {item.required && <span className="ml-1 text-red-500">*</span>}
            </label>
            {item.note && (
              <p className="mb-2 text-xs text-gray-500">{item.note}</p>
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
            <label className="mb-2 block text-sm font-medium text-gray-900">
              {item.question}
              {item.required && <span className="ml-1 text-red-500">*</span>}
            </label>
            {item.note && (
              <p className="mb-2 text-xs text-gray-500">{item.note}</p>
            )}
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={value || ''}
                onChange={(e) =>
                  updateDiagnosisValue(
                    item.id,
                    e.target.value ? parseFloat(e.target.value) : ''
                  )
                }
                placeholder={item.placeholder}
                min={item.min}
                max={item.max}
                className="h-12 flex-1 text-base"
              />
              {item.unit && (
                <span className="whitespace-nowrap text-sm text-gray-600">
                  {item.unit}
                </span>
              )}
            </div>
          </div>
        )

      case 'textarea':
        return (
          <div className="space-y-2">
            <label className="mb-2 block text-sm font-medium text-gray-900">
              {item.question}
              {item.required && <span className="ml-1 text-red-500">*</span>}
            </label>
            {item.note && (
              <p className="mb-2 text-xs text-gray-500">{item.note}</p>
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
  const completedViews = useMemo(
    () => ({
      questionnaire: !!questionnaire,
      photos: photos.length > 0,
      diagnosis: diagnosisProgressPercentage > 0,
      review: false,
      report: !!analysisResult,
    }),
    [questionnaire, photos, diagnosisProgressPercentage, analysisResult]
  )

  if (!session || !questionnaire) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-coral-500"></div>
          <p className="text-gray-600">データを読み込み中...</p>
        </div>
      </div>
    )
  }
  return (
    <div className="flex h-screen touch-pan-y flex-col bg-gray-50">
      {/* ヘッダー */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
        <div className="px-3 py-2.5">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-bold text-gray-900">
                {session?.child_name} ({session?.child_age}歳)
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {(currentMainView === 'diagnosis' ||
                currentMainView === 'photos') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleFillSampleData}
                  className="border-coral-300 bg-coral-50 text-coral-700 hover:bg-coral-100"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
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
        className="flex-1 touch-pan-y overflow-y-auto overscroll-y-contain"
        style={{
          paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentMainView}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="mx-auto max-w-4xl px-3 py-4"
          >
            {/* 問診ビュー */}
            {currentMainView === 'questionnaire' && questionnaire && (
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center space-x-2 text-base">
                        <FileText className="h-4 w-4" />
                        <span>セッション情報確認</span>
                      </CardTitle>
                      <CardDescription className="text-xs">
                        親御さんが入力した問診票内容を確認できます（お子様情報とメッセージは編集可能）
                      </CardDescription>
                    </div>
                    {!isEditingQuestionnaire ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingQuestionnaire({ ...questionnaire })
                          setIsEditingQuestionnaire(true)
                        }}
                        className="text-xs"
                      >
                        <Edit2 className="mr-1 h-3 w-3" />
                        編集
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setIsEditingQuestionnaire(false)
                            setEditingQuestionnaire(null)
                          }}
                          className="text-xs"
                        >
                          キャンセル
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            if (editingQuestionnaire) {
                              setQuestionnaire(editingQuestionnaire)
                            }
                            setIsEditingQuestionnaire(false)
                            setEditingQuestionnaire(null)
                          }}
                          className="bg-blue-600 text-xs hover:bg-blue-700"
                        >
                          <Save className="mr-1 h-3 w-3" />
                          保存
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isEditingQuestionnaire && editingQuestionnaire ? (
                    // 編集モード
                    <>
                      <div>
                        <h3 className="mb-2 text-xs font-medium text-gray-900">
                          お子様情報
                        </h3>
                        <div className="space-y-3 rounded-lg bg-blue-50 p-3">
                          <div>
                            <label className="mb-1 block text-xs text-gray-600">
                              お名前
                            </label>
                            <Input
                              value={editingQuestionnaire.child_name}
                              onChange={(e) =>
                                setEditingQuestionnaire({
                                  ...editingQuestionnaire,
                                  child_name: e.target.value,
                                })
                              }
                              className="text-sm"
                            />
                          </div>
                          <div className="flex gap-3">
                            <div className="flex-1">
                              <label className="mb-1 block text-xs text-gray-600">
                                年齢
                              </label>
                              <Input
                                type="number"
                                value={editingQuestionnaire.child_age}
                                onChange={(e) =>
                                  setEditingQuestionnaire({
                                    ...editingQuestionnaire,
                                    child_age: parseInt(e.target.value) || 0,
                                  })
                                }
                                className="text-sm"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="mb-1 block text-xs text-gray-600">
                                性別
                              </label>
                              <Select
                                value={editingQuestionnaire.child_gender}
                                onValueChange={(value) =>
                                  setEditingQuestionnaire({
                                    ...editingQuestionnaire,
                                    child_gender: value,
                                  })
                                }
                              >
                                <SelectTrigger className="text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="male">男</SelectItem>
                                  <SelectItem value="female">女</SelectItem>
                                  <SelectItem value="other">その他</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="mb-2 text-xs font-medium text-gray-900">
                          スタッフへのメッセージ
                        </h3>
                        <Textarea
                          value={editingQuestionnaire.notes || ''}
                          onChange={(e) =>
                            setEditingQuestionnaire({
                              ...editingQuestionnaire,
                              notes: e.target.value,
                            })
                          }
                          placeholder="特記事項があれば入力..."
                          className="min-h-[80px] text-sm"
                        />
                      </div>
                    </>
                  ) : (
                    // 表示モード
                    <>
                      <div>
                        <h3 className="mb-2 text-sm font-medium text-gray-900">
                          お子様情報
                        </h3>
                        <div className="space-y-2 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 p-4">
                          <p className="text-lg font-bold text-gray-800">
                            {(() => {
                              const nameParts =
                                questionnaire.child_name.split(' ')
                              const firstName =
                                nameParts.length > 1
                                  ? nameParts[nameParts.length - 1]
                                  : questionnaire.child_name
                              const honorific =
                                questionnaire.child_gender === 'male'
                                  ? 'くん'
                                  : questionnaire.child_gender === 'female'
                                    ? 'ちゃん'
                                    : 'さん'
                              return `${firstName}${honorific}`
                            })()}
                            <span className="ml-2 text-sm font-normal text-gray-500">
                              ({questionnaire.child_name})
                            </span>
                          </p>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              🎂{' '}
                              <span className="font-medium">
                                {questionnaire.child_age}歳
                              </span>
                            </span>
                            <span className="flex items-center gap-1">
                              {questionnaire.child_gender === 'male'
                                ? '👦'
                                : '👧'}
                              <span className="font-medium">
                                {questionnaire.child_gender === 'male'
                                  ? '男の子'
                                  : questionnaire.child_gender === 'female'
                                    ? '女の子'
                                    : 'その他'}
                              </span>
                            </span>
                          </div>
                          {/* デモ: 通知手段バッジ(本番のparent連絡先バッジ相当) */}
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">
                              ✅ LINE通知可
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">
                              📧 メール可
                            </span>
                          </div>
                        </div>
                      </div>

                      {questionnaire.notes && (
                        <div>
                          <h3 className="mb-2 text-xs font-medium text-gray-900">
                            スタッフへのメッセージ
                          </h3>
                          <p className="rounded-lg bg-gray-50 p-3 text-xs text-gray-700">
                            {questionnaire.notes}
                          </p>
                        </div>
                      )}

                      {/* デモ用問診回答表示 */}
                      <div className="space-y-3">
                        <h3 className="text-sm font-medium text-gray-900">
                          📋{' '}
                          {(() => {
                            const nameParts =
                              questionnaire.child_name.split(' ')
                            const firstName =
                              nameParts.length > 1
                                ? nameParts[nameParts.length - 1]
                                : questionnaire.child_name
                            const honorific =
                              questionnaire.child_gender === 'male'
                                ? 'くん'
                                : questionnaire.child_gender === 'female'
                                  ? 'ちゃん'
                                  : 'さん'
                            return `${firstName}${honorific}の問診回答`
                          })()}
                        </h3>

                        {/* カテゴリ別にグループ化して表示 */}
                        {(() => {
                          // カテゴリアイコンマップ
                          const categoryIcons: Record<string, string> = {
                            基本情報: '👤',
                            口腔習慣: '👄',
                            食事: '🍽️',
                            睡眠: '😴',
                            姿勢: '🧍',
                            運動: '🏃',
                            生活習慣: '🏠',
                            歯並び: '🦷',
                            その他: '📝',
                          }

                          // カテゴリ色マップ
                          const categoryColors: Record<
                            string,
                            {
                              bg: string
                              border: string
                              text: string
                              badge: string
                            }
                          > = {
                            基本情報: {
                              bg: 'bg-blue-50',
                              border: 'border-blue-200',
                              text: 'text-blue-700',
                              badge: 'bg-blue-100',
                            },
                            口腔習慣: {
                              bg: 'bg-pink-50',
                              border: 'border-pink-200',
                              text: 'text-pink-700',
                              badge: 'bg-pink-100',
                            },
                            食事: {
                              bg: 'bg-orange-50',
                              border: 'border-orange-200',
                              text: 'text-orange-700',
                              badge: 'bg-orange-100',
                            },
                            睡眠: {
                              bg: 'bg-indigo-50',
                              border: 'border-indigo-200',
                              text: 'text-indigo-700',
                              badge: 'bg-indigo-100',
                            },
                            姿勢: {
                              bg: 'bg-teal-50',
                              border: 'border-teal-200',
                              text: 'text-teal-700',
                              badge: 'bg-teal-100',
                            },
                            運動: {
                              bg: 'bg-green-50',
                              border: 'border-green-200',
                              text: 'text-green-700',
                              badge: 'bg-green-100',
                            },
                            生活習慣: {
                              bg: 'bg-amber-50',
                              border: 'border-amber-200',
                              text: 'text-amber-700',
                              badge: 'bg-amber-100',
                            },
                            歯並び: {
                              bg: 'bg-cyan-50',
                              border: 'border-cyan-200',
                              text: 'text-cyan-700',
                              badge: 'bg-cyan-100',
                            },
                          }
                          const defaultColors = {
                            bg: 'bg-gray-50',
                            border: 'border-gray-200',
                            text: 'text-gray-700',
                            badge: 'bg-gray-100',
                          }

                          // デモ用のサンプル問診回答
                          const demoResponses = [
                            {
                              category: '基本情報',
                              question: 'お子様のお名前',
                              answer: questionnaire.child_name,
                            },
                            {
                              category: '基本情報',
                              question: 'お子様の年齢',
                              answer: `${questionnaire.child_age}歳`,
                            },
                            {
                              category: '口腔習慣',
                              question: '指しゃぶりをしていますか？',
                              answer: 'いいえ',
                            },
                            {
                              category: '口腔習慣',
                              question: '口呼吸をしていますか？',
                              answer: 'ときどきある',
                            },
                            {
                              category: '食事',
                              question: '食事中の姿勢はどうですか？',
                              answer: '気になる',
                            },
                            {
                              category: '食事',
                              question: 'よく噛んで食べていますか？',
                              answer: 'あまり噛まない',
                            },
                            {
                              category: '睡眠',
                              question: 'いびきをかきますか？',
                              answer: 'ときどきある',
                            },
                            {
                              category: '睡眠',
                              question: '寝相が悪いですか？',
                              answer: 'はい',
                            },
                          ]

                          // カテゴリ別にグループ化
                          const grouped = demoResponses.reduce(
                            (acc, item) => {
                              if (!acc[item.category]) acc[item.category] = []
                              acc[item.category].push(item)
                              return acc
                            },
                            {} as Record<string, typeof demoResponses>
                          )

                          return Object.entries(grouped).map(
                            ([category, items]) => {
                              const colors =
                                categoryColors[category] || defaultColors
                              const icon = categoryIcons[category] || '📝'

                              return (
                                <div
                                  key={category}
                                  className={`rounded-xl border ${colors.border} ${colors.bg} overflow-hidden`}
                                >
                                  {/* カテゴリヘッダー */}
                                  <div
                                    className={`px-3 py-2 ${colors.badge} border-b ${colors.border}`}
                                  >
                                    <span
                                      className={`text-sm font-semibold ${colors.text}`}
                                    >
                                      {icon} {category}
                                    </span>
                                  </div>

                                  {/* 質問と回答 */}
                                  <div className="divide-y divide-gray-100">
                                    {items.map((item, index) => (
                                      <div
                                        key={index}
                                        className="bg-white/50 px-3 py-2.5"
                                      >
                                        <div className="flex items-start justify-between gap-3">
                                          <p className="flex-1 text-xs text-gray-600">
                                            {item.question}
                                          </p>
                                          <span
                                            className={`text-xs font-bold ${colors.text} whitespace-nowrap rounded-full px-2 py-0.5 ${colors.badge}`}
                                          >
                                            {item.answer}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )
                            }
                          )
                        })()}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 写真ビュー */}
            {currentMainView === 'photos' && (
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-base">
                    <Camera className="h-4 w-4" />
                    <span>写真撮影</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    診断に必要な写真を撮影してください
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Hidden file input for camera capture */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileCapture}
                    className="hidden"
                  />

                  <div className="grid grid-cols-1 gap-4">
                    {photoTypes.map((type) => {
                      const existingPhoto = photos.find(
                        (p) => p.type === type.key
                      )
                      return (
                        <div
                          key={type.key}
                          className={cn(
                            'min-h-[80px] w-full rounded-xl border-2 p-3 text-left transition-all',
                            existingPhoto
                              ? 'border-green-300 bg-green-50'
                              : 'border-gray-200 bg-white'
                          )}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="mb-1 flex items-center space-x-2">
                                <span className="text-lg">{type.icon}</span>
                                <h3 className="text-sm font-semibold text-gray-900">
                                  {type.label}
                                </h3>
                                {existingPhoto && (
                                  <Badge
                                    variant="outline"
                                    className="border-green-300 bg-green-100 text-[10px] text-green-700"
                                  >
                                    撮影済み
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-600">
                                {type.description}
                              </p>
                              {!existingPhoto && (
                                <button
                                  onClick={() => startCamera(type.key)}
                                  className="mt-2 touch-manipulation rounded-lg bg-coral-500 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-coral-600 active:scale-95"
                                >
                                  📷 撮影する
                                </button>
                              )}
                              {existingPhoto && (
                                <button
                                  onClick={() =>
                                    setViewingPhotoInMenu({
                                      url: existingPhoto.url,
                                      type: type.key,
                                      label: type.label,
                                    })
                                  }
                                  className="mt-2 touch-manipulation rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-blue-600 active:scale-95"
                                >
                                  🔍 タップで確認・再撮影
                                </button>
                              )}
                            </div>
                            {existingPhoto ? (
                              <div
                                className="relative cursor-pointer"
                                onClick={() =>
                                  setViewingPhotoInMenu({
                                    url: existingPhoto.url,
                                    type: type.key,
                                    label: type.label,
                                  })
                                }
                              >
                                <Image
                                  src={existingPhoto.url}
                                  alt={type.label}
                                  className="h-20 w-20 rounded-lg border-2 border-green-300 object-cover"
                                  width={80}
                                  height={80}
                                  unoptimized
                                />
                                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/0 transition-colors hover:bg-black/20">
                                  <span className="text-xs font-medium text-white opacity-0 hover:opacity-100">
                                    タップで確認
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-100 text-gray-400">
                                <Camera className="h-6 w-6" />
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <p className="text-xs text-blue-800">
                      <strong>📱 カメラの使い方：</strong>
                      <br />
                      各写真タイプの枠をタップすると、スマホのカメラが起動します。
                      <br />
                      撮影後、プレビューで確認してから保存できます。
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 診断ビュー（カテゴリタブ付き） */}
            {currentMainView === 'diagnosis' && (
              <div className="flex h-full flex-col">
                {/* 進捗バー - 固定 */}
                <div className="sticky top-0 z-20 border-b bg-gray-50 px-3 py-2">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs text-gray-600">診断入力進捗</span>
                    <span className="text-xs font-medium">
                      {diagnosisProgressPercentage}%
                    </span>
                  </div>
                  <Progress
                    value={diagnosisProgressPercentage}
                    className="h-1.5"
                  />
                </div>

                {/* カテゴリタブ - 固定 */}
                <div
                  ref={categoryTabContainerRef}
                  className="scrollbar-hide sticky top-[52px] z-10 overflow-x-auto border-b bg-white shadow-sm"
                >
                  <div className="flex">
                    {staffCategoryOrder.map((category) => {
                      const items = staffItemsByCategory[category] || []
                      const completedCount = items.filter(
                        (item) =>
                          diagnosisValues[item.id] !== undefined &&
                          diagnosisValues[item.id] !== null &&
                          diagnosisValues[item.id] !== ''
                      ).length
                      const isComplete =
                        completedCount === items.length && items.length > 0

                      return (
                        <button
                          key={category}
                          ref={(el) => {
                            categoryTabRefs.current[category] = el
                          }}
                          type="button"
                          onClick={(e) => handleCategoryClick(e, category)}
                          className={cn(
                            'touch-manipulation whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-medium transition-colors',
                            'active:scale-95 active:bg-gray-100',
                            '[&:active]:outline-none [&:active]:ring-0',
                            activeCategory === category
                              ? 'border-blue-500 bg-blue-50 text-blue-600'
                              : 'border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900',
                            isComplete && 'text-green-600'
                          )}
                          style={{ WebkitTapHighlightColor: 'transparent' }}
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{category}</span>
                            {isComplete && (
                              <Check className="h-3.5 w-3.5 flex-shrink-0" />
                            )}
                            {!isComplete && completedCount > 0 && (
                              <Badge
                                variant="outline"
                                className="h-4 px-1 py-0 text-[10px]"
                              >
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
                <div className="flex-1 px-3 py-3">
                  <div className="space-y-6">
                    {staffCategoryOrder.map((category) => {
                      const items = staffItemsByCategory[category] || []
                      if (items.length === 0) return null

                      const completedCount = items.filter(
                        (item) =>
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
                              <CardTitle className="text-base">
                                {category}
                              </CardTitle>
                              <CardDescription className="text-xs">
                                {items.length}項目{' '}
                                {completedCount > 0 &&
                                  `(${completedCount}/${items.length} 完了)`}
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              {items.map((item) => (
                                <div
                                  key={item.id}
                                  className="border-b border-gray-100 pb-4 last:border-0 last:pb-0"
                                >
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

            {/* メモビュー */}
            {currentMainView === 'memo' && (
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-base">
                    <StickyNote className="h-4 w-4" />
                    <span>スタッフメモ</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    診断時の観察事項や気になったことを自由に記入できます
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={staffNotes}
                    onChange={(e) => setStaffNotes(e.target.value)}
                    placeholder="診断時の観察事項：&#10;・姿勢について気になった点&#10;・口腔機能について&#10;・保護者への伝達事項&#10;・次回フォローアップ事項&#10;&#10;自由に記入してください..."
                    className="min-h-[300px] resize-none text-sm leading-relaxed"
                  />
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-xs text-gray-400">
                      {staffNotes.length > 0
                        ? `${staffNotes.length}文字`
                        : 'メモは自動保存されます'}
                    </p>
                    {staffNotes.length > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setStaffNotes('')}
                        className="text-xs text-red-500 hover:text-red-600"
                      >
                        クリア
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 確認/分析ビュー */}
            {currentMainView === 'review' && (
              <div className="space-y-4 pb-4">
                {/* 入力チェックセクション */}
                {!analysisResult && (
                  <Card className="shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center space-x-2 text-base">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>入力チェック</span>
                      </CardTitle>
                      <CardDescription className="text-xs">
                        写真と診断項目の入力状況を確認してください
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* 写真チェック */}
                      <div>
                        <h4 className="mb-2 text-xs font-semibold text-gray-700">
                          写真（必須3枚）
                        </h4>
                        <div className="space-y-1">
                          {[
                            { key: 'posture_front', label: '正面姿勢' },
                            { key: 'posture_side', label: '横向き姿勢' },
                            { key: 'oral_front', label: '口腔内（正面）' },
                          ].map(({ key, label }) => {
                            const hasPhoto = photos.find((p) => p.type === key)
                            return (
                              <button
                                key={key}
                                onClick={() =>
                                  !hasPhoto && setCurrentMainView('photos')
                                }
                                className={cn(
                                  'flex w-full items-center justify-between rounded-lg p-2 text-xs transition-colors',
                                  hasPhoto
                                    ? 'bg-green-50 text-green-700'
                                    : 'cursor-pointer bg-red-50 text-red-700 hover:bg-red-100'
                                )}
                              >
                                <span className="flex items-center gap-2">
                                  {hasPhoto ? (
                                    <Check className="h-3 w-3" />
                                  ) : (
                                    <X className="h-3 w-3" />
                                  )}
                                  {label}
                                </span>
                                {!hasPhoto && (
                                  <ChevronRight className="h-3 w-3" />
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* 診断項目チェック */}
                      <div>
                        <h4 className="mb-2 text-xs font-semibold text-gray-700">
                          診断項目（スタッフ入力）
                        </h4>
                        <div className="max-h-48 space-y-1 overflow-y-auto">
                          {/* 未入力項目を先に表示 */}
                          {[...staffItems.filter((item) => item.required)]
                            .sort((a, b) => {
                              const aHasValue =
                                diagnosisValues[a.id] !== undefined &&
                                diagnosisValues[a.id] !== null &&
                                diagnosisValues[a.id] !== ''
                              const bHasValue =
                                diagnosisValues[b.id] !== undefined &&
                                diagnosisValues[b.id] !== null &&
                                diagnosisValues[b.id] !== ''
                              if (!aHasValue && bHasValue) return -1
                              if (aHasValue && !bHasValue) return 1
                              return 0
                            })
                            .map((item) => {
                              const hasValue =
                                diagnosisValues[item.id] !== undefined &&
                                diagnosisValues[item.id] !== null &&
                                diagnosisValues[item.id] !== ''
                              return (
                                <button
                                  key={item.id}
                                  onClick={() =>
                                    !hasValue && setCurrentMainView('diagnosis')
                                  }
                                  className={cn(
                                    'flex w-full items-center justify-between rounded-lg p-2 text-xs transition-colors',
                                    hasValue
                                      ? 'bg-green-50 text-green-700'
                                      : 'cursor-pointer bg-red-50 text-red-700 hover:bg-red-100'
                                  )}
                                >
                                  <span className="flex items-center gap-2">
                                    {hasValue ? (
                                      <Check className="h-3 w-3" />
                                    ) : (
                                      <X className="h-3 w-3" />
                                    )}
                                    <span className="text-gray-400">
                                      [{item.category}]
                                    </span>
                                    {item.question}
                                  </span>
                                  {!hasValue && (
                                    <ChevronRight className="h-3 w-3" />
                                  )}
                                </button>
                              )
                            })}
                        </div>
                      </div>

                      {/* 分析ボタン */}
                      {(() => {
                        const requiredPhotos = [
                          'posture_front',
                          'posture_side',
                          'oral_front',
                        ]
                        const missingPhotos = requiredPhotos.filter(
                          (key) => !photos.find((p) => p.type === key)
                        )
                        const missingDiagnosis = staffItems.filter(
                          (item) =>
                            item.required &&
                            (diagnosisValues[item.id] === undefined ||
                              diagnosisValues[item.id] === null ||
                              diagnosisValues[item.id] === '')
                        )
                        const canAnalyze =
                          missingPhotos.length === 0 &&
                          missingDiagnosis.length === 0

                        return (
                          <div className="pt-2">
                            {!canAnalyze && (
                              <p className="mb-2 text-center text-xs text-red-600">
                                未入力項目: 写真{missingPhotos.length}枚、診断
                                {missingDiagnosis.length}項目
                              </p>
                            )}
                            <Button
                              onClick={runAnalysis}
                              disabled={isAnalyzing || !canAnalyze}
                              className={cn(
                                'w-full',
                                canAnalyze
                                  ? 'bg-coral-500 hover:bg-coral-600'
                                  : 'bg-gray-300'
                              )}
                              size="lg"
                            >
                              {isAnalyzing ? (
                                <>
                                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
                                  分析中...
                                </>
                              ) : (
                                <>
                                  <Brain className="mr-2 h-5 w-5" />
                                  分析
                                </>
                              )}
                            </Button>
                          </div>
                        )
                      })()}
                    </CardContent>
                  </Card>
                )}

                {/* AI分析結果セクション */}
                {analysisResult && (
                  <Card className="shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center justify-between text-base">
                        <div className="flex items-center space-x-2">
                          <Brain className="h-4 w-4" />
                          <span>分析結果</span>
                        </div>
                        {isReportConfirmed && (
                          <Badge className="border-green-200 bg-green-100 text-green-700">
                            確定済み
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* レポートプレビュー（コメント直接編集可能） */}
                      <ReportPreview
                        childName={
                          questionnaire?.child_name ||
                          session?.child_name ||
                          'お子様'
                        }
                        childAge={
                          questionnaire?.child_age || session?.child_age
                        }
                        eventName="cOral up 診断"
                        diagnosisDate={new Date().toISOString()}
                        photos={{
                          postureSide: photos.find(
                            (p) => p.type === 'posture_side'
                          )?.url,
                          postureFront: photos.find(
                            (p) => p.type === 'posture_front'
                          )?.url,
                          oralFront: photos.find((p) => p.type === 'oral_front')
                            ?.url,
                        }}
                        aiSummary={editableSummary}
                        isEditable={!isReportConfirmed}
                        onSummaryChange={(value) => {
                          setEditableSummary(value)
                          setIsReportConfirmed(false)
                        }}
                        reportUrl={
                          isReportConfirmed
                            ? `https://coralup-yourtime.vercel.app/report/demo-${sessionId}`
                            : undefined
                        }
                      />

                      {/* 確定・送信ボタン */}
                      {!isReportConfirmed ? (
                        <Button
                          onClick={() => setIsReportConfirmed(true)}
                          className="w-full bg-blue-500 hover:bg-blue-600"
                          size="lg"
                        >
                          <Check className="mr-2 h-5 w-5" />
                          レポートを確定
                        </Button>
                      ) : (
                        <div className="space-y-2">
                          <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center">
                            <Check className="mx-auto mb-1 h-5 w-5 text-green-600" />
                            <p className="text-xs text-green-700">
                              レポート確定済み - コメントは編集できません
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => setIsReportConfirmed(false)}
                              variant="outline"
                              className="flex-1"
                            >
                              <Edit2 className="mr-2 h-4 w-4" />
                              編集に戻る
                            </Button>
                            <Button
                              onClick={() => {
                                setLineSendConfirmed(false)
                                setShowLineSendConfirm(true)
                              }}
                              disabled={isSending}
                              className="flex-1 bg-green-500 hover:bg-green-600"
                            >
                              <Send className="mr-2 h-4 w-4" />
                              LINE送信
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* レポートビュー */}
          </motion.div>
        </AnimatePresence>
      </main>

      <StaffDiagnosisBottomNav
        currentView={currentMainView}
        completedViews={completedViews}
        onChangeView={setCurrentMainView}
      />

      {previewPhoto && (
        <StaffDiagnosisPhotoPreviewModal
          imageUrl={previewPhoto.url}
          label={
            photoTypes.find((t) => t.key === previewPhoto.type)?.label || '写真'
          }
          onCancel={closePreview}
          onRetake={retakePhoto}
          onSave={savePreviewPhoto}
        />
      )}

      {/* レガシーカメラモーダル（フォールバック用） */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
          <div className="relative flex flex-1 items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="h-full w-full object-contain"
            />
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-4 rounded-lg border-2 border-dashed border-white opacity-50" />
            </div>
          </div>

          <div className="space-y-4 bg-black/80 p-6">
            <div className="mb-4 text-center text-white">
              <p className="text-lg font-semibold">
                {photoTypes.find((t) => t.key === currentPhotoType)?.label}
              </p>
              <p className="text-sm text-gray-300">
                {
                  photoTypes.find((t) => t.key === currentPhotoType)
                    ?.description
                }
              </p>
            </div>

            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={stopCamera}
                className="flex-1 border-white/20 bg-white/10 text-white hover:bg-white/20"
              >
                <X className="mr-2 h-4 w-4" />
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

      {/* LINE送信確認モーダル */}
      {showLineSendConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl">
            {/* ヘッダー */}
            <div className="bg-green-500 p-4 text-center text-white">
              <Send className="mx-auto mb-2 h-8 w-8" />
              <h2 className="text-lg font-bold">デモLINE送信確認</h2>
            </div>

            {/* 確認内容 */}
            <div className="space-y-4 p-4">
              {/* LINE連携情報 */}
              <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                <p className="mb-1 text-xs font-semibold text-green-600">
                  送信先
                </p>
                <p className="text-sm font-bold text-gray-800">
                  ログイン中スタッフ本人
                </p>
                <p className="mt-1 text-xs text-green-700">
                  患者/保護者には送信されません
                </p>
              </div>

              {/* 親御さん情報 */}
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                <p className="mb-1 text-xs font-semibold text-blue-600">
                  親御さん
                </p>
                <p className="text-sm font-bold text-gray-800">
                  {session?.parent_name || '保護者 太郎'}
                </p>
              </div>

              {/* お子さん情報 */}
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                <p className="mb-1 text-xs font-semibold text-orange-600">
                  お子さん
                </p>
                <p className="text-sm font-bold text-gray-800">
                  {questionnaire?.child_name || session?.child_name || '未入力'}
                  <span className="ml-2 font-normal text-gray-500">
                    ({questionnaire?.child_age || session?.child_age || 0}歳)
                  </span>
                </p>
              </div>

              {/* 確認チェックボックス */}
              <label className="flex cursor-pointer items-start gap-3 rounded-lg bg-gray-50 p-3">
                <input
                  type="checkbox"
                  checked={lineSendConfirmed}
                  onChange={(e) => setLineSendConfirmed(e.target.checked)}
                  className="mt-0.5 h-5 w-5 rounded border-gray-300 text-green-500 focus:ring-green-500"
                />
                <span className="text-sm text-gray-700">
                  上記の情報を確認しました。
                  <br />
                  <span className="text-xs text-gray-500">
                    スタッフ本人へのデモ送信であることを確認してください
                  </span>
                </span>
              </label>
            </div>

            {/* ボタン */}
            <div className="flex gap-3 border-t bg-gray-50 p-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowLineSendConfirm(false)
                  setLineSendConfirmed(false)
                }}
                className="flex-1"
              >
                キャンセル
              </Button>
              <Button
                onClick={() => {
                  setShowLineSendConfirm(false)
                  sendReport()
                }}
                disabled={!lineSendConfirmed || isSending}
                className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-300"
              >
                {isSending ? '送信中...' : 'デモLINE送信'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {viewingPhotoInMenu && (
        <StaffDiagnosisPhotoViewerModal
          imageUrl={viewingPhotoInMenu.url}
          label={viewingPhotoInMenu.label}
          onClose={() => setViewingPhotoInMenu(null)}
          onRetake={() => {
            const photoType = viewingPhotoInMenu.type
            setViewingPhotoInMenu(null)
            startCamera(photoType)
          }}
        />
      )}

      {/* LINE配信確認モーダル */}
      {showLineDeliveryCheck && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl">
            {/* ヘッダー */}
            <div className="bg-green-500 p-4 text-center text-white">
              <Send className="mx-auto mb-2 h-8 w-8" />
              <h2 className="text-lg font-bold">LINE送信完了</h2>
            </div>

            {/* 確認内容 */}
            <div className="space-y-4 p-4">
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-center">
                <p className="mb-2 text-base font-bold text-yellow-800">
                  📱 LINEが届いたことを確認してください
                </p>
                <p className="text-sm text-yellow-700">
                  親御さんのスマホでLINEメッセージが届いているか確認してください
                </p>
              </div>

              {/* 届いた/届いてない/確認できなかったボタン */}
              <div className="flex flex-col gap-3">
                <div className="flex gap-3">
                  <Button
                    onClick={() => completeDiagnosis('confirmed')}
                    className="h-14 flex-1 bg-green-500 text-white hover:bg-green-600"
                  >
                    <Check className="mr-2 h-5 w-5" />
                    届いた
                  </Button>
                  <Button
                    onClick={() => completeDiagnosis('not_received')}
                    variant="outline"
                    className="h-14 flex-1 border-2 border-red-300 text-red-600 hover:bg-red-50"
                  >
                    <X className="mr-2 h-5 w-5" />
                    届いていない
                  </Button>
                </div>
                <Button
                  onClick={() => completeDiagnosis('unknown')}
                  variant="outline"
                  className="h-14 w-full border-2 border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                >
                  <AlertCircle className="mr-2 h-5 w-5" />
                  確認できなかった
                </Button>
              </div>

              <p className="text-center text-xs text-gray-500">
                ※届いていない場合は、近日中にお送りする旨をお伝えください
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 診断完了モーダル */}
      {isDiagnosisComplete && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl">
            {/* ヘッダー */}
            <div className="bg-blue-500 p-6 text-center text-white">
              <CheckCircle2 className="mx-auto mb-3 h-16 w-16" />
              <h2 className="text-xl font-bold">診断完了</h2>
            </div>

            {/* 内容 */}
            <div className="space-y-4 p-6">
              <p className="text-center text-gray-700">
                {questionnaire?.child_name || session?.child_name}
                さんの診断が完了しました。
              </p>

              <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
                <p className="mb-2 font-medium">次のお子様の診断へ進む場合：</p>
                <p>「次の診断へ」ボタンを押してQRスキャン画面に戻ります</p>
              </div>

              <Button
                onClick={() => {
                  setIsDiagnosisComplete(false)
                  setIsReportConfirmed(false)
                  setAnalysisResult(null)
                  setEditableSummary('')
                  setCurrentMainView('questionnaire')
                  // 必要に応じて他の状態もリセット
                }}
                className="h-14 w-full bg-blue-500 text-base font-bold text-white hover:bg-blue-600"
              >
                次の診断へ
              </Button>

              <Button
                variant="outline"
                onClick={() => router.push('/staff')}
                className="w-full"
              >
                スタッフトップに戻る
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
