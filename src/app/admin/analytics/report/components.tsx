'use client'

import { ArrowRight, CheckCircle, Activity, TrendingUp, MessageCircle, FileText } from 'lucide-react'

// ============================================================
// Shared Utility
// ============================================================
export function pct(num: number, denom: number): string {
    if (denom === 0) return '0'
    return Math.round((num / denom) * 100).toString()
}

// ============================================================
// Horizontal Bar (既存analyticsから派生)
// ============================================================
export function HorizontalBar({ label, value, maxValue, color = 'bg-emerald-500', suffix = '', subLabel }: {
    label: string; value: number; maxValue: number; color?: string; suffix?: string; subLabel?: string
}) {
    const width = maxValue > 0 ? Math.max((value / maxValue) * 100, 2) : 0
    return (
        <div className="flex items-center gap-3 group">
            <span className="text-xs text-slate-500 w-20 text-right shrink-0 leading-tight">
                {label}
                {subLabel && <span className="block text-[10px] text-slate-400">{subLabel}</span>}
            </span>
            <div className="flex-1 h-7 bg-slate-50 rounded-md overflow-hidden relative">
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
// Funnel Step (既存analyticsから派生)
// ============================================================
export function FunnelStep({ label, count, total, isLast, icon }: {
    label: string; count: number; total: number; isLast?: boolean; icon: React.ReactNode
}) {
    const rate = pct(count, total)
    const barWidth = total > 0 ? Math.max((count / total) * 100, 3) : 0
    const isGood = Number(rate) >= 70
    const isWarning = Number(rate) >= 30 && Number(rate) < 70
    const barColor = isGood ? 'bg-emerald-500' : isWarning ? 'bg-amber-400' : 'bg-red-400'

    return (
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 w-28 shrink-0">
                <span className="w-5 h-5 flex items-center justify-center text-slate-400">{icon}</span>
                <span className="text-xs text-slate-600 font-medium truncate">{label}</span>
            </div>
            <div className="flex-1 h-7 bg-slate-50 rounded-md overflow-hidden relative">
                <div className={`h-full ${barColor} rounded-md transition-all duration-700 ease-out`} style={{ width: `${barWidth}%` }} />
                <span className="absolute inset-0 flex items-center justify-between px-3 text-xs font-bold">
                    <span className="text-slate-700">{count}人</span>
                    <span className={isGood ? 'text-emerald-700' : isWarning ? 'text-amber-700' : 'text-red-700'}>{rate}%</span>
                </span>
            </div>
            {!isLast && <ArrowRight className="w-3 h-3 text-slate-300 shrink-0" />}
        </div>
    )
}

// ============================================================
// Stat Card
// ============================================================
export function StatCard({ label, value, unit, subText, color = 'text-slate-800' }: {
    label: string; value: string | number; unit?: string; subText?: string; color?: string
}) {
    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="text-xs text-slate-500 mb-1">{label}</div>
            <div className={`text-3xl font-bold ${color}`}>{value}</div>
            {unit && <div className="text-xs text-slate-400 mt-1">{unit}</div>}
            {subText && <div className="text-xs text-slate-400 mt-1">{subText}</div>}
        </div>
    )
}

// ============================================================
// Section Header
// ============================================================
export function SectionHeader({ icon, title, subtitle, badge }: {
    icon: React.ReactNode; title: string; subtitle?: string; badge?: string
}) {
    return (
        <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-sm">
                {icon}
            </div>
            <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    {title}
                    {badge && (
                        <span className="px-2 py-0.5 text-[10px] font-medium bg-red-50 text-red-600 rounded-full">{badge}</span>
                    )}
                </h2>
                {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
            </div>
        </div>
    )
}

// ============================================================
// Heatmap Cell
// ============================================================
export function HeatmapCell({ value, label, onClick }: {
    value: number; label?: string; onClick?: () => void
}) {
    const absVal = Math.abs(value)
    let bgColor = 'bg-slate-50'
    let textColor = 'text-slate-400'
    if (absVal >= 0.5) { bgColor = 'bg-red-500'; textColor = 'text-white' }
    else if (absVal >= 0.3) { bgColor = 'bg-orange-400'; textColor = 'text-white' }
    else if (absVal >= 0.2) { bgColor = 'bg-amber-300'; textColor = 'text-amber-900' }
    else if (absVal >= 0.1) { bgColor = 'bg-yellow-100'; textColor = 'text-yellow-800' }

    return (
        <div
            className={`w-12 h-12 ${bgColor} rounded flex items-center justify-center text-[10px] font-bold ${textColor} cursor-pointer hover:ring-2 hover:ring-slate-400 transition-all`}
            title={label || `φ = ${value}`}
            onClick={onClick}
        >
            {value.toFixed(2)}
        </div>
    )
}

// ============================================================
// Progress Ring
// ============================================================
export function ProgressRing({ value, label, size = 80, color = '#10b981' }: {
    value: number; label: string; size?: number; color?: string
}) {
    const radius = (size - 8) / 2
    const circumference = 2 * Math.PI * radius
    const strokeDashoffset = circumference - (value / 100) * circumference

    return (
        <div className="flex flex-col items-center gap-1">
            <svg width={size} height={size} className="transform -rotate-90">
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f1f5f9" strokeWidth="6" />
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth="6"
                    strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round" className="transition-all duration-1000" />
            </svg>
            <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
                <span className="text-lg font-bold text-slate-800">{value}%</span>
            </div>
            <span className="text-[10px] text-slate-500 text-center leading-tight mt-1">{label}</span>
        </div>
    )
}

// ============================================================
// Value Distribution Bar (for clinical evidence items)
// ============================================================
export function ValueDistributionBar({ valueCounts, options, totalResponses }: {
    valueCounts: Record<string, number>; options: any; totalResponses: number
}) {
    const colors = [
        'bg-emerald-500', 'bg-blue-500', 'bg-amber-500', 'bg-red-500',
        'bg-purple-500', 'bg-pink-500', 'bg-cyan-500', 'bg-orange-500'
    ]

    // Map option values to labels
    const optionLabels: Record<string, string> = {}
    if (Array.isArray(options)) {
        options.forEach((opt: any) => {
            if (opt.value && opt.label) optionLabels[opt.value] = opt.label
        })
    }

    const entries = Object.entries(valueCounts).sort(([, a], [, b]) => b - a)

    return (
        <div className="space-y-1">
            {/* Stacked bar */}
            <div className="h-5 bg-slate-100 rounded-full overflow-hidden flex">
                {entries.map(([value, count], i) => (
                    <div
                        key={value}
                        className={`h-full ${colors[i % colors.length]} transition-all duration-700`}
                        style={{ width: `${(count / totalResponses) * 100}%` }}
                        title={`${optionLabels[value] || value}: ${count}件 (${(count / totalResponses * 100).toFixed(1)}%)`}
                    />
                ))}
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                {entries.map(([value, count], i) => (
                    <span key={value} className="flex items-center gap-1 text-[10px] text-slate-600">
                        <span className={`w-2 h-2 rounded-full ${colors[i % colors.length]}`} />
                        {optionLabels[value] || value}: {count}件 ({(count / totalResponses * 100).toFixed(0)}%)
                    </span>
                ))}
            </div>
        </div>
    )
}
