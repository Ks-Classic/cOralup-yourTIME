'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function StaffLogoutPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    const logout = async () => {
      try {
        const res = await fetch('/api/auth/staff-session', {
          method: 'DELETE',
        })

        if (res.ok) {
          setStatus('success')
          setTimeout(() => {
            router.push('/staff/login')
          }, 1500)
        } else {
          setStatus('error')
        }
      } catch (error) {
        console.error('Logout error:', error)
        setStatus('error')
      }
    }

    logout()
  }, [router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-slate-600 rounded-full"></div>
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="mt-6 text-slate-300 text-lg">ログアウト中...</p>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <div className="bg-slate-800/50 backdrop-blur rounded-2xl shadow-xl p-8 max-w-sm w-full text-center border border-slate-700">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">ログアウト完了</h1>
          <p className="text-slate-300">
            ログイン画面に移動します...
          </p>
        </div>
      </div>
    )
  }

  // error
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="bg-slate-800/50 backdrop-blur rounded-2xl shadow-xl p-8 max-w-sm w-full text-center border border-slate-700">
        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-white mb-2">エラー</h1>
        <p className="text-slate-300 mb-6">ログアウトに失敗しました</p>
        <button
          onClick={() => router.push('/staff/home')}
          className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-xl font-medium transition-colors"
        >
          ホームに戻る
        </button>
      </div>
    </div>
  )
}


