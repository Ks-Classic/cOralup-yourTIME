'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  RefreshCw,
  Users,
  Clock,
  Activity,
  TrendingUp,
  BarChart3,
  MessageCircle,
  FileText,
  CheckCircle,
  Stethoscope,
  Brain,
  Target,
  Megaphone,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Filter,
  Zap,
  Award,
  Check,
  CalendarDays,
} from 'lucide-react'
import Link from 'next/link'
import {
  HorizontalBar,
  FunnelStep,
  StatCard,
  SectionHeader,
  ValueDistributionBar,
  pct,
  CARD,
} from './components'

// ============================================================
// Types
// ============================================================
interface EventSummary {
  id: string
  eventId: string
  name: string
  startDate: string | null
  venue: string | null
  status: string | null
  visitCount: number
}

interface ReportData {
  generatedAt: string
  period:
    | { mode: 'events'; eventIds: string[] }
    | { mode: 'range'; from: string; to: string }
  dataQuality: {
    totalVisitsIncludingTest: number
    totalVisits: number
    testDataExcluded: number
    includeTest: boolean
  }
  executiveSummary: {
    totalVisits: number
    avgAge: number
    sdAge: number
    avgAgeMonths: number
    maleCount: number
    femaleCount: number
    completionRate: number
    diagnosisVisitCount: number
    diagnosisCompletionRate: number
    lineDelivery: { total: number; success: number; failed: number }
    lineSuccessRate: number
    topFindings: Array<{
      item: string
      rate: number
      count: number
      total: number
    }>
    topCorrelations: Array<{ pair: string; phi: number; n: number }>
    aiGrades: Record<string, number>
  }
  basicStats: {
    ageDistribution: Record<string, number>
    genderDistribution: Record<string, number>
    hourlyDistribution: Record<string, number>
    funnel: Record<string, number>
  }
  clinicalEvidence: Array<{
    category: string
    items: Array<{
      question: string
      note: string | null
      answerType: string
      totalResponses: number
      valueCounts: Record<string, number>
      options: any
    }>
  }>
  ageGroupClinical: Record<string, Record<string, Record<string, number>>>
  correlationAnalysis: {
    matrix: Array<{
      item1: string
      item2: string
      phi: number
      n: number
      item1Rate: number
      item2Rate: number
    }>
    items: string[]
    sampleSizeWarning: string | null
  }
  ageBenchmarks: {
    rateByAge: Record<
      string,
      Record<string, { positive: number; total: number; rate: number }>
    >
    lipPressure: Record<
      string,
      { median: number | null; mean: number | null; count: number }
    >
    ageGroupLabels: string[]
  }
  marketingInsights: {
    parentConcerns: Array<{ word: string; count: number }>
    parentGoals: Array<{ word: string; count: number }>
    totalQuestionnaires: number
    aiGrades: Record<string, number>
  }
}

function formatEventDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

type TabKey =
  | 'summary'
  | 'basic'
  | 'clinical'
  | 'correlation'
  | 'benchmark'
  | 'marketing'

