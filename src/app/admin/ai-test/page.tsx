'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import {
    generateMockValuesFromDBItems,
    generateChildInfo,
    generateScores,
    generateStaffNotes,
    SEVERITY_PRESETS,
    AGE_PRESETS,
    type SeverityType,
    type AgeCategoryType,
    type MockTestData,
    type MockChildInfo,
} from '@/lib/mock/diagnosis-generator'
import {
    Bot, Wand2, History, Settings2, Baby, BarChart,
    ClipboardCheck, MessageSquare, ChevronDown, ChevronRight,
    CheckCircle2, AlertCircle, Save, Zap, Play, RefreshCw,
    Layout, Edit3, Eye, Database, FileText, Copy, Trash2
} from 'lucide-react'
import { cn } from '@/utils'

// Types
interface AIReportResult {
    summary: string
    analysis: string
    recommendations: string[]
    nextSteps: string[]
    encouragingMessage: string
    processingTimeMs?: number
    error?: string
    rawText?: string
    debug?: {
        allItemsMapKeys?: string[]
        allItemsMapEntries?: Record<string, string>
        variableReplacements?: Array<{
            variableName: string
            requestedItemIds: string[]
            foundItems: string[]
            notFoundItems: string[]
            replacement: string
        }>
        finalPromptPreview?: string
    }
}

interface VariableConfig {
    name: string
    itemIds: string[]
    priorityItemIds: string[]
}

interface AIPrompt {
    id: string
    label: string
    prompt_template: string
    is_active: boolean
    description?: string
    variable_config?: VariableConfig[]
    model_name?: string
    created_at: string
}

