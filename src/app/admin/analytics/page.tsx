'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { BarChart3, MapPin, RefreshCw, ShieldCheck } from 'lucide-react'
import { DistributionSections } from '@/components/admin/event-insights/DistributionSections'
import { EventPicker } from '@/components/admin/event-insights/EventPicker'
import { ItemDistributionPanel } from '@/components/admin/event-insights/ItemDistributionPanel'
import { Overview } from '@/components/admin/event-insights/Overview'
import { RecordsExplorer } from '@/components/admin/event-insights/RecordsExplorer'
import type { EventInsightsResponse } from '@/types/event-insights'

function isInsightsResponse(value: unknown): value is EventInsightsResponse {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<EventInsightsResponse>
  return Array.isArray(candidate.events)
    && Array.isArray(candidate.records)
    && typeof candidate.selectedEvent === 'object'
    && candidate.selectedEvent !== null
}

function errorMessage(value: unknown): string | null {
  if (typeof value !== 'object' || value === null || !('error' in value)) return null
  return typeof value.error === 'string' ? value.error : null
}

function formatEventDate(start: string | null, end: string | null): string {
  if (!start) return '開催日未設定'
  const formatter = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
  const startLabel = formatter.format(new Date(start))
  if (!end) return startLabel
  const endTime = new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' }).format(new Date(end))
  return `${startLabel}〜${endTime}`
}

export default function AnalyticsPage() {
  const [data, setData] = useState<EventInsightsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const requestSequence = useRef(0)

  const fetchInsights = useCallback(async (eventKey?: string) => {
    const sequence = ++requestSequence.current
    setLoading(true)
    setError(null)
    try {
      const query = eventKey ? `?event=${encodeURIComponent(eventKey)}` : ''
      const response = await fetch(`/api/admin/event-insights${query}`, { cache: 'no-store' })
      const payload: unknown = await response.json()
      if (!response.ok) throw new Error(errorMessage(payload) ?? 'データを取得できませんでした')
      if (!isInsightsResponse(payload)) throw new Error('受信したデータの形式が正しくありません')
      if (sequence !== requestSequence.current) return
      setData(payload)
      const url = new URL(window.location.href)
      url.searchParams.set('event', payload.selectedEvent.eventKey)
      window.history.replaceState(null, '', `${url.pathname}${url.search}`)
    } catch (caught) {
      if (sequence !== requestSequence.current) return
      setError(caught instanceof Error ? caught.message : 'データを取得できませんでした')
    } finally {
      if (sequence === requestSequence.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const eventKey = new URLSearchParams(window.location.search).get('event') ?? undefined
    void fetchInsights(eventKey)
  }, [fetchInsights])

  if (loading && !data) return <DashboardSkeleton />
  if (error && !data) {
    return (
      <div className="mx-auto max-w-xl border border-red-200 bg-red-50 p-6 text-center">
        <h1 className="text-lg font-black text-red-900">可視化データを読み込めませんでした</h1>
        <p className="mt-2 text-sm text-red-700">{error}</p>
        <button type="button" onClick={() => void fetchInsights()} className="mt-4 bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2">再試行</button>
      </div>
    )
  }
  if (!data) return null

  return (
    <div className="-mx-4 -mt-6 bg-slate-50 pb-16 sm:-mx-6 lg:-mx-8">
      <header className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-coral-300"><BarChart3 className="h-4 w-4" aria-hidden="true" />Event insights</div>
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">イベント診断ダッシュボード</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">イベントの全体像から、一人ひとりの問診・診断内容まで。必要なところだけ、すぐ掘り下げられます。</p>
            </div>
            <button type="button" disabled={loading} onClick={() => void fetchInsights(data.selectedEvent.eventKey)} className="flex w-fit items-center gap-2 border border-slate-600 px-3 py-2 text-sm font-bold text-white hover:border-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-coral-400 disabled:cursor-wait disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />最新データに更新</button>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-l-2 border-coral-500 pl-4 text-xs text-slate-300">
            <strong className="text-sm text-white">{data.selectedEvent.name}</strong>
            <span>{formatEventDate(data.selectedEvent.startDate, data.selectedEvent.endDate)}</span>
            {data.selectedEvent.venue && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{data.selectedEvent.venue}</span>}
            <span className="flex items-center gap-1 text-teal-300"><ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />テストデータ除外・管理者限定</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <EventPicker events={data.events} selectedEventKey={data.selectedEvent.eventKey} disabled={loading} onSelect={(eventKey) => void fetchInsights(eventKey)} />
        {error && <div role="alert" className="mt-4 border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">更新に失敗しました。現在表示中のデータを残しています：{error}</div>}

        <main className="space-y-12 pt-8">
          <Overview overview={data.overview} />
          <DistributionSections distributions={data.distributions} />

          <section aria-labelledby="answers-title">
            <div className="mb-4"><p className="text-xs font-bold uppercase tracking-widest text-coral-700">Responses</p><h2 id="answers-title" className="text-xl font-black text-slate-950">何を答え、どう診断された？</h2><p className="text-xs text-slate-500">問診と診断を混ぜず、それぞれの項目ごとに分布を確認できます。</p></div>
            <div className="grid gap-3 lg:grid-cols-2">
              <ItemDistributionPanel kind="questionnaire" items={data.questionnaireDistributions} />
              <ItemDistributionPanel kind="diagnosis" items={data.diagnosisDistributions} />
            </div>
          </section>

          <RecordsExplorer key={data.selectedEvent.eventKey} records={data.records} />
        </main>
        <p className="mt-10 text-right text-[11px] text-slate-400">最終取得 {new Date(data.generatedAt).toLocaleString('ja-JP')}</p>
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="イベントデータを読み込み中" className="-mx-4 -mt-6 animate-pulse sm:-mx-6 lg:-mx-8">
      <div className="h-52 bg-slate-900" />
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex gap-2 overflow-hidden">{[1, 2, 3].map((item) => <div key={item} className="h-24 min-w-56 bg-slate-200" />)}</div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-28 bg-slate-200" />)}</div>
        <div className="grid gap-3 lg:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-64 bg-slate-200" />)}</div>
      </div>
    </div>
  )
}
