'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import liff from '@line/liff'
import { Loader2 } from 'lucide-react'

/**
 * 親御さん用LIFFエントリーポイント
 * 
 * このページがLIFFのエンドポイントになり、
 * liff.state パラメータに応じて正しいページにルーティングする
 * 
 * 使用例:
 * - マイページ: https://liff.line.me/LIFF_ID/home
 * - 問診ページ: https://liff.line.me/LIFF_ID/questionnaire
 */
export default function ParentLiffEntryPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-coral-50 to-white">
                <div className="text-center p-4">
                    <Loader2 className="w-10 h-10 animate-spin text-coral-500 mx-auto mb-4" />
                    <p className="text-gray-600">読み込み中...</p>
                </div>
            </div>
        }>
            <ParentLiffEntryPageContent />
        </Suspense>
    )
}

function ParentLiffEntryPageContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [status, setStatus] = useState<'initializing' | 'redirecting' | 'error'>('initializing')
    const [errorMessage, setErrorMessage] = useState('')

    useEffect(() => {
        const initAndRoute = async () => {
            try {
                const liffId = process.env.NEXT_PUBLIC_PARENT_LIFF_ID
                if (!liffId) {
                    setStatus('error')
                    setErrorMessage('LIFF IDが設定されていません')
                    return
                }

                // LIFF初期化
                await liff.init({ liffId })

                // LINEアプリ外の場合
                if (!liff.isInClient()) {
                    setStatus('error')
                    setErrorMessage('LINEアプリ内で開いてください')
                    return
                }

                // ログインしていない場合
                if (!liff.isLoggedIn()) {
                    liff.login()
                    return
                }

                // ルーティング先を決定
                // liff.state パラメータ（LIFF URLのパス部分）を取得
                const liffState = searchParams.get('liff.state')

                let targetPath = '/parent/questionnaire/liff' // デフォルトは問診ページ

                if (liffState) {
                    // liff.state が /home や /questionnaire などの場合
                    if (liffState === '/home' || liffState.startsWith('/home')) {
                        targetPath = '/parent/home'
                    } else if (liffState === '/questionnaire' || liffState.startsWith('/questionnaire')) {
                        targetPath = '/parent/questionnaire/liff'
                    } else if (liffState.startsWith('/parent/')) {
                        // フルパスが指定されている場合はそのまま使用
                        targetPath = liffState
                    }
                }

                // console.log('[LIFF Entry] Routing to:', targetPath, 'from liff.state:', liffState)
                setStatus('redirecting')

                // リダイレクト
                router.replace(targetPath)

            } catch (error) {
                console.error('[LIFF Entry] Error:', error)
                setStatus('error')
                setErrorMessage('初期化に失敗しました')
            }
        }

        initAndRoute()
    }, [router, searchParams])

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-coral-50 to-white">
            <div className="text-center p-4">
                {status === 'initializing' && (
                    <>
                        <Loader2 className="w-10 h-10 animate-spin text-coral-500 mx-auto mb-4" />
                        <p className="text-gray-600">読み込み中...</p>
                    </>
                )}
                {status === 'redirecting' && (
                    <>
                        <Loader2 className="w-10 h-10 animate-spin text-coral-500 mx-auto mb-4" />
                        <p className="text-gray-600">ページに移動中...</p>
                    </>
                )}
                {status === 'error' && (
                    <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl">⚠️</span>
                        </div>
                        <p className="text-red-600 font-medium mb-2">エラー</p>
                        <p className="text-gray-600 text-sm">{errorMessage}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
                        >
                            再読み込み
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
