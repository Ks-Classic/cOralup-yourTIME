'use client'

import { useEffect } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

export default function StaffError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('[Staff Error Boundary]', error)
    }, [error])

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
            <div className="max-w-sm w-full bg-white rounded-2xl shadow-lg border border-red-100 p-8 text-center">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-red-400" />
                </div>
                <h2 className="text-lg font-bold text-gray-800 mb-2">
                    エラーが発生しました
                </h2>
                <p className="text-sm text-gray-500 mb-6">
                    画面の表示中に問題が起きました。<br />
                    下のボタンで再読み込みをお試しください。
                </p>
                <button
                    onClick={reset}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm font-medium transition-colors w-full justify-center"
                >
                    <RefreshCw className="w-4 h-4" />
                    もう一度試す
                </button>
                <button
                    onClick={() => window.location.href = '/staff'}
                    className="mt-3 inline-flex items-center gap-2 px-6 py-2 bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 rounded-full text-sm font-medium transition-colors w-full justify-center"
                >
                    スタッフトップに戻る
                </button>
            </div>
        </div>
    )
}
