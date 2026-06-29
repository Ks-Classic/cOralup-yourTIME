'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Logo } from '@/components/Logo'

interface Staff {
  id: string
  name: string
  avatarUrl?: string
}

interface EventInfo {
  id: string
  eventId: string
  name: string
  startDate: string | null
  venue: string | null
  status: string
}

type LoginStatus =
  | 'pin_input'
  | 'loading_staff'
  | 'staff_select'
  | 'logging_in'
  | 'error'
  | 'success'

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

  // イベントタブ関連
  const [eventList, setEventList] = useState<EventInfo[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>('all')
  const [loadingStaffForEvent, setLoadingStaffForEvent] = useState(false)

  // URLパラメータからトークンを取得（旧LIFF引き継ぎ用 - 後方互換）
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const tokenFromUrl = urlParams.get('token')

    if (tokenFromUrl) {
      // H-1: セッションJWTをURL/履歴/Refererに残さない。読み取り直後に消去。
      window.history.replaceState(null, '', window.location.pathname)

      fetch('/api/auth/staff-session', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenFromUrl }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            window.location.href = '/staff/home'
          }
        })
        .catch(() => {})
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
        // イベント一覧とスタッフ一覧を並行取得
        const [eventsRes, staffRes] = await Promise.all([
          fetch('/api/events/list'),
          fetch('/api/staff/list'),
        ])

        const eventsData = await eventsRes.json()
        const staffData = await staffRes.json()

        if (staffRes.ok && staffData.staff) {
          setStaffList(staffData.staff)

          if (eventsRes.ok && eventsData.events) {
            setEventList(eventsData.events)
            // イベントが1つだけなら自動選択
            if (eventsData.events.length === 1) {
              setSelectedEventId(eventsData.events[0].id)
              // そのイベントのスタッフを取得
              await loadStaffForEvent(eventsData.events[0].id)
            }
          }

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

  // イベント別スタッフ読み込み
  const loadStaffForEvent = async (eventId: string) => {
    setLoadingStaffForEvent(true)
    try {
      const url =
        eventId === 'all'
          ? '/api/staff/list'
          : `/api/staff/list?eventId=${eventId}`
      const res = await fetch(url)
      const data = await res.json()
      if (res.ok && data.staff) {
        setStaffList(data.staff)
      }
    } catch (err) {
      console.error('Failed to load staff for event:', err)
    } finally {
      setLoadingStaffForEvent(false)
    }
  }

  // イベントタブ切り替え
  const handleEventChange = async (eventId: string) => {
    setSelectedEventId(eventId)
    setSearchQuery('')
    await loadStaffForEvent(eventId)
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
  const filteredStaff = staffList.filter((staff) =>
    staff.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // イベント名のフォーマット
  const formatEventLabel = (event: EventInfo): string => {
    if (event.startDate) {
      const date = new Date(event.startDate)
      const month = date.getMonth() + 1
      const day = date.getDate()
      return `${event.name}（${month}/${day}）`
    }
    return event.name
  }

  // PIN入力画面
  if (status === 'pin_input' || status === 'loading_staff') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white">
              <Logo size="lg" />
            </div>
            <h1 className="text-2xl font-bold text-white">cOralup Staff</h1>
            <p className="mt-2 text-slate-400">スタッフ専用アプリ</p>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 shadow-xl backdrop-blur">
            <label className="mb-2 block text-sm text-slate-400">
              スタッフPINを入力
            </label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
              className="w-full rounded-xl border border-slate-600 bg-slate-700 px-4 py-3 text-center text-2xl tracking-widest text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="••••"
              autoFocus
            />
            {pinError && (
              <p className="mt-2 text-center text-sm text-red-400">
                {pinError}
              </p>
            )}
            <button
              onClick={handlePinSubmit}
              disabled={status === 'loading_staff'}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 font-medium text-white transition-colors hover:bg-emerald-600 disabled:bg-slate-600"
            >
              {status === 'loading_staff' ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
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
        <div className="mx-auto max-w-sm">
          {/* ヘッダー */}
          <div className="mb-6 text-center">
            <h1 className="text-xl font-bold text-white">スタッフを選択</h1>
            <p className="mt-1 text-sm text-slate-400">
              あなたの名前をタップしてください
            </p>
          </div>

          {/* LINE内ブラウザ警告 */}
          {showLineWarning && (
            <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/20 p-4">
              <p className="mb-1 text-sm font-medium text-amber-300">
                ⚠️ LINE内ブラウザです
              </p>
              <p className="text-xs text-amber-200">
                QRスキャンにはSafari/Chromeが必要です。
                <br />
                ログイン後、外部ブラウザで開き直してください。
              </p>
            </div>
          )}

          {/* イベントタブ */}
          {eventList.length > 0 && (
            <div className="mb-4">
              <p className="mb-2 text-xs text-slate-400">📋 イベントを選択</p>
              <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-2">
                <button
                  onClick={() => handleEventChange('all')}
                  className={`flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    selectedEventId === 'all'
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                      : 'border border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  全て
                </button>
                {eventList.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => handleEventChange(event.id)}
                    className={`flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                      selectedEventId === event.id
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                        : 'border border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    {formatEventLabel(event)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 検索ボックス */}
          <div className="mb-4">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="名前で検索..."
                className="w-full rounded-xl border border-slate-700 bg-slate-800/50 py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* スタッフリスト */}
          <div className="max-h-[55vh] space-y-2 overflow-y-auto">
            {loadingStaffForEvent ? (
              <div className="py-8 text-center">
                <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-500" />
                <p className="text-sm text-slate-400">読み込み中...</p>
              </div>
            ) : filteredStaff.length > 0 ? (
              filteredStaff.map((staff) => (
                <button
                  key={staff.id}
                  onClick={() => handleStaffSelect(staff)}
                  className="flex w-full items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/50 p-4 text-left transition-all hover:border-emerald-500/50 hover:bg-slate-700/50"
                >
                  {staff.avatarUrl ? (
                    <Image
                      src={staff.avatarUrl}
                      alt=""
                      className="h-10 w-10 rounded-full"
                      width={40}
                      height={40}
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-600">
                      <span className="text-lg text-slate-300">👤</span>
                    </div>
                  )}
                  <span className="font-medium text-white">{staff.name}</span>
                </button>
              ))
            ) : (
              <div className="py-8 text-center">
                <p className="mb-2 text-3xl text-slate-500">🦷</p>
                <p className="text-sm text-slate-400">
                  {selectedEventId !== 'all'
                    ? 'このイベントに登録されたスタッフがいません'
                    : '該当するスタッフが見つかりません'}
                </p>
                {selectedEventId !== 'all' && (
                  <p className="mt-2 text-xs text-slate-500">
                    LINEスタッフアカウントからイベント登録をお願いします
                  </p>
                )}
              </div>
            )}
          </div>

          {/* スタッフ数表示 */}
          {!loadingStaffForEvent && (
            <p className="mt-3 text-center text-xs text-slate-500">
              {filteredStaff.length}名のスタッフ
            </p>
          )}

          {/* 戻るボタン */}
          <button
            onClick={() => {
              setStatus('pin_input')
              setPin('')
              setSearchQuery('')
              setSelectedEventId('all')
            }}
            className="mt-4 w-full py-2 text-sm text-slate-400 hover:text-white"
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
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <div className="text-center">
          <div className="relative mx-auto mb-4 h-16 w-16 rounded-full border-4 border-emerald-500/30">
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          </div>
          <p className="font-medium text-white">
            {selectedStaff?.name}さんでログイン中...
          </p>
        </div>
      </div>
    )
  }

  // ログイン成功
  if (status === 'success') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <div className="text-center">
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
          <p className="text-slate-300">
            {selectedStaff?.name}さん、ようこそ！
          </p>
        </div>
      </div>
    )
  }

  // エラー
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="text-center">
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
        <h1 className="mb-2 text-xl font-bold text-white">
          エラーが発生しました
        </h1>
        <button
          onClick={() => {
            setStatus('pin_input')
            setPin('')
          }}
          className="mt-4 rounded-xl bg-slate-700 px-6 py-3 text-white hover:bg-slate-600"
        >
          もう一度試す
        </button>
      </div>
    </div>
  )
}
