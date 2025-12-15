'use client'

import { useEffect, useState } from 'react'

// LIFF ID（ビルド時に埋め込み）
const STAFF_LIFF_ID = process.env.NEXT_PUBLIC_STAFF_LIFF_ID || ''

// LINE内ブラウザかどうかを判定
function isLineInAppBrowser(): boolean {
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent.toLowerCase()
  return ua.includes('line')
}

// 外部ブラウザで開く（LINE内ブラウザからの脱出）
function openInExternalBrowser(url: string) {
  // iOS: Safari で開く
  // Android: デフォルトブラウザで開く
  // LINE内ブラウザでは window.open が外部ブラウザで開く
  const externalUrl = `intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`
  
  // まず通常の方法を試す
  const opened = window.open(url, '_blank')
  
  // 開けなかった場合（LINE内ブラウザ等）
  if (!opened) {
    // Android Intent URI を試す
    window.location.href = externalUrl
  }
}

export default function StaffLoginPage() {
  const [status, setStatus] = useState<'checking' | 'line_browser' | 'redirecting' | 'no_liff'>('checking')

  useEffect(() => {
    console.log('[Login] STAFF_LIFF_ID:', STAFF_LIFF_ID)
    console.log('[Login] User Agent:', navigator.userAgent)
    console.log('[Login] Is LINE browser:', isLineInAppBrowser())

    if (!STAFF_LIFF_ID) {
      setStatus('no_liff')
      return
    }

    // LINE内ブラウザの場合
    if (isLineInAppBrowser()) {
      setStatus('line_browser')
      // LINE内ブラウザからはLIFFでログイン後、外部ブラウザで開く案内
      return
    }

    // 外部ブラウザの場合 → LIFFログインへリダイレクト
    setStatus('redirecting')
    const liffUrl = `https://liff.line.me/${STAFF_LIFF_ID}`
    console.log('[Login] Redirecting to:', liffUrl)
    
    const timer = setTimeout(() => {
      window.location.href = liffUrl
    }, 500)
    
    return () => clearTimeout(timer)
  }, [])

  // チェック中
  if (status === 'checking') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // LINE内ブラウザの場合 → 外部ブラウザで開くよう案内
  if (status === 'line_browser') {
    const currentUrl = typeof window !== 'undefined' ? window.location.href : ''
    
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white mb-2">外部ブラウザで開いてください</h1>
            <p className="text-slate-400 text-sm">
              診断アプリはLINE内ブラウザでは動作しません
            </p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur rounded-2xl shadow-xl p-6 border border-slate-700 space-y-4">
            <div className="text-slate-300 text-sm space-y-3">
              <p className="font-medium text-white">📱 開き方:</p>
              <ol className="list-decimal list-inside space-y-2 text-slate-400">
                <li>右上の <span className="text-white">「⋮」</span> または <span className="text-white">「…」</span> をタップ</li>
                <li><span className="text-white">「他のブラウザで開く」</span> を選択</li>
                <li>Safari / Chrome で開きます</li>
              </ol>
            </div>

            <div className="pt-4 border-t border-slate-700">
              <button
                onClick={() => openInExternalBrowser(currentUrl)}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-3 px-4 rounded-xl transition-colors"
              >
                外部ブラウザで開く
              </button>
              <p className="text-xs text-slate-500 text-center mt-2">
                ※ 上手くいかない場合は手動で開いてください
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // リダイレクト中
  if (status === 'redirecting') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">ログイン中...</h1>
          <p className="text-slate-400 text-sm">
            LINEログイン画面に移動します
          </p>
        </div>
      </div>
    )
  }

  // LIFF IDが設定されていない場合
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">cOralup Staff</h1>
          <p className="text-slate-400 mt-2">スタッフ専用アプリ</p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur rounded-2xl shadow-xl p-6 text-center border border-slate-700">
          <p className="text-slate-300 mb-4">
            ログイン設定が完了していません。
            <br />
            管理者にお問い合わせください。
          </p>
        </div>
      </div>
    </div>
  )
}
