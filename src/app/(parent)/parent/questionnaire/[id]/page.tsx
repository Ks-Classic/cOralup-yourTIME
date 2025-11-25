'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { DynamicForm } from '@/components/forms/dynamic-form'
import type { FormSchema } from '@/types/forms'
import { 
  calculateAge, 
  getFormType, 
  createDateFromParts,
  generateYearOptions,
  generateMonthOptions,
  generateDayOptions
} from '@/utils/age-calculator'
import { preschoolerFormSchema } from '@/data/preschooler-form-schema'
import { elementaryFormSchema } from '@/data/elementary-form-schema'

// フォームのバリデーションスキーマ
const basicInfoSchema = z.object({
  furigana: z.string().optional(),
  childName: z.string().min(1, 'お子様のお名前を入力してください'),
  birthYear: z.number().min(2000).max(new Date().getFullYear(), '正しい年を選択してください'),
  birthMonth: z.number().min(1).max(12, '正しい月を選択してください'),
  birthDay: z.number().min(1).max(31, '正しい日を選択してください'),
  prefecture: z.string().optional(),
  childGender: z.enum(['male', 'female', 'other'], {
    required_error: '性別を選択してください',
  }),
  nickname: z.string().optional(),
  parentName: z.string().min(1, '保護者のお名前を入力してください'),
  parentPhone: z.string().regex(/^(\+81|0)[0-9]{9,10}$/, '正しい電話番号を入力してください'),
}).refine((data) => {
  // 日付の妥当性チェック
  const date = createDateFromParts(data.birthYear, data.birthMonth, data.birthDay)
  return date.getFullYear() === data.birthYear && 
         date.getMonth() === data.birthMonth - 1 && 
         date.getDate() === data.birthDay
}, {
  message: '正しい日付を選択してください',
  path: ['birthDay'],
})

const questionnaireSchema = z.object({
  medicalHistory: z.array(z.string()),
  concerns: z.array(z.string()),
  idealGoals: z.array(z.string()),
  notes: z.string().optional(),
})

type BasicInfoForm = z.infer<typeof basicInfoSchema>
type QuestionnaireForm = z.infer<typeof questionnaireSchema>