// ============================================================
// Main Page
// ============================================================
export default function AnalyticsReportPage() {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [events, setEvents] = useState<EventSummary[]>([])
  const [eventsError, setEventsError] = useState<string | null>(null)
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(
    new Set()
  )
  const [includeTest, setIncludeTest] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('summary')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  )

  useEffect(() => {
    fetch('/api/admin/analytics/events')
      .then((res) => {
        if (!res.ok) throw new Error(`API error: ${res.status}`)
        return res.json()
      })
      .then((body) => setEvents(body.events ?? []))
      .catch((err) =>
        setEventsError(err.message || 'イベント一覧の取得に失敗しました')
      )
  }, [])

  const toggleEvent = (id: string) => {
    setSelectedEventIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ includeTest: String(includeTest) })
      if (selectedEventIds.size > 0) {
        params.set('eventIds', Array.from(selectedEventIds).join(','))
      }
      const res = await fetch(`/api/admin/analytics/report?${params}`)
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody.error || `API error: ${res.status}`)
      }
      setData(await res.json())
    } catch (err: any) {
      setError(err.message || 'データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [selectedEventIds, includeTest])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  const tabs: Array<{
    key: TabKey
    label: string
    icon: React.ReactNode
    badge?: string
  }> = [
    { key: 'summary', label: 'サマリー', icon: <Award className="h-4 w-4" /> },
    { key: 'basic', label: '基礎集計', icon: <Users className="h-4 w-4" /> },
    {
      key: 'clinical',
      label: '臨床エビデンス',
      icon: <Stethoscope className="h-4 w-4" />,
      badge: '学会',
    },
    {
      key: 'correlation',
      label: '相関分析',
      icon: <Brain className="h-4 w-4" />,
      badge: '独自性',
    },
    {
      key: 'benchmark',
      label: 'ベンチマーク',
      icon: <Target className="h-4 w-4" />,
    },
    {
      key: 'marketing',
      label: 'マーケインサイト',
      icon: <Megaphone className="h-4 w-4" />,
    },
  ]

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-coral-100 bg-gradient-to-br from-coral-50 via-white to-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_16px_40px_-20px_rgba(224,62,62,0.35)]">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-coral-200/30 blur-3xl" />
        <div className="relative flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/analytics"
              className="text-slate-400 transition-colors hover:text-coral-600"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-coral-400 to-coral-600 text-white shadow-md shadow-coral-500/25">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="bg-gradient-to-r from-coral-600 to-coral-800 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
                cOralup エビデンスレポート
              </h1>
              <p className="mt-0.5 text-xs text-slate-500">
                小児口腔育成×姿勢診断 — 世界水準の包括的分析
              </p>
            </div>
          </div>

          {/* Event Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-xs font-medium text-slate-500">
              <CalendarDays className="h-3.5 w-3.5" /> 対象イベント
            </span>
            <button
              onClick={() => setSelectedEventIds(new Set())}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                selectedEventIds.size === 0
                  ? 'bg-gradient-to-r from-coral-500 to-coral-600 text-white shadow-sm shadow-coral-500/25'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-coral-200 hover:bg-coral-50/60 hover:text-coral-700'
              }`}
            >
              すべて
            </button>
            {events.map((ev) => {
              const isSelected = selectedEventIds.has(ev.id)
              return (
                <button
                  key={ev.id}
                  onClick={() => toggleEvent(ev.id)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-gradient-to-r from-coral-500 to-coral-600 text-white shadow-sm shadow-coral-500/25'
                      : 'border border-slate-200 bg-white text-slate-600 hover:border-coral-200 hover:bg-coral-50/60 hover:text-coral-700'
                  }`}
                  title={ev.venue ?? undefined}
                >
                  {isSelected && <Check className="h-3 w-3" />}
                  {formatEventDate(ev.startDate)} {ev.name}
                  <span
                    className={
                      isSelected ? 'text-white/70' : 'text-slate-400'
                    }
                  >
                    ({ev.visitCount})
                  </span>
                </button>
              )
            })}
            {eventsError && (
              <span className="text-xs text-red-500">{eventsError}</span>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm">
              <input
                type="checkbox"
                checked={includeTest}
                onChange={(e) => setIncludeTest(e.target.checked)}
                className="rounded border-slate-300 text-coral-500 focus:ring-coral-400"
              />
              テストデータ含む
            </label>
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-coral-500 to-coral-600 px-4 py-2 text-sm font-medium text-white shadow-md shadow-coral-500/25 transition-all hover:-translate-y-0.5 hover:from-coral-600 hover:to-coral-700 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
              />
              {loading ? '取得中...' : 'レポート生成'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <strong>エラー:</strong> {error}
          <button onClick={fetchData} className="ml-3 underline">
            再試行
          </button>
        </div>
      )}

      {loading && !data && (
        <div className="flex flex-col items-center justify-center gap-3 py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-coral-500" />
          <span className="animate-pulse text-sm text-slate-500">
            DBからデータを取得中...
          </span>
        </div>
      )}

      {data && (
        <>
          {/* Data quality bar */}
          <div className="flex items-center gap-4 rounded-lg border border-slate-100 bg-white px-4 py-2 text-xs text-slate-500">
            <span>
              生成: {new Date(data.generatedAt).toLocaleString('ja-JP')}
            </span>
            <span>|</span>
            <span>
              対象:{' '}
              <strong className="text-slate-700">
                {data.dataQuality.totalVisits}
              </strong>
              件
            </span>
            <span>
              {data.period.mode === 'events'
                ? `イベント${data.period.eventIds.length}件`
                : '全期間'}
            </span>
            {data.dataQuality.testDataExcluded > 0 && (
              <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] text-amber-600">
                テスト{data.dataQuality.testDataExcluded}件除外
              </span>
            )}
            <span className="flex items-center gap-1 text-coral-600">
              <Zap className="h-3 w-3" /> DB直結リアルタイム
            </span>
          </div>

          {/* Tab navigation */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-gradient-to-r from-coral-500 to-coral-600 text-white shadow-md shadow-coral-500/25'
                    : 'border border-slate-200 bg-white text-slate-600 hover:border-coral-200 hover:bg-coral-50/60 hover:text-coral-700'
                }`}
              >
                {tab.icon} {tab.label}
                {tab.badge && (
                  <span
                    className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                      activeTab === tab.key
                        ? 'bg-white/20 text-white'
                        : 'bg-red-50 text-red-600'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ============ Tab Content ============ */}

          {/* Part 0: Executive Summary */}
          {activeTab === 'summary' && (
            <section className="space-y-6">
              <SectionHeader
                icon={<Award className="h-4 w-4" />}
                title="Executive Summary"
                subtitle="全ステークホルダー向けサマリー"
              />

              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <StatCard
                  label="総来場者数"
                  value={data.executiveSummary.totalVisits}
                  unit="人"
                  accent="bg-coral-400"
                />
                <StatCard
                  label="平均年齢"
                  value={`${data.executiveSummary.avgAge}±${data.executiveSummary.sdAge}`}
                  unit="歳"
                  color="text-blue-600"
                  accent="bg-blue-400"
                />
                <StatCard
                  label="診断完了率"
                  value={`${data.executiveSummary.diagnosisCompletionRate}%`}
                  subText={`${data.executiveSummary.diagnosisVisitCount}人完了`}
                  color="text-emerald-600"
                  accent="bg-emerald-400"
                />
                <StatCard
                  label="完走率(LINE送信)"
                  value={`${data.executiveSummary.completionRate}%`}
                  color={
                    data.executiveSummary.completionRate >= 70
                      ? 'text-emerald-600'
                      : 'text-amber-600'
                  }
                  accent={
                    data.executiveSummary.completionRate >= 70
                      ? 'bg-emerald-400'
                      : 'bg-amber-400'
                  }
                />
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Top Findings */}
                <div className={`${CARD} p-5`}>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700">
                    <Stethoscope className="h-4 w-4 text-red-500" /> 主要所見
                    Top 5
                  </h3>
                  <div className="space-y-2">
                    {data.executiveSummary.topFindings.map((f, i) => (
                      <HorizontalBar
                        key={i}
                        label={f.item}
                        value={f.rate}
                        maxValue={100}
                        color={
                          f.rate > 50
                            ? 'bg-red-400'
                            : f.rate > 30
                              ? 'bg-amber-400'
                              : 'bg-blue-400'
                        }
                        suffix={`% (${f.count}/${f.total})`}
                      />
                    ))}
                    {data.executiveSummary.topFindings.length === 0 && (
                      <p className="text-xs text-slate-400">
                        診断データがありません
                      </p>
                    )}
                  </div>
                </div>

                {/* Top Correlations */}
                <div className={`${CARD} p-5`}>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700">
                    <Brain className="h-4 w-4 text-purple-500" /> 注目相関 Top 3
                  </h3>
                  <div className="space-y-3">
                    {data.executiveSummary.topCorrelations.map((c, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-lg bg-slate-50 p-3"
                      >
                        <span className="text-xs font-medium text-slate-700">
                          {c.pair}
                        </span>
                        <div className="text-right">
                          <span
                            className={`text-sm font-bold ${Math.abs(c.phi) >= 0.3 ? 'text-red-600' : 'text-amber-600'}`}
                          >
                            φ = {c.phi.toFixed(3)}
                          </span>
                          <span className="block text-[10px] text-slate-400">
                            n={c.n}
                          </span>
                        </div>
                      </div>
                    ))}
                    {data.executiveSummary.topCorrelations.length === 0 && (
                      <p className="text-xs text-slate-400">
                        相関データがありません
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* AI Grades */}
              <div className={`${CARD} p-5`}>
                <h3 className="mb-3 text-sm font-bold text-slate-700">
                  AI分析 総合評価分布
                </h3>
                <div className="grid grid-cols-4 gap-4">
                  {Object.entries(data.executiveSummary.aiGrades).map(
                    ([grade, count]) => (
                      <div key={grade} className="text-center">
                        <div
                          className={`text-2xl font-bold ${
                            grade === 'A'
                              ? 'text-emerald-600'
                              : grade === 'B'
                                ? 'text-amber-500'
                                : grade === 'C'
                                  ? 'text-red-500'
                                  : 'text-slate-400'
                          }`}
                        >
                          {count}
                        </div>
                        <div className="text-xs text-slate-500">
                          {grade}評価
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Part 1: Basic Stats */}
          {activeTab === 'basic' && (
            <section className="space-y-6">
              <SectionHeader
                icon={<Users className="h-4 w-4" />}
                title="基礎集計"
                subtitle="Descriptive Statistics"
              />

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className={`${CARD} p-5`}>
                  <h3 className="mb-3 text-sm font-bold text-slate-700">
                    年齢分布（発達段階）
                  </h3>
                  <div className="space-y-1.5">
                    {Object.entries(data.basicStats.ageDistribution)
                      .filter(([, c]) => c > 0)
                      .map(([age, count]) => (
                        <HorizontalBar
                          key={age}
                          label={age.split(' ')[0]}
                          value={count}
                          maxValue={Math.max(
                            ...Object.values(data.basicStats.ageDistribution)
                          )}
                          color="bg-purple-400"
                          suffix="人"
                          subLabel={
                            age.includes('(')
                              ? age.split('(')[1]?.replace(')', '')
                              : undefined
                          }
                        />
                      ))}
                  </div>
                </div>

                <div className={`${CARD} p-5`}>
                  <h3 className="mb-3 text-sm font-bold text-slate-700">
                    性別分布
                  </h3>
                  <div className="space-y-1.5">
                    {Object.entries(data.basicStats.genderDistribution)
                      .filter(([, c]) => c > 0)
                      .map(([g, count]) => (
                        <HorizontalBar
                          key={g}
                          label={g}
                          value={count}
                          maxValue={Math.max(
                            ...Object.values(data.basicStats.genderDistribution)
                          )}
                          color={
                            g === '男'
                              ? 'bg-blue-400'
                              : g === '女'
                                ? 'bg-pink-400'
                                : 'bg-slate-400'
                          }
                          suffix="人"
                        />
                      ))}
                  </div>
                </div>
              </div>

              <div className={`${CARD} p-5`}>
                <h3 className="mb-3 text-sm font-bold text-slate-700">
                  フロー完走率（ファネル）
                </h3>
                <div className="space-y-2">
                  {[
                    [
                      'LINE登録',
                      'lineRegistered',
                      <MessageCircle className="h-4 w-4" key="mc" />,
                    ],
                    [
                      '問診開始',
                      'questionnaireStarted',
                      <FileText className="h-4 w-4" key="ft" />,
                    ],
                    [
                      '問診完了',
                      'questionnaireCompleted',
                      <CheckCircle className="h-4 w-4" key="cc" />,
                    ],
                    [
                      '診断開始',
                      'diagnosisStarted',
                      <Activity className="h-4 w-4" key="ac" />,
                    ],
                    [
                      '分析完了',
                      'analysisCompleted',
                      <TrendingUp className="h-4 w-4" key="tu" />,
                    ],
                    [
                      'LINE送信',
                      'lineSent',
                      <MessageCircle className="h-4 w-4" key="mc2" />,
                    ],
                  ].map(([label, key, icon], i, arr) => (
                    <FunnelStep
                      key={key as string}
                      label={label as string}
                      count={data.basicStats.funnel[key as string] || 0}
                      total={data.basicStats.funnel.lineRegistered || 1}
                      isLast={i === arr.length - 1}
                      icon={icon}
                    />
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Part 2: Clinical Evidence */}
          {activeTab === 'clinical' && (
            <section className="space-y-4">
              <SectionHeader
                icon={<Stethoscope className="h-4 w-4" />}
                title="臨床エビデンス分析"
                subtitle="Clinical Evidence — 診断項目別有所見率"
                badge="学会核心"
              />

              {data.clinicalEvidence.length === 0 && (
                <p className="rounded-xl border bg-white p-6 text-sm text-slate-500">
                  診断データがありません。
                </p>
              )}

              {data.clinicalEvidence.map((cat) => (
                <div key={cat.category} className={`${CARD} overflow-hidden`}>
                  <button
                    onClick={() => toggleCategory(cat.category)}
                    className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-800">
                        {cat.category}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                        {cat.items.length}項目
                      </span>
                    </div>
                    {expandedCategories.has(cat.category) ? (
                      <ChevronUp className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    )}
                  </button>

                  {expandedCategories.has(cat.category) && (
                    <div className="space-y-4 border-t border-slate-100 p-4">
                      {cat.items.map((item) => (
                        <div key={item.question} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-700">
                              {item.question}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              n={item.totalResponses}
                            </span>
                          </div>
                          <ValueDistributionBar
                            valueCounts={item.valueCounts}
                            options={item.options}
                            totalResponses={item.totalResponses}
                          />
                          {item.note && (
                            <p className="text-[10px] text-amber-600">
                              ※ {item.note}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </section>
          )}

          {/* Part 3: Correlation Analysis */}
          {activeTab === 'correlation' && (
            <section className="space-y-6">
              <SectionHeader
                icon={<Brain className="h-4 w-4" />}
                title="多変量相関分析"
                subtitle="Cross-Correlation Analysis — φ係数"
                badge="cOralup独自性"
              />

              {data.correlationAnalysis.sampleSizeWarning && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                  {data.correlationAnalysis.sampleSizeWarning}
                </div>
              )}

              <div className={`${CARD} p-5`}>
                <h3 className="mb-3 text-sm font-bold text-slate-700">
                  相関ペア（|φ|順）
                </h3>
                <div className="max-h-[600px] space-y-2 overflow-y-auto">
                  {data.correlationAnalysis.matrix.slice(0, 30).map((c, i) => {
                    const absP = Math.abs(c.phi)
                    const barColor =
                      absP >= 0.5
                        ? 'bg-red-500'
                        : absP >= 0.3
                          ? 'bg-orange-400'
                          : absP >= 0.2
                            ? 'bg-amber-400'
                            : 'bg-blue-300'
                    return (
                      <div key={i} className="group flex items-center gap-3">
                        <span className="w-6 text-right text-[10px] text-slate-400">
                          {i + 1}
                        </span>
                        <span className="w-40 truncate text-xs font-medium text-slate-700">
                          {c.item1}
                        </span>
                        <span className="text-[10px] text-slate-400">×</span>
                        <span className="w-40 truncate text-xs font-medium text-slate-700">
                          {c.item2}
                        </span>
                        <div className="relative h-5 flex-1 overflow-hidden rounded bg-slate-50">
                          <div
                            className={`h-full ${barColor} rounded transition-all duration-700`}
                            style={{ width: `${Math.abs(c.phi) * 100}%` }}
                          />
                        </div>
                        <span
                          className={`w-14 text-right text-xs font-bold ${absP >= 0.3 ? 'text-red-600' : 'text-slate-600'}`}
                        >
                          {c.phi.toFixed(3)}
                        </span>
                        <span className="w-10 text-[10px] text-slate-400">
                          n={c.n}
                        </span>
                      </div>
                    )
                  })}
                  {data.correlationAnalysis.matrix.length === 0 && (
                    <p className="text-xs text-slate-400">
                      相関を計算するのに十分なデータがありません
                    </p>
                  )}
                </div>
                <div className="mt-4 flex gap-3 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="h-3 w-3 rounded bg-red-500" /> |φ|≥0.5 強い
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-3 w-3 rounded bg-orange-400" /> |φ|≥0.3
                    中程度
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-3 w-3 rounded bg-amber-400" /> |φ|≥0.2
                    弱い
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-3 w-3 rounded bg-blue-300" /> |φ|&lt;0.2
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* Part 4: Age Benchmarks */}
          {activeTab === 'benchmark' && (
            <section className="space-y-6">
              <SectionHeader
                icon={<Target className="h-4 w-4" />}
                title="年齢発達ベンチマーク"
                subtitle="Age-Specific Benchmarks"
              />

              <div className={`${CARD} overflow-x-auto p-5`}>
                <h3 className="mb-3 text-sm font-bold text-slate-700">
                  年齢別達成率テーブル
                </h3>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="px-2 py-2 text-left font-medium text-slate-500">
                        指標
                      </th>
                      {data.ageBenchmarks.ageGroupLabels.map((ag) => (
                        <th
                          key={ag}
                          className="px-3 py-2 text-center font-medium text-slate-500"
                        >
                          {ag}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Collect all benchmark labels */}
                    {(() => {
                      const allLabels = new Set<string>()
                      Object.values(data.ageBenchmarks.rateByAge).forEach(
                        (ageData) => {
                          Object.keys(ageData).forEach((label) =>
                            allLabels.add(label)
                          )
                        }
                      )
                      return Array.from(allLabels).map((label) => (
                        <tr
                          key={label}
                          className="border-b border-slate-50 hover:bg-slate-50"
                        >
                          <td className="px-2 py-2 font-medium text-slate-700">
                            {label}
                          </td>
                          {data.ageBenchmarks.ageGroupLabels.map((ag) => {
                            const entry =
                              data.ageBenchmarks.rateByAge[ag]?.[label]
                            if (!entry || entry.total === 0)
                              return (
                                <td
                                  key={ag}
                                  className="px-3 py-2 text-center text-slate-300"
                                >
                                  -
                                </td>
                              )
                            const color =
                              entry.rate >= 80
                                ? 'text-emerald-600'
                                : entry.rate >= 50
                                  ? 'text-amber-600'
                                  : 'text-red-600'
                            return (
                              <td
                                key={ag}
                                className={`px-3 py-2 text-center font-bold ${color}`}
                              >
                                {entry.rate}%
                                <span className="block text-[9px] font-normal text-slate-400">
                                  ({entry.positive}/{entry.total})
                                </span>
                              </td>
                            )
                          })}
                        </tr>
                      ))
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Lip Pressure */}
              <div className={`${CARD} p-5`}>
                <h3 className="mb-3 text-sm font-bold text-slate-700">
                  口唇圧 年齢別統計
                </h3>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                  {data.ageBenchmarks.ageGroupLabels.map((ag) => {
                    const lp = data.ageBenchmarks.lipPressure[ag]
                    return (
                      <div
                        key={ag}
                        className="rounded-lg bg-slate-50 p-3 text-center"
                      >
                        <div className="mb-1 text-xs text-slate-500">{ag}</div>
                        <div className="text-xl font-bold text-blue-600">
                          {lp?.median != null ? `${lp.median}` : '-'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          中央値 kg (n={lp?.count || 0})
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </section>
          )}

          {/* Part 5: Marketing Insights */}
          {activeTab === 'marketing' && (
            <section className="space-y-6">
              <SectionHeader
                icon={<Megaphone className="h-4 w-4" />}
                title="マーケティングインサイト"
                subtitle="Marketing Intelligence"
              />

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className={`${CARD} p-5`}>
                  <h3 className="mb-3 text-sm font-bold text-slate-700">
                    保護者の関心事キーワード
                  </h3>
                  {data.marketingInsights.parentConcerns.length > 0 ? (
                    <div className="space-y-1.5">
                      {data.marketingInsights.parentConcerns
                        .slice(0, 15)
                        .map((c) => (
                          <HorizontalBar
                            key={c.word}
                            label={c.word}
                            value={c.count}
                            maxValue={
                              data.marketingInsights.parentConcerns[0]?.count ||
                              1
                            }
                            color="bg-pink-400"
                            suffix="件"
                          />
                        ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">
                      問診データがありません
                    </p>
                  )}
                </div>

                <div className={`${CARD} p-5`}>
                  <h3 className="mb-3 text-sm font-bold text-slate-700">
                    保護者の目標キーワード
                  </h3>
                  {data.marketingInsights.parentGoals.length > 0 ? (
                    <div className="space-y-1.5">
                      {data.marketingInsights.parentGoals
                        .slice(0, 15)
                        .map((c) => (
                          <HorizontalBar
                            key={c.word}
                            label={c.word}
                            value={c.count}
                            maxValue={
                              data.marketingInsights.parentGoals[0]?.count || 1
                            }
                            color="bg-teal-400"
                            suffix="件"
                          />
                        ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">
                      問診データがありません
                    </p>
                  )}
                </div>
              </div>

              <div className={`${CARD} p-5`}>
                <h3 className="mb-2 text-sm font-bold text-slate-700">
                  データベース概要
                </h3>
                <p className="text-xs text-slate-500">
                  問診データ: {data.marketingInsights.totalQuestionnaires}件
                </p>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
