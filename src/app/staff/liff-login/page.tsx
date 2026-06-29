'use client'

import { useEffect, useState } from 'react'

type LoginStatus =
  | 'loading'
  | 'success'
  | 'opening_browser'
  | 'error'
  | 'not_registered'
  | 'inactive'

// LINE内ブラウザかどうかを判定
function isLiffBrowser(): boolean {
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent.toLowerCase()
  return ua.includes('line') || ua.includes('liff')
}

export default function LiffLoginPage() {
  const [status, setStatus] = useState<LoginStatus>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [staffName, setStaffName] = useState('')
  const [externalUrl, setExternalUrl] = useState('')

  useEffect(() => {
    const initLiff = async () => {
      try {
        // LIFF SDKを動的インポート
        const liff = (await import('@line/liff')).default

        const liffId = process.env.NEXT_PUBLIC_STAFF_LIFF_ID
        if (!liffId) {
          setStatus('error')
          setErrorMessage('LIFF IDが設定されていません')
          return
        }

        await liff.init({ liffId })

        // LINEログインしていない場合
        if (!liff.isLoggedIn()) {
          liff.login({ redirectUri: window.location.href })
          return
        }

        // IDトークン取得（サーバ側でLINE検証する。userId は送らない）
        const idToken = liff.getIDToken()
        if (!idToken) {
          setStatus('error')
          setErrorMessage(
            'LINE認証情報を取得できませんでした。LINEでログインし直してください。'
          )
          return
        }

        // セッション発行API呼び出し
        const res = await fetch('/api/auth/staff-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        })

        const data = await res.json()

        if (res.ok && data.success) {
          setStatus('success')
          setStaffName(data.staff.name)

          // LIFF/LINE内ブラウザの場合 → 外部ブラウザで開く（トークン付き）
          if (isLiffBrowser() && liff.isInClient()) {
            // トークンをURLパラメータに追加してセッション引き継ぎ
            const loginUrl = `${window.location.origin}/staff/login?token=${encodeURIComponent(data.token)}`
            setExternalUrl(loginUrl)
            setStatus('opening_browser')

            // 少し待ってから外部ブラウザで開く
            setTimeout(() => {
              liff.openWindow({
                url: loginUrl,
                external: true, // 外部ブラウザで開く
              })
            }, 1500)
          } else {
            // 通常ブラウザの場合 → そのまま遷移
            setTimeout(() => {
              window.location.href = '/staff/home'
            }, 1500)
          }
        } else if (data.error === 'not_registered') {
          setStatus('not_registered')
        } else if (data.error === 'account_inactive') {
          setStatus('inactive')
        } else {
          setStatus('error')
          setErrorMessage(data.error || '認証に失敗しました')
        }
      } catch (error) {
        console.error('LIFF init error:', error)
        setStatus('error')
        setErrorMessage('LIFFの初期化に失敗しました')
      }
    }

    initLiff()
  }, [])

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-4 border-emerald-500/30"></div>
          <div className="absolute left-0 top-0 h-16 w-16 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
        </div>
        <p className="mt-6 text-lg text-slate-300">ログイン中...</p>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-800/50 p-8 text-center shadow-xl backdrop-blur">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20">
            <svg
              className="h-10 w-10 text-emerald-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="mb-2 text-xl font-bold text-white">ログイン成功</h1>
          <p className="text-slate-300">{staffName}さん、ようこそ！</p>
          <p className="mt-4 text-sm text-slate-400">
            ホーム画面に移動します...
          </p>
        </div>
      </div>
    )
  }

  // LINE内ブラウザから外部ブラウザへ移動中
  if (status === 'opening_browser') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-800/50 p-8 text-center shadow-xl backdrop-blur">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20">
            <svg
              className="h-10 w-10 text-emerald-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="mb-2 text-xl font-bold text-white">ログイン成功！</h1>
          <p className="mb-4 text-slate-300">{staffName}さん、ようこそ！</p>

          <div className="mb-4 rounded-xl border border-blue-500/30 bg-blue-500/20 p-4">
            <p className="mb-2 text-sm font-medium text-blue-300">
              🌐 ブラウザが開きます
            </p>
            <p className="text-xs leading-relaxed text-blue-200">
              Safari/Chrome で診断アプリが開きます。
              <br />
              <strong>ブックマーク登録</strong>をお願いします！
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
            外部ブラウザを起動中...
          </div>

          <p className="mt-4 text-xs text-slate-500">
            自動で開かない場合は
            <br />
            <a
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 underline"
            >
              こちらをタップ
            </a>
          </p>
        </div>
      </div>
    )
  }

  if (status === 'not_registered') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-800/50 p-8 text-center shadow-xl backdrop-blur">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/20">
            <svg
              className="h-10 w-10 text-amber-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="mb-2 text-xl font-bold text-white">未登録です</h1>
          <p className="mb-6 text-slate-300">
            スタッフとして登録されていません。
            <br />
            LINE公式アカウント「cOralupスタッフ」を
            <br />
            友だち追加してください。
          </p>
          <a
            href="https://line.me/R/ti/p/@coralup-staff"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#06C755] px-6 py-3 font-medium text-white transition-colors hover:bg-[#05b04c]"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
            </svg>
            友だち追加
          </a>
        </div>
      </div>
    )
  }

  if (status === 'inactive') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-800/50 p-8 text-center shadow-xl backdrop-blur">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/20">
            <svg
              className="h-10 w-10 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
          </div>
          <h1 className="mb-2 text-xl font-bold text-white">アカウント無効</h1>
          <p className="text-slate-300">
            このアカウントは現在無効になっています。
            <br />
            管理者にお問い合わせください。
          </p>
        </div>
      </div>
    )
  }

  // error
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-800/50 p-8 text-center shadow-xl backdrop-blur">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/20">
          <svg
            className="h-10 w-10 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h1 className="mb-2 text-xl font-bold text-white">エラー</h1>
        <p className="mb-6 text-slate-300">{errorMessage}</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-xl bg-slate-700 px-6 py-3 font-medium text-white transition-colors hover:bg-slate-600"
        >
          再試行
        </button>
      </div>
    </div>
  )
}
