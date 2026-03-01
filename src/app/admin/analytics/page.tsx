'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    RefreshCw, TrendingUp, Users, Clock, Activity,
    CheckCircle, XCircle, AlertTriangle, ArrowRight,
    BarChart3, MessageCircle, FileText, ChevronDown
} from 'lucide-react'

// ============================================================
// Types
// ============================================================
interface AnalyticsData {
    period: { from: string; to: string }
    overview: {
        totalVisits: number
        totalVisitsIncludingTest: number
        testDataCount: number
    }
    hourlyDistribution: Record<string, number>
    ageDistribution: Record<string, number>
    dailyVisits: Record<string, number>
    funnel: {
        lineRegistered: number
        questionnaireStarted: number
        questionnaireCompleted: number
        diagnosisStarted: number
        photosUploaded: number
        analysisCompleted: number
        reportGenerated: number
        lineSent: number
        lineConfirmed: number
    }
    statusDistribution: Record<string, number>
    lineDelivery: {
        total: number
        success: number
        failed: number
        byType: Record<string, { success: number; failed: number }>
    }
    failedLineLogs: Array<{
        id: string
        visitId: string | null
        lineUserId: string | null
        messageType: string
        errorMessage: string | null
        createdAt: string | null
    }>
    reportSummary: {
        total: number
        draft: number
        completed: number
        sent: number
        sentToLine: number
    }
    diagnosisSummary: {
        visitsWithDiagnosis: number
        diagnosisCompletionRate: number
    }
    generatedAt: string
}

