'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DynamicForm, type DynamicFormRef } from '@/components/forms/dynamic-form'
import {
  calculateAge,
  getFormType,
  createDateFromParts,
  formatDateToISO,
  generateYearOptions,
  generateMonthOptions,
  generateDayOptions
} from '@/utils/age-calculator'
import type { FormSchemaConfig, FormFieldConfig, FormSectionConfig } from '@/types/forms'
import { initLiff, liffLogin, preloadLiffSdk, type LiffProfile } from '@/lib/liff-utils'
import { AlertCircle, Loader2, CheckCircle2, Smartphone } from 'lucide-react'

// LIFF SDKをページロード時にプリロード開始
if (typeof window !== 'undefined') {
  preloadLiffSdk()
}

// ============================================================================
// Types
// ============================================================================

type LiffStatus = 'initializing' | 'not_in_line' | 'not_logged_in' | 'loading_data' | 'ready' | 'error'

interface ParentProfile {
  id: string
  displayName: string
  firstName?: string
  lastName?: string
  phoneNumber?: string
}

interface ChildData {
  id: string
  firstName: string
  lastName: string
  firstNameKana?: string
  lastNameKana?: string
  birthday: string
  gender: string
}

interface VisitData {
  id: string
  sessionId: string
  status: string
  visitDate: string
  childAgeMonths?: number
  eventId?: string
}

// ============================================================================
// Validation Schema
// ============================================================================

const basicInfoSchema = z.object({
  childLastName: z.string().min(1, 'お子様の姓を入力してください'),
  childFirstName: z.string().min(1, 'お子様の名を入力してください'),
  childLastNameKana: z.string().optional(),
  childFirstNameKana: z.string().optional(),
  birthYear: z.number().min(2000).max(new Date().getFullYear(), '正しい年を選択してください'),
  birthMonth: z.number().min(1).max(12, '正しい月を選択してください'),
  birthDay: z.number().min(1).max(31, '正しい日を選択してください'),
  prefecture: z.string().optional(),
  childGender: z.enum(['male', 'female', 'other'], {
    required_error: '性別を選択してください',
  }),
  nickname: z.string().optional(),
  parentLastName: z.string().min(1, '保護者の姓を入力してください'),
  parentFirstName: z.string().min(1, '保護者の名を入力してください'),
  parentLastNameKana: z.string().optional(),
  parentFirstNameKana: z.string().optional(),
  parentPhone: z.string().regex(/^(\+81|0)[0-9]{9,10}$/, '正しい電話番号を入力してください'),
}).refine((data) => {
  const date = createDateFromParts(data.birthYear, data.birthMonth, data.birthDay)
  return date.getFullYear() === data.birthYear &&
    date.getMonth() === data.birthMonth - 1 &&
    date.getDate() === data.birthDay
}, {
  message: '正しい日付を選択してください',
  path: ['birthDay'],
})

type BasicInfoForm = z.infer<typeof basicInfoSchema>

// ============================================================================
// Component
// ============================================================================

