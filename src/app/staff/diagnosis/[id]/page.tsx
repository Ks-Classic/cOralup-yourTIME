'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://coralup-yourtime.vercel.app'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { diagnosisItems as staticDiagnosisItems, diagnosisItemsByCategory as staticItemsByCategory, categoryOrder as staticCategoryOrder } from '@/data/staff-diagnosis-items'
import type { DiagnosisItem } from '@/data/staff-diagnosis-items'
import { Camera, X, Check, ChevronLeft, ChevronRight, Sparkles, QrCode, FileText, Eye, Brain, Send, CheckCircle2, Edit2, ExternalLink, StickyNote, Save, AlertCircle, RotateCcw } from 'lucide-react'
import { ReportPreview } from '@/components/staff/ReportPreview'
import { cn } from '@/utils'
import { generateStaffDiagnosisSampleData } from '@/utils/staff-sample-data-generator'
import { generateQRCode } from '@/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { useDiagnosisStorage, cleanupOldDiagnosisData } from '@/hooks/useDiagnosisStorage'

// メインビューの定義（下部メニューで切り替え）
type MainView = 'questionnaire' | 'photos' | 'diagnosis' | 'review' | 'report' | 'memo'

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
  // レポート用サマリー（分析シート形式）
  reportSummary?: string
  report?: {
    summary: string
    analysis: string
    recommendations: string[]
    nextSteps: string[]
    encouragingMessage: string
  }
  // レポートURL情報（visit_idベース）
  reportUrl?: string
  hasReport?: boolean
}

// 問診回答データの型定義
interface QuestionnaireResponseData {
  id: string
  item_id: string
  value: string | string[] | boolean
  questionnaire_items?: {
    question: string
    options?: Array<{ label: string; value: string }> | string[]
    questionnaire_categories?: {
      name: string
    }
  }
}

// APIから取得するセッションデータの型定義
interface VisitApiData {
  id: string
  session_id: string
  status: string
  child_age_months: number
  visit_date: string
  children: {
    id: string
    first_name: string
    last_name: string
    birthday: string
    gender: string
  }
  parent?: {
    id: string
    display_name?: string
    first_name?: string
    last_name?: string
    phone_number?: string
    line_user_id?: string
  }
  questionnaire_responses?: QuestionnaireResponseData[]
  photos?: Array<{
    id: string
    type: string
    url: string
    uploaded_at?: string
  }>
}