// ============================================================
// Utility
// ============================================================
function formatDateForInput(date: Date): string {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

function pct(num: number, denom: number): string {
    if (denom === 0) return '0'
    return Math.round((num / denom) * 100).toString()
}

// ============================================================
// Simple Bar Chart Component
// ============================================================
function HorizontalBar({ label, value, maxValue, color = 'bg-emerald-500', suffix = '' }: {
    label: string
    value: number
    maxValue: number
    color?: string
    suffix?: string
}) {
    const width = maxValue > 0 ? Math.max((value / maxValue) * 100, 2) : 0
    return (
        <div className="flex items-center gap-3 group">
            <span className="text-xs text-slate-500 w-16 text-right shrink-0">{label}</span>
            <div className="flex-1 h-6 bg-slate-50 rounded-md overflow-hidden relative">
                <div
                    className={`h-full ${color} rounded-md transition-all duration-700 ease-out`}
                    style={{ width: `${width}%` }}
                />
                <span className="absolute inset-0 flex items-center px-2 text-xs font-medium text-slate-700">
                    {value}{suffix}
                </span>
            </div>
        </div>
    )
}

// ============================================================
// Funnel Step Component
// ============================================================
function FunnelStep({ label, count, total, isLast, icon }: {
    label: string
    count: number
    total: number
    isLast?: boolean
    icon: React.ReactNode
}) {
    const rate = pct(count, total)
    const barWidth = total > 0 ? Math.max((count / total) * 100, 3) : 0
    const isGood = Number(rate) >= 70
    const isWarning = Number(rate) >= 30 && Number(rate) < 70
    const barColor = isGood ? 'bg-emerald-500' : isWarning ? 'bg-amber-400' : 'bg-red-400'

    return (
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 w-36 shrink-0">
                <span className="w-5 h-5 flex items-center justify-center text-slate-400">{icon}</span>
                <span className="text-xs text-slate-600 font-medium truncate">{label}</span>
            </div>
            <div className="flex-1 h-7 bg-slate-50 rounded-md overflow-hidden relative">
                <div
                    className={`h-full ${barColor} rounded-md transition-all duration-700 ease-out`}
                    style={{ width: `${barWidth}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-between px-3 text-xs font-bold">
                    <span className="text-slate-700">{count}人</span>
                    <span className={`${isGood ? 'text-emerald-700' : isWarning ? 'text-amber-700' : 'text-red-700'}`}>
                        {rate}%
                    </span>
                </span>
            </div>
            {!isLast && (
                <ArrowRight className="w-3 h-3 text-slate-300 shrink-0" />
            )}
        </div>
    )
}

// ============================================================
// Main Component
// ============================================================
export default function AnalyticsPage() {
    const [data, setData] = useState<AnalyticsData | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [fromDate, setFromDate] = useState(() => {
        // デフォルト: 30日前
        const d = new Date()
        d.setDate(d.getDate() - 30)
        return formatDateForInput(d)
    })
    const [toDate, setToDate] = useState(() => formatDateForInput(new Date()))
    const [showFailedLogs, setShowFailedLogs] = useState(false)

    const fetchData = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(`/api/admin/analytics?from=${fromDate}&to=${toDate}`)
            if (!res.ok) {
                const errBody = await res.json().catch(() => ({}))
                throw new Error(errBody.error || `API error: ${res.status}`)
            }
            const json: AnalyticsData = await res.json()
            setData(json)
        } catch (err: any) {
            console.error('Analytics fetch error:', err)
            setError(err.message || 'データの取得に失敗しました')
        } finally {
            setLoading(false)
        }
    }, [fromDate, toDate])

    useEffect(() => {
        fetchData()
    }, []) // 初回のみ自動取得

    if (error) {
        return (
            <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <h3 className="font-bold text-lg mb-2">データの読み込みエラー</h3>
                <p className="text-sm mb-3">{error}</p>
                <button
                    onClick={fetchData}
                    className="px-4 py-2 bg-red-100 hover:bg-red-200 rounded-lg text-sm font-medium transition-colors"
                >
                    再試行
                </button>
            </div>
        )
    }

    const statusLabels: Record<string, string> = {
        'active': '受付済',
        'in_progress': '進行中',
        'diagnosis_started': '診断開始',
        'questionnaire_done': '問診完了',
        'analysis_done': '分析完了',
        'completed': '完了',
        'published': '送信済',
        'line_sent': 'LINE送信済',
        'line_confirmed': 'LINE確認済',
        'cancelled': 'キャンセル',
    }

    return (
        <div className="space-y-6 pb-12">
            {/* ヘッダー */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <BarChart3 className="w-6 h-6 text-emerald-600" />
                        分析レポート
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">来場傾向・フロー完了率・LINE配信状況</p>
                </div>

                {/* 日付フィルター */}
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm">
                    <input
                        type="date"
                        value={fromDate}
                        onChange={e => setFromDate(e.target.value)}
                        className="text-sm border-none outline-none bg-transparent text-slate-700"
                    />
                    <span className="text-slate-400 text-xs">〜</span>
                    <input
                        type="date"
                        value={toDate}
                        onChange={e => setToDate(e.target.value)}
                        className="text-sm border-none outline-none bg-transparent text-slate-700"
                    />
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="ml-2 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        更新
                    </button>
                </div>
            </div>

            {/* ローディング */}
            {loading && !data && (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
                </div>
            )}

            {data && (
                <>
                    {/* 生成日時 */}
                    <div className="text-xs text-slate-400 text-right">
                        レポート生成: {new Date(data.generatedAt).toLocaleString('ja-JP')}
                        {data.overview.testDataCount > 0 && (
                            <span className="ml-2 px-2 py-0.5 bg-amber-50 text-amber-600 rounded">
                                テストデータ {data.overview.testDataCount}件除外
                            </span>
                        )}
                    </div>

                    {/* ========== セクション1: 来場概況 ========== */}
                    <section>
                        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-500" />
                            来場概況
                        </h2>

                        {/* サマリーカード */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                                <div className="text-xs text-slate-500 mb-1">総来場者数</div>
                                <div className="text-3xl font-bold text-slate-800">{data.overview.totalVisits}</div>
                                <div className="text-xs text-slate-400 mt-1">人</div>
                            </div>
                            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                                <div className="text-xs text-slate-500 mb-1">平均年齢</div>
                                <div className="text-3xl font-bold text-blue-600">
                                    {(() => {
                                        // ageDistributionから推定平均年齢を計算
                                        const ageMap: Record<string, number> = {
                                            '0-1歳': 1, '2-3歳': 3, '4-5歳': 5,
                                            '6-7歳': 7, '8-9歳': 9, '10歳以上': 11,
                                        }
                                        let totalAge = 0, totalCount = 0
                                        Object.entries(data.ageDistribution).forEach(([key, count]) => {
                                            if (key !== '不明' && ageMap[key]) {
                                                totalAge += ageMap[key] * count
                                                totalCount += count
                                            }
                                        })
                                        return totalCount > 0 ? (totalAge / totalCount).toFixed(1) : '-'
                                    })()}
                                </div>
                                <div className="text-xs text-slate-400 mt-1">歳</div>
                            </div>
                            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                                <div className="text-xs text-slate-500 mb-1">診断完了率</div>
                                <div className="text-3xl font-bold text-emerald-600">
                                    {data.diagnosisSummary.diagnosisCompletionRate}%
                                </div>
                                <div className="text-xs text-slate-400 mt-1">{data.diagnosisSummary.visitsWithDiagnosis}人完了</div>
                            </div>
                            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                                <div className="text-xs text-slate-500 mb-1">LINE配信成功率</div>
                                <div className={`text-3xl font-bold ${data.lineDelivery.total > 0 && Number(pct(data.lineDelivery.success, data.lineDelivery.total)) < 80 ? 'text-red-600' : 'text-emerald-600'}`}>
                                    {data.lineDelivery.total > 0 ? pct(data.lineDelivery.success, data.lineDelivery.total) : '-'}%
                                </div>
                                <div className="text-xs text-slate-400 mt-1">
                                    {data.lineDelivery.success}/{data.lineDelivery.total}件
                                </div>
                            </div>
                        </div>

                        {/* 時間帯別・年齢分布 */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* 時間帯別 */}
                            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                                <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-slate-400" />
                                    時間帯別来場者数
                                </h3>
                                <div className="space-y-1.5">
                                    {Object.entries(data.hourlyDistribution)
                                        .sort(([a], [b]) => Number(a) - Number(b))
                                        .filter(([_, count]) => count > 0 || Number(_) >= 9 && Number(_) <= 17)
                                        .map(([hour, count]) => (
                                            <HorizontalBar
                                                key={hour}
                                                label={`${hour}時`}
                                                value={count}
                                                maxValue={Math.max(...Object.values(data.hourlyDistribution))}
                                                color="bg-blue-400"
                                                suffix="人"
                                            />
                                        ))}
                                </div>
                            </div>

                            {/* 年齢分布 */}
                            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                                <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                                    <Users className="w-4 h-4 text-slate-400" />
                                    年齢分布
                                </h3>
                                <div className="space-y-1.5">
                                    {Object.entries(data.ageDistribution)
                                        .filter(([_, count]) => count > 0)
                                        .map(([age, count]) => (
                                            <HorizontalBar
                                                key={age}
                                                label={age}
                                                value={count}
                                                maxValue={Math.max(...Object.values(data.ageDistribution))}
                                                color="bg-purple-400"
                                                suffix="人"
                                            />
                                        ))}
                                </div>
                            </div>
                        </div>

                        {/* 日別トレンド */}
                        {Object.keys(data.dailyVisits).length > 1 && (
                            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 mt-6">
                                <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-slate-400" />
                                    日別来場者数
                                </h3>
                                <div className="space-y-1.5">
                                    {Object.entries(data.dailyVisits)
                                        .sort(([a], [b]) => a.localeCompare(b))
                                        .map(([day, count]) => (
                                            <HorizontalBar
                                                key={day}
                                                label={day.slice(5)} // MM-DD
                                                value={count}
                                                maxValue={Math.max(...Object.values(data.dailyVisits))}
                                                color="bg-emerald-400"
                                                suffix="人"
                                            />
                                        ))}
                                </div>
                            </div>
                        )}
                    </section>

                    {/* ========== セクション2: フロー完了率（ファネル） ========== */}
                    <section>
                        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-amber-500" />
                            フロー完了率（ファネル）
                        </h2>

                        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                            <p className="text-xs text-slate-500 mb-4">
                                問診から診断、レポート送信までの各ステップの完了状況。パーセンテージはLINE登録者数に対する比率です。
                            </p>
                            <div className="space-y-2">
                                <FunnelStep
                                    label="LINE登録"
                                    count={data.funnel.lineRegistered}
                                    total={data.funnel.lineRegistered}
                                    icon={<MessageCircle className="w-4 h-4" />}
                                />
                                <FunnelStep
                                    label="問診開始"
                                    count={data.funnel.questionnaireStarted}
                                    total={data.funnel.lineRegistered}
                                    icon={<FileText className="w-4 h-4" />}
                                />
                                <FunnelStep
                                    label="問診完了"
                                    count={data.funnel.questionnaireCompleted}
                                    total={data.funnel.lineRegistered}
                                    icon={<CheckCircle className="w-4 h-4" />}
                                />
                                <FunnelStep
                                    label="診断開始"
                                    count={data.funnel.diagnosisStarted}
                                    total={data.funnel.lineRegistered}
                                    icon={<Activity className="w-4 h-4" />}
                                />
                                <FunnelStep
                                    label="写真UP"
                                    count={data.funnel.photosUploaded}
                                    total={data.funnel.lineRegistered}
                                    icon={<Activity className="w-4 h-4" />}
                                />
                                <FunnelStep
                                    label="分析完了"
                                    count={data.funnel.analysisCompleted}
                                    total={data.funnel.lineRegistered}
                                    icon={<TrendingUp className="w-4 h-4" />}
                                />
                                <FunnelStep
                                    label="LINE送信"
                                    count={data.funnel.lineSent}
                                    total={data.funnel.lineRegistered}
                                    icon={<MessageCircle className="w-4 h-4" />}
                                />
                                <FunnelStep
                                    label="確認済"
                                    count={data.funnel.lineConfirmed}
                                    total={data.funnel.lineRegistered}
                                    isLast
                                    icon={<CheckCircle className="w-4 h-4" />}
                                />
                            </div>
                        </div>

                        {/* ステータス分布 */}
                        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 mt-4">
                            <h3 className="text-sm font-bold text-slate-700 mb-3">ステータス分布</h3>
                            <div className="space-y-1.5">
                                {Object.entries(data.statusDistribution)
                                    .sort(([, a], [, b]) => b - a)
                                    .map(([status, count]) => (
                                        <HorizontalBar
                                            key={status}
                                            label={statusLabels[status] || status}
                                            value={count}
                                            maxValue={Math.max(...Object.values(data.statusDistribution))}
                                            color="bg-slate-400"
                                            suffix="件"
                                        />
                                    ))}
                            </div>
                        </div>
                    </section>

                    {/* ========== セクション3: LINE配信状況 ========== */}
                    <section>
                        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <MessageCircle className="w-5 h-5 text-green-500" />
                            LINE配信状況
                        </h2>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* 配信サマリー */}
                            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                                <h3 className="text-sm font-bold text-slate-700 mb-4">配信結果</h3>
                                <div className="grid grid-cols-3 gap-4 mb-4">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-slate-700">{data.lineDelivery.total}</div>
                                        <div className="text-xs text-slate-500">送信総数</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-emerald-600">{data.lineDelivery.success}</div>
                                        <div className="text-xs text-emerald-600 flex items-center justify-center gap-1">
                                            <CheckCircle className="w-3 h-3" /> 成功
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <div className={`text-2xl font-bold ${data.lineDelivery.failed > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                                            {data.lineDelivery.failed}
                                        </div>
                                        <div className={`text-xs flex items-center justify-center gap-1 ${data.lineDelivery.failed > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                                            <XCircle className="w-3 h-3" /> 失敗
                                        </div>
                                    </div>
                                </div>

                                {/* 成功率バー */}
                                {data.lineDelivery.total > 0 && (
                                    <div className="h-4 bg-slate-100 rounded-full overflow-hidden flex">
                                        <div
                                            className="h-full bg-emerald-500 transition-all duration-700"
                                            style={{ width: `${(data.lineDelivery.success / data.lineDelivery.total) * 100}%` }}
                                        />
                                        <div
                                            className="h-full bg-red-400 transition-all duration-700"
                                            style={{ width: `${(data.lineDelivery.failed / data.lineDelivery.total) * 100}%` }}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* レポート状況 */}
                            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                                <h3 className="text-sm font-bold text-slate-700 mb-4">レポート生成状況</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-600">レポート総数</span>
                                        <span className="text-lg font-bold text-slate-700">{data.reportSummary.total}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-600 flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-slate-300" /> 下書き
                                        </span>
                                        <span className="text-sm font-medium text-slate-500">{data.reportSummary.draft}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-600 flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-blue-400" /> 完了
                                        </span>
                                        <span className="text-sm font-medium text-blue-600">{data.reportSummary.completed}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-600 flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-emerald-400" /> LINE送信済
                                        </span>
                                        <span className="text-sm font-medium text-emerald-600">{data.reportSummary.sentToLine}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* LINE送信失敗ログ */}
                        {data.failedLineLogs.length > 0 && (
                            <div className="bg-white rounded-xl border border-red-100 shadow-sm p-5 mt-4">
                                <button
                                    onClick={() => setShowFailedLogs(!showFailedLogs)}
                                    className="w-full flex items-center justify-between text-sm font-bold text-red-700 hover:text-red-800 transition-colors"
                                >
                                    <span className="flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4" />
                                        LINE送信失敗ログ ({data.failedLineLogs.length}件)
                                    </span>
                                    <ChevronDown className={`w-4 h-4 transition-transform ${showFailedLogs ? 'rotate-180' : ''}`} />
                                </button>

                                {showFailedLogs && (
                                    <div className="mt-4 overflow-x-auto">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="border-b border-red-100">
                                                    <th className="py-2 px-2 text-left text-slate-500 font-medium">日時</th>
                                                    <th className="py-2 px-2 text-left text-slate-500 font-medium">種別</th>
                                                    <th className="py-2 px-2 text-left text-slate-500 font-medium">LINE ID</th>
                                                    <th className="py-2 px-2 text-left text-slate-500 font-medium">エラー内容</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data.failedLineLogs.map(log => (
                                                    <tr key={log.id} className="border-b border-red-50">
                                                        <td className="py-2 px-2 text-slate-600 whitespace-nowrap">
                                                            {log.createdAt ? new Date(log.createdAt).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
                                                        </td>
                                                        <td className="py-2 px-2 text-slate-600">{log.messageType}</td>
                                                        <td className="py-2 px-2 text-slate-400 font-mono">{log.lineUserId || '-'}</td>
                                                        <td className="py-2 px-2 text-red-600 max-w-xs truncate">{log.errorMessage || '詳細不明'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </section>
                </>
            )}
        </div>
    )
}
