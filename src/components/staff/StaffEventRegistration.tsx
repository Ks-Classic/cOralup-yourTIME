'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

interface StaffEvent {
  id: string
  name: string
  startDate: string | null
  endDate: string | null
  venue: string | null
  isRegistered: boolean
}

interface StaffEventsResponse {
  events?: StaffEvent[]
  error?: string
}

function formatEventDate(startDate: string | null, endDate: string | null) {
  if (!startDate) return '日時未定'

  const start = new Date(startDate)
  const end = endDate ? new Date(endDate) : null
  const date = new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    timeZone: 'Asia/Tokyo',
  }).format(start)
  const startTime = new Intl.DateTimeFormat('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Tokyo',
  }).format(start)
  const endTime = end
    ? new Intl.DateTimeFormat('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Tokyo',
      }).format(end)
    : null

  return `${date} ${startTime}${endTime ? `〜${endTime}` : ''}`
}

interface StaffEventRegistrationProps {
  onboarding?: boolean
}

export function StaffEventRegistration({
  onboarding = false,
}: StaffEventRegistrationProps) {
  const [events, setEvents] = useState<StaffEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [registeringId, setRegisteringId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const loadEvents = useCallback(async () => {
    try {
      const response = await fetch('/api/staff/events', { cache: 'no-store' })
      const data = (await response.json()) as StaffEventsResponse
      if (response.status === 401) {
        throw new Error('ログイン状態を確認できませんでした。もう一度LINEログインしてください。')
      }
      if (!response.ok) throw new Error(data.error || '参加イベントを取得できませんでした')
      setEvents(data.events ?? [])
      setError('')
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : '参加イベントを取得できませんでした'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadEvents()
  }, [loadEvents])

  const registerForEvent = async (eventId: string) => {
    setRegisteringId(eventId)
    setError('')
    try {
      const response = await fetch('/api/staff/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      })
      const data = (await response.json()) as { error?: string }
      if (response.status === 401) {
        throw new Error('ログイン状態を確認できませんでした。もう一度LINEログインしてください。')
      }
      if (!response.ok) throw new Error(data.error || '参加登録に失敗しました')
      await loadEvents()
    } catch (registerError) {
      setError(
        registerError instanceof Error
          ? registerError.message
          : '参加登録に失敗しました'
      )
    } finally {
      setRegisteringId(null)
    }
  }

  if (loading) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-gray-500">参加イベントを確認中...</p>
      </section>
    )
  }

  return (
    <section
      className={`rounded-2xl bg-white p-4 shadow-sm ${
        onboarding
          ? 'border-2 border-[#4cb9a7]'
          : 'border border-gray-200'
      }`}
    >
      <h2 className="font-bold text-gray-900">
        {onboarding ? '参加するイベントを確認' : '参加イベント'}
      </h2>
      <p className="mt-1 text-xs text-gray-500">
        参加するYourTIMEが「登録済み」になっていることを確認してください。
      </p>

      {error && (
        <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <p>{error}</p>
          {error.includes('LINEログイン') && (
            <Link
              href="/staff/liff-login"
              className="mt-3 inline-flex rounded-lg bg-red-600 px-4 py-2 font-bold text-white"
            >
              LINEでログインし直す
            </Link>
          )}
        </div>
      )}

      {events.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">
          現在、参加登録できるイベントはありません。
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="rounded-xl border border-gray-200 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">{event.name}</p>
                  <p className="mt-1 text-xs text-gray-600">
                    {formatEventDate(event.startDate, event.endDate)}
                  </p>
                  {event.venue && (
                    <p className="mt-1 text-xs text-gray-600">{event.venue}</p>
                  )}
                </div>
                {event.isRegistered ? (
                  <span className="whitespace-nowrap rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                    登録済み
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => registerForEvent(event.id)}
                    disabled={registeringId === event.id}
                    className="whitespace-nowrap rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold text-white disabled:bg-gray-300"
                  >
                    {registeringId === event.id ? '登録中...' : '参加登録'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {onboarding && events.some((event) => event.isRegistered) && (
        <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-center">
          <p className="text-sm font-bold text-emerald-800">
            参加登録できました！
          </p>
          <Link
            href="/staff/home"
            className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-[#00536d] px-4 py-3 text-sm font-bold text-white"
          >
            スタッフホームへ進む
          </Link>
        </div>
      )}
    </section>
  )
}