export default function DiagnosisPageWithId() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const visitId = params.id as string

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [sessionId, setSessionId] = useState<string>('')
  const [visitData, setVisitData] = useState<VisitApiData | null>(null)
  const [isLoadingVisit, setIsLoadingVisit] = useState(true)
  const [visitError, setVisitError] = useState<string | null>(null)

  // メインビューの管理（下部メニューで切り替え）
  // URLパラメータで初期ビューを指定可能（QRコード読み取り後は問診ページに遷移）
  const initialView = (searchParams?.get('view') as MainView) || 'questionnaire'
  const [currentMainView, setCurrentMainView] = useState<MainView>(initialView)

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
  const [editableSummary, setEditableSummary] = useState('')
  const [isReportConfirmed, setIsReportConfirmed] = useState(false)
  const [showLineSendConfirm, setShowLineSendConfirm] = useState(false)
  const [lineSendConfirmed, setLineSendConfirmed] = useState(false)
  const [viewingPhotoInMenu, setViewingPhotoInMenu] = useState<{ url: string, type: string, label: string } | null>(null)
  const [showLineDeliveryCheck, setShowLineDeliveryCheck] = useState(false)
  const [lineDeliveryConfirmed, setLineDeliveryConfirmed] = useState(false)
  const [isDiagnosisComplete, setIsDiagnosisComplete] = useState(false)
  const [isEditingQuestionnaire, setIsEditingQuestionnaire] = useState(false)
  const [editingQuestionnaire, setEditingQuestionnaire] = useState<QuestionnaireData | null>(null)

  // 診断データの自動保存・復元フック
  const {
    isLoaded: isStorageLoaded,
    lastSaved,
    loadFromStorage,
    saveToStorage,
    saveImmediately,
    clearStorage,
  } = useDiagnosisStorage(visitId)
  const [showRestoredBanner, setShowRestoredBanner] = useState(false)
  const [restoredAt, setRestoredAt] = useState<Date | null>(null)
  const isInitialLoad = useRef(true)

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
            category: json.data.categories.find((c: any) => c.id === item.categoryId)?.name || '未分類',
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
            analysisUse: item.analysisUse
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

  // 古い診断データをクリーンアップ（初回マウント時に1回だけ実行）
  useEffect(() => {
    cleanupOldDiagnosisData()
  }, [])

  // localStorageから保存済みデータを復元
  useEffect(() => {
    if (!isStorageLoaded || !visitId) return

    const storedData = loadFromStorage()
    if (storedData && isInitialLoad.current) {
      isInitialLoad.current = false

      // 保存済みデータがあれば復元
      if (storedData.diagnosisValues && Object.keys(storedData.diagnosisValues).length > 0) {
        setDiagnosisValues(storedData.diagnosisValues)
      }
      if (storedData.staffNotes) {
        setStaffNotes(storedData.staffNotes)
      }
      if (storedData.photos && storedData.photos.length > 0) {
        // 写真はURLが有効かチェックが必要（ローカルのobjectURLは失効するため）
        // サーバーURLの写真のみ復元
        const validPhotos = storedData.photos.filter(photo =>
          photo.url && !photo.url.startsWith('blob:')
        )
        if (validPhotos.length > 0) {
          setPhotos(validPhotos as PhotoData[])
        }
      }

      // 復元バナーを表示
      if (storedData.lastSaved) {
        setRestoredAt(new Date(storedData.lastSaved))
        setShowRestoredBanner(true)
        // 5秒後にバナーを非表示
        setTimeout(() => setShowRestoredBanner(false), 5000)
      }
    } else if (isInitialLoad.current) {
      isInitialLoad.current = false
    }
  }, [isStorageLoaded, visitId, loadFromStorage])

  // データ変更時に自動保存
  useEffect(() => {
    if (!visitId || isInitialLoad.current) return

    // 診断がまだ進行中（完了していない）の場合のみ保存
    if (!isDiagnosisComplete) {
      saveToStorage({
        diagnosisValues,
        staffNotes,
        photos: photos.map(p => ({
          id: p.id,
          url: p.url,
          type: p.type,
          uploaded_at: p.uploaded_at,
          customTitle: (p as any).customTitle,
        })),
      })
    }
  }, [visitId, diagnosisValues, staffNotes, photos, isDiagnosisComplete, saveToStorage])

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

  // APIからセッションデータを取得
  useEffect(() => {
    if (!visitId) return

    const fetchVisitData = async () => {
      setIsLoadingVisit(true)
      setVisitError(null)

      try {
        // 1. セッションデータ取得
        const res = await fetch(`/api/staff/session?visitId=${encodeURIComponent(visitId)}`)
        const data = await res.json()

        if (!res.ok || !data.success) {
          setVisitError(data.message || 'セッションの取得に失敗しました')
          return
        }

        const visit = data.visit as VisitApiData
        setVisitData(visit)
        setSessionId(visit.session_id || visitId)

        // 2. スタッフ紐付け（まだ紐付けされていない場合）
        try {
          const assignRes = await fetch('/api/staff/session/assign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ visitId }),
          })
          const assignData = await assignRes.json()
          if (assignData.success) {
            // console.log('[Diagnosis] Staff assigned:', assignData)
          }
        } catch (assignError) {
          console.error('[Diagnosis] Staff assignment error:', assignError)
          // 紐付け失敗しても診断は続行可能
        }

        // SessionDataを設定
        const childName = `${visit.children.last_name} ${visit.children.first_name}`
        const parentName = visit.parent
          ? (visit.parent.last_name && visit.parent.first_name
            ? `${visit.parent.last_name} ${visit.parent.first_name}`
            : visit.parent.display_name || '')
          : ''
        const ageYears = Math.floor(visit.child_age_months / 12)

        setSession({
          id: visit.id,
          session_id: visit.session_id,
          status: visit.status,
          parent_name: parentName,
          parent_phone: visit.parent?.phone_number,
          child_name: childName,
          child_age: ageYears,
          child_gender: visit.children.gender,
          created_at: visit.visit_date,
        })

        // QuestionnaireDataを設定（問診回答から構築）
        const concerns: string[] = []
        const idealGoals: string[] = []
        const medicalHistory: string[] = []
        let notes = ''

        visit.questionnaire_responses?.forEach((response) => {
          const category = response.questionnaire_items?.questionnaire_categories?.name || ''
          const value = Array.isArray(response.value)
            ? response.value.join(', ')
            : typeof response.value === 'boolean'
              ? (response.value ? 'はい' : 'いいえ')
              : String(response.value)

          if (category.includes('気になること') || category.includes('心配')) {
            concerns.push(value)
          } else if (category.includes('目標') || category.includes('希望')) {
            idealGoals.push(value)
          } else if (category.includes('既往') || category.includes('病歴')) {
            medicalHistory.push(value)
          }
        })

        setQuestionnaire({
          child_name: childName,
          child_age: ageYears,
          child_gender: visit.children.gender,
          medical_history: medicalHistory.length > 0 ? medicalHistory : ['特になし'],
          concerns: concerns.length > 0 ? concerns : ['特になし'],
          ideal_goals: idealGoals.length > 0 ? idealGoals : ['特になし'],
          notes,
        })

        // DBから写真を復元（既存の写真がない場合のみ）
        if (visit.photos && visit.photos.length > 0 && photos.length === 0) {
          const restoredPhotos: PhotoData[] = visit.photos
            .filter((p: any) => p.url) // URLがある写真のみ
            .map((p: any) => ({
              id: p.id,
              url: p.url,
              type: p.type as PhotoData['type'],
              uploaded_at: p.uploaded_at || new Date().toISOString(),
            }))
          if (restoredPhotos.length > 0) {
            setPhotos(restoredPhotos)
          }
        }

        // console.log('[Diagnosis] Visit data loaded:', visit)
      } catch (err) {
        console.error('[Diagnosis] Fetch error:', err)
        setVisitError('データの取得に失敗しました')
      } finally {
        setIsLoadingVisit(false)
      }
    }

    fetchVisitData()
  }, [visitId])

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

  // スタッフ用項目のみフィルタリング（動的データ使用）
  const staffItems = useMemo(() =>
    diagnosisItems.filter(item => item.inputType === 'staff'),
    [diagnosisItems]
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
    return staticCategoryOrder.filter(cat => staffItemsByCategory[cat]?.length > 0)
  }, [staffItemsByCategory, categoryList])

  // アクティブカテゴリの初期化（デフォルトは「舌」）
  useEffect(() => {
    if (currentMainView === 'diagnosis' && staffCategoryOrder.length > 0 && !activeCategory) {
      // デフォルトで「舌」カテゴリを選択
      const defaultCategory = staffCategoryOrder.includes('舌') ? '舌' : staffCategoryOrder[0]
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
      const scrollLeft = tabElement.offsetLeft - (containerRect.width / 2) + (tabRect.width / 2)

      container.scrollTo({
        left: Math.max(0, scrollLeft),
        behavior: 'smooth'
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
      if (!mainContainerRef.current) return

      observer = new IntersectionObserver(
        (entries) => {
          if (isScrollingRef.current) return

          // 最も上に表示されているカテゴリを検出
          const visibleEntries = entries.filter(entry => entry.isIntersecting)
          if (visibleEntries.length > 0) {
            // 最も上に近いカテゴリを選択（mainコンテナ内での相対位置を考慮）
            const containerTop = mainContainerRef.current?.getBoundingClientRect().top || 0
            const topEntry = visibleEntries.reduce((prev, current) => {
              const prevTop = prev.boundingClientRect.top - containerTop
              const currentTop = current.boundingClientRect.top - containerTop
              return currentTop < prevTop ? current : prev
            })

            const categoryId = topEntry.target.id.replace('category-', '')
            if (categoryId) {
              setActiveCategory(categoryId)
            }
          }
        },
        {
          root: mainContainerRef.current,
          rootMargin: '-100px 0px -70% 0px', // ヘッダー（約52px）+ カテゴリタブ（約48px）= 約100px、下部は70%で調整
          threshold: [0, 0.1, 0.5, 1.0] // 複数の閾値で検出
        }
      )

      // カテゴリ要素を検索して監視
      let observedCount = 0
      staffCategoryOrder.forEach((category) => {
        const element = document.getElementById(`category-${category}`)
        if (element && observer) {
          observer.observe(element)
          observedCount++
        }
      })

      // デバッグ: 監視開始を確認
      if (observedCount === 0) {
        console.warn('[Diagnosis] No category elements found for Intersection Observer')
      } else {
        // console.log(`[Diagnosis] Intersection Observer started, observing ${observedCount} categories`)
      }
    }, 300) // アニメーション完了を待つ（300ms）

    return () => {
      clearTimeout(timeoutId)
      if (observer) {
        observer.disconnect()
      }
    }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedSteps, isStepCompleted])

  // 写真プレビュー状態
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string, type: string } | null>(null)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
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

  // アップロード中の写真を追跡（楽観的UI更新用）
  const [uploadingPhotos, setUploadingPhotos] = useState<Set<string>>(new Set())

  // プレビューから保存（楽観的UI更新 + バックグラウンドアップロード）
  const savePreviewPhoto = async () => {
    // console.log('[DEBUG] savePreviewPhoto called', { previewPhoto, isUploadingPhoto, visitId })
    if (!previewPhoto || isUploadingPhoto) return

    const photoType = previewPhoto.type
    const localUrl = previewPhoto.url
    const tempId = `${photoType}-${Date.now()}`

    // 1. 即座にUIを更新（楽観的更新）
    const optimisticPhoto: PhotoData = {
      id: tempId,
      url: localUrl,
      type: photoType as PhotoData['type'],
      uploaded_at: new Date().toISOString(),
    }
    setPhotos(prev => [...prev.filter(p => p.type !== photoType), optimisticPhoto])
    setUploadingPhotos(prev => new Set([...prev, photoType]))

    // プレビューを即座に閉じる
    setPreviewPhoto(null)
    setCurrentPhotoType('')

    // 全ての写真が撮影済みならステップ完了
    const newPhotoCount = photos.filter(p => p.type !== photoType).length + 1
    if (newPhotoCount >= photoTypes.length) {
      markStepCompleted('photos')
    }

    // 2. バックグラウンドでアップロード
    try {
      const response = await fetch(localUrl)
      const blob = await response.blob()

      const formData = new FormData()
      formData.append('file', blob, `${photoType}_${Date.now()}.jpg`)
      formData.append('visitId', visitId)
      formData.append('photoType', photoType)
      if (visitData?.session_id) {
        formData.append('sessionId', visitData.session_id)
      }

      const uploadRes = await fetch('/api/photos/upload', {
        method: 'POST',
        body: formData,
      })

      const uploadData = await uploadRes.json()
      // console.log('[DEBUG] Upload response:', { ok: uploadRes.ok, status: uploadRes.status, uploadData })

      if (!uploadRes.ok || !uploadData.success) {
        console.error('[Photo Upload] Failed:', uploadData)
        // アップロード失敗時もローカルプレビューは維持（後でリトライ可能）
        return
      }

      // console.log('[Photo Upload] Success:', uploadData)

      // アップロード成功後、URLをサーバーURLに更新
      setPhotos(prev => prev.map(p =>
        p.id === tempId
          ? { ...p, id: uploadData.photoId || tempId, url: uploadData.url || localUrl }
          : p
      ))
    } catch (error) {
      console.error('[Photo Upload] Error:', error)
      // エラー時もローカルプレビューは維持
    } finally {
      setUploadingPhotos(prev => {
        const next = new Set(prev)
        next.delete(photoType)
        return next
      })
    }
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
      stream.getTracks().forEach(track => track.stop())
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
      setStaffNotes('診断時の観察事項：\n・姿勢に軽度の改善点が見られる\n・口腔機能は良好\n・継続的な観察を推奨\n\n保護者への伝達事項：\n・日常的な姿勢意識の重要性\n・定期的な検診の推奨')
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
    if (!visitId) {
      alert('診断データが見つかりません')
      return
    }

    setIsAnalyzing(true)
    try {
      // 診断値をtestData形式に変換（diagnosisMeta: { itemId: { question, value } }）
      const diagnosisMeta: Record<string, { question: string; value: string }> = {}
      staffItems.forEach(item => {
        const rawValue = diagnosisValues[item.id]
        if (rawValue !== undefined && rawValue !== null && rawValue !== '') {
          // 値を日本語ラベルに変換
          const displayValue = getDisplayValue(item, rawValue)
          diagnosisMeta[item.id] = {
            question: item.question,
            value: displayValue
          }
        }
      })

      // 問診データをtestData形式に変換
      const questionnaireMeta: Record<string, { question: string; value: string }> = {}
      if (visitData?.questionnaire_responses) {
        visitData.questionnaire_responses.forEach((response: any) => {
          const question = response.questionnaire_items?.question || response.item_id
          let value = response.value
          // 配列の場合はカンマ区切りに
          if (Array.isArray(value)) {
            value = value.join(', ')
          }
          questionnaireMeta[response.item_id] = {
            question,
            value: String(value)
          }
        })
      }

      // 子供の年齢を計算
      const childAgeMonths = visitData?.child_age_months || 0
      const childAge = childAgeMonths > 0 ? Math.floor(childAgeMonths / 12) : (questionnaire?.child_age || 0)

      // 実際のAI APIを呼び出し（管理画面で設定したプロンプト・変数を使用）
      const response = await fetch('/api/ai/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitId,
          // testModeを使用してローカルデータを渡す（DBに保存されていなくても動作）
          testMode: true,
          testData: {
            childName: questionnaire?.child_name || visitData?.children?.first_name || 'お子様',
            childAge,
            childAgeMonths,
            childGender: questionnaire?.child_gender || visitData?.children?.gender || '',
            diagnosisMeta,
            questionnaireMeta,
            staffNotes: staffNotes || '',
          }
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'AI分析に失敗しました')
      }

      const aiResult = await response.json()

      // AI分析結果を状態に保存
      const analysisResultData: AnalysisResult = {
        postureAnalysis: aiResult.postureAnalysis || {
          overallScore: 0,
          issues: [],
          recommendations: [],
          severity: 'low' as const,
          details: {
            headPosition: '評価中',
            shoulderBalance: '評価中',
            spineCurve: '評価中',
            pelvisTilt: '評価中',
            footBalance: '評価中',
          },
        },
        oralAnalysis: aiResult.oralAnalysis || {
          overallScore: 0,
          issues: [],
          recommendations: [],
          severity: 'low' as const,
          details: {
            biteCondition: '評価中',
            teethAlignment: '評価中',
            tonguePosition: '評価中',
            oralCleanliness: '評価中',
            functionEstimation: '評価中',
          },
        },
        // AI生成コメントを使用（rawTextがあればそれを優先）
        reportSummary: aiResult.rawText || aiResult.analysis || aiResult.summary || 'AI分析結果を取得しました。',
      }

      setAnalysisResult(analysisResultData)
      setEditableSummary(analysisResultData.reportSummary || '')
      setIsReportConfirmed(false)
      markStepCompleted('analysis')
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error running analysis:', error)
      alert('分析の実行に失敗しました: ' + (error as Error).message)
    } finally {
      setIsAnalyzing(false)
    }
  }

  // レポート生成
  // AI APIを使わず、editableSummaryを直接レポートに保存する簡易版
  // 既存レポートがあれば再利用、なければ新規作成
  const generateReport = async () => {
    if (!analysisResult || !visitId) {
      alert('分析結果が不足しています')
      return
    }

    setIsGeneratingReport(true)
    try {
      // レポートをDBに作成（editableSummaryを直接使用）
      const createReportResponse = await fetch(`/api/report/${visitId}/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitId,
          diagnosisId: null,
          aiSummary: editableSummary || analysisResult.reportSummary || 'お子様の口腔・姿勢診断が完了しました。',
          ageConsideration: visitData?.child_age_months
            ? `${visitData.child_age_months}ヶ月のお子様の年齢に応じた発達段階を考慮した評価です。`
            : undefined,
          postureAnalysis: analysisResult.postureAnalysis,
          oralAnalysis: analysisResult.oralAnalysis,
        }),
      })

      if (!createReportResponse.ok) {
        const errorData = await createReportResponse.json().catch(() => ({}))
        throw new Error(errorData.error || 'レポートの作成に失敗しました')
      }

      const reportData = await createReportResponse.json()

      // 生成されたレポートを状態に保存（visit_idベースのURLを使用）
      setAnalysisResult(prev => ({
        ...prev,
        reportUrl: reportData.url,
        hasReport: true,
      }))

      // console.log('[Diagnosis] Report generated:', { reportId: reportData.reportId, visitId: reportData.visitId, url: reportData.url })
    } catch (error) {
      console.error('Error generating report:', error)
      alert('レポートの生成に失敗しました: ' + (error as Error).message)
    } finally {
      setIsGeneratingReport(false)
    }
  }

  // レポート送信（実際のAPI呼び出し）
  const sendReport = async () => {
    if (!visitData?.parent?.line_user_id) {
      alert('保護者のLINE IDが見つかりません。レポートは後ほど手動で送信してください。')
      setShowLineDeliveryCheck(true)
      setLineDeliveryConfirmed(false)
      return
    }

    // レポートが既に作成されているか確認
    if (!analysisResult?.hasReport) {
      alert('レポートが生成されていません。先に「レポート生成」を実行してください。')
      return
    }

    setIsSending(true)
    try {
      // 既に作成されたレポートを使用してLINE送信（visit_idで特定）
      const res = await fetch('/api/diagnosis/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitId,
          diagnosisId: undefined,
          aiSummary: editableSummary || analysisResult.report?.summary || '',
          ageConsideration: visitData.child_age_months
            ? `${visitData.child_age_months}ヶ月のお子様の年齢に応じた発達段階を考慮した評価です。`
            : undefined,
          postureAnalysis: analysisResult.postureAnalysis,
          oralAnalysis: analysisResult.oralAnalysis,
          sendLineNotification: true,
        })
      })

      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error || 'レポート送信に失敗しました')
      }

      // console.log('[Diagnosis] Report sent:', data)

      // LINE送信後、配信確認ダイアログを表示
      setShowLineDeliveryCheck(true)
      setLineDeliveryConfirmed(false)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error sending report:', error)
      alert('レポートの送信に失敗しました: ' + (error as Error).message)
    } finally {
      setIsSending(false)
    }
  }

  // LINE配信確認後の完了処理
  const completeDiagnosis = async (confirmationStatus: 'confirmed' | 'not_received' | 'unknown') => {
    try {
      // APIに確認結果を送信
      const response = await fetch('/api/line/confirm-delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitId,
          confirmationStatus,
        }),
      })

      if (!response.ok) {
        throw new Error('確認結果の保存に失敗しました')
      }

      // 状態に応じたメッセージ表示
      if (confirmationStatus === 'not_received') {
        alert('親御さんに「近日中にレポートをお送りします」とお伝えください。')
      } else if (confirmationStatus === 'unknown') {
        alert('確認できなかった場合は、後日再送信できます。')
      }

      markStepCompleted('report')
      setIsDiagnosisComplete(true)
      setShowLineDeliveryCheck(false)

      // 診断完了後、localStorageから途中保存データをクリア
      clearStorage()
    } catch (error) {
      console.error('Error confirming delivery:', error)
      alert('確認結果の保存に失敗しました: ' + (error as Error).message)
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

  // ローディング中
  if (isLoadingVisit) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="text-slate-400">データを読み込み中...</p>
        </div>
      </div>
    )
  }

  // エラー
  if (visitError || !visitData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center space-y-4 max-w-md mx-4 bg-red-900/20 border border-red-500/30 rounded-lg p-6">
          <p className="text-red-400 font-medium">{visitError || 'セッションが見つかりません'}</p>
          <Button
            onClick={() => router.push('/staff/scan')}
            className="bg-emerald-500 hover:bg-emerald-600"
          >
            QRスキャンに戻る
          </Button>
        </div>
      </div>
    )
  }

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
              {lastSaved && !isDiagnosisComplete && (
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <Save className="w-3 h-3" />
                  保存済み {lastSaved.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {(currentMainView === 'diagnosis' || currentMainView === 'photos') && (
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
                onClick={() => router.push('/staff/home')}
                className="text-gray-600"
              >
                戻る
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* 復元バナー */}
      <AnimatePresence>
        {showRestoredBanner && restoredAt && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-blue-50 border-b border-blue-200 px-4 py-2"
          >
            <div className="flex items-center justify-between max-w-4xl mx-auto">
              <div className="flex items-center gap-2 text-sm text-blue-700">
                <RotateCcw className="w-4 h-4" />
                <span>
                  前回の入力内容を復元しました（{restoredAt.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}時点）
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRestoredBanner(false)}
                className="text-blue-700 hover:bg-blue-100 h-6 px-2"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* メインコンテンツエリア */}
      <main
        ref={mainContainerRef}
        className="flex-1 overflow-y-auto pb-[140px] overscroll-y-contain touch-pan-y"
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
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center space-x-2">
                        <FileText className="w-4 h-4" />
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
                        <Edit2 className="w-3 h-3 mr-1" />
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
                          className="text-xs bg-blue-600 hover:bg-blue-700"
                        >
                          <Save className="w-3 h-3 mr-1" />
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
                        <h3 className="text-xs font-medium text-gray-900 mb-2">お子様情報</h3>
                        <div className="bg-blue-50 rounded-lg p-3 space-y-3">
                          <div>
                            <label className="text-xs text-gray-600 block mb-1">お名前</label>
                            <Input
                              value={editingQuestionnaire.child_name}
                              onChange={(e) => setEditingQuestionnaire({
                                ...editingQuestionnaire,
                                child_name: e.target.value
                              })}
                              className="text-sm"
                            />
                          </div>
                          <div className="flex gap-3">
                            <div className="flex-1">
                              <label className="text-xs text-gray-600 block mb-1">年齢</label>
                              <Input
                                type="number"
                                value={editingQuestionnaire.child_age}
                                onChange={(e) => setEditingQuestionnaire({
                                  ...editingQuestionnaire,
                                  child_age: parseInt(e.target.value) || 0
                                })}
                                className="text-sm"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="text-xs text-gray-600 block mb-1">性別</label>
                              <Select
                                value={editingQuestionnaire.child_gender}
                                onValueChange={(value) => setEditingQuestionnaire({
                                  ...editingQuestionnaire,
                                  child_gender: value
                                })}
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
                        <h3 className="text-xs font-medium text-gray-900 mb-2">スタッフへのメッセージ</h3>
                        <Textarea
                          value={editingQuestionnaire.notes || ''}
                          onChange={(e) => setEditingQuestionnaire({
                            ...editingQuestionnaire,
                            notes: e.target.value
                          })}
                          placeholder="特記事項があれば入力..."
                          className="text-sm min-h-[80px]"
                        />
                      </div>
                    </>
                  ) : (
                    // 表示モード
                    <>
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 mb-2">お子様情報</h3>
                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 space-y-2">
                          <p className="text-lg font-bold text-gray-800">
                            {(() => {
                              const nameParts = questionnaire.child_name.split(' ')
                              const firstName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : questionnaire.child_name
                              const honorific = questionnaire.child_gender === 'male' ? 'くん' : 'ちゃん'
                              return `${firstName}${honorific}`
                            })()}
                            <span className="text-sm font-normal text-gray-500 ml-2">
                              ({questionnaire.child_name})
                            </span>
                          </p>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              🎂 <span className="font-medium">{questionnaire.child_age}歳</span>
                            </span>
                            <span className="flex items-center gap-1">
                              {questionnaire.child_gender === 'male' ? '👦' : '👧'}
                              <span className="font-medium">{questionnaire.child_gender === 'male' ? '男の子' : questionnaire.child_gender === 'female' ? '女の子' : 'その他'}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {questionnaire.notes && (
                        <div>
                          <h3 className="text-xs font-medium text-gray-900 mb-2">スタッフへのメッセージ</h3>
                          <p className="text-xs text-gray-700 bg-gray-50 rounded-lg p-3">{questionnaire.notes}</p>
                        </div>
                      )}

                      {/* APIから取得した詳細問診回答 */}
                      {visitData?.questionnaire_responses && visitData.questionnaire_responses.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="text-sm font-medium text-gray-900">
                            📋 {(() => {
                              const nameParts = questionnaire.child_name.split(' ')
                              const firstName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : questionnaire.child_name
                              const honorific = questionnaire.child_gender === 'male' ? 'くん' : 'ちゃん'
                              return `${firstName}${honorific}の問診回答`
                            })()}
                          </h3>

                          {/* カテゴリ別にグループ化して表示 */}
                          {(() => {
                            // カテゴリアイコンマップ
                            const categoryIcons: Record<string, string> = {
                              '基本情報': '👤',
                              '口腔習慣': '👄',
                              '食事': '🍽️',
                              '睡眠': '😴',
                              '姿勢': '🧍',
                              '運動': '🏃',
                              '生活習慣': '🏠',
                              '歯並び': '🦷',
                              'その他': '📝',
                            }

                            // カテゴリ色マップ
                            const categoryColors: Record<string, { bg: string, border: string, text: string, badge: string }> = {
                              '基本情報': { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100' },
                              '口腔習慣': { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700', badge: 'bg-pink-100' },
                              '食事': { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', badge: 'bg-orange-100' },
                              '睡眠': { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', badge: 'bg-indigo-100' },
                              '姿勢': { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700', badge: 'bg-teal-100' },
                              '運動': { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-100' },
                              '生活習慣': { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100' },
                              '歯並び': { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', badge: 'bg-cyan-100' },
                            }
                            const defaultColors = { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', badge: 'bg-gray-100' }

                            // JSON文字列をパースするヘルパー
                            const parseJsonSafe = <T,>(val: unknown): T | null => {
                              if (typeof val === 'string') {
                                try { return JSON.parse(val) as T } catch { return null }
                              }
                              return val as T
                            }

                            // optionsからラベルを取得するヘルパー
                            const getOptionLabel = (value: string, rawOptions?: unknown): string => {
                              // optionsがJSON文字列の場合はパース
                              const options = parseJsonSafe<Array<{ label: string; value: string }> | string[]>(rawOptions)
                              if (!options || !Array.isArray(options) || options.length === 0) return value
                              if (typeof options[0] === 'object' && 'value' in options[0]) {
                                const found = (options as Array<{ label: string; value: string }>).find(opt => opt.value === value)
                                return found ? found.label : value
                              } else {
                                const stringOptions = options as string[]
                                for (const opt of stringOptions) {
                                  if (opt.includes(':')) {
                                    const [label, val] = opt.split(':')
                                    if (val === value) return label
                                  } else if (opt === value) {
                                    return opt
                                  }
                                }
                              }
                              return value
                            }

                            // 回答値をラベルに変換
                            const formatAnswerValue = (rawValue: unknown, rawOptions?: unknown): string => {
                              // valueがJSON文字列の場合はパース
                              const value = parseJsonSafe<string | string[] | boolean>(rawValue) ?? rawValue
                              const options = parseJsonSafe<Array<{ label: string; value: string }> | string[]>(rawOptions)

                              if (typeof value === 'boolean') return value ? 'はい' : 'いいえ'
                              if (Array.isArray(value)) return value.map(v => getOptionLabel(String(v), options)).join('、')
                              if (options && Array.isArray(options) && options.length > 0) return getOptionLabel(String(value), options)
                              // よく使うvalue→labelマッピング
                              const labelMap: Record<string, string> = {
                                // 基本
                                'yes': 'はい', 'no': 'いいえ', 'true': 'はい', 'false': 'いいえ',
                                'male': '男の子', 'female': '女の子', 'other': 'その他',
                                // 頻度
                                'often': 'よくある', 'sometimes': 'ときどきある', 'rarely': 'あまりない', 'never': 'ない',
                                'always': '常にある', 'frequently': '頻繁にある', 'occasionally': 'たまにある',
                                'daily': '毎日', 'weekly': '週に数回', 'monthly': '月に数回',
                                // 評価
                                'good': '良い', 'normal': '普通', 'bad': '悪い', 'poor': '悪い',
                                'concerned': '気になる', 'not_concerned': '気にならない',
                                'very_good': 'とても良い', 'excellent': 'とても良い',
                                // 口腔習慣
                                'mouth_breathing': '口呼吸', 'nose_breathing': '鼻呼吸', 'both': '両方',
                                'thumb_sucking': '指しゃぶり', 'nail_biting': '爪噛み', 'lip_biting': '唇噛み',
                                'tongue_thrust': '舌突出', 'teeth_grinding': '歯ぎしり',
                                // 食事
                                'soft': '軟らかいもの中心', 'hard': '硬いもの中心', 'balanced': 'バランス良く',
                                'picky': '好き嫌いが多い', 'not_picky': '好き嫌いなし',
                                'fast': '早食い', 'slow': 'ゆっくり', 'moderate': '普通',
                                // 睡眠
                                'snoring': 'いびきあり', 'no_snoring': 'いびきなし',
                                'mouth_open': '口を開けて寝る', 'mouth_closed': '口を閉じて寝る',
                                // 姿勢
                                'straight': 'まっすぐ', 'slouched': '猫背', 'tilted': '傾いている',
                              }
                              return labelMap[String(value)] || String(value)
                            }

                            // カテゴリ別にグループ化
                            const grouped = visitData.questionnaire_responses.reduce((acc, response) => {
                              const category = response.questionnaire_items?.questionnaire_categories?.name || 'その他'
                              if (!acc[category]) acc[category] = []
                              acc[category].push(response)
                              return acc
                            }, {} as Record<string, typeof visitData.questionnaire_responses>)

                            return Object.entries(grouped).map(([category, responses]) => {
                              const colors = categoryColors[category] || defaultColors
                              const icon = categoryIcons[category] || '📝'

                              return (
                                <div key={category} className={`rounded-xl border ${colors.border} ${colors.bg} overflow-hidden`}>
                                  {/* カテゴリヘッダー */}
                                  <div className={`px-3 py-2 ${colors.badge} border-b ${colors.border}`}>
                                    <span className={`text-sm font-semibold ${colors.text}`}>
                                      {icon} {category}
                                    </span>
                                  </div>

                                  {/* 質問と回答 */}
                                  <div className="divide-y divide-gray-100">
                                    {responses.map((response) => (
                                      <div key={response.id} className="px-3 py-2.5 bg-white/50">
                                        <div className="flex items-start justify-between gap-3">
                                          <p className="text-xs text-gray-600 flex-1">
                                            {response.questionnaire_items?.question}
                                          </p>
                                          <span className={`text-xs font-bold ${colors.text} whitespace-nowrap px-2 py-0.5 rounded-full ${colors.badge}`}>
                                            {formatAnswerValue(response.value, response.questionnaire_items?.options)}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )
                            })
                          })()}
                        </div>
                      )}
                    </>
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
                      const existingPhoto = photos.find(p => p.type === type.key)
                      const isUploading = uploadingPhotos.has(type.key)
                      return (
                        <div
                          key={type.key}
                          className={cn(
                            'w-full border-2 rounded-xl p-3 transition-all text-left min-h-[80px]',
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
                                {existingPhoto && !isUploading && (
                                  <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 text-[10px]">
                                    撮影済み
                                  </Badge>
                                )}
                                {isUploading && (
                                  <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 text-[10px] animate-pulse">
                                    保存中...
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-600">{type.description}</p>
                              {!existingPhoto && (
                                <button
                                  onClick={() => startCamera(type.key)}
                                  className="mt-2 px-3 py-1.5 bg-coral-500 text-white text-xs font-medium rounded-lg hover:bg-coral-600 active:scale-95 transition-all touch-manipulation"
                                >
                                  📷 撮影する
                                </button>
                              )}
                              {existingPhoto && (
                                <button
                                  onClick={() => setViewingPhotoInMenu({
                                    url: existingPhoto.url,
                                    type: type.key,
                                    label: type.label
                                  })}
                                  className="mt-2 px-3 py-1.5 bg-blue-500 text-white text-xs font-medium rounded-lg hover:bg-blue-600 active:scale-95 transition-all touch-manipulation"
                                >
                                  🔍 タップで確認・再撮影
                                </button>
                              )}
                            </div>
                            {existingPhoto ? (
                              <div
                                className="relative cursor-pointer"
                                onClick={() => setViewingPhotoInMenu({
                                  url: existingPhoto.url,
                                  type: type.key,
                                  label: type.label
                                })}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={existingPhoto.url}
                                  alt={type.label}
                                  className="w-20 h-20 object-cover rounded-lg border-2 border-green-300"
                                />
                                <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center">
                                  <span className="text-white text-xs font-medium opacity-0 hover:opacity-100">タップで確認</span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center w-16 h-16 rounded-lg bg-gray-100 text-gray-400 border-2 border-dashed border-gray-300">
                                <Camera className="w-6 h-6" />
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-800">
                      <strong>📱 カメラの使い方：</strong><br />
                      各写真タイプの枠をタップすると、スマホのカメラが起動します。<br />
                      撮影後、プレビューで確認してから保存できます。
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
                <div
                  ref={categoryTabContainerRef}
                  className="border-b bg-white overflow-x-auto sticky top-[52px] z-10 scrollbar-hide shadow-sm"
                >
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
                          ref={(el) => { categoryTabRefs.current[category] = el }}
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

            {/* メモビュー */}
            {currentMainView === 'memo' && (
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center space-x-2">
                    <StickyNote className="w-4 h-4" />
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
                    className="min-h-[300px] text-sm leading-relaxed resize-none"
                  />
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-xs text-gray-400">
                      {staffNotes.length > 0 ? `${staffNotes.length}文字` : 'メモは自動保存されます'}
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

            {/* 各ビュー共通の下部余白 */}
            {(currentMainView === 'questionnaire' || currentMainView === 'photos' || currentMainView === 'diagnosis' || currentMainView === 'memo') && (
              <div className="h-32" />
            )}

            {/* 確認/分析ビュー */}
            {currentMainView === 'review' && (
              <div className="space-y-4">
                {/* 入力チェックセクション */}
                {!analysisResult && (
                  <Card className="shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center space-x-2">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>入力チェック</span>
                      </CardTitle>
                      <CardDescription className="text-xs">
                        写真と診断項目の入力状況を確認してください
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* 写真チェック */}
                      <div>
                        <h4 className="text-xs font-semibold text-gray-700 mb-2">写真（必須3枚）</h4>
                        <div className="space-y-1">
                          {[
                            { key: 'posture_front', label: '正面姿勢' },
                            { key: 'posture_side', label: '横向き姿勢' },
                            { key: 'oral_front', label: '口腔内（正面）' },
                          ].map(({ key, label }) => {
                            const hasPhoto = photos.find(p => p.type === key)
                            return (
                              <button
                                key={key}
                                onClick={() => !hasPhoto && setCurrentMainView('photos')}
                                className={cn(
                                  "w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors",
                                  hasPhoto
                                    ? "bg-green-50 text-green-700"
                                    : "bg-red-50 text-red-700 hover:bg-red-100 cursor-pointer"
                                )}
                              >
                                <span className="flex items-center gap-2">
                                  {hasPhoto ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                  {label}
                                </span>
                                {!hasPhoto && <ChevronRight className="w-3 h-3" />}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* 診断項目チェック（カテゴリ別表示） */}
                      <div>
                        <h4 className="text-xs font-semibold text-gray-700 mb-2">診断項目（スタッフ入力）</h4>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {/* カテゴリ別にグループ化して表示 */}
                          {staffCategoryOrder.map(category => {
                            const categoryItems = staffItemsByCategory[category] || []
                            if (categoryItems.length === 0) return null

                            const completedCount = categoryItems.filter(item =>
                              diagnosisValues[item.id] !== undefined &&
                              diagnosisValues[item.id] !== null &&
                              diagnosisValues[item.id] !== ''
                            ).length
                            const isComplete = completedCount === categoryItems.length
                            const hasAnyInput = completedCount > 0

                            return (
                              <div key={category} className="border rounded-lg overflow-hidden">
                                {/* カテゴリヘッダー */}
                                <button
                                  onClick={() => !isComplete && setCurrentMainView('diagnosis')}
                                  className={cn(
                                    "w-full flex items-center justify-between p-2 text-xs font-medium transition-colors",
                                    isComplete
                                      ? "bg-green-100 text-green-800"
                                      : hasAnyInput
                                        ? "bg-yellow-50 text-yellow-800 hover:bg-yellow-100 cursor-pointer"
                                        : "bg-red-50 text-red-700 hover:bg-red-100 cursor-pointer"
                                  )}
                                >
                                  <span className="flex items-center gap-2">
                                    {isComplete ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                    {category}
                                  </span>
                                  <span className="text-[10px]">
                                    {completedCount}/{categoryItems.length}
                                  </span>
                                </button>

                                {/* 未完了カテゴリの項目詳細 */}
                                {!isComplete && (
                                  <div className="divide-y divide-gray-100">
                                    {categoryItems.map(item => {
                                      const hasValue = diagnosisValues[item.id] !== undefined &&
                                        diagnosisValues[item.id] !== null &&
                                        diagnosisValues[item.id] !== ''
                                      return (
                                        <div
                                          key={item.id}
                                          className={cn(
                                            "flex items-center justify-between px-3 py-1.5 text-[11px]",
                                            hasValue ? "bg-green-50/50 text-green-700" : "bg-white text-gray-600"
                                          )}
                                        >
                                          <span className="flex items-center gap-1.5">
                                            {hasValue ? <Check className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5 text-red-400" />}
                                            {item.question}
                                            {item.required && <span className="text-red-400">*</span>}
                                          </span>
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* 分析ボタン */}
                      {(() => {
                        const requiredPhotos = ['posture_front', 'posture_side', 'oral_front']
                        const missingPhotos = requiredPhotos.filter(key => !photos.find(p => p.type === key))
                        const missingDiagnosis = staffItems.filter(item =>
                          item.required &&
                          (diagnosisValues[item.id] === undefined ||
                            diagnosisValues[item.id] === null ||
                            diagnosisValues[item.id] === '')
                        )
                        const canAnalyze = missingPhotos.length === 0 && missingDiagnosis.length === 0

                        return (
                          <div className="pt-2">
                            {!canAnalyze && (
                              <p className="text-xs text-red-600 mb-2 text-center">
                                未入力項目: 写真{missingPhotos.length}枚、診断{missingDiagnosis.length}項目
                              </p>
                            )}
                            <Button
                              onClick={runAnalysis}
                              disabled={isAnalyzing || !canAnalyze}
                              className={cn(
                                "w-full",
                                canAnalyze ? "bg-coral-500 hover:bg-coral-600" : "bg-gray-300"
                              )}
                              size="lg"
                            >
                              {isAnalyzing ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                  分析中...
                                </>
                              ) : (
                                <>
                                  <Brain className="w-5 h-5 mr-2" />
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
                      <CardTitle className="text-base flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Brain className="w-4 h-4" />
                          <span>分析結果</span>
                        </div>
                        {isReportConfirmed && (
                          <Badge className="bg-green-100 text-green-700 border-green-200">
                            確定済み
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* レポートプレビュー（コメント直接編集可能） */}
                      <ReportPreview
                        childName={questionnaire?.child_name || session?.child_name || 'お子様'}
                        childAge={questionnaire?.child_age || session?.child_age}
                        eventName="cOral up 診断"
                        diagnosisDate={new Date().toISOString()}
                        photos={{
                          postureSide: photos.find(p => p.type === 'posture_side')?.url,
                          postureFront: photos.find(p => p.type === 'posture_front')?.url,
                          oralFront: photos.find(p => p.type === 'oral_front')?.url,
                        }}
                        aiSummary={editableSummary}
                        isEditable={!isReportConfirmed}
                        onSummaryChange={(value) => {
                          setEditableSummary(value)
                          setIsReportConfirmed(false)
                        }}
                        reportUrl={analysisResult?.reportUrl || (isReportConfirmed && analysisResult?.hasReport ? `${APP_URL}/report/${visitId}` : undefined)}
                      />

                      {/* レポート生成・確定・送信ボタン */}
                      {!analysisResult?.hasReport ? (
                        // レポート未生成の場合：レポート生成ボタンを表示
                        <Button
                          onClick={generateReport}
                          disabled={isGeneratingReport}
                          className="w-full bg-coral-500 hover:bg-coral-600"
                          size="lg"
                        >
                          {isGeneratingReport ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                              レポート生成中...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-5 h-5 mr-2" />
                              レポート生成
                            </>
                          )}
                        </Button>
                      ) : !isReportConfirmed ? (
                        // レポート生成済み・未確定の場合：確定ボタンを表示
                        <Button
                          onClick={() => setIsReportConfirmed(true)}
                          className="w-full bg-blue-500 hover:bg-blue-600"
                          size="lg"
                        >
                          <Check className="w-5 h-5 mr-2" />
                          レポートを確定
                        </Button>
                      ) : (
                        // レポート確定済みの場合：編集・送信ボタンを表示
                        <div className="space-y-2">
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                            <Check className="w-5 h-5 text-green-600 mx-auto mb-1" />
                            <p className="text-xs text-green-700">レポート確定済み - コメントは編集できません</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => setIsReportConfirmed(false)}
                              variant="outline"
                              className="flex-1"
                            >
                              <Edit2 className="w-4 h-4 mr-2" />
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
                              <Send className="w-4 h-4 mr-2" />
                              LINE送信
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
                {/* 下部メニューに隠れないための余白 */}
                <div className="h-32" />
              </div>
            )}

            {/* レポートビュー */}
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
            { view: 'memo' as MainView, label: 'メモ', icon: <StickyNote className="w-4 h-4" /> },
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

      {/* 写真プレビューモーダル（フルスクリーン） */}
      {previewPhoto && (
        <div
          className="fixed inset-0 bg-black z-[9999] flex flex-col"
          style={{
            touchAction: 'none',
            overscrollBehavior: 'none',
          }}
        >
          {/* 上部：画像エリア（60%） */}
          <div
            className="flex-1 flex items-center justify-center p-2 overflow-hidden"
            style={{ maxHeight: '60vh' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewPhoto.url}
              alt="プレビュー"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>

          {/* 下部：ボタンエリア（40%） */}
          <div className="bg-black p-4 flex flex-col justify-center" style={{ height: '40vh' }}>
            <div className="text-center text-white mb-4">
              <p className="text-lg font-semibold">
                {photoTypes.find(t => t.key === previewPhoto.type)?.label}
              </p>
              <p className="text-sm text-gray-300 mt-1">
                この写真でよろしいですか？
              </p>
            </div>

            <div className="flex gap-3 max-w-md mx-auto w-full">
              <Button
                variant="outline"
                onClick={closePreview}
                className="flex-1 h-14 bg-white/10 border-white/30 text-white hover:bg-white/20 text-base"
              >
                <X className="w-5 h-5 mr-2" />
                キャンセル
              </Button>
              <Button
                variant="outline"
                onClick={retakePhoto}
                className="flex-1 h-14 bg-yellow-500/30 border-yellow-500/50 text-yellow-200 hover:bg-yellow-500/40 text-base"
              >
                <Camera className="w-5 h-5 mr-2" />
                撮り直す
              </Button>
              <Button
                onClick={savePreviewPhoto}
                disabled={isUploadingPhoto}
                className="flex-1 h-14 bg-green-600 hover:bg-green-700 text-white text-base font-bold disabled:bg-green-400"
              >
                {isUploadingPhoto ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    保存
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* レガシーカメラモーダル（フォールバック用） */}
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

      {/* LINE送信確認モーダル */}
      {showLineSendConfirm && (
        <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden">
            {/* ヘッダー */}
            <div className="bg-green-500 p-4 text-white text-center">
              <Send className="w-8 h-8 mx-auto mb-2" />
              <h2 className="text-lg font-bold">LINE送信確認</h2>
            </div>

            {/* 確認内容 */}
            <div className="p-4 space-y-4">
              {/* LINE連携情報（profilesのdisplay_name） */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-xs text-green-600 font-semibold mb-1">LINE連携アカウント</p>
                <p className="text-sm font-bold text-gray-800">
                  {visitData?.parent?.display_name || '未連携'}
                </p>
              </div>

              {/* 親御さん情報（問診票から） */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-600 font-semibold mb-1">親御さん</p>
                <p className="text-sm font-bold text-gray-800">
                  {questionnaire?.child_name ? `${visitData?.children?.last_name || ''} ${visitData?.parent?.first_name || ''}`.trim() || session?.parent_name || '未入力' : session?.parent_name || '未入力'}
                </p>
              </div>

              {/* お子さん情報（問診票から） */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-xs text-orange-600 font-semibold mb-1">お子さん</p>
                <p className="text-sm font-bold text-gray-800">
                  {questionnaire?.child_name || `${visitData?.children?.last_name || ''} ${visitData?.children?.first_name || ''}`.trim() || session?.child_name || '未入力'}
                  <span className="text-gray-500 font-normal ml-2">
                    ({questionnaire?.child_age || (visitData?.child_age_months ? Math.floor(visitData.child_age_months / 12) : session?.child_age) || 0}歳)
                  </span>
                </p>
              </div>

              {/* 確認チェックボックス */}
              <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={lineSendConfirmed}
                  onChange={(e) => setLineSendConfirmed(e.target.checked)}
                  className="w-5 h-5 mt-0.5 rounded border-gray-300 text-green-500 focus:ring-green-500"
                />
                <span className="text-sm text-gray-700">
                  上記の情報を確認しました。<br />
                  <span className="text-xs text-gray-500">
                    送信先が正しいことを確認してください
                  </span>
                </span>
              </label>
            </div>

            {/* ボタン */}
            <div className="p-4 bg-gray-50 border-t flex gap-3">
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
                {isSending ? '送信中...' : 'LINE送信'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 写真確認モーダル（写真メニューから） */}
      {viewingPhotoInMenu && (
        <div
          className="fixed inset-0 bg-black z-[9999] flex flex-col"
          style={{
            touchAction: 'none',
            overscrollBehavior: 'none',
          }}
        >
          {/* 上部：画像エリア（65%） */}
          <div
            className="flex-1 flex items-center justify-center p-2 overflow-hidden"
            style={{ maxHeight: '65vh' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={viewingPhotoInMenu.url}
              alt={viewingPhotoInMenu.label}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>

          {/* 下部：ボタンエリア（35%） */}
          <div className="bg-black p-4 flex flex-col justify-center" style={{ height: '35vh' }}>
            <div className="text-center text-white mb-4">
              <p className="text-lg font-semibold">{viewingPhotoInMenu.label}</p>
              <p className="text-sm text-gray-300 mt-1">撮影済みの写真</p>
            </div>

            <div className="flex gap-3 max-w-md mx-auto w-full">
              <Button
                variant="outline"
                onClick={() => setViewingPhotoInMenu(null)}
                className="flex-1 h-14 bg-white/10 border-white/30 text-white hover:bg-white/20 text-base"
              >
                <X className="w-5 h-5 mr-2" />
                戻る
              </Button>
              <Button
                onClick={() => {
                  const photoType = viewingPhotoInMenu.type
                  setViewingPhotoInMenu(null)
                  startCamera(photoType)
                }}
                className="flex-1 h-14 bg-yellow-500 hover:bg-yellow-600 text-white text-base font-bold"
              >
                <Camera className="w-5 h-5 mr-2" />
                再撮影
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* LINE配信確認モーダル */}
      {showLineDeliveryCheck && (
        <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden">
            {/* ヘッダー */}
            <div className="bg-green-500 p-4 text-white text-center">
              <Send className="w-8 h-8 mx-auto mb-2" />
              <h2 className="text-lg font-bold">LINE送信完了</h2>
            </div>

            {/* 確認内容 */}
            <div className="p-4 space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                <p className="text-base font-bold text-yellow-800 mb-2">
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
                    className="flex-1 h-14 bg-green-500 hover:bg-green-600 text-white"
                  >
                    <Check className="w-5 h-5 mr-2" />
                    届いた
                  </Button>
                  <Button
                    onClick={() => completeDiagnosis('not_received')}
                    variant="outline"
                    className="flex-1 h-14 border-2 border-red-300 text-red-600 hover:bg-red-50"
                  >
                    <X className="w-5 h-5 mr-2" />
                    届いていない
                  </Button>
                </div>
                <Button
                  onClick={() => completeDiagnosis('unknown')}
                  variant="outline"
                  className="w-full h-14 border-2 border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                >
                  <AlertCircle className="w-5 h-5 mr-2" />
                  確認できなかった
                </Button>
              </div>

              <p className="text-xs text-gray-500 text-center">
                ※届いていない場合は、近日中にお送りする旨をお伝えください
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 診断完了モーダル */}
      {isDiagnosisComplete && (
        <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden">
            {/* ヘッダー */}
            <div className="bg-blue-500 p-6 text-white text-center">
              <CheckCircle2 className="w-16 h-16 mx-auto mb-3" />
              <h2 className="text-xl font-bold">診断完了</h2>
            </div>

            {/* 内容 */}
            <div className="p-6 space-y-4">
              <p className="text-center text-gray-700">
                {questionnaire?.child_name || session?.child_name}さんの診断が完了しました。
              </p>

              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
                <p className="font-medium mb-2">次のお子様の診断へ進む場合：</p>
                <p>「次の診断へ」ボタンを押してQRスキャン画面に戻ります</p>
              </div>

              <Button
                onClick={() => {
                  router.push('/staff/scan')
                }}
                className="w-full h-14 bg-blue-500 hover:bg-blue-600 text-white text-base font-bold"
              >
                次の診断へ（QRスキャン）
              </Button>

              <Button
                variant="outline"
                onClick={() => router.push('/staff/home')}
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




