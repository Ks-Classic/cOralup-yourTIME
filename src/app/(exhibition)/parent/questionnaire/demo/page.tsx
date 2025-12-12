'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { DynamicForm, type DynamicFormRef } from '@/components/forms/dynamic-form'
import {
    calculateAge,
    getFormType,
    createDateFromParts,
    generateYearOptions,
    generateMonthOptions,
    generateDayOptions
} from '@/utils/age-calculator'
import type { FormSchemaConfig, FormFieldConfig, FormSectionConfig } from '@/types/forms'
import { useQuestionnaireStorage } from '@/hooks/useQuestionnaireStorage'
import { Sparkles, RotateCcw } from 'lucide-react'
import { generateBasicInfoSampleData, generateSampleData } from '@/utils/sample-data-generator'

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
    const date = createDateFromParts(data.birthYear, data.birthMonth, data.birthDay)
    return date.getFullYear() === data.birthYear &&
        date.getMonth() === data.birthMonth - 1 &&
        date.getDate() === data.birthDay
}, {
    message: '正しい日付を選択してください',
    path: ['birthDay'],
})

type BasicInfoForm = z.infer<typeof basicInfoSchema>

export default function QuestionnairePageDemo() {
    const router = useRouter()
    const sessionId = 'demo' // デモ用に固定

    const [currentStep, setCurrentStep] = useState(1)
    const [isLoading, setIsLoading] = useState(false)
    const [isInitializing, setIsInitializing] = useState(true)
    const [sessionSummaryData, setSessionSummaryData] = useState<Record<string, unknown> | null>(null)
    const [calculatedAge, setCalculatedAge] = useState<number | null>(null)
    const [formType, setFormType] = useState<'preschooler' | 'elementary' | null>(null)
    const questionnaireFormRef = useRef<DynamicFormRef>(null)

    // スキーマデータ（動的取得）
    const [activeFormSchema, setActiveFormSchema] = useState<FormSchemaConfig | null>(null)
    const [isSchemaLoading, setIsSchemaLoading] = useState(false)
    const [isSampleFilled, setIsSampleFilled] = useState(false) // サンプル入力フラグ

    // DB項目をFormSchemaConfig形式に変換する関数
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

    // フォームタイプが変更されたらAPIからスキーマを取得
    useEffect(() => {
        if (!formType) {
            setActiveFormSchema(null)
            return
        }

        const fetchSchema = async () => {
            setIsSchemaLoading(true)
            console.log('[DemoQuestionnaire] スキーマ取得開始:', formType)
            try {
                // 新API: /api/questionnaire/items を使用
                const targetAge = formType === 'preschooler' ? 'preschool' : 'elementary'
                const res = await fetch(`/api/questionnaire/items?target_age=${targetAge}`)
                console.log('[DemoQuestionnaire] API応答ステータス:', res.status)

                if (res.ok) {
                    const json = await res.json()
                    if (json.success && json.data?.categories) {
                        // DB形式からFormSchemaConfig形式に変換
                        const convertedSchema = convertToFormSchema(json.data)
                        setActiveFormSchema(convertedSchema)
                        console.log('[DemoQuestionnaire] スキーマ取得成功:', {
                            categories: json.data.categories.length,
                            totalItems: json.data.meta?.total_items,
                        })
                        return
                    }
                }

                console.error('[DemoQuestionnaire] 問診票スキーマのAPI取得に失敗しました')
                setActiveFormSchema(null)
            } catch (error) {
                console.error('[DemoQuestionnaire] スキーマ取得エラー:', error)
                setActiveFormSchema(null)
            } finally {
                setIsSchemaLoading(false)
            }
        }

        fetchSchema()
    }, [formType])

    // localStorage連携
    const {
        data: storedData,
        isLoading: isStorageLoading,
        canRestore,
        saveBasicInfo,
        saveQuestionnaireData,
        saveCurrentStep,
        saveFormType,
        clearData,
    } = useQuestionnaireStorage(sessionId)

    // フォームのセットアップ
    const basicInfoForm = useForm<BasicInfoForm>({
        resolver: zodResolver(basicInfoSchema),
        defaultValues: {
            birthYear: new Date().getFullYear() - 8,
            birthMonth: 1,
            birthDay: 1,
        },
    })

    // 保存データからフォームを復元（初回のみ、サンプル入力後はスキップ）
    useEffect(() => {
        if (isSampleFilled) {
            // サンプル入力後は復元をスキップ
            setIsInitializing(false)
            return
        }
        if (!isStorageLoading && storedData?.basicInfo) {
            basicInfoForm.reset({
                furigana: storedData.basicInfo.furigana,
                childName: storedData.basicInfo.childName,
                birthYear: storedData.basicInfo.birthYear,
                birthMonth: storedData.basicInfo.birthMonth,
                birthDay: storedData.basicInfo.birthDay,
                prefecture: storedData.basicInfo.prefecture,
                childGender: storedData.basicInfo.childGender,
                nickname: storedData.basicInfo.nickname,
                parentName: storedData.basicInfo.parentName,
                parentPhone: storedData.basicInfo.parentPhone,
            })
            setCurrentStep(storedData.currentStep || 1)
            setFormType(storedData.formType)

            if (storedData.formType && storedData.currentStep === 2) {
                // ステップ2の場合はセッションサマリーも復元
                const birthDate = createDateFromParts(
                    storedData.basicInfo.birthYear,
                    storedData.basicInfo.birthMonth,
                    storedData.basicInfo.birthDay
                )
                const age = calculateAge(birthDate)
                setSessionSummaryData({
                    session_id: sessionId,
                    parent_name: storedData.basicInfo.parentName,
                    parent_phone: storedData.basicInfo.parentPhone,
                    child_name: storedData.basicInfo.childName,
                    child_age: age,
                    child_gender: storedData.basicInfo.childGender,
                    birth_date: birthDate.toISOString(),
                    form_type: storedData.formType,
                })
            }
        }
        setIsInitializing(false)
    }, [isStorageLoading, storedData, basicInfoForm, sessionId, isSampleFilled])

    // 生年月日から年齢を自動計算（watch配列による無限ループを防止）
    const watchedYear = basicInfoForm.watch('birthYear')
    const watchedMonth = basicInfoForm.watch('birthMonth')
    const watchedDay = basicInfoForm.watch('birthDay')

    useEffect(() => {
        if (watchedYear && watchedMonth && watchedDay) {
            try {
                const birthDate = createDateFromParts(watchedYear, watchedMonth, watchedDay)
                const age = calculateAge(birthDate)
                setCalculatedAge(age)
                const newFormType = getFormType(age)
                setFormType(newFormType)
                saveFormType(newFormType)
            } catch {
                setCalculatedAge(null)
                setFormType(null)
            }
        }
    }, [watchedYear, watchedMonth, watchedDay, saveFormType])

    // 年のオプション生成
    const yearOptions = useMemo(() => generateYearOptions(0, 18), [])
    const monthOptions = useMemo(() => generateMonthOptions(), [])

    // 日のオプション生成（年と月に依存）
    const dayOptions = useMemo(() => {
        if (watchedYear && watchedMonth) {
            return generateDayOptions(watchedYear, watchedMonth)
        }
        return generateDayOptions(new Date().getFullYear(), 1)
    }, [watchedYear, watchedMonth])

    const handleBasicInfoSubmit = async (data: BasicInfoForm) => {
        setIsLoading(true)
        try {
            const birthDate = createDateFromParts(data.birthYear, data.birthMonth, data.birthDay)
            const age = calculateAge(birthDate)
            const formTypeValue = getFormType(age)

            // localStorageに保存
            saveBasicInfo({
                furigana: data.furigana,
                childName: data.childName,
                birthYear: data.birthYear,
                birthMonth: data.birthMonth,
                birthDay: data.birthDay,
                prefecture: data.prefecture,
                childGender: data.childGender,
                nickname: data.nickname,
                parentName: data.parentName,
                parentPhone: data.parentPhone,
            })
            saveCurrentStep(2)
            saveFormType(formTypeValue)

            // 名前を分割
            const nameParts = data.childName.split(/\s+/)
            const childLastName = nameParts[0] || ''
            const childFirstName = nameParts.slice(1).join(' ') || ''
            const parentNameParts = data.parentName.split(/\s+/)
            const parentLastName = parentNameParts[0] || ''
            const parentFirstName = parentNameParts.slice(1).join(' ') || ''
            const furiganaParts = data.furigana?.split(/\s+/) || []
            const childLastNameKana = furiganaParts[0] || ''
            const childFirstNameKana = furiganaParts.slice(1).join(' ') || ''

            // DBに保存（API経由）
            const res = await fetch('/api/parent/basic-info', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: sessionId,
                    // 保護者情報
                    parent_last_name: parentLastName,
                    parent_first_name: parentFirstName,
                    parent_phone: data.parentPhone,
                    prefecture: data.prefecture,
                    // お子様情報
                    child_last_name: childLastName,
                    child_first_name: childFirstName,
                    child_last_name_kana: childLastNameKana,
                    child_first_name_kana: childFirstNameKana,
                    child_nickname: data.nickname,
                    child_birthday: birthDate.toISOString().split('T')[0],
                    child_gender: data.childGender,
                    child_age: age,
                }),
            })

            if (!res.ok) {
                const errorData = await res.json()
                console.error('基本情報の保存に失敗:', errorData)
                // デモモードではDB保存失敗してもUIは進める
            } else {
                console.log('基本情報をDBに保存しました')
            }

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

    const handleQuestionnaireSubmit = async (values: Record<string, unknown>) => {
        setIsLoading(true)
        try {
            if (!activeFormSchema) {
                throw new Error('フォームスキーマが見つかりません')
            }

            // localStorageに保存
            saveQuestionnaireData(values)

            // 回答データを item_id: value の配列形式に変換
            const responses = Object.entries(values).map(([itemId, value]) => ({
                item_id: itemId,
                value: typeof value === 'object' ? JSON.stringify(value) : String(value),
            }))

            // 基本情報を取得
            const basicInfo = basicInfoForm.getValues()

            // DBに保存（API経由）
            const res = await fetch('/api/parent/questionnaire', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: sessionId,
                    responses,
                    child_info: {
                        child_name: basicInfo.childName,
                        child_age: calculatedAge,
                        child_gender: basicInfo.childGender,
                        parent_name: basicInfo.parentName,
                        parent_phone: basicInfo.parentPhone,
                    },
                }),
            })

            if (!res.ok) {
                const errorData = await res.json()
                console.error('問診票の保存に失敗:', errorData)
                // デモモードではDB保存失敗してもUIは進める
            } else {
                console.log('問診票をDBに保存しました')
            }

            console.log('問診票送信データ:', {
                sessionId: sessionId,
                formType,
                basicInfo: basicInfoForm.getValues(),
                questionnaire: values,
                responsesCount: responses.length,
            })

            // 結果画面（QR表示）へ遷移
            router.push(`/parent/result/${sessionId}`)
        } catch (error) {
            console.error('Error saving questionnaire:', error)
            alert('問診票の保存に失敗しました')
        } finally {
            setIsLoading(false)
        }
    }

    // サンプルデータを一括入力
    const handleFillSampleData = useCallback(() => {
        if (currentStep === 1) {
            const sampleData = generateBasicInfoSampleData()
            
            // サンプル入力フラグをセット（useEffectの復元をブロック）
            setIsSampleFilled(true)
            
            // resetで一括設定
            basicInfoForm.reset(sampleData, { keepDefaultValues: false })

            const birthDate = createDateFromParts(
                sampleData.birthYear,
                sampleData.birthMonth,
                sampleData.birthDay
            )
            const age = calculateAge(birthDate)
            const nextFormType = getFormType(age)
            setCalculatedAge(age)
            setFormType(nextFormType)
            saveFormType(nextFormType)
        } else if (currentStep === 2 && activeFormSchema && questionnaireFormRef.current) {
            const sampleData = generateSampleData(activeFormSchema)
            questionnaireFormRef.current.fillSampleData(sampleData)
        }
    }, [currentStep, activeFormSchema, basicInfoForm, saveFormType])

    // 保存データをクリア
    const handleClearData = useCallback(() => {
        if (confirm('保存されたデータを削除しますか？')) {
            clearData()
            basicInfoForm.reset({
                birthYear: new Date().getFullYear() - 8,
                birthMonth: 1,
                birthDay: 1,
            })
            setCurrentStep(1)
            setSessionSummaryData(null)
            setCalculatedAge(null)
            setFormType(null)
        }
    }, [clearData, basicInfoForm])

    // 初期化中のローディング表示
    if (isInitializing || isStorageLoading) {
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
                <div className="flex justify-between items-center">
                    <Button variant="outline" size="sm" onClick={() => router.push('/parent')}>
                        ホームに戻る
                    </Button>
                </div>
                <div className="space-y-4">
                    <div className="text-center space-y-2">
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                            デモモード
                        </Badge>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                            基本情報の入力
                        </h1>
                        <p className="text-sm sm:text-base text-gray-600">
                            お子様と保護者の方の情報を入力してください
                        </p>
                    </div>
                    <div className="flex justify-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleFillSampleData}
                            className="bg-coral-50 border-coral-300 text-coral-700 hover:bg-coral-100"
                        >
                            <Sparkles className="w-4 h-4 mr-2" />
                            サンプル入力
                        </Button>
                        {canRestore && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleClearData}
                                className="text-gray-600"
                            >
                                <RotateCcw className="w-4 h-4 mr-2" />
                                リセット
                            </Button>
                        )}
                    </div>
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
                                            value={watchedYear?.toString() || ''}
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
                                    </div>
                                    <div>
                                        <Select
                                            value={watchedMonth?.toString() || ''}
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
                                    </div>
                                    <div>
                                        <Select
                                            value={watchedDay?.toString() || ''}
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
                                            placeholder="例: 09012345678"
                                            className="h-11"
                                            type="tel"
                                        />
                                        {basicInfoForm.formState.errors.parentPhone && (
                                            <p className="text-sm text-red-600 mt-1">
                                                {basicInfoForm.formState.errors.parentPhone.message}
                                            </p>
                                        )}
                                        <p className="text-xs text-gray-500 mt-1.5">
                                            📱 診断結果をLINEでお送りします（ハイフンなしで入力）
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
            <div className="flex justify-between items-center">
                <Button variant="outline" size="sm" onClick={() => router.push('/parent')}>
                    ホームに戻る
                </Button>
            </div>
            {/* セッションサマリー */}
            {sessionSummaryData && (
                <Card className="bg-gradient-to-r from-coral-50 to-blue-50 border-coral-200">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                            <div className="space-y-1">
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 mb-2">
                                    デモモード
                                </Badge>
                                <p className="text-sm text-gray-600">お子様</p>
                                <p className="text-lg font-semibold text-gray-900">
                                    {sessionSummaryData.child_name as string} ({sessionSummaryData.child_age as number}歳)
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
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-xl sm:text-2xl">問診票入力</CardTitle>
                            <CardDescription className="text-sm sm:text-base">
                                {formType === 'preschooler'
                                    ? '未就学児用の問診票です。各項目にご回答ください。'
                                    : '小学生以上用の問診票です。各項目にご回答ください。'}
                            </CardDescription>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleFillSampleData}
                            className="ml-4"
                        >
                            <Sparkles className="w-4 h-4 mr-2" />
                            サンプル入力
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {activeFormSchema ? (
                        <DynamicForm
                            ref={questionnaireFormRef}
                            key={formType}
                            schema={activeFormSchema}
                            onSubmit={handleQuestionnaireSubmit}
                            onBack={() => {
                                setCurrentStep(1)
                                saveCurrentStep(1)
                            }}
                            isSubmitting={isLoading}
                            submitLabel="送信する"
                            defaultValues={storedData?.questionnaireData || {}}
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


