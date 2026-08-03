import type { InsightDistribution } from '@/types/event-insights'

interface BarChartProps {
  data: InsightDistribution[]
  emptyLabel?: string
  tone?: 'coral' | 'blue' | 'amber' | 'teal'
  valueSuffix?: string
}

const toneClasses = {
  coral: 'bg-coral-500',
  blue: 'bg-sky-500',
  amber: 'bg-amber-500',
  teal: 'bg-teal-600',
}

export function BarChart({ data, emptyLabel = '該当データがありません', tone = 'coral', valueSuffix = '人' }: BarChartProps) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">{emptyLabel}</p>
  }

  const max = Math.max(...data.map((item) => item.count), 1)
  return (
    <div className="space-y-2">
      {data.map((item) => (
        <div key={item.label} className="grid grid-cols-[5.25rem_minmax(0,1fr)_2.75rem] items-center gap-2 text-xs">
          <span className="truncate text-right font-medium text-slate-600" title={item.label}>{item.label}</span>
          <div className="h-5 overflow-hidden bg-slate-100" aria-hidden="true">
            <div
              className={`h-full min-w-1 ${toneClasses[tone]}`}
              style={{ width: `${Math.max((item.count / max) * 100, 2)}%` }}
            />
          </div>
          <span className="font-bold tabular-nums text-slate-800">{item.count}{valueSuffix}</span>
        </div>
      ))}
    </div>
  )
}
