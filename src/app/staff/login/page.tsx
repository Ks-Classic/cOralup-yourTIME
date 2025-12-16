'use client'

import { useEffect, useState } from 'react'

interface Staff {
  id: string
  name: string
  avatarUrl?: string
}

type LoginStatus = 'pin_input' | 'loading_staff' | 'staff_select' | 'logging_in' | 'error' | 'success'

// LINE内ブラウザかどうかを判定
function isLineInAppBrowser(): boolean {
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent.toLowerCase()
  return ua.includes('line')
}

export default function StaffLoginPage() {
  const [status, setStatus] = useState<LoginStatus>('pin_input')
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)
  const [showLineWarning, setShowLineWarning] = useState(false)

  // URLパラメータからトークンを取得（旧LIFF引き継ぎ用 - 後方互換）
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const tokenFromUrl = urlParams.get('token')

    if (tokenFromUrl) {
      fetch('/api/auth/staff-session', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenFromUrl }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            window.location.href = '/staff/home'
          }
        })
        .catch(() => { })
    }
  }, [])

  // PIN検証
  const handlePinSubmit = async () => {
    if (pin.length < 4) {
      setPinError('PINを入力してください')
      return
    }

    setPinError('')
    setStatus('loading_staff')

    try {
      const res = await fetch('/api/auth/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })

      const data = await res.json()

      if (res.ok && data.valid) {
        // スタッフ一覧を取得
        const staffRes = await fetch('/api/staff/list')
        const staffData = await staffRes.json()

        if (staffRes.ok && staffData.staff) {
          setStaffList(staffData.staff)
          setStatus('staff_select')

          // LINE内ブラウザなら警告表示
          if (isLineInAppBrowser()) {
            setShowLineWarning(true)
          }
        } else {
          setStatus('error')
        }
      } else {
        setPinError('PINが正しくありません')
        setStatus('pin_input')
      }
    } catch {
      setPinError('エラーが発生しました')
      setStatus('pin_input')
    }
  }

  // スタッフ選択してログイン
  const handleStaffSelect = async (staff: Staff) => {
    setSelectedStaff(staff)
    setStatus('logging_in')

    try {
      const res = await fetch('/api/auth/pin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, staffId: staff.id }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setStatus('success')
        setTimeout(() => {
          window.location.href = '/staff/home'
        }, 1000)
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  // 検索フィルタ
  const filteredStaff = staffList.filter(staff =>
    staff.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // PIN入力画面
  if (status === 'pin_input' || status === 'loading_staff') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🦷</span>
            </div>
            <h1 className="text-2xl font-bold text-white">cOralup Staff</h1>
            <p className="text-slate-400 mt-2">スタッフ専用アプリ</p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur rounded-2xl shadow-xl p-6 border border-slate-700">
            <label className="block text-sm text-slate-400 mb-2">スタッフPINを入力</label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
              className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="••••"
              autoFocus
            />
            {pinError && (
              <p className="text-red-400 text-sm mt-2 text-center">{pinError}</p>
            )}
            <button
              onClick={handlePinSubmit}
              disabled={status === 'loading_staff'}
              className="w-full mt-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-600 text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {status === 'loading_staff' ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  確認中...
                </>
              ) : (
                'ログイン'
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // スタッフ選択画面
  if (status === 'staff_select') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <div className="max-w-sm mx-auto">
          {/* ヘッダー */}
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-white">スタッフを選択</h1>
            <p className="text-slate-400 text-sm mt-1">あなたの名前をタップしてください</p>
          </div>

          {/* LINE内ブラウザ警告 */}
          {showLineWarning && (
            <div className="bg-amber-500/20 border border-amber-500/30 rounded-xl p-4 mb-4">
              <p className="text-amber-300 text-sm font-medium mb-1">⚠️ LINE内ブラウザです</p>
              <p className="text-amber-200 text-xs">
                QRスキャンにはSafari/Chromeが必要です。<br />
                ログイン後、外部ブラウザで開き直してください。
              </p>
            </div>
          )}

          {/* 検索ボックス */}
          <div className="mb-4">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="名前で検索..."
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* スタッフリスト */}
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {filteredStaff.length > 0 ? (
              filteredStaff.map((staff) => (
                <button
                  key={staff.id}
                  onClick={() => handleStaffSelect(staff)}
                  className="w-full bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 hover:border-emerald-500/50 rounded-xl p-4 text-left transition-all flex items-center gap-3"
                >
                  {staff.avatarUrl ? (
                    <img src={staff.avatarUrl} alt="" className="w-10 h-10 rounded-full" />
                  ) : (
                    <div className="w-10 h-10 bg-slate-600 rounded-full flex items-center justify-center">
                      <span className="text-slate-300 text-lg">👤</span>
                    </div>
                  )}
                  <span className="text-white font-medium">{staff.name}</span>
                </button>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-400">該当するスタッフが見つかりません</p>
              </div>
            )}
          </div>

          {/* 戻るボタン */}
          <button
            onClick={() => {
              setStatus('pin_input')
              setPin('')
              setSearchQuery('')
            }}
            className="w-full mt-4 text-slate-400 hover:text-white text-sm py-2"
          >
            ← PINを再入力
          </button>
        </div>
      </div>
    )
  }

  // ログイン中
  if (status === 'logging_in') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500/30 rounded-full mx-auto mb-4 relative">
            <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-white font-medium">{selectedStaff?.name}さんでログイン中...</p>
        </div>
      </div>
    )
  }

  // ログイン成功
  if (status === 'success') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">ログイン成功！</h1>
          <p className="text-slate-300">{selectedStaff?.name}さん、ようこそ！</p>
        </div>
      </div>
    )
  }

  // エラー
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="text-center">
        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-white mb-2">エラーが発生しました</h1>
        <button
          onClick={() => {
            setStatus('pin_input')
            setPin('')
          }}
          className="mt-4 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-xl"
        >
          もう一度試す
        </button>
      </div>
    </div>
  )
}
