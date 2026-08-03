import { ClipboardCheck, FileCheck2, Stethoscope, UsersRound } from 'lucide-react'
import type { EventInsightsResponse } from '@/types/event-insights'

interface OverviewProps {
  overview: EventInsightsResponse['overview']
}

function rate(value: number, total: number): number {
  return total > 0 ? Math.round((value / total) * 100) : 0
}

export function Overview({ overview }: OverviewProps) {
  const metrics = [
    { label: '来場', value: overview.visits, suffix: '人', icon: UsersRound, color: 'text-slate-900' },
    { label: '問診あり', value: overview.questionnaires, suffix: '人', icon: ClipboardCheck, color: 'text-sky-700' },
    { label: '診断あり', value: overview.diagnoses, suffix: '人', icon: Stethoscope, color: 'text-coral-700' },
    { label: 'レポートあり', value: overview.reports, suffix: '人', icon: FileCheck2, color: 'text-teal-700' },
  ]

  return (
    <section aria-labelledby="overview-title" className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-coral-700">Overview</p>
          <h2 id="overview-title" className="text-xl font-black tracking-tight text-slate-950">まず、全体像</h2>
        </div>
        <div className="hidden gap-5 text-right text-xs text-slate-500 sm:flex">
          <span>平均年齢 <strong className="block text-base text-slate-900">{overview.averageAgeYears ?? '—'}歳</strong></span>
          <span>兄弟姉妹で来場 <strong className="block text-base text-slate-900">{overview.siblingVisits}人</strong></span>
          <span>平均診断時間 <strong className="block text-base text-slate-900">{overview.averageDiagnosisMinutes ?? '—'}分</strong></span>
        </div>
      </div>

      <div className="grid grid-cols-2 border-l border-t border-slate-200 bg-white lg:grid-cols-4">
        {metrics.map(({ label, value, suffix, icon: Icon, color }) => (
          <div key={label} className="border-b border-r border-slate-200 p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>{label}</span><Icon className="h-4 w-4" aria-hidden="true" />
            </div>
            <p className={`text-3xl font-black tabular-nums ${color}`}>{value}<span className="ml-1 text-xs font-medium text-slate-400">{suffix}</span></p>
            <p className="mt-1 text-xs text-slate-400">来場者の{rate(value, overview.visits)}%</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs sm:hidden">
        <div className="border border-slate-200 bg-white p-2"><span className="block text-slate-400">平均年齢</span><strong>{overview.averageAgeYears ?? '—'}歳</strong></div>
        <div className="border border-slate-200 bg-white p-2"><span className="block text-slate-400">兄弟来場</span><strong>{overview.siblingVisits}人</strong></div>
        <div className="border border-slate-200 bg-white p-2"><span className="block text-slate-400">平均診断</span><strong>{overview.averageDiagnosisMinutes ?? '—'}分</strong></div>
      </div>
    </section>
  )
}
