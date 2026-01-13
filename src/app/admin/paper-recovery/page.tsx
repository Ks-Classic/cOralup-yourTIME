'use client'

import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { FileImage, Check, AlertCircle, Loader2, ArrowRight, ChevronDown, Upload, X, ZoomIn } from 'lucide-react'
import Link from 'next/link'

interface Visit {
    id: string
    sessionId: string
    childName: string
    birthday: string
    status: string
}

interface QuestionnaireData {
    has_siblings?: string
    sibling_order?: number | null
    screen_time?: string
    screen_hours?: number | null
    sleep_conditions?: string[]
    bedtime?: number | null
    sleep_pattern?: string[]
    lessons?: string[]
    eating_habits?: string[]
    disliked_foods?: string | null
    liked_foods?: string | null
    photo_consent?: string
}

interface ExtractedData {
    childName: string
    furigana: string
    birthday: string
    gender: string
    prefecture: string
    questionnaire: QuestionnaireData
    confidence: number
}

export default function PaperRecoveryPage() {
    const [visits, setVisits] = useState<Visit[]>([])
    const [selectedVisitId, setSelectedVisitId] = useState<string>('')
    const [extractedData, setExtractedData] = useState<ExtractedData | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [step, setStep] = useState<'select' | 'process' | 'saved'>('select')
    const [error, setError] = useState<string | null>(null)
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [savedImageUrl, setSavedImageUrl] = useState<string | null>(null)
    const [isZoomed, setIsZoomed] = useState(false)

    // インポート済みのvisitリストを取得（PAPER-セッション専用API）
    useEffect(() => {
        const fetchVisits = async () => {
            try {
                // 専用API（認証不要）
                const response = await fetch('/api/admin/paper-recovery/visits')
                const result = await response.json()
                if (result.success && result.data) {
                    const formattedVisits = result.data.map((v: any) => ({
                        id: v.id,
                        sessionId: v.sessionId,
                        childName: v.child
                            ? `${v.child.lastName || ''} ${v.child.firstName || ''}`.trim()
                            : '名前なし',
                        birthday: v.child?.birthday
                            ? new Date(v.child.birthday).toISOString().split('T')[0]
                            : '',
                        status: v.status,
                    }))
                    setVisits(formattedVisits)
                }
            } catch (err) {
                console.error('visitリスト取得エラー:', err)
            }
        }
        fetchVisits()
    }, [])

    // ファイルドロップ処理
    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return

        const file = acceptedFiles[0]
        setImageFile(file)

        // プレビュー用URLを作成
        const previewUrl = URL.createObjectURL(file)
        setImagePreview(previewUrl)
        setError(null)
    }, [])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/png': ['.png'],
        },
        maxFiles: 1,
    })

    // visit選択して処理画面へ
    const handleSelectVisit = () => {
        if (!selectedVisitId) return
        setStep('process')
    }

    // 画像をStorageに保存
    const handleSaveImage = async () => {
        if (!imageFile || !selectedVisitId) return

        setIsUploading(true)
        setError(null)

        try {
            const formData = new FormData()
            formData.append('file', imageFile)
            formData.append('visitId', selectedVisitId)
            formData.append('photoType', 'paper_questionnaire')

            const response = await fetch('/api/photos/upload', {
                method: 'POST',
                body: formData,
            })

            const result = await response.json()

            if (result.success) {
                setSavedImageUrl(result.url)
            } else {
                setError('画像の保存に失敗しました')
            }
        } catch (err) {
            setError('画像の保存に失敗しました')
        } finally {
            setIsUploading(false)
        }
    }

    // Geminiで解析
    const handleAnalyze = async () => {
        if (!imageFile) return

        setIsLoading(true)
        setError(null)

        try {
            const formData = new FormData()
            formData.append('image', imageFile)

            const response = await fetch('/api/admin/paper-recovery/analyze', {
                method: 'POST',
                body: formData,
            })

            const result = await response.json()

            if (result.success) {
                setExtractedData(result.data)
            } else {
                setError(result.error || 'AIによる解析に失敗しました')
            }
        } catch (err) {
            setError('画像の解析に失敗しました')
        } finally {
            setIsLoading(false)
        }
    }

    // 問診データ保存
    const handleSaveQuestionnaire = async () => {
        if (!selectedVisitId || !extractedData) return

        setIsLoading(true)
        setError(null)

        try {
            // まず画像を保存（未保存の場合）
            if (!savedImageUrl && imageFile) {
                await handleSaveImage()
            }

            const response = await fetch('/api/admin/paper-recovery/save-questionnaire', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    visitId: selectedVisitId,
                    questionnaire: extractedData.questionnaire,
                    gender: extractedData.gender,  // 性別も送信
                }),
            })

            const result = await response.json()

            if (result.success) {
                setStep('saved')
            } else {
                setError(result.error)
            }
        } catch (err) {
            setError('問診データの保存に失敗しました')
        } finally {
            setIsLoading(false)
        }
    }

    // 選択肢のラベル変換
    const getLabel = (code: string, type: string): string => {
        const labels: Record<string, Record<string, string>> = {
            sleep_conditions: {
                snoring: 'いびき',
                bedtime_fuss: '寝ぐずり',
                wake_fuss: '起きぐずり',
                night_crying: '夜泣き',
                frequent_waking: '頻回起き',
                prone: 'うつ伏せ寝',
                supine: '仰向け',
                side: '横向き寝',
            },
            lessons: {
                swimming: 'スイミング',
                gymnastics: '体操',
                soccer: 'サッカー',
                baseball: '野球',
                english: '英語',
                other: 'その他',
            },
            eating_habits: {
                picky: '偏食',
                no_chew: '噛まない',
                cannot_swallow: '飲み込めない',
                swallow_whole: '丸呑み',
                large_bite: '一口量が多い',
                fast: '食べるのが早い',
                slow: '食べるのが遅い',
                other: 'その他',
            },
        }
        return labels[type]?.[code] || code
    }

    const selectedVisit = visits.find(v => v.id === selectedVisitId)

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto p-6">
                {/* ヘッダー */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">
                        紙問診票リカバリー
                    </h1>
                    <p className="text-gray-600 mt-1">
                        紙の問診票から問診データを抽出してDBに登録します
                    </p>
                </div>

                {/* エラー表示 */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                        <span className="text-red-800">{error}</span>
                        <button onClick={() => setError(null)} className="ml-auto">
                            <X className="w-4 h-4 text-red-600" />
                        </button>
                    </div>
                )}

                {/* Step 1: 対象者選択 */}
                {step === 'select' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-xl">
                        <h2 className="font-semibold text-gray-900 mb-4">対象者を選択</h2>
                        <p className="text-sm text-gray-500 mb-4">
                            スプレッドシートからインポートした来場者を選択してください
                        </p>

                        <div className="relative mb-4">
                            <select
                                value={selectedVisitId}
                                onChange={(e) => setSelectedVisitId(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">選択してください</option>
                                {visits.map((visit) => (
                                    <option key={visit.id} value={visit.id}>
                                        {visit.childName} ({visit.birthday})
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                        </div>

                        {visits.length === 0 && (
                            <div className="text-amber-600 text-sm mb-4 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                インポート済みの来場者がいません。
                                <Link href="/admin/spreadsheet-import" className="underline">
                                    スプレッドシートインポート
                                </Link>
                            </div>
                        )}

                        <button
                            onClick={handleSelectVisit}
                            disabled={!selectedVisitId}
                            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            次へ <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Step 2: 処理画面（2カラム） */}
                {step === 'process' && (
                    <div className="space-y-4">
                        {/* 対象者情報 */}
                        {selectedVisit && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
                                <div>
                                    <div className="font-medium text-blue-900">{selectedVisit.childName}</div>
                                    <div className="text-sm text-blue-700">{selectedVisit.birthday}</div>
                                </div>
                                <button
                                    onClick={() => {
                                        setStep('select')
                                        setImageFile(null)
                                        setImagePreview(null)
                                        setExtractedData(null)
                                        setSavedImageUrl(null)
                                    }}
                                    className="text-blue-600 hover:text-blue-800 text-sm"
                                >
                                    変更
                                </button>
                            </div>
                        )}

                        {/* 2カラムレイアウト */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* 左カラム: 画像 */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <h3 className="font-semibold text-gray-900 mb-4">紙問診票画像</h3>

                                {!imagePreview ? (
                                    <div
                                        {...getRootProps()}
                                        className={`
                                            border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
                                            transition-colors
                                            ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}
                                        `}
                                    >
                                        <input {...getInputProps()} />
                                        <Upload className="w-10 h-10 mx-auto text-gray-400 mb-3" />
                                        <p className="text-gray-600">
                                            画像をドロップ
                                        </p>
                                        <p className="text-sm text-gray-400 mt-1">
                                            またはクリックして選択
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div
                                            className="relative cursor-zoom-in"
                                            onClick={() => setIsZoomed(true)}
                                        >
                                            <img
                                                src={imagePreview}
                                                alt="問診票"
                                                className="w-full rounded-lg border border-gray-200"
                                            />
                                            <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                                                <ZoomIn className="w-3 h-3" />
                                                拡大
                                            </div>
                                            {savedImageUrl && (
                                                <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                                                    <Check className="w-3 h-3" />
                                                    保存済み
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setImageFile(null)
                                                    setImagePreview(null)
                                                    setExtractedData(null)
                                                    setSavedImageUrl(null)
                                                }}
                                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
                                            >
                                                別の画像
                                            </button>
                                            <button
                                                onClick={handleAnalyze}
                                                disabled={isLoading}
                                                className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                                            >
                                                {isLoading ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        解析中...
                                                    </>
                                                ) : (
                                                    'AI解析'
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 右カラム: 問診データ */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold text-gray-900">抽出された問診データ</h3>
                                    {extractedData && (
                                        <span className="text-sm text-gray-500">
                                            信頼度: {Math.round((extractedData.confidence || 0.8) * 100)}%
                                        </span>
                                    )}
                                </div>

                                {!extractedData ? (
                                    <div className="text-center py-12 text-gray-400">
                                        <FileImage className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                        <p>画像をアップロードして<br />「AI解析」を実行してください</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4 max-h-[700px] overflow-y-auto">
                                        {/* 基本情報 */}
                                        <div className="p-3 bg-gray-50 rounded-lg">
                                            <h4 className="text-sm font-medium text-gray-700 mb-2">基本情報</h4>
                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                <div>
                                                    <span className="text-gray-500">お名前:</span>{' '}
                                                    <span className="font-medium">{extractedData.childName}</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500">ふりがな:</span>{' '}
                                                    <span className="font-medium">{extractedData.furigana}</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500">生年月日:</span>{' '}
                                                    <span className="font-medium">{extractedData.birthday}</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500">都道府県:</span>{' '}
                                                    <span className="font-medium">{extractedData.prefecture}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 性別（編集可能） */}
                                        <div className="p-2 border border-gray-200 rounded-lg">
                                            <label className="block text-gray-500 mb-1">性別</label>
                                            <div className="flex items-center gap-4">
                                                <label className="flex items-center gap-1">
                                                    <input
                                                        type="radio"
                                                        name="gender"
                                                        checked={extractedData.gender === 'male' || extractedData.gender === '男' || extractedData.gender === '男の子'}
                                                        onChange={() => setExtractedData({
                                                            ...extractedData,
                                                            gender: 'male'
                                                        })}
                                                    />
                                                    男の子
                                                </label>
                                                <label className="flex items-center gap-1">
                                                    <input
                                                        type="radio"
                                                        name="gender"
                                                        checked={extractedData.gender === 'female' || extractedData.gender === '女' || extractedData.gender === '女の子'}
                                                        onChange={() => setExtractedData({
                                                            ...extractedData,
                                                            gender: 'female'
                                                        })}
                                                    />
                                                    女の子
                                                </label>
                                            </div>
                                        </div>

                                        {/* 問診項目（編集可能） */}
                                        <div className="space-y-3 text-sm">
                                            {/* きょうだい */}
                                            <div className="p-2 border border-gray-200 rounded-lg">
                                                <label className="block text-gray-500 mb-1">きょうだい</label>
                                                <div className="flex items-center gap-4">
                                                    <label className="flex items-center gap-1">
                                                        <input
                                                            type="radio"
                                                            name="siblings"
                                                            checked={extractedData.questionnaire.has_siblings === 'has'}
                                                            onChange={() => setExtractedData({
                                                                ...extractedData,
                                                                questionnaire: { ...extractedData.questionnaire, has_siblings: 'has' }
                                                            })}
                                                        />
                                                        いる
                                                    </label>
                                                    <label className="flex items-center gap-1">
                                                        <input
                                                            type="radio"
                                                            name="siblings"
                                                            checked={extractedData.questionnaire.has_siblings === 'none'}
                                                            onChange={() => setExtractedData({
                                                                ...extractedData,
                                                                questionnaire: { ...extractedData.questionnaire, has_siblings: 'none' }
                                                            })}
                                                        />
                                                        いない
                                                    </label>
                                                    {extractedData.questionnaire.has_siblings === 'has' && (
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max="10"
                                                            value={extractedData.questionnaire.sibling_order || ''}
                                                            onChange={(e) => setExtractedData({
                                                                ...extractedData,
                                                                questionnaire: { ...extractedData.questionnaire, sibling_order: parseInt(e.target.value) || null }
                                                            })}
                                                            className="w-16 px-2 py-1 border border-gray-300 rounded"
                                                            placeholder="何人目"
                                                        />
                                                    )}
                                                </div>
                                            </div>

                                            {/* TV視聴 */}
                                            <div className="p-2 border border-gray-200 rounded-lg">
                                                <label className="block text-gray-500 mb-1">TV・スマホ視聴</label>
                                                <div className="flex items-center gap-2">
                                                    <select
                                                        value={extractedData.questionnaire.screen_time || ''}
                                                        onChange={(e) => setExtractedData({
                                                            ...extractedData,
                                                            questionnaire: { ...extractedData.questionnaire, screen_time: e.target.value }
                                                        })}
                                                        className="px-2 py-1 border border-gray-300 rounded"
                                                    >
                                                        <option value="">選択</option>
                                                        <option value="none">見ない</option>
                                                        <option value="less_1">1時間未満</option>
                                                        <option value="less_2">1〜2時間</option>
                                                        <option value="more">2時間以上</option>
                                                    </select>
                                                    {extractedData.questionnaire.screen_time === 'more' && (
                                                        <input
                                                            type="number"
                                                            min="2"
                                                            max="24"
                                                            value={extractedData.questionnaire.screen_hours || ''}
                                                            onChange={(e) => setExtractedData({
                                                                ...extractedData,
                                                                questionnaire: { ...extractedData.questionnaire, screen_hours: parseInt(e.target.value) || null }
                                                            })}
                                                            className="w-16 px-2 py-1 border border-gray-300 rounded"
                                                            placeholder="時間"
                                                        />
                                                    )}
                                                </div>
                                            </div>

                                            {/* 睡眠の様子 */}
                                            <div className="p-2 border border-gray-200 rounded-lg">
                                                <label className="block text-gray-500 mb-1">睡眠の様子（複数選択可）</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {Object.entries({
                                                        snoring: 'いびき',
                                                        bedtime_fuss: '寝ぐずり',
                                                        wake_fuss: '起きぐずり',
                                                        night_crying: '夜泣き',
                                                        frequent_waking: '頻回起き',
                                                        prone: 'うつ伏せ寝',
                                                    }).map(([key, label]) => (
                                                        <label key={key} className="flex items-center gap-1 text-xs bg-gray-100 px-2 py-1 rounded">
                                                            <input
                                                                type="checkbox"
                                                                checked={extractedData.questionnaire.sleep_conditions?.includes(key) || false}
                                                                onChange={(e) => {
                                                                    const current = extractedData.questionnaire.sleep_conditions || []
                                                                    const updated = e.target.checked
                                                                        ? [...current, key]
                                                                        : current.filter(c => c !== key)
                                                                    setExtractedData({
                                                                        ...extractedData,
                                                                        questionnaire: { ...extractedData.questionnaire, sleep_conditions: updated }
                                                                    })
                                                                }}
                                                            />
                                                            {label}
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* 就寝時刻 */}
                                            <div className="p-2 border border-gray-200 rounded-lg">
                                                <label className="block text-gray-500 mb-1">就寝時刻</label>
                                                <select
                                                    value={extractedData.questionnaire.bedtime || ''}
                                                    onChange={(e) => setExtractedData({
                                                        ...extractedData,
                                                        questionnaire: { ...extractedData.questionnaire, bedtime: parseInt(e.target.value) || null }
                                                    })}
                                                    className="px-2 py-1 border border-gray-300 rounded"
                                                >
                                                    <option value="">選択</option>
                                                    {[18, 19, 20, 21, 22, 23, 24].map(h => (
                                                        <option key={h} value={h}>{h}時</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* 習い事 */}
                                            <div className="p-2 border border-gray-200 rounded-lg">
                                                <label className="block text-gray-500 mb-1">習い事（複数選択可）</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {Object.entries({
                                                        swimming: 'スイミング',
                                                        gymnastics: '体操',
                                                        soccer: 'サッカー',
                                                        baseball: '野球',
                                                        english: '英語',
                                                        other: 'その他',
                                                    }).map(([key, label]) => (
                                                        <label key={key} className="flex items-center gap-1 text-xs bg-gray-100 px-2 py-1 rounded">
                                                            <input
                                                                type="checkbox"
                                                                checked={extractedData.questionnaire.lessons?.includes(key) || false}
                                                                onChange={(e) => {
                                                                    const current = extractedData.questionnaire.lessons || []
                                                                    const updated = e.target.checked
                                                                        ? [...current, key]
                                                                        : current.filter(c => c !== key)
                                                                    setExtractedData({
                                                                        ...extractedData,
                                                                        questionnaire: { ...extractedData.questionnaire, lessons: updated }
                                                                    })
                                                                }}
                                                            />
                                                            {label}
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* 食事の様子 */}
                                            <div className="p-2 border border-gray-200 rounded-lg">
                                                <label className="block text-gray-500 mb-1">食事の様子（複数選択可）</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {Object.entries({
                                                        picky: '偏食',
                                                        no_chew: '噛まない',
                                                        cannot_swallow: '飲み込めない',
                                                        swallow_whole: '丸呑み',
                                                        large_bite: '一口量多い',
                                                        fast: '早食い',
                                                        slow: '遅い',
                                                    }).map(([key, label]) => (
                                                        <label key={key} className="flex items-center gap-1 text-xs bg-gray-100 px-2 py-1 rounded">
                                                            <input
                                                                type="checkbox"
                                                                checked={extractedData.questionnaire.eating_habits?.includes(key) || false}
                                                                onChange={(e) => {
                                                                    const current = extractedData.questionnaire.eating_habits || []
                                                                    const updated = e.target.checked
                                                                        ? [...current, key]
                                                                        : current.filter(c => c !== key)
                                                                    setExtractedData({
                                                                        ...extractedData,
                                                                        questionnaire: { ...extractedData.questionnaire, eating_habits: updated }
                                                                    })
                                                                }}
                                                            />
                                                            {label}
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* 嫌いな物・好きな物 */}
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="p-2 border border-gray-200 rounded-lg">
                                                    <label className="block text-gray-500 mb-1">嫌いな物</label>
                                                    <input
                                                        type="text"
                                                        value={extractedData.questionnaire.disliked_foods || ''}
                                                        onChange={(e) => setExtractedData({
                                                            ...extractedData,
                                                            questionnaire: { ...extractedData.questionnaire, disliked_foods: e.target.value || null }
                                                        })}
                                                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                                        placeholder="なし"
                                                    />
                                                </div>
                                                <div className="p-2 border border-gray-200 rounded-lg">
                                                    <label className="block text-gray-500 mb-1">好きな物</label>
                                                    <input
                                                        type="text"
                                                        value={extractedData.questionnaire.liked_foods || ''}
                                                        onChange={(e) => setExtractedData({
                                                            ...extractedData,
                                                            questionnaire: { ...extractedData.questionnaire, liked_foods: e.target.value || null }
                                                        })}
                                                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                                        placeholder="なし"
                                                    />
                                                </div>
                                            </div>

                                            {/* 写真同意 */}
                                            <div className="p-2 border border-gray-200 rounded-lg">
                                                <label className="block text-gray-500 mb-1">写真同意</label>
                                                <div className="flex items-center gap-4">
                                                    <label className="flex items-center gap-1">
                                                        <input
                                                            type="radio"
                                                            name="photo_consent"
                                                            checked={extractedData.questionnaire.photo_consent === 'yes'}
                                                            onChange={() => setExtractedData({
                                                                ...extractedData,
                                                                questionnaire: { ...extractedData.questionnaire, photo_consent: 'yes' }
                                                            })}
                                                        />
                                                        YES
                                                    </label>
                                                    <label className="flex items-center gap-1">
                                                        <input
                                                            type="radio"
                                                            name="photo_consent"
                                                            checked={extractedData.questionnaire.photo_consent === 'no'}
                                                            onChange={() => setExtractedData({
                                                                ...extractedData,
                                                                questionnaire: { ...extractedData.questionnaire, photo_consent: 'no' }
                                                            })}
                                                        />
                                                        NO
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* アクションボタン */}
                        {extractedData && (
                            <div className="flex gap-4">
                                <button
                                    onClick={handleSaveQuestionnaire}
                                    disabled={isLoading}
                                    className="flex-1 px-6 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2 text-lg font-medium"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            保存中...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="w-5 h-5" />
                                            問診データを登録
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Step 3: 保存完了 */}
                {step === 'saved' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center max-w-xl mx-auto">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Check className="w-8 h-8 text-green-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">
                            問診データ登録完了！
                        </h2>
                        <p className="text-gray-600 mb-6">
                            次は診断入力を行ってください。<br />
                            紙問診票の画像も参照できます。
                        </p>
                        <div className="flex flex-col gap-3">
                            <Link
                                href={`/staff/diagnosis/${selectedVisitId}`}
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                診断入力へ進む <ArrowRight className="w-4 h-4" />
                            </Link>
                            <button
                                onClick={() => {
                                    setStep('select')
                                    setSelectedVisitId('')
                                    setExtractedData(null)
                                    setImagePreview(null)
                                    setImageFile(null)
                                    setSavedImageUrl(null)
                                }}
                                className="text-gray-600 hover:text-gray-900"
                            >
                                別の来場者を処理する
                            </button>
                        </div>
                    </div>
                )}

                {/* 画像拡大モーダル */}
                {isZoomed && imagePreview && (
                    <div
                        className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
                        onClick={() => setIsZoomed(false)}
                    >
                        <button
                            className="absolute top-4 right-4 text-white hover:text-gray-300"
                            onClick={() => setIsZoomed(false)}
                        >
                            <X className="w-8 h-8" />
                        </button>
                        <img
                            src={imagePreview}
                            alt="問診票（拡大）"
                            className="max-w-full max-h-full object-contain"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}
