'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useDiagnosisStorage, cleanupOldDiagnosisData } from '@/hooks/useDiagnosisStorage'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { diagnosisItems as staticDiagnosisItems, diagnosisItemsByCategory as staticItemsByCategory, categoryOrder as staticCategoryOrder } from '@/data/staff-diagnosis-items'
import type { DiagnosisItem } from '@/data/staff-diagnosis-items'
import { Camera, X, Check, ChevronLeft, ChevronRight, Sparkles, QrCode, FileText, Eye, Brain, Send, CheckCircle2, Edit2, Plus, Loader2, AlertCircle } from 'lucide-react'
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
  | 'review'      // 分析
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
  type: 'posture_front' | 'posture_side' | 'oral_front' | 'oral_side' | 'oral_closeup' | 'custom'
  uploaded_at: string
  customTitle?: string
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

export default function IntegratedDiagnosisPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isScrollingRef = useRef(false)

  const [sessionId, setSessionId] = useState<string>('')

  // ... (params logic)
  useEffect(() => {
    const resolveParams = async () => {
      try {
        const resolvedParams = 'then' in params ? await params : params
        const id = resolvedParams.id
        setSessionId(id || '')
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error resolving params:', error)
        setSessionId('')
      }
    }
    resolveParams()
  }, [params])

  // メインビューの管理
  const [currentMainView, setCurrentMainView] = useState<MainView>('questionnaire')

  // ステップ管理
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
  const [isLoadingSession, setIsLoadingSession] = useState(false)
  const [sessionError, setSessionError] = useState<string | null>(null)

  // スキーマデータ（動的取得）
  const [diagnosisItems, setDiagnosisItems] = useState<DiagnosisItem[]>([])
  const [categoryList, setCategoryList] = useState<any[]>([])
  const [isSchemaLoading, setIsSchemaLoading] = useState(true)

  useEffect(() => {
    const fetchSchema = async () => {
      console.log('[StaffDiagnosis] スキーマ取得開始...')
      try {
        const res = await fetch('/api/diagnosis-schema?input_type=staff')
        console.log('[StaffDiagnosis] API応答ステータス:', res.status)
        if (!res.ok) throw new Error('スキーマ取得失敗')
        const json = await res.json()
        console.log('[StaffDiagnosis] 取得データ:', json.data?.items?.length, '項目')

        if (json.success && json.data) {
          // APIデータをアプリケーションの形式に変換
          const apiItems = json.data.items.map((item: any) => ({
            id: item.id,
            category: json.data.categories.find((c: any) => c.id === item.category_id)?.name || '未分類',
            question: item.question,
            answerType: item.answer_type, // 'radio' | 'checkbox' | ...
            options: item.options,
            required: item.is_required,
            inputType: item.input_type,
            note: item.note,
            min: item.min_value,
            max: item.max_value,
            unit: item.unit,
            placeholder: item.placeholder
          }))

          // 舌カテゴリの確認
          const tongueItems = apiItems.filter((i: any) => i.category === '舌')
          console.log('[StaffDiagnosis] 舌カテゴリ:', tongueItems.length, '件', tongueItems.map((i: any) => i.question))

          setDiagnosisItems(apiItems)
          setCategoryList(json.data.categories)
        }
      } catch (e) {
        console.error('[StaffDiagnosis] エラー:', e)
        // エラー時は静的データにフォールバック、または空にする
        // setDiagnosisItems(staticDiagnosisItems) 
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
  const [diagnosisContainer, setDiagnosisContainer] = useState<HTMLDivElement | null>(null)

  // ... (custom photo state)
  const [isAddingCustomPhoto, setIsAddingCustomPhoto] = useState(false)
  const [customPhotoTitle, setCustomPhotoTitle] = useState('')
  const [pendingCustomPhotoId, setPendingCustomPhotoId] = useState<string | null>(null)

  // ... (auto save hook)
  const {
    isLoaded: isStorageLoaded,
    lastSaved,
    loadFromStorage,
    saveToStorage,
    clearStorage,
  } = useDiagnosisStorage(sessionId)

  // ... (useEffect for restore)
  useEffect(() => {
    cleanupOldDiagnosisData()
  }, [])

  useEffect(() => {
    // ... (restore logic)
    if (!sessionId || !isStorageLoaded) return

    const savedData = loadFromStorage()
    if (savedData) {
      const shouldRestore = window.confirm(
        `前回の診断データが見つかりました（${new Date(savedData.lastSaved).toLocaleString('ja-JP')}）。\n復元しますか？`
      )

      if (shouldRestore) {
        if (savedData.diagnosisValues) {
          setDiagnosisValues(savedData.diagnosisValues)
        }
        if (savedData.staffNotes) {
          setStaffNotes(savedData.staffNotes)
        }
      }
    }
  }, [sessionId, isStorageLoaded, loadFromStorage])

  // ... (useEffect for auto save)
  useEffect(() => {
    if (!sessionId || !isStorageLoaded) return
    if (Object.keys(diagnosisValues).length === 0 && !staffNotes) return
    saveToStorage({
      diagnosisValues,
      staffNotes,
      photos: photos.map(p => ({
        id: p.id,
        url: p.url,
        type: p.type,
        uploaded_at: p.uploaded_at,
        customTitle: p.customTitle,
      })),
    })
  }, [sessionId, isStorageLoaded, diagnosisValues, staffNotes, photos, saveToStorage])

  // セッションデータ取得（DBから）
  useEffect(() => {
    if (!sessionId) return

    const fetchSessionData = async () => {
      setIsLoadingSession(true)
      setSessionError(null)

      try {
        // sessionIdがUUID形式（visitId）かどうかを判定
        // UUID形式: 8-4-4-4-12文字のハイフン区切り
        const isVisitId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId)
        
        const apiUrl = isVisitId
          ? `/api/staff/session?visitId=${encodeURIComponent(sessionId)}`
          : `/api/staff/session?code=${encodeURIComponent(sessionId.slice(0, 8))}`
        
        const response = await fetch(apiUrl)
        const data = await response.json()

        if (!data.success || !data.visit) {
          throw new Error(data.message || 'セッションデータの取得に失敗しました')
        }

        const visit = data.visit
        const child = visit.children

        // SessionData形式に変換
        const sessionData: SessionData = {
          id: visit.id,
          session_id: visit.session_id || visit.id,
          status: visit.status || 'questionnaire_completed',
          parent_name: visit.parent
            ? (visit.parent.last_name && visit.parent.first_name
                ? `${visit.parent.last_name} ${visit.parent.first_name}`
                : visit.parent.display_name)
            : undefined,
          parent_phone: visit.parent?.phone_number,
          child_name: child
            ? `${child.last_name || ''} ${child.first_name || ''}`.trim()
            : undefined,
          child_age: visit.child_age_months
            ? Math.floor(visit.child_age_months / 12)
            : undefined,
          child_gender: child?.gender,
          created_at: visit.visit_date || new Date().toISOString(),
        }

        // QuestionnaireData形式に変換
        // questionnaire_responsesから必要な情報を抽出
        const responses = visit.questionnaire_responses || []
        const questionnaireData: QuestionnaireData = {
          child_name: child
            ? `${child.last_name || ''} ${child.first_name || ''}`.trim()
            : 'お子様',
          child_age: visit.child_age_months
            ? Math.floor(visit.child_age_months / 12)
            : 0,
          child_gender: child?.gender || 'other',
          medical_history: [],
          concerns: [],
          ideal_goals: [],
          notes: '',
        }

        // questionnaire_responsesから情報を抽出（必要に応じて）
        // 実際の問診項目に応じてマッピングを調整
        responses.forEach((resp: any) => {
          const item = resp.questionnaire_items
          if (!item) return

          // カテゴリや質問内容に応じて分類
          // ここは実際の問診項目の構造に合わせて調整が必要
          if (item.question?.includes('既往歴') || item.question?.includes('アレルギー')) {
            if (resp.value && resp.value !== 'no' && resp.value !== 'いいえ') {
              questionnaireData.medical_history.push(resp.value)
            }
          }
          if (item.question?.includes('気になる') || item.question?.includes('心配')) {
            if (resp.value && resp.value !== 'no' && resp.value !== 'いいえ') {
              questionnaireData.concerns.push(resp.value)
            }
          }
          if (item.question?.includes('理想') || item.question?.includes('目標')) {
            if (resp.value && resp.value !== 'no' && resp.value !== 'いいえ') {
              questionnaireData.ideal_goals.push(resp.value)
            }
          }
        })

        // 互換用questionnaireテーブルのデータも確認
        if (visit.questionnaire) {
          const legacy = visit.questionnaire
          if (legacy.concerns) {
            questionnaireData.concerns = Array.isArray(legacy.concerns)
              ? legacy.concerns
              : []
          }
          if (legacy.ideal_goals) {
            questionnaireData.ideal_goals = Array.isArray(legacy.ideal_goals)
              ? legacy.ideal_goals
              : []
          }
          if (legacy.medical_history) {
            questionnaireData.medical_history = Array.isArray(legacy.medical_history)
              ? legacy.medical_history
              : []
          }
          if (legacy.notes) {
            questionnaireData.notes = legacy.notes
          }
        }

        setSession(sessionData)
        setQuestionnaire(questionnaireData)
      } catch (error) {
        console.error('セッションデータ取得エラー:', error)
        setSessionError(error instanceof Error ? error.message : 'データの取得に失敗しました')
        // エラー時は空のデータを設定（画面は表示されるがデータなし）
        setSession(null)
        setQuestionnaire(null)
      } finally {
        setIsLoadingSession(false)
      }
    }

    fetchSessionData()
  }, [sessionId])

  // ... (url hash sync)
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

  const markStepCompleted = useCallback((step: DiagnosisStep) => {
    setCompletedSteps(prev => {
      const next = new Set(prev)
      next.add(step)
      return next
    })
  }, [])

  const isStepCompleted = useCallback((step: DiagnosisStep) => {
    return completedSteps.has(step)
  }, [completedSteps])

  // スタッフ用項目のみフィルタリング（API取得データを使用）
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

  // カテゴリの順序（Activeなカテゴリのみ）
  const staffCategoryOrder = useMemo(() => {
    // APIから取得したカテゴリリストの順序を優先
    if (categoryList.length > 0) {
      return categoryList.map(c => c.name).filter(name => staffItemsByCategory[name]?.length > 0)
    }
    return []
  }, [categoryList, staffItemsByCategory])

  // アクティブカテゴリの初期化（デフォルトは「舌」）
  useEffect(() => {
    if (currentMainView === 'diagnosis' && staffCategoryOrder.length > 0 && !activeCategory) {
      // デフォルトで「舌」カテゴリを選択
      const defaultCategory = staffCategoryOrder.includes('舌') ? '舌' : staffCategoryOrder[0]
      setActiveCategory(defaultCategory)
    }
  }, [currentMainView, staffCategoryOrder, activeCategory])

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
  // 保存済み写真の表示状態
  const [viewingPhoto, setViewingPhoto] = useState<PhotoData | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // モーダル表示時にbodyのスクロールを無効化
  useEffect(() => {
    if (previewPhoto || viewingPhoto) {
      // スクロール位置を保存
      const scrollY = window.scrollY
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.left = '0'
      document.body.style.right = '0'
      document.body.style.overflow = 'hidden'

      return () => {
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.left = ''
        document.body.style.right = ''
        document.body.style.overflow = ''
        window.scrollTo(0, scrollY)
      }
    }
  }, [previewPhoto, viewingPhoto])

  // 保存済み写真を表示
  const viewSavedPhoto = (photo: PhotoData) => {
    setViewingPhoto(photo)
  }

  // 保存済み写真の表示を閉じる
  const closeViewingPhoto = () => {
    setViewingPhoto(null)
  }

  // 保存済み写真から再撮影
  const retakeFromViewing = () => {
    if (!viewingPhoto) return
    const photoType = viewingPhoto.type === 'custom' ? viewingPhoto.id : viewingPhoto.type
    setViewingPhoto(null)
    setCurrentPhotoType(photoType)
    // 少し遅延してカメラを起動
    setTimeout(() => {
      if (fileInputRef.current) {
        fileInputRef.current.click()
      }
    }, 100)
  }

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

    const photoType = previewPhoto.type
    const objectUrl = previewPhoto.url

    // カスタム写真の場合
    if (photoType === 'custom' && pendingCustomPhotoId) {
      const newPhoto: PhotoData = {
        id: pendingCustomPhotoId,
        url: objectUrl,
        type: 'custom',
        uploaded_at: new Date().toISOString(),
        customTitle: customPhotoTitle,
      }
      setPhotos(prev => [...prev, newPhoto])
      setPendingCustomPhotoId(null)
      setCustomPhotoTitle('')
    } else if (photoType.startsWith('custom-')) {
      // 既存カスタム写真の再撮影
      const photoId = photoType
      setPhotos(prev => prev.map(p =>
        p.id === photoId
          ? { ...p, url: objectUrl, uploaded_at: new Date().toISOString() }
          : p
      ))
    } else {
      // 通常の写真タイプ
      const newPhoto: PhotoData = {
        id: `${photoType}-${Date.now()}`,
        url: objectUrl,
        type: photoType as PhotoData['type'],
        uploaded_at: new Date().toISOString(),
      }
      setPhotos(prev => [...prev.filter(p => p.type !== photoType), newPhoto])
    }

    // 全ての固定写真が撮影済みならステップ完了
    const standardPhotoCount = photos.filter(p => p.type !== 'custom' && p.type !== photoType).length + (photoType !== 'custom' && !photoType.startsWith('custom-') ? 1 : 0)
    if (standardPhotoCount >= photoTypes.length) {
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
    // カスタム写真の場合、保留中のIDもクリア
    if (pendingCustomPhotoId) {
      setPendingCustomPhotoId(null)
      setCustomPhotoTitle('')
    }
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

      // カスタム写真の場合
      if (currentPhotoType === 'custom' && pendingCustomPhotoId) {
        const newPhoto: PhotoData = {
          id: pendingCustomPhotoId,
          url: objectUrl,
          type: 'custom',
          uploaded_at: new Date().toISOString(),
          customTitle: customPhotoTitle,
        }
        setPhotos(prev => [...prev, newPhoto])
        setPendingCustomPhotoId(null)
        setCustomPhotoTitle('')
      } else if (currentPhotoType.startsWith('custom-')) {
        // 既存カスタム写真の再撮影
        const photoId = currentPhotoType
        setPhotos(prev => prev.map(p =>
          p.id === photoId
            ? { ...p, url: objectUrl, uploaded_at: new Date().toISOString() }
            : p
        ))
      } else {
        // 通常の写真タイプ
        const newPhoto: PhotoData = {
          id: `${currentPhotoType}-${Date.now()}`,
          url: objectUrl,
          type: currentPhotoType as PhotoData['type'],
          uploaded_at: new Date().toISOString(),
        }
        setPhotos(prev => [...prev.filter(p => p.type !== currentPhotoType), newPhoto])
      }

      stopCamera()

      // 全ての固定写真が撮影済みならステップ完了
      const standardPhotoCount = photos.filter(p => p.type !== 'custom' && p.type !== currentPhotoType).length + (currentPhotoType !== 'custom' && !currentPhotoType.startsWith('custom-') ? 1 : 0)
      if (standardPhotoCount >= photoTypes.length) {
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

  // カスタム写真追加開始
  const startAddCustomPhoto = () => {
    setIsAddingCustomPhoto(true)
    setCustomPhotoTitle('')
  }

  // カスタム写真タイトル確定してカメラ起動
  const confirmCustomPhotoTitle = async () => {
    if (!customPhotoTitle.trim()) {
      alert('タイトルを入力してください')
      return
    }
    const newPhotoId = `custom-${Date.now()}`
    setPendingCustomPhotoId(newPhotoId)
    setIsAddingCustomPhoto(false)
    await startCamera('custom')
  }

  // カスタム写真の再撮影
  const retakeCustomPhoto = async (photoId: string) => {
    await startCamera(photoId)
  }

  // カスタム写真追加のキャンセル
  const cancelAddCustomPhoto = () => {
    setIsAddingCustomPhoto(false)
    setCustomPhotoTitle('')
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
      // eslint-disable-next-line no-console
      console.error('Error running analysis:', error)
      alert('分析の実行に失敗しました')
    } finally {
      setIsAnalyzing(false)
    }
  }

  // レポート生成
  // 診断データをDBに保存（正規化対応）
  const saveDiagnosisToDB = async () => {
    if (!sessionId) return false

    const payload = {
      sessionId,
      postureAnalysis: analysisResult?.postureAnalysis || {},
      oralAnalysis: analysisResult?.oralAnalysis || {},
      diagnosisItems: diagnosisValues,
      staffNotes,
      photos: photos.map(p => ({
        id: p.id,
        url: p.url,
        type: p.type,
        uploaded_at: p.uploaded_at,
        customTitle: p.customTitle,
      }))
    }

    try {
      console.log('[StaffDiagnosis] Saving diagnosis...')
      const res = await fetch('/api/diagnoses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error('Failed to save diagnosis')
      console.log('[StaffDiagnosis] Diagnosis saved successfully')
      return true
    } catch (e) {
      console.error('Error saving diagnosis:', e)
      alert('データの保存に失敗しました。')
      return false
    }
  }

  // レポート生成
  const generateReport = async () => {
    setIsGeneratingReport(true)
    try {
      // 1. 最新データをDBに保存
      const saved = await saveDiagnosisToDB()
      if (!saved) {
        setIsGeneratingReport(false)
        return
      }

      // 2. AIレポート生成API呼び出し
      console.log('[StaffDiagnosis] Generating report via API...')
      const res = await fetch('/api/ai/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      })

      if (!res.ok) throw new Error('AIレポート生成失敗')
      const reportData = await res.json()

      setAnalysisResult(prev => ({
        ...prev!,
        report: reportData,
      }))
      setEditableReport(reportData)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error generating report:', error)
      alert('レポートの生成に失敗しました')
    } finally {
      setIsGeneratingReport(false)
    }
  }

  // レポート送信（統合API使用）
  const sendReport = async () => {
    if (!session?.id) return

    setIsSending(true)
    try {
      // 診断完了→レポート作成→LINE送信の統合APIを呼び出し
      const res = await fetch('/api/diagnosis/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitId: session.id,
          aiSummary: editableReport?.summary || '診断が完了しました。',
          ageConsideration: editableReport?.analysis || '',
          postureAnalysis: analysisResult?.postureAnalysis,
          oralAnalysis: analysisResult?.oralAnalysis,
          sendLineNotification: true,
        }),
      })

      const result = await res.json()

      if (!result.success) {
        throw new Error(result.error || 'レポート送信に失敗しました')
      }

      // 成功時
      markStepCompleted('report')
      clearStorage()

      // LINE通知結果を表示
      if (result.lineNotification?.success) {
        alert(`✅ 診断レポートを送信しました！\n\nレポートURL:\n${result.report.url}`)
      } else {
        alert(`⚠️ レポートは作成されましたが、LINE通知の送信に失敗しました。\n\nレポートURL:\n${result.report.url}`)
      }

      router.push('/staff/home')
    } catch (error) {
      console.error('Error sending report:', error)
      alert('レポートの送信に失敗しました: ' + (error instanceof Error ? error.message : '不明なエラー'))
    } finally {
      setIsSending(false)
    }
  }

  // 現在のカテゴリ（診断ビュー用）
  // スクロールスパイの実装
  useEffect(() => {
    if (currentMainView !== 'diagnosis' || !diagnosisContainer) return

    const observer = new IntersectionObserver(
      (entries) => {
        // プログラムによるスクロール中は更新しない
        if (isScrollingRef.current) return

        // 表示されているカテゴリを見つける
        const visibleEntries = entries.filter(entry => entry.isIntersecting)
        if (visibleEntries.length > 0) {
          // 最も上部に近いカテゴリを選択
          const topEntry = visibleEntries.reduce((prev, current) => {
            return current.boundingClientRect.top < prev.boundingClientRect.top ? current : prev
          })
          const categoryId = topEntry.target.id.replace('category-', '')
          setActiveCategory(categoryId)
        }
      },
      {
        root: null, // ビューポートを基準にする
        rootMargin: '-120px 0px -70% 0px', // ヘッダーとタブの分を考慮して調整
        threshold: 0
      }
    )

    staffCategoryOrder.forEach((category) => {
      const element = document.getElementById(`category-${category}`)
      if (element) observer.observe(element)
    })

    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMainView, staffCategoryOrder])


  const currentCategoryItems = activeCategory ? (staffItemsByCategory[activeCategory] || []) : []

  // ステップラベル
  const stepLabels: Record<DiagnosisStep, string> = {
    start: '開始',
    session: 'セッション情報',
    photos: '写真撮影',
    diagnosis: '診断入力',
    review: '分析',
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
            <div className="grid grid-cols-2 gap-2">
              {item.options?.map(option => (
                <label
                  key={option.value}
                  className={cn(
                    'flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-all touch-manipulation font-medium',
                    value === option.value
                      ? 'border-coral-500 bg-coral-50 text-coral-700'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  )}
                >
                  <input
                    type="radio"
                    name={item.id}
                    value={option.value}
                    checked={value === option.value}
                    onChange={() => updateDiagnosisValue(item.id, option.value)}
                    className="sr-only"
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
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
            <div className="grid grid-cols-2 gap-2">
              {item.options?.map(option => {
                const isChecked = checkboxValue.includes(option.value)
                return (
                  <label
                    key={option.value}
                    className={cn(
                      'flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-all touch-manipulation font-medium',
                      isChecked
                        ? 'border-coral-500 bg-coral-50 text-coral-700'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        const newValue = e.target.checked
                          ? [...checkboxValue, option.value]
                          : checkboxValue.filter(v => v !== option.value)
                        updateDiagnosisValue(item.id, newValue)
                      }}
                      className="sr-only"
                    />
                    <span className="text-sm">{option.label}</span>
                  </label>
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
              className="h-11"
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
                className="h-11 flex-1"
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
              className="resize-none"
            />
          </div>
        )

      default:
        return null
    }
  }

  // 完了状態の判定（早期リターンの前に配置 - React Hooksのルール）
  const completedViews = useMemo(() => ({
    questionnaire: !!questionnaire,
    photos: photos.length > 0,
    diagnosis: diagnosisProgressPercentage > 0,
    review: false,
    report: !!analysisResult,
  }), [questionnaire, photos, diagnosisProgressPercentage, analysisResult])

  // ローディング状態
  if (isLoadingSession || isSchemaLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 mx-auto text-coral-500 animate-spin" />
          <p className="text-gray-600">データを読み込み中...</p>
        </div>
      </div>
    )
  }

  // エラー状態
  if (sessionError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4 max-w-md mx-auto px-4">
          <AlertCircle className="w-12 h-12 mx-auto text-red-500" />
          <h2 className="text-lg font-semibold text-gray-900">エラーが発生しました</h2>
          <p className="text-sm text-gray-600">{sessionError}</p>
          <div className="flex gap-2 justify-center">
            <Button
              onClick={() => router.push('/staff/scan')}
              variant="outline"
            >
              QRスキャンに戻る
            </Button>
            <Button
              onClick={() => {
                setSessionError(null)
                if (sessionId) {
                  // 再試行
                  window.location.reload()
                }
              }}
            >
              再試行
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // データ未取得状態
  if (!session || !questionnaire) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 mx-auto text-yellow-500" />
          <p className="text-gray-600">セッションデータが見つかりません</p>
          <Button
            onClick={() => router.push('/staff/scan')}
            variant="outline"
          >
            QRスキャンに戻る
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                {session?.child_name} ({session?.child_age}歳)
              </h1>
              {lastSaved && (
                <p className="text-xs text-gray-500">
                  自動保存: {lastSaved.toLocaleTimeString('ja-JP')}
                </p>
              )}
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
                onClick={() => router.push('/')}
                className="text-gray-600"
              >
                戻る
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 overflow-y-auto pb-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentMainView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="p-4"
          >
            {/* 問診ビュー */}
            {currentMainView === 'questionnaire' && questionnaire && (
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <FileText className="w-5 h-5" />
                    <span>セッション情報確認</span>
                  </CardTitle>
                  <CardDescription className="text-sm">
                    親御さんが入力した問診票内容を確認してください
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-2">お子様情報</h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <p className="text-sm"><span className="font-medium">お名前:</span> {questionnaire.child_name}</p>
                      <p className="text-sm"><span className="font-medium">年齢:</span> {questionnaire.child_age}歳</p>
                      <p className="text-sm"><span className="font-medium">性別:</span> {questionnaire.child_gender === 'male' ? '男' : questionnaire.child_gender === 'female' ? '女' : 'その他'}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-2">気になること</h3>
                    <div className="flex flex-wrap gap-2">
                      {questionnaire.concerns.map((concern, index) => (
                        <Badge key={index} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {concern}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-2">理想の状態</h3>
                    <div className="flex flex-wrap gap-2">
                      {questionnaire.ideal_goals.map((goal, index) => (
                        <Badge key={index} variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {goal}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {questionnaire.medical_history.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 mb-2">既往歴</h3>
                      <div className="flex flex-wrap gap-2">
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
                      <h3 className="text-sm font-medium text-gray-900 mb-2">スタッフへのメッセージ</h3>
                      <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-4">{questionnaire.notes}</p>
                    </div>
                  )}

                </CardContent>
              </Card>
            )}

            {/* 写真ビュー */}
            {currentMainView === 'photos' && (
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <Camera className="w-5 h-5" />
                    <span>写真撮影</span>
                  </CardTitle>
                  <CardDescription className="text-sm">
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
                      return (
                        <button
                          key={type.key}
                          onClick={() => {
                            if (existingPhoto) {
                              // 撮影済みの場合は写真を表示
                              viewSavedPhoto(existingPhoto)
                            } else {
                              // 未撮影の場合はカメラを起動
                              startCamera(type.key)
                            }
                          }}
                          className={cn(
                            'w-full border-2 rounded-xl p-4 transition-all text-left',
                            'hover:border-coral-300 hover:shadow-md active:scale-[0.98]',
                            existingPhoto
                              ? 'border-green-300 bg-green-50'
                              : 'border-gray-200 bg-white'
                          )}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="text-xl">{type.icon}</span>
                                <h3 className="font-semibold text-gray-900">{type.label}</h3>
                                {existingPhoto && (
                                  <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                                    撮影済み
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600">{type.description}</p>
                              {!existingPhoto && (
                                <p className="text-xs text-coral-600 mt-2 font-medium">
                                  👆 タップしてカメラを起動
                                </p>
                              )}
                              {existingPhoto && (
                                <p className="text-xs text-green-600 mt-2 font-medium">
                                  👆 タップして写真を確認
                                </p>
                              )}
                            </div>
                            {existingPhoto ? (
                              <div className="flex flex-col items-end gap-2">
                                <div className="relative">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={existingPhoto.url}
                                    alt={type.label}
                                    className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                                  />
                                </div>
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

                  {/* その他写真セクション */}
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-gray-900">その他写真</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={startAddCustomPhoto}
                        className="text-coral-600 border-coral-300 hover:bg-coral-50"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        追加
                      </Button>
                    </div>

                    {/* カスタム写真一覧 */}
                    {photos.filter(p => p.type === 'custom').length > 0 ? (
                      <div className="grid grid-cols-1 gap-3">
                        {photos.filter(p => p.type === 'custom').map((customPhoto) => (
                          <div
                            key={customPhoto.id}
                            className="border-2 border-purple-200 bg-purple-50 rounded-xl p-4"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="text-xl">📎</span>
                                  <h4 className="font-semibold text-gray-900">
                                    {customPhoto.customTitle || 'その他写真'}
                                  </h4>
                                  <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300">
                                    撮影済み
                                  </Badge>
                                </div>
                                <p className="text-xs text-gray-500">
                                  撮影: {new Date(customPhoto.uploaded_at).toLocaleString('ja-JP')}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <div className="relative">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={customPhoto.url}
                                    alt={customPhoto.customTitle || 'その他写真'}
                                    className="w-20 h-20 object-cover rounded-lg border border-gray-200 cursor-pointer"
                                    onClick={() => retakeCustomPhoto(customPhoto.id)}
                                  />
                                  <button
                                    onClick={() => deletePhoto(customPhoto.id)}
                                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                                <span className="text-xs text-gray-500">タップで再撮影</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                        <p className="text-sm text-gray-500">
                          その他の写真を追加する場合は<br />
                          「追加」ボタンをタップしてください
                        </p>
                      </div>
                    )}
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
              <div className="px-4 pt-4 pb-2 space-y-6">
                {staffCategoryOrder.map((category) => {
                  const items = staffItemsByCategory[category] || []
                  return (
                    <div key={category} id={`category-${category}`} className="scroll-mt-[115px]">
                      <Card className="shadow-sm">
                        <CardHeader className="pb-4">
                          <CardTitle className="text-lg">{category}</CardTitle>
                          <CardDescription className="text-sm">
                            {items.length}項目
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          {items.map(item => (
                            <div key={item.id} className="pb-6 border-b border-gray-100 last:border-0 last:pb-0">
                              {renderField(item)}
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    </div>
                  )
                })}
              </div>
            )}

            {/* 分析ビュー */}
            {currentMainView === 'review' && (
              <div className="space-y-6">
                {/* AI分析セクション */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <Brain className="w-5 h-5" />
                      <span>AI分析</span>
                    </CardTitle>
                    <CardDescription className="text-sm">
                      AI分析を実行してレポートを生成します
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
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
                      <div className="space-y-6">
                        {/* 姿勢分析結果 */}
                        {analysisResult.postureAnalysis && (
                          <div className="bg-blue-50 rounded-lg p-4">
                            <h3 className="font-semibold text-gray-900 mb-2">姿勢分析結果</h3>
                            <div className="space-y-2 text-sm">
                              <p><span className="font-medium">総合スコア:</span> {analysisResult.postureAnalysis.overallScore}/10</p>
                              <p><span className="font-medium">問題点:</span> {analysisResult.postureAnalysis.issues.join(', ')}</p>
                              <p><span className="font-medium">推奨事項:</span> {analysisResult.postureAnalysis.recommendations.join(', ')}</p>
                            </div>
                          </div>
                        )}

                        {/* 口腔分析結果 */}
                        {analysisResult.oralAnalysis && (
                          <div className="bg-green-50 rounded-lg p-4">
                            <h3 className="font-semibold text-gray-900 mb-2">口腔機能分析結果</h3>
                            <div className="space-y-2 text-sm">
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
                          <div className="space-y-4">
                            <h3 className="font-semibold text-gray-900">レポート内容</h3>
                            <div className="space-y-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-900 mb-2">要約</label>
                                <Textarea
                                  value={editableReport.summary}
                                  onChange={(e) => setEditableReport({ ...editableReport, summary: e.target.value })}
                                  rows={3}
                                  className="resize-none"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-900 mb-2">分析</label>
                                <Textarea
                                  value={editableReport.analysis}
                                  onChange={(e) => setEditableReport({ ...editableReport, analysis: e.target.value })}
                                  rows={5}
                                  className="resize-none"
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
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <Send className="w-5 h-5" />
                    <span>レポート送信</span>
                  </CardTitle>
                  <CardDescription className="text-sm">
                    最終レポートを確認して送信してください
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {editableReport ? (
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">要約</h3>
                        <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-4">{editableReport.summary}</p>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">分析</h3>
                        <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-4">{editableReport.analysis}</p>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">推奨事項</h3>
                        <ul className="list-disc list-inside text-sm text-gray-700 bg-gray-50 rounded-lg p-4 space-y-1">
                          {editableReport.recommendations.map((rec: string, index: number) => (
                            <li key={index}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">次のステップ</h3>
                        <ul className="list-disc list-inside text-sm text-gray-700 bg-gray-50 rounded-lg p-4 space-y-1">
                          {editableReport.nextSteps.map((step: string, index: number) => (
                            <li key={index}>{step}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">メッセージ</h3>
                        <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-4">{editableReport.encouragingMessage}</p>
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
                        分析に戻る
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>
      </main >

      {/* 下部ナビゲーションメニュー */}
      < nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50" >
        <div className="flex">
          {[
            { view: 'questionnaire' as MainView, label: '問診', icon: <FileText className="w-5 h-5" /> },
            { view: 'photos' as MainView, label: '写真', icon: <Camera className="w-5 h-5" /> },
            { view: 'diagnosis' as MainView, label: '診断', icon: <CheckCircle2 className="w-5 h-5" /> },
            { view: 'review' as MainView, label: '分析', icon: <Brain className="w-5 h-5" /> },
            { view: 'report' as MainView, label: 'レポート', icon: <Send className="w-5 h-5" /> },
          ].map(({ view, label, icon }) => (
            <button
              key={view}
              type="button"
              onClick={(e) => {
                e.preventDefault()
                setCurrentMainView(view)
              }}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-2 px-1 transition-colors",
                currentMainView === view
                  ? "text-blue-600 bg-blue-50"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              <div className="relative">
                {icon}
                {completedViews[view] && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
                )}
              </div>
              <span className="text-xs mt-1">{label}</span>
            </button>
          ))}
        </div>
      </nav >

      {/* カスタム写真タイトル入力モーダル */}
      {isAddingCustomPhoto && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              その他写真を追加
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  写真のタイトル
                </label>
                <Input
                  value={customPhotoTitle}
                  onChange={(e) => setCustomPhotoTitle(e.target.value)}
                  placeholder="例: 舌の裏側、歯の側面など"
                  className="w-full"
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={cancelAddCustomPhoto}
                  className="flex-1"
                >
                  キャンセル
                </Button>
                <Button
                  onClick={confirmCustomPhotoTitle}
                  className="flex-1 bg-coral-500 hover:bg-coral-600"
                  disabled={!customPhotoTitle.trim()}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  撮影へ
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 写真プレビューモーダル（フルスクリーン） */}
      {previewPhoto && (
        <div
          className="fixed inset-0 bg-black z-[9999]"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            touchAction: 'none',
            overscrollBehavior: 'none',
            overflow: 'hidden'
          }}
        >
          {/* 上部：ボタンエリア - 絶対位置で上部固定 */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              backgroundColor: '#000',
              padding: '16px',
              zIndex: 10
            }}
          >
            <div className="text-center text-white mb-3">
              <p className="text-base font-semibold">
                {previewPhoto.type === 'custom'
                  ? customPhotoTitle || 'その他写真'
                  : previewPhoto.type.startsWith('custom-')
                    ? photos.find(p => p.id === previewPhoto.type)?.customTitle || 'その他写真'
                    : photoTypes.find(t => t.key === previewPhoto.type)?.label
                }
              </p>
              <p className="text-sm text-gray-300">
                この写真でよろしいですか？
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={closePreview}
                className="flex-1 h-12 bg-white/10 border-white/30 text-white hover:bg-white/20 text-sm"
              >
                <X className="w-4 h-4 mr-1" />
                キャンセル
              </Button>
              <Button
                variant="outline"
                onClick={retakePhoto}
                className="flex-1 h-12 bg-yellow-500/30 border-yellow-500/50 text-yellow-200 hover:bg-yellow-500/40 text-sm"
              >
                <Camera className="w-4 h-4 mr-1" />
                撮り直す
              </Button>
              <Button
                onClick={savePreviewPhoto}
                className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white text-sm font-bold"
              >
                <Check className="w-4 h-4 mr-1" />
                保存
              </Button>
            </div>
          </div>

          {/* 下部：画像エリア */}
          <div
            style={{
              position: 'absolute',
              top: '160px',
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px',
              overflow: 'hidden'
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewPhoto.url}
              alt="プレビュー"
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                borderRadius: '8px'
              }}
            />
          </div>
        </div>
      )}

      {/* 保存済み写真表示モーダル */}
      {viewingPhoto && (
        <div className="fixed inset-0 bg-black z-[100] flex flex-col">
          {/* 写真表示エリア */}
          <div className="flex-1 flex items-center justify-center p-4 min-h-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={viewingPhoto.url}
              alt="保存済み写真"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>

          {/* ボタンエリア */}
          <div className="flex-shrink-0 bg-black/95 p-4 pb-8" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
            <div className="text-center text-white mb-4">
              <p className="text-lg font-semibold">
                {viewingPhoto.type === 'custom'
                  ? viewingPhoto.customTitle || 'その他写真'
                  : photoTypes.find(t => t.key === viewingPhoto.type)?.label
                }
              </p>
              <p className="text-sm text-gray-300">
                撮影済みの写真です
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={closeViewingPhoto}
                className="flex-1 h-12 bg-white/10 border-white/30 text-white hover:bg-white/20 text-sm"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                戻る
              </Button>
              <Button
                onClick={retakeFromViewing}
                className="flex-1 h-12 bg-coral-500 hover:bg-coral-600 text-white text-sm font-bold"
              >
                <Camera className="w-4 h-4 mr-1" />
                再撮影
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
                {currentPhotoType === 'custom'
                  ? customPhotoTitle || 'その他写真'
                  : currentPhotoType.startsWith('custom-')
                    ? photos.find(p => p.id === currentPhotoType)?.customTitle || 'その他写真'
                    : photoTypes.find(t => t.key === currentPhotoType)?.label
                }
              </p>
              <p className="text-sm text-gray-300">
                {currentPhotoType === 'custom' || currentPhotoType.startsWith('custom-')
                  ? 'タップして撮影してください'
                  : photoTypes.find(t => t.key === currentPhotoType)?.description
                }
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
    </div >
  )
}
