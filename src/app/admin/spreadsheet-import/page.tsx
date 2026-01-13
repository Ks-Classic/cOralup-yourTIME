'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileSpreadsheet, Check, AlertCircle, Loader2, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface ParsedRow {
    rowNumber: number
    timestamp: string
    childName: string
    furigana: string
    birthday: string
    email: string
}

interface CheckResult {
    rowNumber: number
    status: 'found' | 'not_found'
    existingChild?: {
        id: string
        firstName: string
        lastName: string
        parentProfileId: string
    }
    existingVisit?: {
        id: string
        status: string
    }
}

interface ImportResult {
    rowNumber: number
    childId: string
    visitId: string
    action: 'used_existing' | 'created_new'
}

export default function SpreadsheetImportPage() {
    const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
    const [checkResults, setCheckResults] = useState<CheckResult[]>([])
    const [importResults, setImportResults] = useState<ImportResult[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [step, setStep] = useState<'upload' | 'preview' | 'checked' | 'imported'>('upload')
    const [error, setError] = useState<string | null>(null)

    // ファイルドロップ処理
    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return

        setIsLoading(true)
        setError(null)

        try {
            const file = acceptedFiles[0]
            const formData = new FormData()
            formData.append('file', file)

            const response = await fetch('/api/admin/spreadsheet-import/parse', {
                method: 'POST',
                body: formData,
            })

            const result = await response.json()

            if (result.success) {
                setParsedRows(result.data.rows)
                setStep('preview')
            } else {
                setError(result.error)
            }
        } catch (err) {
            setError('ファイルの読み込みに失敗しました')
        } finally {
            setIsLoading(false)
        }
    }, [])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/csv': ['.csv'],
        },
        maxFiles: 1,
    })

    // DB存在チェック
    const handleCheck = async () => {
        setIsLoading(true)
        setError(null)

        try {
            const response = await fetch('/api/admin/spreadsheet-import/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rows: parsedRows.map(row => ({
                        childName: row.childName,
                        birthday: row.birthday,
                    })),
                }),
            })

            const result = await response.json()

            if (result.success) {
                setCheckResults(result.data.results)
                setStep('checked')
            } else {
                setError(result.error)
            }
        } catch (err) {
            setError('DB検索に失敗しました')
        } finally {
            setIsLoading(false)
        }
    }

    // インポート実行
    const handleImport = async () => {
        setIsLoading(true)
        setError(null)

        try {
            const response = await fetch('/api/admin/spreadsheet-import/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rows: parsedRows.map((row, index) => ({
                        childName: row.childName,
                        furigana: row.furigana,
                        birthday: row.birthday,
                        email: row.email,
                        existingChildId: checkResults[index]?.existingChild?.id,
                    })),
                }),
            })

            const result = await response.json()

            if (result.success) {
                setImportResults(result.data.imported)
                setStep('imported')
            } else {
                setError(result.error)
            }
        } catch (err) {
            setError('インポートに失敗しました')
        } finally {
            setIsLoading(false)
        }
    }

    // 集計
    const summary = checkResults.reduce(
        (acc, r) => {
            if (r.status === 'found') acc.found++
            else acc.notFound++
            return acc
        },
        { found: 0, notFound: 0 }
    )

    const importSummary = importResults.reduce(
        (acc, r) => {
            if (r.action === 'used_existing') acc.existing++
            else acc.created++
            return acc
        },
        { existing: 0, created: 0 }
    )

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto">
                {/* ヘッダー */}
                <div className="mb-8">
                    <Link href="/admin" className="text-blue-600 hover:underline text-sm mb-2 inline-block">
                        ← 管理画面に戻る
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900">
                        スプレッドシートインポート
                    </h1>
                    <p className="text-gray-600 mt-1">
                        GoogleスプレッドシートからエクスポートしたCSVをインポートします
                    </p>
                </div>

                {/* エラー表示 */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <span className="text-red-800">{error}</span>
                    </div>
                )}

                {/* Step 1: ファイルアップロード */}
                {step === 'upload' && (
                    <div
                        {...getRootProps()}
                        className={`
              border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
              transition-colors
              ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white hover:border-blue-400'}
            `}
                    >
                        <input {...getInputProps()} />
                        {isLoading ? (
                            <Loader2 className="w-12 h-12 mx-auto text-blue-500 animate-spin" />
                        ) : (
                            <>
                                <FileSpreadsheet className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                                <p className="text-lg font-medium text-gray-700">
                                    CSVファイルをドロップ
                                </p>
                                <p className="text-sm text-gray-500 mt-1">
                                    またはクリックしてファイルを選択
                                </p>
                                <p className="text-xs text-gray-400 mt-4">
                                    Googleスプレッドシート → ファイル → ダウンロード → CSV形式
                                </p>
                            </>
                        )}
                    </div>
                )}

                {/* Step 2: プレビュー */}
                {step === 'preview' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                            <div>
                                <h2 className="font-semibold text-gray-900">プレビュー</h2>
                                <p className="text-sm text-gray-500">{parsedRows.length}件のデータ</p>
                            </div>
                            <button
                                onClick={handleCheck}
                                disabled={isLoading}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                DB存在チェック
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-medium text-gray-600">#</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-600">お名前</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-600">ふりがな</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-600">生年月日</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-600">メアド</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {parsedRows.map((row, index) => (
                                        <tr key={index} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-gray-500">{row.rowNumber}</td>
                                            <td className="px-4 py-3 font-medium text-gray-900">{row.childName}</td>
                                            <td className="px-4 py-3 text-gray-600">{row.furigana}</td>
                                            <td className="px-4 py-3 text-gray-600">{row.birthday}</td>
                                            <td className="px-4 py-3 text-gray-600 text-xs">{row.email}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Step 3: チェック結果 */}
                {step === 'checked' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                            <div>
                                <h2 className="font-semibold text-gray-900">DB存在チェック結果</h2>
                                <p className="text-sm text-gray-500">
                                    ✅ 既存: {summary.found}件 / ⚠️ 新規作成: {summary.notFound}件
                                </p>
                            </div>
                            <button
                                onClick={handleImport}
                                disabled={isLoading}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                インポート実行（{parsedRows.length}件）
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-medium text-gray-600">#</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-600">お名前</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-600">生年月日</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-600">メアド</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-600">状態</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {parsedRows.map((row, index) => {
                                        const check = checkResults[index]
                                        return (
                                            <tr key={index} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 text-gray-500">{row.rowNumber}</td>
                                                <td className="px-4 py-3 font-medium text-gray-900">{row.childName}</td>
                                                <td className="px-4 py-3 text-gray-600">{row.birthday}</td>
                                                <td className="px-4 py-3 text-gray-600 text-xs">{row.email}</td>
                                                <td className="px-4 py-3">
                                                    {check?.status === 'found' ? (
                                                        <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 px-2 py-1 rounded-full text-xs">
                                                            <Check className="w-3 h-3" /> 既存
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-1 rounded-full text-xs">
                                                            <AlertCircle className="w-3 h-3" /> 新規
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Step 4: インポート完了 */}
                {step === 'imported' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Check className="w-8 h-8 text-green-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">
                            インポート完了！
                        </h2>
                        <p className="text-gray-600 mb-6">
                            {importResults.length}件のデータをインポートしました
                        </p>
                        <div className="flex justify-center gap-8 mb-8">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">{importSummary.existing}</div>
                                <div className="text-sm text-gray-500">既存child使用</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600">{importSummary.created}</div>
                                <div className="text-sm text-gray-500">新規作成</div>
                            </div>
                        </div>
                        <Link
                            href="/admin/paper-recovery"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            紙問診票リカバリーへ進む <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                )}
            </div>
        </div>
    )
}