export default function QuestionnairePage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [sessionId, setSessionId] = useState<string>('')
  const [eventId, setEventId] = useState<string | null>(null)
  const [sessionSummaryData, setSessionSummaryData] = useState<any>(null)
  const [calculatedAge, setCalculatedAge] = useState<number | null>(null)
  const [formType, setFormType] = useState<'preschooler' | 'elementary' | null>(null)

  // デバッグ用: コンポーネントが読み込まれているか確認
  useEffect(() => {
    console.log('[QuestionnairePage] Component mounted')
  }, [])

  // パラメータの解決（Next.js 14対応）
  useEffect(() => {
    const resolveParams = async () => {
      try {
        const resolvedParams = 'then' in params ? await params : params
        const id = resolvedParams.id
        console.log('[QuestionnairePage] Resolved session ID:', id)
        setSessionId(id || 'demo')
      } catch (error) {
        console.error('[QuestionnairePage] Error resolving params:', error)
        setSessionId('demo')
      }
    }
    resolveParams()
  }, [params])

  // フォームのセットアップ
  const basicInfoForm = useForm<BasicInfoForm>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      birthYear: new Date().getFullYear() - 8,
      birthMonth: 1,
      birthDay: 1,
    },
  })

  // 生年月日から年齢を自動計算
  const watchedBirthDate = basicInfoForm.watch(['birthYear', 'birthMonth', 'birthDay'])
  
  useEffect(() => {
    const [year, month, day] = watchedBirthDate
    if (year && month && day) {
      try {
        const birthDate = createDateFromParts(year, month, day)
        const age = calculateAge(birthDate)
        setCalculatedAge(age)
        setFormType(getFormType(age))
      } catch (error) {
        setCalculatedAge(null)
        setFormType(null)
      }
    }
  }, [watchedBirthDate])

  // 年のオプション生成
  const yearOptions = useMemo(() => generateYearOptions(0, 18), [])
  const monthOptions = useMemo(() => generateMonthOptions(), [])
  
  // 日のオプション生成（年と月に依存）
  const dayOptions = useMemo(() => {
    const [year, month] = watchedBirthDate
    if (year && month) {
      return generateDayOptions(year, month)
    }
    return generateDayOptions(new Date().getFullYear(), 1)
  }, [watchedBirthDate])

  // セッションデータの取得
  useEffect(() => {
    if (!sessionId) return // sessionIdが設定されるまで待つ

    const fetchSessionData = async () => {
      setIsInitializing(true)
      try {
        const response = await fetch(`/api/parent/questionnaire/${sessionId}`)
        const data = await response.json()
        
        // セッションが存在する場合は設定
        if (data.session) {
          setSessionSummaryData(data.session)
        }
        
        // 既存の問診票データがある場合はフォームに設定
        if (data.questionnaire) {
          // 既存データの処理（必要に応じて実装）
          console.log('既存の問診票データが見つかりました:', data.questionnaire)
        } else {
          // 新規作成の場合
          console.log('新規セッションとして扱います。セッションID:', sessionId)
        }
      } catch (error) {
        console.error('Error fetching session data:', error)
        // エラーが発生しても新規作成として続行
        console.log('エラーが発生しましたが、新規作成として続行します。')
      } finally {
        // 必ず初期化を完了させる（タイムアウトも考慮）
        setTimeout(() => {
          setIsInitializing(false)
        }, 100)
      }
    }

    fetchSessionData()
  }, [sessionId])

  const handleBasicInfoSubmit = async (data: BasicInfoForm) => {
    setIsLoading(true)
    try {
      // 生年月日から年齢を計算
      const birthDate = createDateFromParts(data.birthYear, data.birthMonth, data.birthDay)
      const age = calculateAge(birthDate)
      const formTypeValue = getFormType(age)

      // 基本情報を保存（モックデータ用なので実際のDB保存はスキップ）
      // セッション情報をローカルステートに保存
      setSessionSummaryData({
        session_id: sessionId,
        parent_name: data.parentName,
        parent_phone: data.parentPhone,
        child_name: data.childName,
        child_age: age,
        child_gender: data.childGender,
        birth_date: birthDate.toISOString(),
        form_type: formTypeValue,
      })

      setCurrentStep(2)
    } catch (error) {
      console.error('Error saving basic info:', error)
      alert('情報の保存に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  // 年齢に応じたフォームスキーマを選択（モックデータ使用）
  const activeFormSchema = useMemo(() => {
    if (formType === 'preschooler') {
      return preschoolerFormSchema
    } else if (formType === 'elementary') {
      return elementaryFormSchema
    }
    return null
  }, [formType])

  const handleQuestionnaireSubmit = async (values: Record<string, any>) => {
    setIsLoading(true)
    try {
      if (!activeFormSchema) {
        throw new Error('フォームスキーマが見つかりません')
      }

      // モックデータ用なので、実際のDB保存はスキップ
      // UIUX確認用にコンソールに出力
      console.log('問診票送信データ:', {
        sessionId: sessionId,
        formType,
        basicInfo: basicInfoForm.getValues(),
        questionnaire: values,
      })

      // 成功メッセージ表示
      alert('問診票の送信が完了しました（モックデータ）')
      
      // 結果画面へ遷移（モック）
      router.push(`/parent/result/${sessionId}`)
    } catch (error) {
      console.error('Error saving questionnaire:', error)
      alert('問診票の保存に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }


  // 初期化中のローディング表示
  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-coral-500 mx-auto"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  // ステップ1: 基本情報入力
  if (currentStep === 1) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            基本情報の入力
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            お子様と保護者の方の情報を入力してください
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
              <span className="text-2xl">👶</span>
              <span>お子様の情報</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={basicInfoForm.handleSubmit(handleBasicInfoSubmit)} className="space-y-5">
              {/* ふりがな */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  ふりがな
                </label>
                <Input
                  {...basicInfoForm.register('furigana')}
                  placeholder="例: たなか たろう"
                  className="h-11"
                />
              </div>

              {/* お名前 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  お名前 <span className="text-red-500">*</span>
                </label>
                <Input
                  {...basicInfoForm.register('childName')}
                  placeholder="例: 田中 太郎"
                  className="h-11"
                />
                {basicInfoForm.formState.errors.childName && (
                  <p className="text-sm text-red-600 mt-1">
                    {basicInfoForm.formState.errors.childName.message}
                  </p>
                )}
              </div>

              {/* 生年月日 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  生年月日 <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Select
                      value={basicInfoForm.watch('birthYear')?.toString() || ''}
                      onValueChange={(value) => {
                        basicInfoForm.setValue('birthYear', parseInt(value), { shouldValidate: true })
                      }}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="年" />
                      </SelectTrigger>
                      <SelectContent>
                        {yearOptions.map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}年
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {basicInfoForm.formState.errors.birthYear && (
                      <p className="text-xs text-red-600 mt-1">年を選択してください</p>
                    )}
                  </div>
                  <div>
                    <Select
                      value={basicInfoForm.watch('birthMonth')?.toString() || ''}
                      onValueChange={(value) => {
                        basicInfoForm.setValue('birthMonth', parseInt(value), { shouldValidate: true })
                      }}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="月" />
                      </SelectTrigger>
                      <SelectContent>
                        {monthOptions.map((month) => (
                          <SelectItem key={month} value={month.toString()}>
                            {month}月
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {basicInfoForm.formState.errors.birthMonth && (
                      <p className="text-xs text-red-600 mt-1">月を選択してください</p>
                    )}
                  </div>
                  <div>
                    <Select
                      value={basicInfoForm.watch('birthDay')?.toString() || ''}
                      onValueChange={(value) => {
                        basicInfoForm.setValue('birthDay', parseInt(value), { shouldValidate: true })
                      }}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="日" />
                      </SelectTrigger>
                      <SelectContent>
                        {dayOptions.map((day) => (
                          <SelectItem key={day} value={day.toString()}>
                            {day}日
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {basicInfoForm.formState.errors.birthDay && (
                      <p className="text-xs text-red-600 mt-1">日を選択してください</p>
                    )}
                  </div>
                </div>
                {calculatedAge !== null && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <span className="font-semibold">年齢: {calculatedAge}歳</span>
                      {formType && (
                        <span className="ml-2">
                          ({formType === 'preschooler' ? '未就学児用フォーム' : '小学生以上用フォーム'})
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </div>

              {/* 都道府県 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  お住まいの都道府県
                </label>
                <Input
                  {...basicInfoForm.register('prefecture')}
                  placeholder="例: 東京都"
                  className="h-11"
                />
              </div>

              {/* 性別 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  性別 <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'male', label: '男' },
                    { value: 'female', label: '女' },
                    { value: 'other', label: 'その他' },
                  ].map((gender) => (
                    <label
                      key={gender.value}
                      className={`
                        flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-all
                        ${basicInfoForm.watch('childGender') === gender.value
                          ? 'border-coral-500 bg-coral-50 text-coral-700'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}
                      `}
                    >
                      <input
                        type="radio"
                        value={gender.value}
                        {...basicInfoForm.register('childGender')}
                        className="sr-only"
                      />
                      <span className="text-sm font-medium">{gender.label}</span>
                    </label>
                  ))}
                </div>
                {basicInfoForm.formState.errors.childGender && (
                  <p className="text-sm text-red-600 mt-1">
                    {basicInfoForm.formState.errors.childGender.message}
                  </p>
                )}
              </div>

              {/* ニックネーム */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  ニックネーム
                </label>
                <Input
                  {...basicInfoForm.register('nickname')}
                  placeholder="例: たーくん"
                  className="h-11"
                />
              </div>

              {/* 保護者情報セクション */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <span>👨‍👩‍👧‍👦</span>
                  <span>保護者の情報</span>
                </h3>

                <div className="space-y-5">
                  {/* 保護者のお名前 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      保護者のお名前 <span className="text-red-500">*</span>
                    </label>
                    <Input
                      {...basicInfoForm.register('parentName')}
                      placeholder="例: 田中 花子"
                      className="h-11"
                    />
                    {basicInfoForm.formState.errors.parentName && (
                      <p className="text-sm text-red-600 mt-1">
                        {basicInfoForm.formState.errors.parentName.message}
                      </p>
                    )}
                  </div>

                  {/* 電話番号 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      電話番号 <span className="text-red-500">*</span>
                    </label>
                    <Input
                      {...basicInfoForm.register('parentPhone')}
                      placeholder="例: 090-1234-5678"
                      className="h-11"
                      type="tel"
                    />
                    {basicInfoForm.formState.errors.parentPhone && (
                      <p className="text-sm text-red-600 mt-1">
                        {basicInfoForm.formState.errors.parentPhone.message}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1.5">
                      📱 診断結果をLINEでお送りします
                    </p>
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-base font-semibold mt-6" 
                disabled={isLoading || calculatedAge === null}
              >
                {isLoading ? '保存中...' : '次へ進む'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ステップ2: 問診票詳細入力
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* セッションサマリー */}
      {sessionSummaryData && (
        <Card className="bg-gradient-to-r from-coral-50 to-blue-50 border-coral-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="space-y-1">
                <p className="text-sm text-gray-600">お子様</p>
                <p className="text-lg font-semibold text-gray-900">
                  {sessionSummaryData.child_name} ({sessionSummaryData.child_age}歳)
                </p>
              </div>
              <Badge variant="outline" className="bg-white border-coral-300 text-coral-700 px-3 py-1">
                {formType === 'preschooler' ? '未就学児用フォーム' : '小学生以上用フォーム'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 問診票フォーム */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl">問診票入力</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            {formType === 'preschooler' 
              ? '未就学児用の問診票です。各項目にご回答ください。'
              : '小学生以上用の問診票です。各項目にご回答ください。'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {activeFormSchema ? (
            <DynamicForm
              key={formType}
              schema={activeFormSchema}
              onSubmit={handleQuestionnaireSubmit}
              onBack={() => setCurrentStep(1)}
              isSubmitting={isLoading}
              submitLabel="送信する"
              defaultValues={{}}
            />
          ) : (
            <div className="py-12 text-center text-gray-500">
              <p className="text-base">フォームを読み込み中です...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

