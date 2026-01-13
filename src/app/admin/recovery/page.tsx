'use client'

import { useState } from 'react'
import { FileSpreadsheet, FileImage, ArrowRight, Check } from 'lucide-react'
import Link from 'next/link'

type Phase = 'select' | 'csv' | 'paper'

export default function PaperRecoveryHubPage() {
    const [selectedPhase, setSelectedPhase] = useState<Phase>('select')

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto p-6">
                {/* ヘッダー */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">
                        紙問診票リカバリー
                    </h1>
                    <p className="text-gray-600 mt-1">
                        紙の問診票データをDBに登録し、診断・レポート作成を行います
                    </p>
                </div>

                {/* フェーズ選択 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Phase 1: CSVインポート */}
                    <Link
                        href="/admin/spreadsheet-import"
                        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:border-blue-400 hover:shadow-md transition-all group"
                    >
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
                                <FileSpreadsheet className="w-6 h-6 text-blue-600" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                        Phase 1
                                    </span>
                                </div>
                                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                                    CSVインポート
                                </h2>
                                <p className="text-sm text-gray-600 mb-4">
                                    Googleフォームから出力したCSVをアップロードし、来場者データをDBに登録します
                                </p>
                                <ul className="text-sm text-gray-500 space-y-1">
                                    <li className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-green-500" />
                                        お子様の名前・生年月日を登録
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-green-500" />
                                        保護者のメールアドレスを登録
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-green-500" />
                                        重複チェック機能
                                    </li>
                                </ul>
                                <div className="mt-4 flex items-center text-blue-600 font-medium text-sm group-hover:translate-x-1 transition-transform">
                                    CSVインポートへ <ArrowRight className="w-4 h-4 ml-1" />
                                </div>
                            </div>
                        </div>
                    </Link>

                    {/* Phase 2: 紙問診処理 */}
                    <Link
                        href="/admin/paper-recovery"
                        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:border-purple-400 hover:shadow-md transition-all group"
                    >
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-purple-200 transition-colors">
                                <FileImage className="w-6 h-6 text-purple-600" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                                        Phase 2
                                    </span>
                                </div>
                                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                                    紙問診票処理
                                </h2>
                                <p className="text-sm text-gray-600 mb-4">
                                    インポート済みの対象者を選び、紙問診票から問診データを抽出・登録します
                                </p>
                                <ul className="text-sm text-gray-500 space-y-1">
                                    <li className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-green-500" />
                                        対象者をリストから選択
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-green-500" />
                                        AIで問診データを自動抽出
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-green-500" />
                                        診断入力画面へ直接遷移
                                    </li>
                                </ul>
                                <div className="mt-4 flex items-center text-purple-600 font-medium text-sm group-hover:translate-x-1 transition-transform">
                                    問診票処理へ <ArrowRight className="w-4 h-4 ml-1" />
                                </div>
                            </div>
                        </div>
                    </Link>
                </div>

                {/* 補足情報 */}
                <div className="mt-8 bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <h3 className="font-medium text-amber-800 mb-2">📌 作業フロー</h3>
                    <ol className="text-sm text-amber-700 space-y-1 list-decimal list-inside">
                        <li><strong>最初の1人</strong>がCSVインポートを実行（全員分のデータを一括登録）</li>
                        <li><strong>2人目以降</strong>は「紙問診票処理」から対象者を選んで作業開始</li>
                        <li>問診データ登録後、診断入力→AI分析→レポート作成の流れ</li>
                    </ol>
                </div>
            </div>
        </div>
    )
}
