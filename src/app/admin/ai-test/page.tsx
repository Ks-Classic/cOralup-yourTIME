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
  Bot,
  Wand2,
  History,
  Settings2,
  Baby,
  BarChart,
  ClipboardCheck,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Save,
  Zap,
  Play,
  RefreshCw,
  Layout,
  Edit3,
  Eye,
  Database,
  FileText,
  Copy,
  Trash2,
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

// 利用可能なGeminiモデル（公式の現行モデルIDのみ。2026-06 Google公式価格表に準拠）
// 旧 'gemini-3-pro-preview' / 'gemini-3-flash-preview' は無効IDのため削除。
const GEMINI_MODELS = [
  {
    value: 'gemini-3.1-flash-lite',
    label: 'Gemini 3.1 Flash-Lite（推奨・低レイテンシ/コスパ）',
  },
  {
    value: 'gemini-3.5-flash',
    label: 'Gemini 3.5 Flash（高品質・やや高コスト）',
  },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash（安定版・バランス）' },
  {
    value: 'gemini-2.5-flash-lite',
    label: 'Gemini 2.5 Flash-Lite（安定版・最安/現行既定）',
  },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro（高品質・割高）' },
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
  const [diagnosisCategories, setDiagnosisCategories] = useState<DBCategory[]>(
    []
  )
  const [questionnaireCategories, setQuestionnaireCategories] = useState<
    DBCategory[]
  >([])
  const [isLoadingSchema, setIsLoadingSchema] = useState(true)
  const [schemaError, setSchemaError] = useState<string | null>(null)

  // Test Data state
  const [testData, setTestData] = useState<MockTestData | null>(null)
  const [testType, setTestType] = useState<'random' | 'manual'>('random')
  const [selectedSeverity, setSelectedSeverity] =
    useState<SeverityType>('moderate')
  const [selectedAgeCategory, setSelectedAgeCategory] =
    useState<AgeCategoryType>('toddler')

  // Prompt states
  const [customPrompt, setCustomPrompt] = useState(DEFAULT_PROMPT)
  const [prompts, setPrompts] = useState<AIPrompt[]>([])
  const [isSavingPrompt, setIsSavingPrompt] = useState(false)
  const [promptLabel, setPromptLabel] = useState('')
  const [variableConfigs, setVariableConfigs] = useState<VariableConfig[]>([])
  const [editingVariableIndex, setEditingVariableIndex] = useState<
    number | null
  >(null)
  const [mappingTab, setMappingTab] = useState<'diagnosis' | 'questionnaire'>(
    'diagnosis'
  )
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
  const generateTestDataFromDB = useCallback(
    (
      diagCats: DBCategory[],
      questCats: DBCategory[],
      severity: SeverityType,
      ageCategory: AgeCategoryType
    ): MockTestData => {
      // 全診断項目をフラットに
      const allDiagItems = diagCats.flatMap((cat) =>
        cat.items.map((item) => ({
          id: item.id,
          question: item.question,
          options: item.options,
          answer_type: item.answer_type,
        }))
      )

      // 全問診項目をフラットに
      const allQuestItems = questCats.flatMap((cat) =>
        cat.items.map((item) => ({
          id: item.id,
          question: item.question,
          options: item.options,
          answer_type: item.answer_type,
        }))
      )

      // 値を生成
      const diagnosisValues = generateMockValuesFromDBItems(
        allDiagItems,
        severity
      )
      const questionnaireValues = generateMockValuesFromDBItems(
        allQuestItems,
        severity
      )

      return {
        childInfo: generateChildInfo(ageCategory),
        diagnosis: diagnosisValues,
        questionnaire: questionnaireValues,
        scores: generateScores(severity),
        staffNotes: generateStaffNotes(severity),
      }
    },
    []
  )

  // Initialization
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoadingSchema(true)
      try {
        // Fetch schemas
        const [diagRes, questRes, promptsRes] = await Promise.all([
          fetch('/api/diagnosis-schema?input_type=staff'),
          fetch('/api/questionnaire/items?target_age=all'),
          fetch('/api/admin/ai-prompts'),
        ])

        const diagData = await diagRes.json()
        const questData = await questRes.json()
        const promptsData = await promptsRes.json()

        const normalizeOptions = (
          options: any
        ): { value: string; label: string }[] => {
          if (!options) return []
          if (Array.isArray(options)) {
            return options.map((opt) => {
              if (typeof opt === 'string') return { value: opt, label: opt }
              return {
                value: opt.value || opt,
                label: opt.label || opt.value || opt,
              }
            })
          }
          if (typeof options === 'string') {
            try {
              return normalizeOptions(JSON.parse(options))
            } catch {
              return []
            }
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
            items: items
              .filter((i: any) => i.categoryId === cat.id)
              .map((item: any) => ({
                id: item.id,
                question: item.question,
                answer_type: item.answerType,
                options: normalizeOptions(item.options),
                is_required: item.isRequired,
                input_type: item.inputType,
              })),
          }))
          setDiagnosisCategories(diagCats)
        }

        if (questData.data?.categories) {
          questCats = questData.data.categories.map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            display_order: cat.display_order,
            items:
              cat.items?.map((item: any) => ({
                id: item.id,
                question: item.question,
                answer_type: item.answer_type,
                options: normalizeOptions(item.options),
                is_required: item.is_required,
                input_type: item.input_type,
              })) || [],
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
          setTestData(
            generateTestDataFromDB(diagCats, questCats, 'moderate', 'toddler')
          )
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
  const handleConditionChange = useCallback(
    (severity: SeverityType) => {
      setSelectedSeverity(severity)
      // 状態ボタンを押したら即座に再生成（DB項目ベース）
      setTestData(
        generateTestDataFromDB(
          diagnosisCategories,
          questionnaireCategories,
          severity,
          selectedAgeCategory
        )
      )
      setResult(null) // 結果はクリア
    },
    [
      diagnosisCategories,
      questionnaireCategories,
      selectedAgeCategory,
      generateTestDataFromDB,
    ]
  )

  const handleAgeChange = useCallback(
    (age: AgeCategoryType) => {
      setSelectedAgeCategory(age)
      // 年齢を変えたら即座に再生成（DB項目ベース）
      setTestData(
        generateTestDataFromDB(
          diagnosisCategories,
          questionnaireCategories,
          selectedSeverity,
          age
        )
      )
      setResult(null)
    },
    [
      diagnosisCategories,
      questionnaireCategories,
      selectedSeverity,
      generateTestDataFromDB,
    ]
  )

  // Action: Update data
  const updateChildInfo = useCallback(
    (field: keyof MockChildInfo, value: string | number) => {
      setTestData((prev) =>
        prev
          ? {
              ...prev,
              childInfo: { ...prev.childInfo, [field]: value },
            }
          : null
      )
    },
    []
  )

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
          is_active: true,
        }),
      })
      const data = await res.json()
      if (data.success) {
        alert('プロンプトを保存しました')
        setPrompts([
          data.data,
          ...prompts.map((p) => ({ ...p, is_active: false })),
        ])
      }
    } catch (err) {
      alert('保存に失敗しました')
    } finally {
      setIsSavingPrompt(false)
    }
  }

  const addVariable = () => {
    const newVariable: VariableConfig = {
      name: '新規変数',
      itemIds: [],
      priorityItemIds: [],
    }
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
      v.itemIds = v.itemIds.filter((id) => id !== itemId)
      v.priorityItemIds = v.priorityItemIds.filter((id) => id !== itemId)
    } else {
      v.itemIds.push(itemId)
    }
    setVariableConfigs(newConfigs)
  }

  const togglePriorityInVariable = (vIndex: number, itemId: string) => {
    const newConfigs = [...variableConfigs]
    const v = newConfigs[vIndex]
    if (v.priorityItemIds.includes(itemId)) {
      v.priorityItemIds = v.priorityItemIds.filter((id) => id !== itemId)
    } else {
      v.priorityItemIds.push(itemId)
    }
    setVariableConfigs(newConfigs)
  }

  const toggleCategoryInVariable = (
    vIndex: number | null,
    itemIds: string[]
  ) => {
    if (vIndex === null) return
    const newConfigs = [...variableConfigs]
    const v = newConfigs[vIndex]
    const allSelected = itemIds.every((id) => v.itemIds.includes(id))

    if (allSelected) {
      // Remove all
      v.itemIds = v.itemIds.filter((id) => !itemIds.includes(id))
      v.priorityItemIds = v.priorityItemIds.filter(
        (id) => !itemIds.includes(id)
      )
    } else {
      // Add missing
      itemIds.forEach((id) => {
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
    const diagnosisMeta: Record<string, { question: string; value: string }> =
      {}
    const questionnaireMeta: Record<
      string,
      { question: string; value: string }
    > = {}
    const postureIssues: string[] = []
    const oralIssues: string[] = []

    // 診断データの処理
    for (const [itemId, value] of Object.entries(testData.diagnosis)) {
      // DB項目から質問名を取得
      let question = itemId
      let categoryName = ''
      for (const cat of diagnosisCategories) {
        const item = cat.items.find((i) => i.id === itemId)
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
        const item = cat.items.find((i) => i.id === itemId)
        if (item) {
          question = item.question
          break
        }
      }
      questionnaireMeta[itemId] = { question, value }
    }

    // 総月齢を計算（年×12 + 月）
    const totalAgeMonths =
      testData.childInfo.age * 12 + testData.childInfo.ageMonths

    return {
      testMode: true,
      testData: {
        childName: testData.childInfo.name,
        childAge: testData.childInfo.age,
        childAgeMonths: totalAgeMonths, // 総月齢を送信
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
      modelName: selectedModel,
    }
  }, [
    testData,
    diagnosisCategories,
    questionnaireCategories,
    customPrompt,
    selectedModel,
    variableConfigs,
  ])

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
      if (!response.ok)
        throw new Error(data.error || `API error: ${response.status}`)
      setResult({ ...data, processingTimeMs: Date.now() - startTime })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [formatForAPI])

  if (isLoadingSchema)
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-slate-400">
        <RefreshCw className="mb-4 h-10 w-10 animate-spin text-purple-500" />
        <p>システム構成を読み込み中...</p>
      </div>
    )

  return (
    <div className="flex h-[calc(100vh-100px)] flex-col space-y-6">
      <div className="flex-shrink-0">
        <h2 className="flex items-center gap-2 text-xl font-bold text-slate-800">
          <Zap className="h-6 w-6 fill-amber-500 text-amber-500" />
          AIプロンプト実験室 / gemini-2.5-flash-lite
        </h2>
        <p className="text-xs text-slate-500">
          あらゆる診断ケースを自動生成し、プロンプトを調整して即座に結果を確認できます。
        </p>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-3">
        {/* 左カラム: ケース設定 */}
        <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="z-10 flex-shrink-0 border-b border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="flex items-center gap-1 text-xs font-bold text-slate-700">
                <Layout className="h-3.5 w-3.5 text-blue-500" />
                テストケース設定
              </h3>
              <div className="flex gap-1">
                <button
                  onClick={() => setTestType('random')}
                  className={cn(
                    'rounded px-2 py-0.5 text-[10px] transition-all',
                    testType === 'random'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:bg-slate-100'
                  )}
                >
                  自動
                </button>
                <button
                  onClick={() => setTestType('manual')}
                  className={cn(
                    'rounded px-2 py-0.5 text-[10px] transition-all',
                    testType === 'manual'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:bg-slate-100'
                  )}
                >
                  手動
                </button>
              </div>
            </div>

            {/* 2列設定パネル */}
            {testType === 'random' && (
              <div className="grid grid-cols-[auto_1fr] items-center gap-2 text-xs">
                <span className="text-[10px] font-bold uppercase text-slate-400">
                  年齢層
                </span>
                <div className="no-scrollbar flex gap-1 overflow-x-auto">
                  {Object.entries(AGE_PRESETS).map(([id, meta]) => (
                    <button
                      key={id}
                      onClick={() => handleAgeChange(id as any)}
                      className={cn(
                        'flex items-center gap-1 whitespace-nowrap rounded border px-2 py-1.5 transition-all',
                        selectedAgeCategory === id
                          ? 'border-blue-400 bg-blue-50 font-bold text-blue-700 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                      )}
                    >
                      <span>{meta.emoji}</span>
                      <span>{meta.label}</span>
                    </button>
                  ))}
                </div>

                <span className="text-[10px] font-bold uppercase text-slate-400">
                  状態
                </span>
                <div className="no-scrollbar flex gap-1 overflow-x-auto">
                  {Object.entries(SEVERITY_PRESETS).map(([id, meta]) => (
                    <button
                      key={id}
                      onClick={() => handleConditionChange(id as any)}
                      className={cn(
                        'flex items-center gap-1 whitespace-nowrap rounded border px-2 py-1.5 transition-all',
                        selectedSeverity === id
                          ? 'border-amber-400 bg-amber-50 font-bold text-amber-700 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
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
          <div className="relative flex-1 overflow-y-auto bg-white p-0">
            {testData && (
              <div className="pb-4">
                {/* 基本情報ヘッダー */}
                <div className="sticky top-0 z-0 flex gap-3 border-b border-slate-100 bg-white/95 px-3 py-2 text-xs shadow-sm backdrop-blur">
                  <div className="flex flex-1 items-center gap-2 font-bold text-slate-700">
                    <Baby className="h-4 w-4 text-pink-400" />
                    {testData.childInfo.name}{' '}
                    <span className="font-normal text-slate-400">
                      ({testData.childInfo.age}歳{testData.childInfo.ageMonths}
                      ヶ月)
                    </span>
                  </div>
                  <div className="flex gap-2 text-[10px]">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5">
                      姿勢 {testData.scores.postureScore}
                    </span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5">
                      口腔 {testData.scores.oralScore}
                    </span>
                  </div>
                </div>

                <div className="space-y-4 px-3 py-3">
                  {/* DBカテゴリでグループ化して表示 */}
                  {diagnosisCategories.map((cat) => {
                    // このカテゴリに属するテストデータのみ抽出
                    const itemsInCategory = cat.items.filter(
                      (item) => testData.diagnosis[item.id] !== undefined
                    )

                    if (itemsInCategory.length === 0) return null

                    return (
                      <div key={cat.id} className="space-y-1">
                        <div className="border-l-2 border-blue-200 pl-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {cat.name}
                        </div>
                        <div className="grid grid-cols-1 gap-1">
                          {itemsInCategory.map((item) => {
                            const val = testData.diagnosis[item.id] || ''
                            const isIssue =
                              ['有', '不可', '困難', '口呼吸', '不良'].includes(
                                val
                              ) || val.includes('肥大')

                            return (
                              <div
                                key={item.id}
                                className={cn(
                                  'flex items-center justify-between rounded border p-1.5 text-xs transition-colors',
                                  isIssue
                                    ? 'border-red-100 bg-red-50'
                                    : 'border-slate-100 bg-white'
                                )}
                              >
                                <span
                                  className={cn(
                                    'flex-1 pr-2',
                                    isIssue
                                      ? 'font-medium text-red-700'
                                      : 'text-slate-600'
                                  )}
                                >
                                  {item.question}
                                </span>
                                <button
                                  onClick={() => {
                                    if (testType === 'manual') {
                                      const opts = item.options || []
                                      if (opts.length > 0) {
                                        const optLabels = opts.map((o: any) =>
                                          typeof o === 'string' ? o : o.label
                                        )
                                        const idx = optLabels.indexOf(val)
                                        const nextVal =
                                          optLabels[
                                            (idx + 1) % optLabels.length
                                          ]
                                        // フラット構造で更新
                                        setTestData((prev) =>
                                          prev
                                            ? {
                                                ...prev,
                                                diagnosis: {
                                                  ...prev.diagnosis,
                                                  [item.id]: nextVal,
                                                },
                                              }
                                            : null
                                        )
                                      }
                                    }
                                  }}
                                  className={cn(
                                    'min-w-[3rem] rounded px-2 py-0.5 text-center text-[10px] font-bold transition-all',
                                    testType === 'manual' &&
                                      'cursor-pointer shadow-sm hover:scale-105 active:scale-95',
                                    isIssue
                                      ? 'bg-red-100 text-red-600'
                                      : 'bg-slate-100 text-slate-500'
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
        <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex-shrink-0 space-y-3 border-b border-slate-200 bg-white p-4">
            {/* タイトル行 */}
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <Edit3 className="h-4 w-4 text-purple-600" />
                プロンプト調整
              </h3>
            </div>

            {/* モデル選択 */}
            <div className="flex items-center gap-3">
              <label className="min-w-[3rem] text-[10px] font-bold uppercase tracking-wider text-slate-400">
                モデル
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="flex-1 cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none transition-all focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
              >
                {GEMINI_MODELS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* プロンプト名と保存ボタン */}
            <div className="flex items-center gap-3">
              <label className="min-w-[3rem] text-[10px] font-bold uppercase tracking-wider text-slate-400">
                名前
              </label>
              <input
                type="text"
                placeholder="プロンプトの名前を入力..."
                value={promptLabel}
                onChange={(e) => setPromptLabel(e.target.value)}
                className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none transition-all focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={handleSavePrompt}
                disabled={isSavingPrompt}
                className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-purple-100 transition-all hover:bg-purple-700 hover:shadow-purple-200 disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                {isSavingPrompt ? '保存中...' : '保存'}
              </button>
            </div>
          </div>

          <div className="relative min-h-0 flex-1 bg-slate-50">
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className="h-full w-full resize-none border-0 bg-white p-4 font-mono text-xs leading-relaxed text-slate-700 outline-none focus:ring-0"
              placeholder="System Prompt Template..."
            />
          </div>

          {/* レポート生成ボタンエリア（ここへ移動） */}
          <div className="flex-shrink-0 space-y-2 border-t border-slate-200 bg-white p-3">
            <div className="mb-2 flex flex-wrap gap-2 rounded-lg border border-slate-100 bg-slate-50 p-2">
              <div className="mb-1 flex w-full items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-tight text-slate-400">
                  利用可能な変数
                </span>
                <button
                  onClick={addVariable}
                  className="flex items-center gap-1 rounded bg-purple-600 px-2 py-0.5 text-[10px] text-white transition-colors hover:bg-purple-700"
                >
                  <Zap className="h-3 w-3" />
                  変数を作成
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                <div className="mb-1 mt-1 w-full text-[9px] font-bold text-slate-400">
                  システム変数
                </div>
                <button
                  onClick={() => copyToClipboard('{{ageDisplay}}')}
                  className="flex items-center gap-1 rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[9px] text-slate-500 shadow-sm transition-all hover:border-purple-300 hover:text-purple-600"
                  title="年齢表示（例: 5歳9ヶ月）- クリックでコピー"
                >
                  ageDisplay
                  <Copy className="h-2.5 w-2.5 opacity-50" />
                </button>

                <div className="mb-1 mt-2 w-full text-[9px] font-bold text-purple-400">
                  カスタム変数 (Variable Maker)
                </div>
                {variableConfigs.length === 0 && (
                  <div className="p-1 text-[10px] italic text-slate-300">
                    「変数を作成」から独自の変数を定義できます
                  </div>
                )}
                {variableConfigs.map((v, idx) => (
                  <div
                    key={v.name}
                    className="flex items-center overflow-hidden rounded-lg border border-purple-100 bg-purple-50 shadow-sm transition-shadow hover:shadow"
                  >
                    <button
                      onClick={() => copyToClipboard(`{{${v.name}}}`)}
                      className="border-r border-purple-100 p-1 px-1.5 text-purple-400 transition-colors hover:bg-purple-100"
                      title={`{{${v.name}}} をコピー`}
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => setEditingVariableIndex(idx)}
                      className="flex items-center gap-1.5 px-2 py-1 font-mono text-[10px] font-bold text-purple-700 transition-colors hover:bg-purple-100"
                      title="クリックで定義を編集"
                    >
                      <Settings2 className="h-3 w-3 text-purple-300" />
                      {v.name}
                      <span className="rounded bg-purple-200/50 px-1 text-[8px] text-purple-600">
                        {v.itemIds.length}
                      </span>
                    </button>
                    <button
                      onClick={() => removeVariable(idx)}
                      className="border-l border-purple-100 p-1 px-1.5 text-purple-300 transition-colors hover:bg-red-50 hover:text-red-500"
                      title="変数を削除"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={generateReport}
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-sm font-bold text-white shadow-md shadow-blue-100 transition-all hover:-translate-y-0.5 hover:shadow-blue-200 active:translate-y-0 disabled:translate-y-0 disabled:opacity-50"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4 fill-white" />
              )}
              この設定でAI生成を実行
            </button>
          </div>
        </div>

        {/* 右カラム: 結果プレビュー */}
        <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white p-3">
            <h3 className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Eye className="h-3.5 w-3.5 text-emerald-500" />
              結果プレビュー
            </h3>
            {result && (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                {result.processingTimeMs}ms
              </span>
            )}
          </div>

          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto bg-white p-0">
            {!result && !error ? (
              <div className="flex h-full flex-col items-center justify-center space-y-3 p-10 text-center opacity-40">
                <FileText className="h-12 w-12 text-slate-300" />
                <p className="text-xs text-slate-400">
                  左の設定を選んで
                  <br />
                  中央の実行ボタンを押してください
                </p>
              </div>
            ) : error ? (
              <div className="m-4 rounded-xl border border-red-100 bg-red-50 p-4 text-red-600">
                <h4 className="mb-1 flex items-center gap-2 text-xs font-bold">
                  <AlertCircle className="h-3.5 w-3.5" />
                  エラーが発生しました
                </h4>
                <p className="break-all font-mono text-[10px]">{error}</p>
              </div>
            ) : (
              <div className="space-y-6 p-5 pb-20 duration-300 animate-in fade-in zoom-in-95">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      AI生成出力（プレビュー）
                    </h4>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          copyToClipboard(result.rawText || result.analysis)
                        }
                        className="flex items-center gap-1 text-[10px] text-slate-400 transition-colors hover:text-slate-600"
                      >
                        <Copy className="h-3 w-3" />
                        出力をコピー
                      </button>
                    </div>
                  </div>

                  <div className="min-h-[400px] whitespace-pre-wrap rounded-2xl border border-slate-100 bg-slate-50 p-6 text-sm leading-relaxed text-slate-700 shadow-inner">
                    {result.rawText || result.analysis}
                  </div>
                </div>

                {/* デバッグ情報セクション */}
                {result.debug && (
                  <div className="space-y-3">
                    <h4 className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-amber-600">
                      <Database className="h-3 w-3" />
                      デバッグ情報（変数置換の詳細）
                    </h4>

                    {/* 変数置換の詳細 */}
                    {result.debug.variableReplacements &&
                      result.debug.variableReplacements.length > 0 && (
                        <div className="space-y-2">
                          {result.debug.variableReplacements.map((vr, idx) => (
                            <div
                              key={idx}
                              className="rounded-lg border border-amber-200 bg-amber-50 p-3"
                            >
                              <div className="mb-2 flex items-center gap-2">
                                <span className="text-xs font-bold text-amber-700">
                                  {`{{${vr.variableName}}}`}
                                </span>
                                <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] text-green-700">
                                  見つかった: {vr.foundItems.length}
                                </span>
                                <span
                                  className={cn(
                                    'rounded px-1.5 py-0.5 text-[10px]',
                                    vr.notFoundItems.length > 0
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-slate-100 text-slate-500'
                                  )}
                                >
                                  見つからない: {vr.notFoundItems.length}
                                </span>
                              </div>

                              {vr.notFoundItems.length > 0 && (
                                <div className="mb-2">
                                  <span className="text-[9px] font-bold text-red-600">
                                    ⚠️ 見つからなかったID:
                                  </span>
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {vr.notFoundItems.map((id) => (
                                      <code
                                        key={id}
                                        className="rounded bg-red-100 px-1 py-0.5 text-[9px] text-red-700"
                                      >
                                        {id}
                                      </code>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {vr.foundItems.length > 0 && (
                                <div className="mb-2">
                                  <span className="text-[9px] font-bold text-green-600">
                                    ✓ 見つかったID:
                                  </span>
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {vr.foundItems.map((id) => (
                                      <code
                                        key={id}
                                        className="rounded bg-green-100 px-1 py-0.5 text-[9px] text-green-700"
                                      >
                                        {id}
                                      </code>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div>
                                <span className="text-[9px] font-bold text-slate-500">
                                  置換結果:
                                </span>
                                <pre className="mt-1 max-h-24 overflow-y-auto whitespace-pre-wrap rounded border border-amber-200 bg-white p-2 text-[10px]">
                                  {vr.replacement || '(空)'}
                                </pre>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                    {/* 利用可能なマップキー（折りたたみ） */}
                    <details className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <summary className="cursor-pointer text-[10px] font-bold text-slate-500">
                        利用可能な全キー（クリックで展開） -{' '}
                        {result.debug.allItemsMapKeys?.length || 0}件
                      </summary>
                      <div className="mt-2 flex max-h-40 flex-wrap gap-1 overflow-y-auto">
                        {result.debug.allItemsMapKeys?.map((key) => (
                          <code
                            key={key}
                            className="rounded bg-slate-200 px-1 py-0.5 text-[9px] text-slate-700"
                          >
                            {key}
                          </code>
                        ))}
                      </div>
                    </details>

                    {/* マップの中身（折りたたみ） */}
                    <details className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <summary className="cursor-pointer text-[10px] font-bold text-slate-500">
                        マップの中身（クリックで展開）
                      </summary>
                      <pre className="mt-2 max-h-60 overflow-y-auto whitespace-pre-wrap rounded border border-slate-200 bg-white p-2 text-[9px]">
                        {JSON.stringify(
                          result.debug.allItemsMapEntries,
                          null,
                          2
                        )}
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
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* Variable Mapping Modal */}
      {editingVariableIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl duration-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 bg-white p-4">
              <div className="mr-4 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="rounded bg-purple-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-purple-600">
                    変数名
                  </span>
                  <input
                    type="text"
                    value={variableConfigs[editingVariableIndex].name}
                    onChange={(e) =>
                      updateVariableName(editingVariableIndex, e.target.value)
                    }
                    className="w-full border-b border-slate-200 bg-transparent text-sm font-bold text-slate-800 outline-none focus:border-purple-500"
                    placeholder="変数名を入力..."
                    autoFocus
                  />
                </div>
                <p className="text-[10px] text-slate-400">
                  プロンプト内では{' '}
                  <code className="rounded bg-slate-100 px-1 text-purple-600">{`{{${variableConfigs[editingVariableIndex].name}}}`}</code>{' '}
                  として使用します。
                </p>
              </div>
              <button
                onClick={() => setEditingVariableIndex(null)}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition-colors hover:bg-slate-100"
              >
                ×
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-100 bg-white px-4">
              <button
                onClick={() => setMappingTab('diagnosis')}
                className={cn(
                  'border-b-2 px-4 py-3 text-xs font-bold transition-all',
                  mappingTab === 'diagnosis'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                )}
              >
                診断項目 (スタッフ入力)
              </button>
              <button
                onClick={() => setMappingTab('questionnaire')}
                className={cn(
                  'border-b-2 px-4 py-3 text-xs font-bold transition-all',
                  mappingTab === 'questionnaire'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                )}
              >
                問診項目 (保護者入力)
              </button>
            </div>

            <div className="custom-scrollbar flex-1 overflow-y-auto bg-slate-50 p-4">
              <div className="space-y-6">
                {mappingTab === 'questionnaire' ? (
                  <div className="space-y-4">
                    {questionnaireCategories.map((cat) => (
                      <div key={cat.id} className="space-y-2">
                        <div className="flex items-center justify-between border-l-2 border-slate-200 pl-2">
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            {cat.name}
                          </h4>
                          <button
                            onClick={() =>
                              toggleCategoryInVariable(
                                editingVariableIndex,
                                cat.items.map((i) => i.id)
                              )
                            }
                            className="text-[9px] font-bold text-purple-600 hover:text-purple-700"
                          >
                            {cat.items.every((i) =>
                              variableConfigs[
                                editingVariableIndex
                              ].itemIds.includes(i.id)
                            )
                              ? '全解除'
                              : '全選択'}
                          </button>
                        </div>
                        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                          {cat.items.map((item) => {
                            const isSelected = variableConfigs[
                              editingVariableIndex
                            ].itemIds.includes(item.id)
                            const isPriority = variableConfigs[
                              editingVariableIndex
                            ].priorityItemIds.includes(item.id)
                            return (
                              <div
                                key={item.id}
                                className={cn(
                                  'flex cursor-pointer items-center gap-2 rounded-xl border p-3 shadow-sm transition-all',
                                  isSelected
                                    ? 'border-purple-200 bg-white ring-1 ring-purple-100'
                                    : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'
                                )}
                                onClick={() =>
                                  toggleItemInVariable(
                                    editingVariableIndex,
                                    item.id
                                  )
                                }
                              >
                                <div
                                  className={cn(
                                    'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border transition-colors',
                                    isSelected
                                      ? 'border-purple-600 bg-purple-600 text-white'
                                      : 'border-slate-200 bg-white'
                                  )}
                                >
                                  {isSelected && (
                                    <ClipboardCheck className="h-3 w-3" />
                                  )}
                                </div>
                                <span
                                  className={cn(
                                    'flex-1 truncate text-[11px]',
                                    isSelected
                                      ? 'font-medium text-slate-700'
                                      : 'text-slate-400'
                                  )}
                                >
                                  {item.question}
                                </span>
                                {isSelected && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      togglePriorityInVariable(
                                        editingVariableIndex,
                                        item.id
                                      )
                                    }}
                                    className={cn(
                                      'flex h-7 w-7 items-center justify-center rounded-lg transition-all',
                                      isPriority
                                        ? 'bg-orange-100 text-orange-600 shadow-inner'
                                        : 'bg-slate-50 text-slate-200 hover:bg-orange-50 hover:text-orange-300'
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
                    {diagnosisCategories.map((cat) => (
                      <div key={cat.id} className="space-y-2">
                        <div className="flex items-center justify-between border-l-2 border-slate-200 pl-2">
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            {cat.name}
                          </h4>
                          <button
                            onClick={() =>
                              toggleCategoryInVariable(
                                editingVariableIndex,
                                cat.items.map((i) => i.id)
                              )
                            }
                            className="text-[9px] font-bold text-purple-600 hover:text-purple-700"
                          >
                            {cat.items.every((i) =>
                              variableConfigs[
                                editingVariableIndex
                              ].itemIds.includes(i.id)
                            )
                              ? '全解除'
                              : '全選択'}
                          </button>
                        </div>
                        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                          {cat.items.map((item) => {
                            const isSelected = variableConfigs[
                              editingVariableIndex
                            ].itemIds.includes(item.id)
                            const isPriority = variableConfigs[
                              editingVariableIndex
                            ].priorityItemIds.includes(item.id)
                            return (
                              <div
                                key={item.id}
                                className={cn(
                                  'flex cursor-pointer items-center gap-2 rounded-xl border p-3 shadow-sm transition-all',
                                  isSelected
                                    ? 'border-purple-200 bg-white ring-1 ring-purple-100'
                                    : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'
                                )}
                                onClick={() =>
                                  toggleItemInVariable(
                                    editingVariableIndex,
                                    item.id
                                  )
                                }
                              >
                                <div
                                  className={cn(
                                    'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border transition-colors',
                                    isSelected
                                      ? 'border-purple-600 bg-purple-600 text-white'
                                      : 'border-slate-200 bg-white'
                                  )}
                                >
                                  {isSelected && (
                                    <ClipboardCheck className="h-3 w-3" />
                                  )}
                                </div>
                                <span
                                  className={cn(
                                    'flex-1 truncate text-[11px]',
                                    isSelected
                                      ? 'font-medium text-slate-700'
                                      : 'text-slate-400'
                                  )}
                                >
                                  {item.question}
                                </span>
                                {isSelected && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      togglePriorityInVariable(
                                        editingVariableIndex,
                                        item.id
                                      )
                                    }}
                                    className={cn(
                                      'flex h-7 w-7 items-center justify-center rounded-lg transition-all',
                                      isPriority
                                        ? 'bg-orange-100 text-orange-600 shadow-inner'
                                        : 'bg-slate-50 text-slate-200 hover:bg-orange-50 hover:text-orange-300'
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

            <div className="flex justify-end border-t border-slate-100 bg-white p-4">
              <button
                onClick={() => setEditingVariableIndex(null)}
                className="rounded-xl bg-slate-900 px-6 py-2 text-sm font-bold text-white shadow-lg shadow-slate-200 transition-all hover:scale-105 active:scale-95"
              >
                設定を完了する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
