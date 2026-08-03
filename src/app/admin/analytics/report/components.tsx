'use client'

import {
  ArrowRight,
  CheckCircle,
  Activity,
  TrendingUp,
  MessageCircle,
  FileText,
} from 'lucide-react'

// ============================================================
// Shared Utility
// ============================================================
export function pct(num: number, denom: number): string {
  if (denom === 0) return '0'
  return Math.round((num / denom) * 100).toString()
}

// 二層の柔らかい影で「厚み」を出す共通カードスタイル
export const CARD =
  'bg-white rounded-2xl border border-slate-100 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-12px_rgba(15,23,42,0.12)]'

// ============================================================
// Horizontal Bar (既存analyticsから派生)
// ============================================================
export function HorizontalBar({
  label,
  value,
  maxValue,
  color = 'bg-emerald-500',
  suffix = '',
  subLabel,
}: {
  label: string
  value: number
  maxValue: number
  color?: string
  suffix?: string
  subLabel?: string
}) {
  const width = maxValue > 0 ? Math.max((value / maxValue) * 100, 2) : 0
  return (
    <div className="group flex items-center gap-3">
      <span className="w-20 shrink-0 text-right text-xs leading-tight text-slate-500">
        {label}
        {subLabel && (
          <span className="block text-[10px] text-slate-400">{subLabel}</span>
        )}
      </span>
      <div className="relative h-7 flex-1 overflow-hidden rounded-md bg-slate-50">
        <div
          className={`h-full ${color} rounded-md transition-all duration-700 ease-out`}
          style={{ width: `${width}%` }}
        />
        <span className="absolute inset-0 flex items-center px-2 text-xs font-medium text-slate-700">
          {value}
          {suffix}
        </span>
      </div>
    </div>
  )
}

// ============================================================
// Funnel Step (既存analyticsから派生)
// ============================================================
export function FunnelStep({
  label,
  count,
  total,
  isLast,
  icon,
}: {
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
  const barColor = isGood
    ? 'bg-emerald-500'
    : isWarning
      ? 'bg-amber-400'
      : 'bg-red-400'

  return (
    <div className="flex items-center gap-3">
      <div className="flex w-28 shrink-0 items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center text-slate-400">
          {icon}
        </span>
        <span className="truncate text-xs font-medium text-slate-600">
          {label}
        </span>
      </div>
      <div className="relative h-7 flex-1 overflow-hidden rounded-md bg-slate-50">
        <div
          className={`h-full ${barColor} rounded-md transition-all duration-700 ease-out`}
          style={{ width: `${barWidth}%` }}
        />
        <span className="absolute inset-0 flex items-center justify-between px-3 text-xs font-bold">
          <span className="text-slate-700">{count}人</span>
          <span
            className={
              isGood
                ? 'text-emerald-700'
                : isWarning
                  ? 'text-amber-700'
                  : 'text-red-700'
            }
          >
            {rate}%
          </span>
        </span>
      </div>
      {!isLast && <ArrowRight className="h-3 w-3 shrink-0 text-slate-300" />}
    </div>
  )
}

// ============================================================
// Stat Card
// ============================================================
export function StatCard({
  label,
  value,
  unit,
  subText,
  color = 'text-slate-800',
  accent = 'bg-coral-400',
}: {
  label: string
  value: string | number
  unit?: string
  subText?: string
  color?: string
  accent?: string
}) {
  return (
    <div
      className={`relative ${CARD} overflow-hidden p-4 pt-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(15,23,42,0.06),0_16px_32px_-12px_rgba(15,23,42,0.18)]`}
    >
      <div className={`absolute left-0 right-0 top-0 h-1 ${accent}`} />
      <div className="mb-1.5 text-xs tracking-wide text-slate-500">{label}</div>
      <div className={`text-3xl font-bold tabular-nums ${color}`}>{value}</div>
      {unit && <div className="mt-1 text-xs text-slate-400">{unit}</div>}
      {subText && <div className="mt-1 text-xs text-slate-400">{subText}</div>}
    </div>
  )
}

// ============================================================
// Section Header
// ============================================================
export function SectionHeader({
  icon,
  title,
  subtitle,
  badge,
}: {
  icon: React.ReactNode
  title: string
  subtitle?: string
  badge?: string
}) {
  return (
    <div className="mb-5 flex items-center gap-3.5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-coral-400 to-coral-600 text-white shadow-md shadow-coral-500/20 ring-4 ring-coral-50">
        {icon}
      </div>
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-800">
          {title}
          {badge && (
            <span className="rounded-full bg-coral-50 px-2 py-0.5 text-[10px] font-semibold text-coral-600">
              {badge}
            </span>
          )}
        </h2>
        {subtitle && (
          <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
        )}
      </div>
    </div>
  )
}

// ============================================================
// Heatmap Cell
// ============================================================
export function HeatmapCell({
  value,
  label,
  onClick,
}: {
  value: number
  label?: string
  onClick?: () => void
}) {
  const absVal = Math.abs(value)
  let bgColor = 'bg-slate-50'
  let textColor = 'text-slate-400'
  if (absVal >= 0.5) {
    bgColor = 'bg-red-500'
    textColor = 'text-white'
  } else if (absVal >= 0.3) {
    bgColor = 'bg-orange-400'
    textColor = 'text-white'
  } else if (absVal >= 0.2) {
    bgColor = 'bg-amber-300'
    textColor = 'text-amber-900'
  } else if (absVal >= 0.1) {
    bgColor = 'bg-yellow-100'
    textColor = 'text-yellow-800'
  }

  return (
    <div
      className={`h-12 w-12 ${bgColor} flex items-center justify-center rounded text-[10px] font-bold ${textColor} cursor-pointer transition-all hover:ring-2 hover:ring-slate-400`}
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
export function ProgressRing({
  value,
  label,
  size = 80,
  color = '#10b981',
}: {
  value: number
  label: string
  size?: number
  color?: string
}) {
  const radius = (size - 8) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (value / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90 transform">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#f1f5f9"
          strokeWidth="6"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>
      <div
        className="absolute flex flex-col items-center justify-center"
        style={{ width: size, height: size }}
      >
        <span className="text-lg font-bold text-slate-800">{value}%</span>
      </div>
      <span className="mt-1 text-center text-[10px] leading-tight text-slate-500">
        {label}
      </span>
    </div>
  )
}

// ============================================================
// Value Distribution Bar (for clinical evidence items)
// ============================================================
export function ValueDistributionBar({
  valueCounts,
  options,
  totalResponses,
}: {
  valueCounts: Record<string, number>
  options: any
  totalResponses: number
}) {
  const colors = [
    'bg-emerald-500',
    'bg-blue-500',
    'bg-amber-500',
    'bg-red-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-cyan-500',
    'bg-orange-500',
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
      <div className="flex h-5 overflow-hidden rounded-full bg-slate-100">
        {entries.map(([value, count], i) => (
          <div
            key={value}
            className={`h-full ${colors[i % colors.length]} transition-all duration-700`}
            style={{ width: `${(count / totalResponses) * 100}%` }}
            title={`${optionLabels[value] || value}: ${count}件 (${((count / totalResponses) * 100).toFixed(1)}%)`}
          />
        ))}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {entries.map(([value, count], i) => (
          <span
            key={value}
            className="flex items-center gap-1 text-[10px] text-slate-600"
          >
            <span
              className={`h-2 w-2 rounded-full ${colors[i % colors.length]}`}
            />
            {optionLabels[value] || value}: {count}件 (
            {((count / totalResponses) * 100).toFixed(0)}%)
          </span>
        ))}
      </div>
    </div>
  )
}