// 利用可能なGeminiモデル (2.5以上のみ)
const GEMINI_MODELS = [
    { value: 'gemini-3-pro-preview', label: 'Gemini 3 Pro Preview (最高品質)' },
    { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash Preview (高速・高品質)' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (安定版・高品質)' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (安定版・バランス)' },
    { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite (安定版・高速)' },
]

interface DBCategory {
    id: string
    name: string
    display_order: number
    items: DBItem[]
}

interface DBItem {
    id: string
    question: string
    answer_type: string
    options: { value: string; label: string }[]
    is_required: boolean
    input_type?: string
}

const DEFAULT_PROMPT = `対象のお子様情報:
- お名前: {{childName}}
- 年齢: {{ageDisplay}}
- 性別: {{childGender}}

【診断データ】
{{diagnosisDetails}}

【問診データ】
{{questionnaireDetails}}

上記のデータを分析して、保護者向けのレポートを作成してください。`

export default function AdminAITestPage() {
    // Schema/Data states
    const [diagnosisCategories, setDiagnosisCategories] = useState<DBCategory[]>([])
    const [questionnaireCategories, setQuestionnaireCategories] = useState<DBCategory[]>([])
    const [isLoadingSchema, setIsLoadingSchema] = useState(true)
    const [schemaError, setSchemaError] = useState<string | null>(null)

    // Test Data state
    const [testData, setTestData] = useState<MockTestData | null>(null)
    const [testType, setTestType] = useState<'random' | 'manual'>('random')
    const [selectedSeverity, setSelectedSeverity] = useState<SeverityType>('moderate')
    const [selectedAgeCategory, setSelectedAgeCategory] = useState<AgeCategoryType>('toddler')

    // Prompt states
    const [customPrompt, setCustomPrompt] = useState(DEFAULT_PROMPT)
    const [prompts, setPrompts] = useState<AIPrompt[]>([])
    const [isSavingPrompt, setIsSavingPrompt] = useState(false)
    const [promptLabel, setPromptLabel] = useState('')
    const [variableConfigs, setVariableConfigs] = useState<VariableConfig[]>([])
    const [editingVariableIndex, setEditingVariableIndex] = useState<number | null>(null)
    const [mappingTab, setMappingTab] = useState<'diagnosis' | 'questionnaire'>('diagnosis')
    const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash-lite')

    // AI states
    const [result, setResult] = useState<AIReportResult | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Auto-scroll ref
    const resultEndRef = useRef<HTMLDivElement>(null)

    /**
     * DB項目からテストデータを生成
     * - 項目構造: DBから取得した diagnosisCategories/questionnaireCategories
     * - 値: フロントでランダム生成
     */
    const generateTestDataFromDB = useCallback((
        diagCats: DBCategory[],
        questCats: DBCategory[],
        severity: SeverityType,
        ageCategory: AgeCategoryType
    ): MockTestData => {
        // 全診断項目をフラットに
        const allDiagItems = diagCats.flatMap(cat => cat.items.map(item => ({
            id: item.id,
            question: item.question,
            options: item.options,
            answer_type: item.answer_type,
        })))

        // 全問診項目をフラットに
        const allQuestItems = questCats.flatMap(cat => cat.items.map(item => ({
            id: item.id,
            question: item.question,
            options: item.options,
            answer_type: item.answer_type,
        })))

        // 値を生成
        const diagnosisValues = generateMockValuesFromDBItems(allDiagItems, severity)
        const questionnaireValues = generateMockValuesFromDBItems(allQuestItems, severity)

        return {
            childInfo: generateChildInfo(ageCategory),
            diagnosis: diagnosisValues,
            questionnaire: questionnaireValues,
            scores: generateScores(severity),
            staffNotes: generateStaffNotes(severity),
        }
    }, [])

    // Initialization
    useEffect(() => {
        const fetchInitialData = async () => {
            setIsLoadingSchema(true)
            try {
                // Fetch schemas
                const [diagRes, questRes, promptsRes] = await Promise.all([
                    fetch('/api/diagnosis-schema?input_type=staff'),
                    fetch('/api/questionnaire/items?target_age=all'),
                    fetch('/api/admin/ai-prompts')
                ])

                const diagData = await diagRes.json()
                const questData = await questRes.json()
                const promptsData = await promptsRes.json()

                const normalizeOptions = (options: any): { value: string; label: string }[] => {
                    if (!options) return []
                    if (Array.isArray(options)) {
                        return options.map(opt => {
                            if (typeof opt === 'string') return { value: opt, label: opt }
                            return { value: opt.value || opt, label: opt.label || opt.value || opt }
                        })
                    }
                    if (typeof options === 'string') {
                        try { return normalizeOptions(JSON.parse(options)) } catch { return [] }
                    }
                    return []
                }

                let diagCats: DBCategory[] = []
                let questCats: DBCategory[] = []

                if (diagData.success && diagData.data) {
                    const { categories, items } = diagData.data
                    diagCats = categories.map((cat: any) => ({
                        id: cat.id,
                        name: cat.name,
                        display_order: cat.displayOrder,
                        items: items.filter((i: any) => i.categoryId === cat.id).map((item: any) => ({
                            id: item.id,
                            question: item.question,
                            answer_type: item.answerType,
                            options: normalizeOptions(item.options),
                            is_required: item.isRequired,
                            input_type: item.inputType,
                        }))
                    }))
                    setDiagnosisCategories(diagCats)
                }

                if (questData.data?.categories) {
                    questCats = questData.data.categories.map((cat: any) => ({
                        id: cat.id,
                        name: cat.name,
                        display_order: cat.display_order,
                        items: cat.items?.map((item: any) => ({
                            id: item.id,
                            question: item.question,
                            answer_type: item.answer_type,
                            options: normalizeOptions(item.options),
                            is_required: item.is_required,
                            input_type: item.input_type,
                        })) || []
                    }))
                    setQuestionnaireCategories(questCats)
                }

                if (promptsData.success) {
                    setPrompts(promptsData.data)
                    const active = promptsData.data.find((p: AIPrompt) => p.is_active)
                    if (active) {
                        setCustomPrompt(active.prompt_template)
                        setVariableConfigs(active.variable_config || [])
                        setPromptLabel(active.label)
                        if (active.model_name) {
                            setSelectedModel(active.model_name)
                        }
                    }
                }

                // Generate initial mock data from DB items
                if (diagCats.length > 0 || questCats.length > 0) {
                    setTestData(generateTestDataFromDB(diagCats, questCats, 'moderate', 'toddler'))
                }
            } catch (err) {
                setSchemaError(err instanceof Error ? err.message : 'データ取得エラー')
            } finally {
                setIsLoadingSchema(false)
            }
        }
        fetchInitialData()
    }, [generateTestDataFromDB])

    // Scroll to result on generation
    useEffect(() => {
        if (result && resultEndRef.current) {
            resultEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [result])

    // Action: Generate new mock data (and auto-update if random mode)
    const handleConditionChange = useCallback((severity: SeverityType) => {
        setSelectedSeverity(severity)
        // 状態ボタンを押したら即座に再生成（DB項目ベース）
        setTestData(generateTestDataFromDB(diagnosisCategories, questionnaireCategories, severity, selectedAgeCategory))
        setResult(null) // 結果はクリア
    }, [diagnosisCategories, questionnaireCategories, selectedAgeCategory, generateTestDataFromDB])

    const handleAgeChange = useCallback((age: AgeCategoryType) => {
        setSelectedAgeCategory(age)
        // 年齢を変えたら即座に再生成（DB項目ベース）
        setTestData(generateTestDataFromDB(diagnosisCategories, questionnaireCategories, selectedSeverity, age))
        setResult(null)
    }, [diagnosisCategories, questionnaireCategories, selectedSeverity, generateTestDataFromDB])

    // Action: Update data
    const updateChildInfo = useCallback((field: keyof MockChildInfo, value: string | number) => {
        setTestData(prev => prev ? {
            ...prev,
            childInfo: { ...prev.childInfo, [field]: value },
        } : null)
    }, [])

    // Action: Save Prompt
    const handleSavePrompt = async () => {
        if (!promptLabel) {
            alert('プロンプトのラベル（名前）を入力してください')
            return
        }
        setIsSavingPrompt(true)
        try {
            const res = await fetch('/api/admin/ai-prompts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    label: promptLabel,
                    prompt_template: customPrompt,
                    variable_config: variableConfigs,
                    model_name: selectedModel,
                    is_active: true
                })
            })
            const data = await res.json()
            if (data.success) {
                alert('プロンプトを保存しました')
                setPrompts([data.data, ...prompts.map(p => ({ ...p, is_active: false }))])
            }
        } catch (err) {
            alert('保存に失敗しました')
        } finally {
            setIsSavingPrompt(false)
        }
    }

    const addVariable = () => {
        const newVariable: VariableConfig = { name: '新規変数', itemIds: [], priorityItemIds: [] }
        const newConfigs = [...variableConfigs, newVariable]
        setVariableConfigs(newConfigs)
        setEditingVariableIndex(newConfigs.length - 1)
        setMappingTab('diagnosis')
    }

    const removeVariable = (index: number) => {
        if (confirm('この変数を削除しますか？')) {
            setVariableConfigs(variableConfigs.filter((_, i) => i !== index))
        }
    }

    const toggleItemInVariable = (vIndex: number, itemId: string) => {
        const newConfigs = [...variableConfigs]
        const v = newConfigs[vIndex]
        if (v.itemIds.includes(itemId)) {
            v.itemIds = v.itemIds.filter(id => id !== itemId)
            v.priorityItemIds = v.priorityItemIds.filter(id => id !== itemId)
        } else {
            v.itemIds.push(itemId)
        }
        setVariableConfigs(newConfigs)
    }

    const togglePriorityInVariable = (vIndex: number, itemId: string) => {
        const newConfigs = [...variableConfigs]
        const v = newConfigs[vIndex]
        if (v.priorityItemIds.includes(itemId)) {
            v.priorityItemIds = v.priorityItemIds.filter(id => id !== itemId)
        } else {
            v.priorityItemIds.push(itemId)
        }
        setVariableConfigs(newConfigs)
    }

    const toggleCategoryInVariable = (vIndex: number | null, itemIds: string[]) => {
        if (vIndex === null) return
        const newConfigs = [...variableConfigs]
        const v = newConfigs[vIndex]
        const allSelected = itemIds.every(id => v.itemIds.includes(id))

        if (allSelected) {
            // Remove all
            v.itemIds = v.itemIds.filter(id => !itemIds.includes(id))
            v.priorityItemIds = v.priorityItemIds.filter(id => !itemIds.includes(id))
        } else {
            // Add missing
            itemIds.forEach(id => {
                if (!v.itemIds.includes(id)) v.itemIds.push(id)
            })
        }
        setVariableConfigs(newConfigs)
    }

    const updateVariableName = (vIndex: number, name: string) => {
        const newConfigs = [...variableConfigs]
        newConfigs[vIndex].name = name
        setVariableConfigs(newConfigs)
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        // Toast logic could go here, but alert is simpler for now
        // or just a temporary state change
    }

    // AI Logic - テストデータをAPI用にフォーマット
    const formatForAPI = useCallback(() => {
        if (!testData) return null

        // 新構造: testData.diagnosis は { itemId: value } のフラット形式
        // DB項目を参照してquestion名とのマッピングを作成
        const diagnosisMeta: Record<string, { question: string, value: string }> = {}
        const questionnaireMeta: Record<string, { question: string, value: string }> = {}
        const postureIssues: string[] = []
        const oralIssues: string[] = []

        // 診断データの処理
        for (const [itemId, value] of Object.entries(testData.diagnosis)) {
            // DB項目から質問名を取得
            let question = itemId
            let categoryName = ''
            for (const cat of diagnosisCategories) {
                const item = cat.items.find(i => i.id === itemId)
                if (item) {
                    question = item.question
                    categoryName = cat.name
                    break
                }
            }

            diagnosisMeta[itemId] = { question, value }

            // 問題点の抽出
            const isIssue = ['有', '不可', '困難', '口呼吸'].includes(value)
            if (isIssue) {
                if (['姿勢', '足', '全身'].includes(categoryName)) {
                    postureIssues.push(`${question}: ${value}`)
                } else {
                    oralIssues.push(`${question}: ${value}`)
                }
            }
        }

        // 問診データの処理
        for (const [itemId, value] of Object.entries(testData.questionnaire)) {
            let question = itemId
            for (const cat of questionnaireCategories) {
                const item = cat.items.find(i => i.id === itemId)
                if (item) {
                    question = item.question
                    break
                }
            }
            questionnaireMeta[itemId] = { question, value }
        }

        // 総月齢を計算（年×12 + 月）
        const totalAgeMonths = testData.childInfo.age * 12 + testData.childInfo.ageMonths

        return {
            testMode: true,
            testData: {
                childName: testData.childInfo.name,
                childAge: testData.childInfo.age,
                childAgeMonths: totalAgeMonths,  // 総月齢を送信
                childGender: testData.childInfo.gender,
                // 新形式: itemId -> {question, value} のマッピング
                diagnosisMeta,
                questionnaireMeta,
                postureScore: testData.scores.postureScore,
                oralScore: testData.scores.oralScore,
                postureIssues,
                oralIssues,
                staffNotes: testData.staffNotes,
            },
            customPrompt: customPrompt,
            variableConfig: variableConfigs,
            modelName: selectedModel
        }
    }, [testData, diagnosisCategories, questionnaireCategories, customPrompt, selectedModel, variableConfigs])

    const generateReport = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        const startTime = Date.now()
        try {
            const apiData = formatForAPI()
            if (!apiData) return alert('テストデータがありません')

            const response = await fetch('/api/ai/generate-report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(apiData),
            })
            const data = await response.json()
            if (!response.ok) throw new Error(data.error || `API error: ${response.status}`)
            setResult({ ...data, processingTimeMs: Date.now() - startTime })
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error')
        } finally {
            setIsLoading(false)
        }
    }, [formatForAPI])

    if (isLoadingSchema) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
            <RefreshCw className="w-10 h-10 animate-spin mb-4 text-purple-500" />
            <p>システム構成を読み込み中...</p>
        </div>
    )

    return (
        <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
            <div className="flex-shrink-0">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Zap className="w-6 h-6 text-amber-500 fill-amber-500" />
                    AIプロンプト実験室 / gemini-2.5-flash-lite
                </h2>
                <p className="text-xs text-slate-500">
                    あらゆる診断ケースを自動生成し、プロンプトを調整して即座に結果を確認できます。
                </p>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">

                {/* 左カラム: ケース設定 */}
                <div className="flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-0">
                    <div className="p-3 border-b border-slate-200 bg-slate-50 flex-shrink-0 z-10">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-bold text-slate-700 text-xs flex items-center gap-1">
                                <Layout className="w-3.5 h-3.5 text-blue-500" />
                                テストケース設定
                            </h3>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => setTestType('random')}
                                    className={cn("px-2 py-0.5 text-[10px] rounded transition-all", testType === 'random' ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-100")}
                                >自動</button>
                                <button
                                    onClick={() => setTestType('manual')}
                                    className={cn("px-2 py-0.5 text-[10px] rounded transition-all", testType === 'manual' ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-100")}
                                >手動</button>
                            </div>
                        </div>

                        {/* 2列設定パネル */}
                        {testType === 'random' && (
                            <div className="grid grid-cols-[auto_1fr] gap-2 items-center text-xs">
                                <span className="font-bold text-slate-400 text-[10px] uppercase">年齢層</span>
                                <div className="flex gap-1 overflow-x-auto no-scrollbar">
                                    {Object.entries(AGE_PRESETS).map(([id, meta]) => (
                                        <button
                                            key={id}
                                            onClick={() => handleAgeChange(id as any)}
                                            className={cn(
                                                "px-2 py-1.5 rounded border whitespace-nowrap transition-all flex items-center gap-1",
                                                selectedAgeCategory === id ? "bg-blue-50 border-blue-400 text-blue-700 font-bold shadow-sm" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                                            )}
                                        >
                                            <span>{meta.emoji}</span>
                                            <span>{meta.label}</span>
                                        </button>
                                    ))}
                                </div>

                                <span className="font-bold text-slate-400 text-[10px] uppercase">状態</span>
                                <div className="flex gap-1 overflow-x-auto no-scrollbar">
                                    {Object.entries(SEVERITY_PRESETS).map(([id, meta]) => (
                                        <button
                                            key={id}
                                            onClick={() => handleConditionChange(id as any)}
                                            className={cn(
                                                "px-2 py-1.5 rounded border whitespace-nowrap transition-all flex items-center gap-1",
                                                selectedSeverity === id ? "bg-amber-50 border-amber-400 text-amber-700 font-bold shadow-sm" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                                            )}
                                        >
                                            <span>{meta.emoji}</span>
                                            <span>{meta.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 診断結果リスト（スクロールエリア） */}
                    <div className="flex-1 overflow-y-auto bg-white p-0 relative">
                        {testData && (
                            <div className="pb-4">
                                {/* 基本情報ヘッダー */}
                                <div className="sticky top-0 bg-white/95 backdrop-blur z-0 border-b border-slate-100 px-3 py-2 flex gap-3 text-xs shadow-sm">
                                    <div className="flex-1 font-bold text-slate-700 flex items-center gap-2">
                                        <Baby className="w-4 h-4 text-pink-400" />
                                        {testData.childInfo.name} <span className="font-normal text-slate-400">
                                            ({testData.childInfo.age}歳{testData.childInfo.ageMonths}ヶ月)
                                        </span>
                                    </div>
                                    <div className="flex gap-2 text-[10px]">
                                        <span className="bg-slate-100 px-1.5 py-0.5 rounded">姿勢 {testData.scores.postureScore}</span>
                                        <span className="bg-slate-100 px-1.5 py-0.5 rounded">口腔 {testData.scores.oralScore}</span>
                                    </div>
                                </div>

                                <div className="px-3 py-3 space-y-4">
                                    {/* DBカテゴリでグループ化して表示 */}
                                    {diagnosisCategories.map((cat) => {
                                        // このカテゴリに属するテストデータのみ抽出
                                        const itemsInCategory = cat.items.filter(item =>
                                            testData.diagnosis[item.id] !== undefined
                                        )

                                        if (itemsInCategory.length === 0) return null

                                        return (
                                            <div key={cat.id} className="space-y-1">
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1 border-l-2 border-blue-200">
                                                    {cat.name}
                                                </div>
                                                <div className="grid grid-cols-1 gap-1">
                                                    {itemsInCategory.map((item) => {
                                                        const val = testData.diagnosis[item.id] || ''
                                                        const isIssue = ['有', '不可', '困難', '口呼吸', '不良'].includes(val) || val.includes('肥大')

                                                        return (
                                                            <div key={item.id} className={cn(
                                                                "flex items-center justify-between text-xs p-1.5 rounded border transition-colors",
                                                                isIssue ? "bg-red-50 border-red-100" : "bg-white border-slate-100"
                                                            )}>
                                                                <span className={cn("flex-1 pr-2", isIssue ? "text-red-700 font-medium" : "text-slate-600")}>
                                                                    {item.question}
                                                                </span>
                                                                <button
                                                                    onClick={() => {
                                                                        if (testType === 'manual') {
                                                                            const opts = item.options || []
                                                                            if (opts.length > 0) {
                                                                                const optLabels = opts.map((o: any) => typeof o === 'string' ? o : o.label)
                                                                                const idx = optLabels.indexOf(val)
                                                                                const nextVal = optLabels[(idx + 1) % optLabels.length]
                                                                                // フラット構造で更新
                                                                                setTestData(prev => prev ? {
                                                                                    ...prev,
                                                                                    diagnosis: { ...prev.diagnosis, [item.id]: nextVal }
                                                                                } : null)
                                                                            }
                                                                        }
                                                                    }}
                                                                    className={cn(
                                                                        "font-bold px-2 py-0.5 rounded text-[10px] min-w-[3rem] text-center transition-all",
                                                                        testType === 'manual' && "hover:scale-105 active:scale-95 cursor-pointer shadow-sm",
                                                                        isIssue ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-500"
                                                                    )}
                                                                >
                                                                    {val}
                                                                </button>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 中カラム: プロンプト編集 */}
                <div className="flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-0">
                    <div className="p-4 border-b border-slate-200 bg-white flex-shrink-0 space-y-3">
                        {/* タイトル行 */}
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                                <Edit3 className="w-4 h-4 text-purple-600" />
                                プロンプト調整
                            </h3>
                        </div>

                        {/* モデル選択 */}
                        <div className="flex items-center gap-3">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider min-w-[3rem]">
                                モデル
                            </label>
                            <select
                                value={selectedModel}
                                onChange={(e) => setSelectedModel(e.target.value)}
                                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none cursor-pointer transition-all"
                            >
                                {GEMINI_MODELS.map((m) => (
                                    <option key={m.value} value={m.value}>{m.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* プロンプト名と保存ボタン */}
                        <div className="flex items-center gap-3">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider min-w-[3rem]">
                                名前
                            </label>
                            <input
                                type="text"
                                placeholder="プロンプトの名前を入力..."
                                value={promptLabel}
                                onChange={(e) => setPromptLabel(e.target.value)}
                                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                            />
                            <button
                                onClick={handleSavePrompt}
                                disabled={isSavingPrompt}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 shadow-md shadow-purple-100 hover:shadow-purple-200 disabled:opacity-50 transition-all flex items-center gap-1.5"
                            >
                                <Save className="w-3.5 h-3.5" />
                                {isSavingPrompt ? '保存中...' : '保存'}
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 relative bg-slate-50 min-h-0">
                        <textarea
                            value={customPrompt}
                            onChange={(e) => setCustomPrompt(e.target.value)}
                            className="w-full h-full p-4 bg-white text-slate-700 font-mono text-xs leading-relaxed focus:ring-0 outline-none resize-none border-0"
                            placeholder="System Prompt Template..."
                        />
                    </div>

                    {/* レポート生成ボタンエリア（ここへ移動） */}
                    <div className="p-3 bg-white border-t border-slate-200 flex-shrink-0 space-y-2">
                        <div className="flex flex-wrap gap-2 mb-2 p-2 bg-slate-50 border border-slate-100 rounded-lg">
                            <div className="w-full flex items-center justify-between mb-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">利用可能な変数</span>
                                <button
                                    onClick={addVariable}
                                    className="text-[10px] bg-purple-600 text-white px-2 py-0.5 rounded hover:bg-purple-700 transition-colors flex items-center gap-1"
                                >
                                    <Zap className="w-3 h-3" />
                                    変数を作成
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-1">
                                <div className="w-full text-[9px] text-slate-400 font-bold mb-1 mt-1">システム変数</div>
                                <button
                                    onClick={() => copyToClipboard('{{ageDisplay}}')}
                                    className="text-[9px] font-mono bg-white px-1.5 py-0.5 border border-slate-200 rounded text-slate-500 hover:border-purple-300 hover:text-purple-600 transition-all shadow-sm flex items-center gap-1"
                                    title="年齢表示（例: 5歳9ヶ月）- クリックでコピー"
                                >
                                    ageDisplay
                                    <Copy className="w-2.5 h-2.5 opacity-50" />
                                </button>

                                <div className="w-full text-[9px] text-purple-400 font-bold mb-1 mt-2">カスタム変数 (Variable Maker)</div>
                                {variableConfigs.length === 0 && (
                                    <div className="text-[10px] text-slate-300 italic p-1">「変数を作成」から独自の変数を定義できます</div>
                                )}
                                {variableConfigs.map((v, idx) => (
                                    <div key={v.name} className="flex items-center bg-purple-50 border border-purple-100 rounded-lg overflow-hidden shadow-sm hover:shadow transition-shadow">
                                        <button
                                            onClick={() => copyToClipboard(`{{${v.name}}}`)}
                                            className="p-1 px-1.5 hover:bg-purple-100 text-purple-400 transition-colors border-r border-purple-100"
                                            title={`{{${v.name}}} をコピー`}
                                        >
                                            <Copy className="w-3 h-3" />
                                        </button>
                                        <button
                                            onClick={() => setEditingVariableIndex(idx)}
                                            className="text-[10px] font-mono px-2 py-1 text-purple-700 font-bold hover:bg-purple-100 transition-colors flex items-center gap-1.5"
                                            title="クリックで定義を編集"
                                        >
                                            <Settings2 className="w-3 h-3 text-purple-300" />
                                            {v.name}
                                            <span className="bg-purple-200/50 text-purple-600 px-1 rounded text-[8px]">{v.itemIds.length}</span>
                                        </button>
                                        <button
                                            onClick={() => removeVariable(idx)}
                                            className="p-1 px-1.5 text-purple-300 hover:text-red-500 hover:bg-red-50 transition-colors border-l border-purple-100"
                                            title="変数を削除"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <button
                            onClick={generateReport}
                            disabled={isLoading}
                            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-bold shadow-md shadow-blue-100 hover:shadow-blue-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:translate-y-0 transition-all flex items-center justify-center gap-2 text-sm"
                        >
                            {isLoading ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                                <Play className="w-4 h-4 fill-white" />
                            )}
                            この設定でAI生成を実行
                        </button>
                    </div>
                </div>

                {/* 右カラム: 結果プレビュー */}
                <div className="flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-0">
                    <div className="p-3 border-b border-slate-200 bg-white flex items-center justify-between flex-shrink-0">
                        <h3 className="font-bold text-slate-700 text-xs flex items-center gap-2">
                            <Eye className="w-3.5 h-3.5 text-emerald-500" />
                            結果プレビュー
                        </h3>
                        {result && (
                            <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">
                                {result.processingTimeMs}ms
                            </span>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-0 bg-white min-h-0">
                        {!result && !error ? (
                            <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-40 p-10">
                                <FileText className="w-12 h-12 text-slate-300" />
                                <p className="text-xs text-slate-400">
                                    左の設定を選んで<br />中央の実行ボタンを押してください
                                </p>
                            </div>
                        ) : error ? (
                            <div className="m-4 bg-red-50 border border-red-100 p-4 rounded-xl text-red-600">
                                <h4 className="font-bold text-xs flex items-center gap-2 mb-1">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    エラーが発生しました
                                </h4>
                                <p className="text-[10px] font-mono break-all">{error}</p>
                            </div>
                        ) : (
                            <div className="p-5 space-y-6 animate-in fade-in zoom-in-95 duration-300 pb-20">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AI生成出力（プレビュー）</h4>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => copyToClipboard(result.rawText || result.analysis)}
                                                className="text-[10px] text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"
                                            >
                                                <Copy className="w-3 h-3" />
                                                出力をコピー
                                            </button>
                                        </div>
                                    </div>

                                    <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-inner min-h-[400px]">
                                        {result.rawText || result.analysis}
                                    </div>
                                </div>

                                {/* デバッグ情報セクション */}
                                {result.debug && (
                                    <div className="space-y-3">
                                        <h4 className="text-[10px] font-bold text-amber-600 uppercase tracking-widest flex items-center gap-1">
                                            <Database className="w-3 h-3" />
                                            デバッグ情報（変数置換の詳細）
                                        </h4>

                                        {/* 変数置換の詳細 */}
                                        {result.debug.variableReplacements && result.debug.variableReplacements.length > 0 && (
                                            <div className="space-y-2">
                                                {result.debug.variableReplacements.map((vr, idx) => (
                                                    <div key={idx} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="font-bold text-amber-700 text-xs">
                                                                {`{{${vr.variableName}}}`}
                                                            </span>
                                                            <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                                                                見つかった: {vr.foundItems.length}
                                                            </span>
                                                            <span className={cn(
                                                                "text-[10px] px-1.5 py-0.5 rounded",
                                                                vr.notFoundItems.length > 0
                                                                    ? "bg-red-100 text-red-700"
                                                                    : "bg-slate-100 text-slate-500"
                                                            )}>
                                                                見つからない: {vr.notFoundItems.length}
                                                            </span>
                                                        </div>

                                                        {vr.notFoundItems.length > 0 && (
                                                            <div className="mb-2">
                                                                <span className="text-[9px] text-red-600 font-bold">⚠️ 見つからなかったID:</span>
                                                                <div className="flex flex-wrap gap-1 mt-1">
                                                                    {vr.notFoundItems.map(id => (
                                                                        <code key={id} className="text-[9px] bg-red-100 text-red-700 px-1 py-0.5 rounded">
                                                                            {id}
                                                                        </code>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {vr.foundItems.length > 0 && (
                                                            <div className="mb-2">
                                                                <span className="text-[9px] text-green-600 font-bold">✓ 見つかったID:</span>
                                                                <div className="flex flex-wrap gap-1 mt-1">
                                                                    {vr.foundItems.map(id => (
                                                                        <code key={id} className="text-[9px] bg-green-100 text-green-700 px-1 py-0.5 rounded">
                                                                            {id}
                                                                        </code>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div>
                                                            <span className="text-[9px] text-slate-500 font-bold">置換結果:</span>
                                                            <pre className="text-[10px] bg-white p-2 rounded border border-amber-200 mt-1 whitespace-pre-wrap max-h-24 overflow-y-auto">
                                                                {vr.replacement || '(空)'}
                                                            </pre>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* 利用可能なマップキー（折りたたみ） */}
                                        <details className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                                            <summary className="text-[10px] font-bold text-slate-500 cursor-pointer">
                                                利用可能な全キー（クリックで展開） - {result.debug.allItemsMapKeys?.length || 0}件
                                            </summary>
                                            <div className="mt-2 flex flex-wrap gap-1 max-h-40 overflow-y-auto">
                                                {result.debug.allItemsMapKeys?.map(key => (
                                                    <code key={key} className="text-[9px] bg-slate-200 text-slate-700 px-1 py-0.5 rounded">
                                                        {key}
                                                    </code>
                                                ))}
                                            </div>
                                        </details>

                                        {/* マップの中身（折りたたみ） */}
                                        <details className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                                            <summary className="text-[10px] font-bold text-slate-500 cursor-pointer">
                                                マップの中身（クリックで展開）
                                            </summary>
                                            <pre className="mt-2 text-[9px] bg-white p-2 rounded border border-slate-200 whitespace-pre-wrap max-h-60 overflow-y-auto">
                                                {JSON.stringify(result.debug.allItemsMapEntries, null, 2)}
                                            </pre>
                                        </details>
                                    </div>
                                )}

                                <div ref={resultEndRef} />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

            {/* Variable Mapping Modal */}
            {editingVariableIndex !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
                            <div className="flex-1 mr-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-bold text-purple-600 uppercase tracking-widest bg-purple-50 px-2 py-0.5 rounded">変数名</span>
                                    <input
                                        type="text"
                                        value={variableConfigs[editingVariableIndex].name}
                                        onChange={(e) => updateVariableName(editingVariableIndex, e.target.value)}
                                        className="text-sm font-bold text-slate-800 border-b border-slate-200 focus:border-purple-500 outline-none w-full bg-transparent"
                                        placeholder="変数名を入力..."
                                        autoFocus
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400">
                                    プロンプト内では <code className="bg-slate-100 px-1 rounded text-purple-600">{`{{${variableConfigs[editingVariableIndex].name}}}`}</code> として使用します。
                                </p>
                            </div>
                            <button
                                onClick={() => setEditingVariableIndex(null)}
                                className="w-8 h-8 flex items-center justify-center bg-slate-50 text-slate-400 rounded-full hover:bg-slate-100 transition-colors flex-shrink-0"
                            >
                                ×
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="px-4 flex border-b border-slate-100 bg-white">
                            <button
                                onClick={() => setMappingTab('diagnosis')}
                                className={cn(
                                    "px-4 py-3 text-xs font-bold transition-all border-b-2",
                                    mappingTab === 'diagnosis' ? "border-purple-600 text-purple-600" : "border-transparent text-slate-400 hover:text-slate-600"
                                )}
                            >
                                診断項目 (スタッフ入力)
                            </button>
                            <button
                                onClick={() => setMappingTab('questionnaire')}
                                className={cn(
                                    "px-4 py-3 text-xs font-bold transition-all border-b-2",
                                    mappingTab === 'questionnaire' ? "border-purple-600 text-purple-600" : "border-transparent text-slate-400 hover:text-slate-600"
                                )}
                            >
                                問診項目 (保護者入力)
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50">
                            <div className="space-y-6">
                                {mappingTab === 'questionnaire' ? (
                                    <div className="space-y-4">
                                        {questionnaireCategories.map(cat => (
                                            <div key={cat.id} className="space-y-2">
                                                <div className="flex items-center justify-between pl-2 border-l-2 border-slate-200">
                                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                        {cat.name}
                                                    </h4>
                                                    <button
                                                        onClick={() => toggleCategoryInVariable(editingVariableIndex, cat.items.map(i => i.id))}
                                                        className="text-[9px] text-purple-600 hover:text-purple-700 font-bold"
                                                    >
                                                        {cat.items.every(i => variableConfigs[editingVariableIndex].itemIds.includes(i.id)) ? '全解除' : '全選択'}
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                                    {cat.items.map(item => {
                                                        const isSelected = variableConfigs[editingVariableIndex].itemIds.includes(item.id)
                                                        const isPriority = variableConfigs[editingVariableIndex].priorityItemIds.includes(item.id)
                                                        return (
                                                            <div
                                                                key={item.id}
                                                                className={cn(
                                                                    "flex items-center gap-2 p-3 rounded-xl border transition-all cursor-pointer shadow-sm",
                                                                    isSelected ? "bg-white border-purple-200 ring-1 ring-purple-100" : "bg-slate-50 border-slate-100 hover:border-slate-200 text-slate-400"
                                                                )}
                                                                onClick={() => toggleItemInVariable(editingVariableIndex, item.id)}
                                                            >
                                                                <div className={cn(
                                                                    "w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors",
                                                                    isSelected ? "bg-purple-600 border-purple-600 text-white" : "border-slate-200 bg-white"
                                                                )}>
                                                                    {isSelected && <ClipboardCheck className="w-3 h-3" />}
                                                                </div>
                                                                <span className={cn("text-[11px] flex-1 truncate", isSelected ? "text-slate-700 font-medium" : "text-slate-400")}>{item.question}</span>
                                                                {isSelected && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation()
                                                                            togglePriorityInVariable(editingVariableIndex, item.id)
                                                                        }}
                                                                        className={cn(
                                                                            "w-7 h-7 rounded-lg flex items-center justify-center transition-all",
                                                                            isPriority ? "bg-orange-100 text-orange-600 shadow-inner" : "bg-slate-50 text-slate-200 hover:bg-orange-50 hover:text-orange-300"
                                                                        )}
                                                                        title="最重要項目としてマーク"
                                                                    >
                                                                        ★
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {/* 診断項目 */}
                                        {diagnosisCategories.map(cat => (
                                            <div key={cat.id} className="space-y-2">
                                                <div className="flex items-center justify-between pl-2 border-l-2 border-slate-200">
                                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                        {cat.name}
                                                    </h4>
                                                    <button
                                                        onClick={() => toggleCategoryInVariable(editingVariableIndex, cat.items.map(i => i.id))}
                                                        className="text-[9px] text-purple-600 hover:text-purple-700 font-bold"
                                                    >
                                                        {cat.items.every(i => variableConfigs[editingVariableIndex].itemIds.includes(i.id)) ? '全解除' : '全選択'}
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                                    {cat.items.map(item => {
                                                        const isSelected = variableConfigs[editingVariableIndex].itemIds.includes(item.id)
                                                        const isPriority = variableConfigs[editingVariableIndex].priorityItemIds.includes(item.id)
                                                        return (
                                                            <div
                                                                key={item.id}
                                                                className={cn(
                                                                    "flex items-center gap-2 p-3 rounded-xl border transition-all cursor-pointer shadow-sm",
                                                                    isSelected ? "bg-white border-purple-200 ring-1 ring-purple-100" : "bg-slate-50 border-slate-100 hover:border-slate-200 text-slate-400"
                                                                )}
                                                                onClick={() => toggleItemInVariable(editingVariableIndex, item.id)}
                                                            >
                                                                <div className={cn(
                                                                    "w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors",
                                                                    isSelected ? "bg-purple-600 border-purple-600 text-white" : "border-slate-200 bg-white"
                                                                )}>
                                                                    {isSelected && <ClipboardCheck className="w-3 h-3" />}
                                                                </div>
                                                                <span className={cn("text-[11px] flex-1 truncate", isSelected ? "text-slate-700 font-medium" : "text-slate-400")}>{item.question}</span>
                                                                {isSelected && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation()
                                                                            togglePriorityInVariable(editingVariableIndex, item.id)
                                                                        }}
                                                                        className={cn(
                                                                            "w-7 h-7 rounded-lg flex items-center justify-center transition-all",
                                                                            isPriority ? "bg-orange-100 text-orange-600 shadow-inner" : "bg-slate-50 text-slate-200 hover:bg-orange-50 hover:text-orange-300"
                                                                        )}
                                                                        title="最重要項目としてマーク"
                                                                    >
                                                                        ★
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-100 bg-white flex justify-end">
                            <button
                                onClick={() => setEditingVariableIndex(null)}
                                className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-lg shadow-slate-200 hover:scale-105 active:scale-95 transition-all"
                            >
                                設定を完了する
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    )
}