export default function LiffQuestionnairePage() {
  const router = useRouter()

  // LIFF状態
  const [liffStatus, setLiffStatus] = useState<LiffStatus>('initializing')
  const [liffProfile, setLiffProfile] = useState<LiffProfile | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')

  // データ状態
  const [parentProfile, setParentProfile] = useState<ParentProfile | null>(null)
  const [childData, setChildData] = useState<ChildData | null>(null)
  const [visitData, setVisitData] = useState<VisitData | null>(null)
  const [restoredResponses, setRestoredResponses] = useState<Record<string, string>>({})

  // フォーム状態
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [calculatedAge, setCalculatedAge] = useState<number | null>(null)
  const [formType, setFormType] = useState<'preschooler' | 'elementary' | null>(null)
  const [activeFormSchema, setActiveFormSchema] = useState<FormSchemaConfig | null>(null)
  const [isSchemaLoading, setIsSchemaLoading] = useState(false)
  const questionnaireFormRef = useRef<DynamicFormRef>(null)

  // react-hook-form
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BasicInfoForm>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      birthYear: undefined,
      birthMonth: undefined,
      birthDay: undefined,
    },
  })

  const birthYear = watch('birthYear')
  const birthMonth = watch('birthMonth')
  const birthDay = watch('birthDay')

  // ============================================================================
  // LIFF初期化
  // ============================================================================

  useEffect(() => {
    const initializeLiff = async () => {
      const liffId = process.env.NEXT_PUBLIC_PARENT_LIFF_ID

      if (!liffId) {
        setLiffStatus('error')
        setErrorMessage('LIFF IDが設定されていません')
        return
      }

      const result = await initLiff(liffId)

      if (!result.success) {
        setLiffStatus('error')
        setErrorMessage(result.error || '初期化に失敗しました')
        return
      }

      // LINEアプリ外で開かれた場合
      if (!result.isInClient) {
        setLiffStatus('not_in_line')
        return
      }

      // ログインしていない場合
      if (!result.isLoggedIn) {
        setLiffStatus('not_logged_in')
        return
      }

      // プロフィール取得成功
      if (result.profile) {
        setLiffProfile(result.profile)
        setLiffStatus('loading_data')

        // 既存データを取得
        await loadExistingData(result.profile.userId)
      }
    }

    initializeLiff()
  }, [])

  // ============================================================================
  // 既存データ読み込み
  // ============================================================================

  const loadExistingData = async (lineUserId: string) => {
    try {
      const res = await fetch(`/api/parent/visit?line_user_id=${encodeURIComponent(lineUserId)}`)
      const data = await res.json()

      if (!data.success) {
        setLiffStatus('ready')
        return
      }

      // プロフィール設定
      if (data.profile) {
        setParentProfile(data.profile)
      }

      // 子供データ設定
      if (data.child) {
        setChildData(data.child)

        // フォームに復元（姓名分離）
        if (data.child.lastName) setValue('childLastName', data.child.lastName)
        if (data.child.firstName) setValue('childFirstName', data.child.firstName)
        if (data.child.lastNameKana) setValue('childLastNameKana', data.child.lastNameKana)
        if (data.child.firstNameKana) setValue('childFirstNameKana', data.child.firstNameKana)
        if (data.child.gender) setValue('childGender', data.child.gender as 'male' | 'female' | 'other')

        // 生年月日を復元
        if (data.child.birthday) {
          const bd = new Date(data.child.birthday)
          setValue('birthYear', bd.getFullYear())
          setValue('birthMonth', bd.getMonth() + 1)
          setValue('birthDay', bd.getDate())
        }
      }

      // 保護者情報を復元（姓名分離）
      if (data.profile) {
        if (data.profile.lastName) setValue('parentLastName', data.profile.lastName)
        if (data.profile.firstName) setValue('parentFirstName', data.profile.firstName)
        if (data.profile.lastNameKana) setValue('parentLastNameKana', data.profile.lastNameKana)
        if (data.profile.firstNameKana) setValue('parentFirstNameKana', data.profile.firstNameKana)
        if (data.profile.phoneNumber) setValue('parentPhone', data.profile.phoneNumber)
      }

      // Visit設定
      if (data.visit) {
        setVisitData(data.visit)

        // 問診回答を復元
        if (data.questionnaireResponses && data.questionnaireResponses.length > 0) {
          const restored: Record<string, string> = {}
          for (const r of data.questionnaireResponses) {
            restored[r.item_id] = r.value
          }
          setRestoredResponses(restored)

          // 問診途中なら問診ステップへ
          if (data.visit.status === 'questionnaire_in_progress') {
            setCurrentStep(2)
          }
        }
      }

      setLiffStatus('ready')
    } catch (error) {
      console.error('[LIFF] Load data error:', error)
      setLiffStatus('ready')
    }
  }

  // ============================================================================
  // 年齢計算・フォームタイプ判定
  // ============================================================================

  useEffect(() => {
    if (birthYear && birthMonth && birthDay) {
      const birthday = createDateFromParts(birthYear, birthMonth, birthDay)
      const age = calculateAge(birthday)
      setCalculatedAge(age)
      setFormType(getFormType(age))
    } else {
      setCalculatedAge(null)
      setFormType(null)
    }
  }, [birthYear, birthMonth, birthDay])

  // ============================================================================
  // 問診スキーマ取得
  // ============================================================================

  useEffect(() => {
    if (!formType) {
      setActiveFormSchema(null)
      return
    }

    const fetchSchema = async () => {
      setIsSchemaLoading(true)
      try {
        const targetAge = formType === 'preschooler' ? 'preschool' : 'elementary'
        const res = await fetch(`/api/questionnaire/items?target_age=${targetAge}`)

        if (res.ok) {
          const json = await res.json()
          if (json.success && json.data?.categories) {
            const convertedSchema = convertToFormSchema(json.data)
            setActiveFormSchema(convertedSchema)
          }
        }
      } catch (error) {
        console.error('[LIFF] Schema fetch error:', error)
      } finally {
        setIsSchemaLoading(false)
      }
    }

    fetchSchema()
  }, [formType])

  // DB項目をFormSchemaConfig形式に変換
  const convertToFormSchema = (apiData: {
    categories: Array<{
      id: string
      name: string
      description?: string
      display_order: number
      items: Array<{
        id: string
        question: string
        answer_type: string
        options?: Array<{ value: string; label: string }>
        is_required: boolean
        placeholder?: string
        helper_text?: string
        validation?: { min?: number; max?: number; minLength?: number; maxLength?: number }
        display_order: number
      }>
    }>
  }): FormSchemaConfig => {
    const sections: FormSectionConfig[] = apiData.categories.map((category) => ({
      id: category.id,
      title: category.name,
      description: category.description,
      order: category.display_order,
      fields: category.items.map((item): FormFieldConfig => {
        const typeMap: Record<string, FormFieldConfig['type']> = {
          'radio': 'radio',
          'checkbox': 'checkbox',
          'text': 'text',
          'textarea': 'textarea',
          'number': 'number',
          'select': 'select',
          'multi-select': 'multi-select',
          'date': 'date',
          'email': 'email',
          'tel': 'tel',
        }

        return {
          id: item.id,
          name: item.question,
          type: typeMap[item.answer_type] || 'text',
          required: item.is_required,
          placeholder: item.placeholder,
          helperText: item.helper_text,
          options: item.options,
          validation: item.validation,
        }
      }),
    }))

    return {
      sections,
      settings: {
        showProgress: true,
        allowBackNavigation: true,
      },
    }
  }

  // ============================================================================
  // 基本情報送信
  // ============================================================================

  const onBasicInfoSubmit = async (data: BasicInfoForm) => {
    if (!liffProfile) return

    setIsLoading(true)
    try {
      // 生年月日（タイムゾーンに依存しないISO形式で送信）
      const birthday = createDateFromParts(data.birthYear, data.birthMonth, data.birthDay)
      const birthdayStr = formatDateToISO(data.birthYear, data.birthMonth, data.birthDay)

      // API呼び出し（姓名分離で送信）
      const res = await fetch('/api/parent/basic-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineUserId: liffProfile.userId,
          sessionId: visitData?.sessionId,
          parentName: `${data.parentLastName} ${data.parentFirstName}`,
          parentLastName: data.parentLastName,
          parentFirstName: data.parentFirstName,
          parentLastNameKana: data.parentLastNameKana,
          parentFirstNameKana: data.parentFirstNameKana,
          parentPhone: data.parentPhone,
          childName: `${data.childLastName} ${data.childFirstName}`,
          childLastName: data.childLastName,
          childFirstName: data.childFirstName,
          childLastNameKana: data.childLastNameKana,
          childFirstNameKana: data.childFirstNameKana,
          childBirthday: birthdayStr,
          childGender: data.childGender,
          childNickname: data.nickname,
          prefecture: data.prefecture,
        }),
      })

      const result = await res.json()

      if (result.success) {
        // visitDataを更新
        if (result.visitId || result.sessionId) {
          setVisitData(prev => ({
            ...prev,
            id: result.visitId || prev?.id || '',
            sessionId: result.sessionId || prev?.sessionId || '',
            status: 'questionnaire_in_progress',
            visitDate: prev?.visitDate || new Date().toISOString(),
          }))
        }

        // 問診ステップへ
        setCurrentStep(2)
      } else {
        console.error('[LIFF] Basic info save error:', result.error)
        alert('保存に失敗しました。もう一度お試しください。')
      }
    } catch (error) {
      console.error('[LIFF] Basic info submit error:', error)
      alert('エラーが発生しました。')
    } finally {
      setIsLoading(false)
    }
  }

  // ============================================================================
  // 問診完了
  // ============================================================================

  const handleQuestionnaireComplete = async (formData: Record<string, unknown>) => {
    if (!visitData?.sessionId) return

    setIsLoading(true)
    try {
      // 問診回答を保存
      const res = await fetch('/api/parent/questionnaire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: visitData.sessionId,
          visitId: visitData.id,
          answers: formData,
        }),
      })

      const result = await res.json()

      if (result.success) {
        // QR表示ステップへ
        setCurrentStep(3)
      } else {
        console.error('[LIFF] Questionnaire save error:', result.error)
        alert('保存に失敗しました。')
      }
    } catch (error) {
      console.error('[LIFF] Questionnaire submit error:', error)
      alert('エラーが発生しました。')
    } finally {
      setIsLoading(false)
    }
  }

  // ============================================================================
  // 自動保存（入力ごと）
  // ============================================================================

  const handleAutoSave = useCallback(async (fieldId: string, value: unknown) => {
    if (!visitData?.id && !visitData?.sessionId) return

    try {
      await fetch('/api/parent/questionnaire/autosave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitId: visitData.id,
          sessionId: visitData.sessionId,
          itemId: fieldId,
          value: String(value),
        }),
      })
    } catch (error) {
      // 自動保存エラーは無視（次回保存で上書き）
      console.warn('[LIFF] Auto save error:', error)
    }
  }, [visitData?.id, visitData?.sessionId])

  // ============================================================================
  // Render: LIFF状態別
  // ============================================================================

  // 初期化中 - スケルトンUIで体感速度向上
  if (liffStatus === 'initializing' || liffStatus === 'loading_data') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-coral-50 to-white">
        {/* ヘッダースケルトン */}
        <div className="bg-white border-b px-4 py-3">
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
        
        {/* コンテンツスケルトン */}
        <div className="p-4 space-y-4">
          <Card>
            <CardHeader>
              <div className="h-5 w-24 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-4 w-48 bg-gray-100 rounded animate-pulse" />
            </CardHeader>
            <CardContent className="space-y-4">
              {/* フォームフィールドスケルトン */}
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                  <div className="h-10 w-full bg-gray-100 rounded animate-pulse" />
                </div>
              ))}
            </CardContent>
          </Card>
          
          {/* ローディングインジケーター */}
          <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{liffStatus === 'initializing' ? 'LINE認証中...' : 'データを読み込み中...'}</span>
          </div>
        </div>
      </div>
    )
  }

  // LINEアプリ外で開かれた場合
  if (liffStatus === 'not_in_line') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-coral-50 to-white p-4">
        <Card className="max-w-sm w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-[#06C755]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Smartphone className="w-8 h-8 text-[#06C755]" />
            </div>
            <CardTitle>LINEアプリで開いてください</CardTitle>
            <CardDescription>
              この問診票はLINEアプリ内でのみご利用いただけます。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 text-center">
              LINE公式アカウント「cOralup」のメニューから
              「問診を開始」をタップしてください。
            </p>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-xs text-gray-500">
                ※ ブラウザで直接開くことはできません
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 未ログイン
  if (liffStatus === 'not_logged_in') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-coral-50 to-white p-4">
        <Card className="max-w-sm w-full">
          <CardHeader className="text-center">
            <CardTitle>ログインが必要です</CardTitle>
            <CardDescription>
              LINEアカウントでログインしてください
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => liffLogin()}
              className="w-full bg-[#06C755] hover:bg-[#05b04c]"
            >
              LINEでログイン
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // エラー
  if (liffStatus === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-coral-50 to-white p-4">
        <Card className="max-w-sm w-full border-red-200">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <CardTitle className="text-red-800">エラーが発生しました</CardTitle>
            <CardDescription className="text-red-600">
              {errorMessage}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="w-full"
            >
              再読み込み
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ============================================================================
  // Render: メインフォーム
  // ============================================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-coral-50 to-white">
      {/* ヘッダー */}
      <header className="bg-white/80 backdrop-blur border-b border-coral-100 sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-coral-600">cOralup 問診票</h1>
            {liffProfile && (
              <p className="text-xs text-gray-500">{liffProfile.displayName}さん</p>
            )}
          </div>
          <Badge variant="outline" className="text-coral-600 border-coral-200">
            {currentStep === 1 && '基本情報'}
            {currentStep === 2 && '問診'}
            {currentStep === 3 && 'QRコード'}
          </Badge>
        </div>
        {/* プログレスバー */}
        <div className="h-1 bg-coral-100">
          <div
            className="h-full bg-coral-500 transition-all duration-300"
            style={{ width: `${(currentStep / 3) * 100}%` }}
          />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {/* ステップ1: 基本情報 */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-8 h-8 bg-coral-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </span>
                基本情報
              </CardTitle>
              <CardDescription>
                お子様と保護者の情報を入力してください
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onBasicInfoSubmit)} className="space-y-4">
                {/* お子様のお名前（姓名横並び） */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    お子様のお名前 <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Input
                        {...register('childLastName')}
                        placeholder="姓（例: 山田）"
                      />
                      {errors.childLastName && (
                        <p className="text-red-500 text-xs mt-1">{errors.childLastName.message}</p>
                      )}
                    </div>
                    <div>
                      <Input
                        {...register('childFirstName')}
                        placeholder="名（例: 太郎）"
                      />
                      {errors.childFirstName && (
                        <p className="text-red-500 text-xs mt-1">{errors.childFirstName.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* ふりがな（姓名横並び） */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ふりがな
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      {...register('childLastNameKana')}
                      placeholder="せい（例: やまだ）"
                    />
                    <Input
                      {...register('childFirstNameKana')}
                      placeholder="めい（例: たろう）"
                    />
                  </div>
                </div>

                {/* 生年月日 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    生年月日 <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      {...register('birthYear', { valueAsNumber: true })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">年</option>
                      {generateYearOptions().map((y) => (
                        <option key={y} value={y}>{y}年</option>
                      ))}
                    </select>
                    <select
                      {...register('birthMonth', { valueAsNumber: true })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">月</option>
                      {generateMonthOptions().map((m) => (
                        <option key={m} value={m}>{m}月</option>
                      ))}
                    </select>
                    <select
                      {...register('birthDay', { valueAsNumber: true })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">日</option>
                      {generateDayOptions(birthYear, birthMonth).map((d) => (
                        <option key={d} value={d}>{d}日</option>
                      ))}
                    </select>
                  </div>
                  {(errors.birthYear || errors.birthMonth || errors.birthDay) && (
                    <p className="text-red-500 text-xs mt-1">生年月日を選択してください</p>
                  )}
                  {calculatedAge !== null && (
                    <p className="text-coral-600 text-sm mt-1">
                      {calculatedAge}歳
                      {formType && (
                        <span className="ml-2 text-gray-500">
                          （{formType === 'preschooler' ? '未就学児' : '小学生'}用問診）
                        </span>
                      )}
                    </p>
                  )}
                </div>

                {/* 性別 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    性別 <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-4">
                    {[
                      { value: 'male', label: '男の子' },
                      { value: 'female', label: '女の子' },
                      { value: 'other', label: 'その他' },
                    ].map((option) => (
                      <label key={option.value} className="flex items-center gap-2">
                        <input
                          type="radio"
                          {...register('childGender')}
                          value={option.value}
                          className="w-4 h-4 text-coral-500"
                        />
                        <span className="text-sm">{option.label}</span>
                      </label>
                    ))}
                  </div>
                  {errors.childGender && (
                    <p className="text-red-500 text-xs mt-1">{errors.childGender.message}</p>
                  )}
                </div>

                {/* 保護者のお名前（姓名横並び） */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    保護者のお名前 <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Input
                        {...register('parentLastName')}
                        placeholder="姓（例: 山田）"
                      />
                      {errors.parentLastName && (
                        <p className="text-red-500 text-xs mt-1">{errors.parentLastName.message}</p>
                      )}
                    </div>
                    <div>
                      <Input
                        {...register('parentFirstName')}
                        placeholder="名（例: 花子）"
                      />
                      {errors.parentFirstName && (
                        <p className="text-red-500 text-xs mt-1">{errors.parentFirstName.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 保護者ふりがな（姓名横並び） */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    保護者ふりがな
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      {...register('parentLastNameKana')}
                      placeholder="せい（例: やまだ）"
                    />
                    <Input
                      {...register('parentFirstNameKana')}
                      placeholder="めい（例: はなこ）"
                    />
                  </div>
                </div>

                {/* 電話番号 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    電話番号 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    {...register('parentPhone')}
                    type="tel"
                    placeholder="例: 09012345678"
                  />
                  {errors.parentPhone && (
                    <p className="text-red-500 text-xs mt-1">{errors.parentPhone.message}</p>
                  )}
                </div>

                {/* 送信ボタン */}
                <Button
                  type="submit"
                  disabled={isLoading || !formType}
                  className="w-full bg-coral-500 hover:bg-coral-600"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    '次へ：問診票入力'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* ステップ2: 問診 */}
        {currentStep === 2 && activeFormSchema && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-8 h-8 bg-coral-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </span>
                問診票
              </CardTitle>
              <CardDescription>
                お子様の状態について教えてください
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isSchemaLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 text-coral-500 animate-spin" />
                </div>
              ) : (
                <DynamicForm
                  ref={questionnaireFormRef}
                  schema={activeFormSchema}
                  defaultValues={restoredResponses}
                  onSubmit={handleQuestionnaireComplete}
                  submitLabel="次へ：QRコード表示"
                  isSubmitting={isLoading}
                />
              )}

              {/* 戻るボタン */}
              <Button
                variant="ghost"
                onClick={() => setCurrentStep(1)}
                className="w-full mt-4"
              >
                ← 基本情報に戻る
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ステップ3: QRコード表示 */}
        {currentStep === 3 && visitData && (
          <Card className="border-green-200 bg-green-50/30">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-green-800">問診票の入力が完了しました</CardTitle>
              <CardDescription>
                このQRコードをスタッフに見せてください
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              {/* QRコード */}
              <div className="bg-white p-4 rounded-xl shadow-lg mb-4">
                <QRCodeDisplay visitId={visitData.id} />
              </div>

              <p className="text-sm text-gray-600 text-center mb-4">
                受付番号: <span className="font-mono font-bold">{visitData.id.slice(0, 8).toUpperCase()}</span>
              </p>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                <p className="text-xs text-yellow-800">
                  💡 この画面を閉じても、LINEから再度開けます
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}

// ============================================================================
// QRコード表示コンポーネント
// ============================================================================

function QRCodeDisplay({ visitId }: { visitId: string }) {
  const [qrUrl, setQrUrl] = useState<string>('')

  useEffect(() => {
    const generateQR = async () => {
      try {
        const { QRCodeSVG } = await import('qrcode.react')
        // QRコードのデータ
        const qrData = JSON.stringify({
          type: 'coralup_visit',
          visitId,
          version: 1,
        })

        // SVGをdata URLに変換
        const svg = document.createElement('div')
        const { createRoot } = await import('react-dom/client')
        const root = createRoot(svg)
        root.render(<QRCodeSVG value={qrData} size={200} level="M" />)

        // 少し待ってからSVGを取得
        setTimeout(() => {
          const svgElement = svg.querySelector('svg')
          if (svgElement) {
            const svgString = new XMLSerializer().serializeToString(svgElement)
            const dataUrl = `data:image/svg+xml;base64,${btoa(svgString)}`
            setQrUrl(dataUrl)
          }
        }, 100)
      } catch (error) {
        console.error('QR generation error:', error)
      }
    }

    generateQR()
  }, [visitId])

  if (!qrUrl) {
    return (
      <div className="w-[200px] h-[200px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={qrUrl} alt="QRコード" className="w-[200px] h-[200px]" />
  )
}

