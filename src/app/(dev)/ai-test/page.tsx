'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  generateMockData,
  PRESETS,
  type PresetType,
  type MockTestData,
  type MockChildInfo,
  type MockScores,
} from '@/lib/mock/diagnosis-generator'

interface AIReportResult {
  summary: string
  analysis: string
  recommendations: string[]
  nextSteps: string[]
  encouragingMessage: string
  processingTimeMs?: number
  error?: string
}

interface HistoryItem {
  id: string
  timestamp: Date
  input: MockTestData
  output: AIReportResult
  prompt?: string
}

// DB項目の型定義
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

// デフォルトプロンプトテンプレート
const DEFAULT_PROMPT = `あなたは口腔育成の専門家として、診断結果から親御さん向けのレポートを生成してください。

【重要な指示】
- 専門用語は避け、親御さんにわかりやすい表現を使ってください
- ポジティブな点も必ず言及してください
- 問題点は深刻になりすぎない表現で伝えてください
- 「です・ます」調で統一してください

対象のお子様情報:
- お名前: {{childName}}
- 年齢: {{ageDisplay}}
- 性別: {{childGender}}

{{ageConsiderations}}

姿勢分析結果:
- 全体評価: {{postureScore}}/10
- 問題点: {{postureIssues}}

口腔分析結果:
- 全体評価: {{oralScore}}/10
- 問題点: {{oralIssues}}

スタッフの所見: {{staffNotes}}

詳細診断項目:
{{diagnosisDetails}}

以下の形式でJSONとしてレポートを出力してください:
{
  "summary": "全体の要約（150-200文字程度、ポジティブな点から始める）",
  "analysis": "詳細な分析内容（姿勢と口腔の相関関係を含む、300文字程度）",
  "recommendations": ["具体的で実践しやすい改善提案1", "改善提案2", "改善提案3"],
  "nextSteps": ["次のステップ1", "次のステップ2"],
  "encouragingMessage": "親御さんへの温かい励ましのメッセージ（50-100文字）"
}`

// 初期データ（SSR用の固定値）
const INITIAL_DATA: MockTestData = {
  childInfo: { name: 'テスト太郎', age: 5, ageMonths: 0, gender: '男' },
  questionnaire: {},
  diagnosis: {},
  scores: { postureScore: 5, oralScore: 5 },
  staffNotes: '',
}

export default function AITestPage() {
  // DB項目
  const [diagnosisCategories, setDiagnosisCategories] = useState<DBCategory[]>([])
  const [questionnaireCategories, setQuestionnaireCategories] = useState<DBCategory[]>([])
  const [isLoadingSchema, setIsLoadingSchema] = useState(true)
  const [schemaError, setSchemaError] = useState<string | null>(null)

  // 入力データ
  const [testData, setTestData] = useState<MockTestData>(INITIAL_DATA)
  const [isInitialized, setIsInitialized] = useState(false)

  // プロンプト
  const [customPrompt, setCustomPrompt] = useState(DEFAULT_PROMPT)
  const [showPromptEditor, setShowPromptEditor] = useState(false)

  // AI結果
  const [result, setResult] = useState<AIReportResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 履歴
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [selectedPreset, setSelectedPreset] = useState<PresetType>('random')

  // DBから項目を取得
  useEffect(() => {
    const fetchSchemas = async () => {
      setIsLoadingSchema(true)
      setSchemaError(null)

      try {
        // 診断項目取得
        const diagRes = await fetch('/api/diagnosis-schema')
        if (!diagRes.ok) throw new Error('診断項目の取得に失敗')
        const diagData = await diagRes.json()

        // 問診項目取得
        const questRes = await fetch('/api/questionnaire/items?target_age=all')
        if (!questRes.ok) throw new Error('問診項目の取得に失敗')
        const questData = await questRes.json()

        // 診断項目を整形
        if (diagData.categories) {
          setDiagnosisCategories(diagData.categories.map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            display_order: cat.display_order,
            items: cat.items?.map((item: any) => ({
              id: item.id,
              question: item.question,
              answer_type: item.answer_type,
              options: item.options || [],
              is_required: item.is_required,
              input_type: item.input_type,
            })) || []
          })))
        }

        // 問診項目を整形
        if (questData.data?.categories) {
          setQuestionnaireCategories(questData.data.categories.map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            display_order: cat.display_order,
            items: cat.items?.map((item: any) => ({
              id: item.id,
              question: item.question,
              answer_type: item.answer_type,
              options: item.options || [],
              is_required: item.is_required,
            })) || []
          })))
        }

      } catch (err) {
        console.error('Schema fetch error:', err)
        setSchemaError(err instanceof Error ? err.message : 'スキーマ取得エラー')
      } finally {
        setIsLoadingSchema(false)
      }
    }

    fetchSchemas()
  }, [])

  // クライアント側でのみランダムデータを生成
  useEffect(() => {
    if (!isInitialized) {
      setTestData(generateMockData('random'))
      setIsInitialized(true)
    }
  }, [isInitialized])

  // プリセット適用
  const applyPreset = useCallback((preset: PresetType) => {
    setSelectedPreset(preset)
    setTestData(generateMockData(preset))
    setResult(null)
    setError(null)
  }, [])

  // 子供情報更新
  const updateChildInfo = useCallback((field: keyof MockChildInfo, value: string | number) => {
    setTestData(prev => ({
      ...prev,
      childInfo: { ...prev.childInfo, [field]: value },
    }))
  }, [])

  // スコア更新
  const updateScores = useCallback((field: keyof MockScores, value: number) => {
    setTestData(prev => ({
      ...prev,
      scores: { ...prev.scores, [field]: value },
    }))
  }, [])

  // 診断項目更新（DB項目用）
  const updateDiagnosisDB = useCallback((categoryId: string, itemId: string, value: string) => {
    setTestData(prev => ({
      ...prev,
      diagnosis: {
        ...prev.diagnosis,
        [categoryId]: {
          ...(prev.diagnosis[categoryId] || {}),
          [itemId]: value,
        },
      },
    }))
  }, [])

  // 問診項目更新（DB項目用）
  const updateQuestionnaireDB = useCallback((categoryId: string, itemId: string, value: string) => {
    setTestData(prev => ({
      ...prev,
      questionnaire: {
        ...prev.questionnaire,
        [categoryId]: {
          ...(prev.questionnaire[categoryId] || {}),
          [itemId]: value,
        },
      },
    }))
  }, [])

  // スタッフ所見更新
  const updateStaffNotes = useCallback((value: string) => {
    setTestData(prev => ({ ...prev, staffNotes: value }))
  }, [])

  // プロンプトをリセット
  const resetPrompt = useCallback(() => {
    setCustomPrompt(DEFAULT_PROMPT)
  }, [])

  // API用データ整形
  const formatForAPI = useCallback(() => {
    // 問診データをフラット化
    const flatQuestionnaire: Record<string, string> = {}
    for (const [catId, items] of Object.entries(testData.questionnaire)) {
      for (const [itemId, value] of Object.entries(items as Record<string, string>)) {
        // カテゴリ名と項目名を取得
        const cat = questionnaireCategories.find(c => c.id === catId)
        const item = cat?.items.find(i => i.id === itemId)
        if (item) {
          flatQuestionnaire[`${cat?.name || catId}_${item.question}`] = value
        }
      }
    }

    // 診断データをフラット化
    const flatDiagnosis: Record<string, string> = {}
    const postureIssues: string[] = []
    const oralIssues: string[] = []

    for (const [catId, items] of Object.entries(testData.diagnosis)) {
      const cat = diagnosisCategories.find(c => c.id === catId)
      for (const [itemId, value] of Object.entries(items as Record<string, string>)) {
        const item = cat?.items.find(i => i.id === itemId)
        if (item) {
          flatDiagnosis[`${cat?.name || catId}_${item.question}`] = value

          // 問題点を抽出
          const isIssue = value === '有' || value === '不可' || value === '困難' || value === '口呼吸'
          if (isIssue) {
            const catName = cat?.name || ''
            if (['姿勢', '足', '全身'].includes(catName)) {
              postureIssues.push(`${item.question}: ${value}`)
            } else {
              oralIssues.push(`${item.question}: ${value}`)
            }
          }
        }
      }
    }

    return {
      testMode: true,
      testData: {
        childName: testData.childInfo.name,
        childAge: testData.childInfo.age,
        childAgeMonths: testData.childInfo.ageMonths,
        childGender: testData.childInfo.gender,
        questionnaire: flatQuestionnaire,
        diagnosis: flatDiagnosis,
        postureScore: testData.scores.postureScore,
        oralScore: testData.scores.oralScore,
        postureIssues,
        oralIssues,
        staffNotes: testData.staffNotes,
      },
      customPrompt: customPrompt !== DEFAULT_PROMPT ? customPrompt : undefined,
    }
  }, [testData, diagnosisCategories, questionnaireCategories, customPrompt])

  // AI生成実行
  const generateReport = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    const startTime = Date.now()

    try {
      const apiData = formatForAPI()

      const response = await fetch('/api/ai/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `API error: ${response.status}`)
      }

      const processingTimeMs = Date.now() - startTime

      const resultWithTime: AIReportResult = {
        ...data,
        processingTimeMs,
      }

      setResult(resultWithTime)

      // 履歴に追加
      const historyItem: HistoryItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        timestamp: new Date(),
        input: { ...testData },
        output: resultWithTime,
        prompt: customPrompt !== DEFAULT_PROMPT ? customPrompt : undefined,
      }
      setHistory(prev => [historyItem, ...prev].slice(0, 10))

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [testData, formatForAPI, customPrompt])

  // 履歴から復元
  const restoreFromHistory = useCallback((item: HistoryItem) => {
    setTestData(item.input)
    setResult(item.output)
    if (item.prompt) {
      setCustomPrompt(item.prompt)
    }
  }, [])

  // 選択肢の表示値を取得
  const getOptionLabel = (options: { value: string; label: string }[], value: string) => {
    const opt = options.find(o => o.value === value)
    return opt?.label || value
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* ヘッダー */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-cyan-400">AI分析テストツール</h1>
            <p className="text-sm text-gray-400 mt-1">問診・診断データからAIコメントをテスト</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowPromptEditor(!showPromptEditor)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                showPromptEditor ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              📝 プロンプト編集
            </button>
            <div className="text-xs text-gray-500">開発環境専用</div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* プロンプトエディター */}
        {showPromptEditor && (
          <section className="mb-8 bg-purple-900/30 rounded-xl p-6 border border-purple-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-purple-300">プロンプトテンプレート</h2>
              <button
                onClick={resetPrompt}
                className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300"
              >
                リセット
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-3">
              変数: {'{{childName}}'}, {'{{ageDisplay}}'}, {'{{childGender}}'}, {'{{postureScore}}'}, {'{{oralScore}}'}, {'{{postureIssues}}'}, {'{{oralIssues}}'}, {'{{staffNotes}}'}, {'{{diagnosisDetails}}'}, {'{{ageConsiderations}}'}
            </p>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className="w-full h-64 bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-sm text-white font-mono resize-y"
              placeholder="プロンプトを入力..."
            />
          </section>
        )}

        {/* スキーマ読み込み状態 */}
        {isLoadingSchema && (
          <div className="mb-8 bg-gray-800 rounded-xl p-6 border border-gray-700 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-400">DBから項目を読み込み中...</p>
          </div>
        )}

        {schemaError && (
          <div className="mb-8 bg-red-900/50 border border-red-500 rounded-xl p-4 text-red-300">
            <h3 className="font-bold mb-1">スキーマ読み込みエラー</h3>
            <p className="text-sm">{schemaError}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左カラム: 入力 */}
          <div className="space-y-6">
            {/* プリセット */}
            <section className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-lg font-semibold mb-4 text-cyan-300">プリセット</h2>
              <div className="grid grid-cols-4 gap-2">
                {(Object.entries(PRESETS) as [PresetType, typeof PRESETS[PresetType]][]).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => applyPreset(key)}
                    className={`p-3 rounded-lg text-center transition-all ${
                      selectedPreset === key
                        ? 'bg-cyan-600 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-1">{preset.emoji}</div>
                    <div className="text-xs font-medium">{preset.label}</div>
                  </button>
                ))}
              </div>
            </section>

            {/* 基本情報 */}
            <section className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-lg font-semibold mb-4 text-cyan-300">基本情報</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">名前</label>
                  <input
                    type="text"
                    value={testData.childInfo.name}
                    onChange={(e) => updateChildInfo('name', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">性別</label>
                  <select
                    value={testData.childInfo.gender}
                    onChange={(e) => updateChildInfo('gender', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="男">男</option>
                    <option value="女">女</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    年齢: {testData.childInfo.age}歳
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="12"
                    value={testData.childInfo.age}
                    onChange={(e) => updateChildInfo('age', parseInt(e.target.value))}
                    className="w-full accent-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    月齢: {testData.childInfo.ageMonths}ヶ月
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="11"
                    value={testData.childInfo.ageMonths}
                    onChange={(e) => updateChildInfo('ageMonths', parseInt(e.target.value))}
                    className="w-full accent-cyan-500"
                  />
                </div>
              </div>
            </section>

            {/* スコア */}
            <section className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-lg font-semibold mb-4 text-cyan-300">評価スコア</h2>
              <div className="space-y-4">
                <div>
                  <label className="flex justify-between text-sm text-gray-400 mb-1">
                    <span>姿勢スコア</span>
                    <span className={`font-bold ${
                      testData.scores.postureScore >= 8 ? 'text-green-400' :
                      testData.scores.postureScore >= 5 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {testData.scores.postureScore}/10
                    </span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={testData.scores.postureScore}
                    onChange={(e) => updateScores('postureScore', parseInt(e.target.value))}
                    className="w-full accent-cyan-500"
                  />
                </div>
                <div>
                  <label className="flex justify-between text-sm text-gray-400 mb-1">
                    <span>口腔スコア</span>
                    <span className={`font-bold ${
                      testData.scores.oralScore >= 8 ? 'text-green-400' :
                      testData.scores.oralScore >= 5 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {testData.scores.oralScore}/10
                    </span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={testData.scores.oralScore}
                    onChange={(e) => updateScores('oralScore', parseInt(e.target.value))}
                    className="w-full accent-cyan-500"
                  />
                </div>
              </div>
            </section>

            {/* 問診項目（DBから取得） */}
            <details className="bg-gray-800 rounded-xl border border-gray-700">
              <summary className="p-6 cursor-pointer text-lg font-semibold text-cyan-300 hover:bg-gray-750">
                問診項目（保護者入力）
                <span className="ml-2 text-xs text-gray-500">
                  {questionnaireCategories.length}カテゴリ / {questionnaireCategories.reduce((sum, c) => sum + c.items.length, 0)}項目
                </span>
              </summary>
              <div className="px-6 pb-6 space-y-4 max-h-96 overflow-y-auto">
                {questionnaireCategories.map((category) => (
                  <div key={category.id} className="border-t border-gray-700 pt-4">
                    <h3 className="text-sm font-medium text-gray-300 mb-2">{category.name}</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {category.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-2">
                          <select
                            value={testData.questionnaire[category.id]?.[item.id] || ''}
                            onChange={(e) => updateQuestionnaireDB(category.id, item.id, e.target.value)}
                            className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                          >
                            <option value="">--</option>
                            {item.options.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          <span className="text-xs text-gray-400 truncate max-w-[100px]" title={item.question}>
                            {item.question}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {questionnaireCategories.length === 0 && !isLoadingSchema && (
                  <p className="text-gray-500 text-sm">問診項目がありません</p>
                )}
              </div>
            </details>

            {/* 診断項目（DBから取得） */}
            <details className="bg-gray-800 rounded-xl border border-gray-700">
              <summary className="p-6 cursor-pointer text-lg font-semibold text-cyan-300 hover:bg-gray-750">
                診断項目（スタッフ入力）
                <span className="ml-2 text-xs text-gray-500">
                  {diagnosisCategories.length}カテゴリ / {diagnosisCategories.reduce((sum, c) => sum + c.items.length, 0)}項目
                </span>
              </summary>
              <div className="px-6 pb-6 space-y-4 max-h-96 overflow-y-auto">
                {diagnosisCategories.map((category) => (
                  <div key={category.id} className="border-t border-gray-700 pt-4">
                    <h3 className="text-sm font-medium text-gray-300 mb-2">{category.name}</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {category.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-2">
                          <select
                            value={testData.diagnosis[category.id]?.[item.id] || ''}
                            onChange={(e) => updateDiagnosisDB(category.id, item.id, e.target.value)}
                            className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                          >
                            <option value="">--</option>
                            {item.options.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          <span className="text-xs text-gray-400 truncate max-w-[100px]" title={item.question}>
                            {item.question}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {diagnosisCategories.length === 0 && !isLoadingSchema && (
                  <p className="text-gray-500 text-sm">診断項目がありません</p>
                )}
              </div>
            </details>

            {/* スタッフ所見 */}
            <section className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-lg font-semibold mb-4 text-cyan-300">スタッフ所見</h2>
              <textarea
                value={testData.staffNotes}
                onChange={(e) => updateStaffNotes(e.target.value)}
                placeholder="特記事項があれば入力..."
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white h-24 resize-none"
              />
            </section>

            {/* 生成ボタン */}
            <button
              onClick={generateReport}
              disabled={isLoading}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                isLoading
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg hover:shadow-cyan-500/25'
              }`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  AI分析中...
                </span>
              ) : (
                '🤖 AI分析を実行'
              )}
            </button>
          </div>

          {/* 右カラム: 結果 */}
          <div className="space-y-6">
            {/* エラー表示 */}
            {error && (
              <div className="bg-red-900/50 border border-red-500 rounded-xl p-4 text-red-300">
                <h3 className="font-bold mb-1">エラー</h3>
                <p className="text-sm">{error}</p>
              </div>
            )}

            {/* 結果表示 */}
            {result && !result.error && (
              <div className="space-y-4">
                {/* サマリー */}
                <section className="bg-gradient-to-br from-cyan-900/50 to-blue-900/50 rounded-xl p-6 border border-cyan-700">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold text-cyan-300">サマリー</h2>
                    {result.processingTimeMs && (
                      <span className="text-xs text-gray-400">
                        {result.processingTimeMs}ms
                      </span>
                    )}
                  </div>
                  <p className="text-white leading-relaxed">{result.summary}</p>
                </section>

                {/* 詳細分析 */}
                <section className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h2 className="text-lg font-semibold mb-3 text-cyan-300">詳細分析</h2>
                  <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{result.analysis}</p>
                </section>

                {/* 改善提案 */}
                <section className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h2 className="text-lg font-semibold mb-3 text-cyan-300">改善提案</h2>
                  <ul className="space-y-2">
                    {result.recommendations?.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2 text-gray-300">
                        <span className="text-cyan-400 mt-1">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                {/* 次のステップ */}
                <section className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h2 className="text-lg font-semibold mb-3 text-cyan-300">次のステップ</h2>
                  <ol className="space-y-2">
                    {result.nextSteps?.map((step, i) => (
                      <li key={i} className="flex items-start gap-2 text-gray-300">
                        <span className="text-cyan-400 font-bold">{i + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </section>

                {/* 励ましメッセージ */}
                <section className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded-xl p-6 border border-green-700">
                  <h2 className="text-lg font-semibold mb-3 text-green-300">💚 メッセージ</h2>
                  <p className="text-green-100 leading-relaxed">{result.encouragingMessage}</p>
                </section>
              </div>
            )}

            {/* プレースホルダー */}
            {!result && !error && (
              <div className="bg-gray-800 rounded-xl p-12 border border-gray-700 text-center">
                <div className="text-6xl mb-4">🤖</div>
                <p className="text-gray-400">
                  左側でデータを設定して<br />
                  「AI分析を実行」をクリック
                </p>
              </div>
            )}

            {/* 履歴 */}
            {history.length > 0 && (
              <section className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h2 className="text-lg font-semibold mb-4 text-cyan-300">履歴</h2>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {history.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => restoreFromHistory(item)}
                      className="w-full text-left p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-300">
                          {item.input.childInfo.name} ({item.input.childInfo.age}歳)
                        </span>
                        <span className="text-xs text-gray-500">
                          {item.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1 truncate">
                        姿勢:{item.input.scores.postureScore} 口腔:{item.input.scores.oralScore}
                        {item.prompt && ' 📝カスタムプロンプト'}
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
