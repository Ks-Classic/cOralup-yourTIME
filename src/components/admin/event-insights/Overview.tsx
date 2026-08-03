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
    <section aria-labelledby="overview-title" className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-widest text-coral-700">Event snapshot</p><h2 id="overview-title" className="mt-1 text-2xl font-black tracking-tight text-slate-950">今回の全体像</h2><p className="mt-2 text-sm text-slate-600">来場からレポートまでの進行状況を、ひとつの流れで確認できます。</p></div>
        <div className="grid grid-cols-3 gap-5 text-left text-xs text-slate-500"><span>平均年齢<strong className="mt-1 block text-lg text-slate-950">{overview.averageAgeYears ?? '—'}歳</strong></span><span>兄弟来場<strong className="mt-1 block text-lg text-slate-950">{overview.siblingVisits}人</strong></span><span>平均診断<strong className="mt-1 block text-lg text-slate-950">{overview.averageDiagnosisMinutes ?? '—'}分</strong></span></div>
      </div>
      <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map(({ label, value, suffix, icon: Icon, color }) => (
          <div key={label} className="rounded-xl bg-slate-50 p-4">
            <div className="mb-5 flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>{label}</span><Icon className="h-4 w-4" aria-hidden="true" />
            </div>
            <p className={`text-3xl font-black tabular-nums ${color}`}>{value}<span className="ml-1 text-xs font-medium text-slate-400">{suffix}</span></p>
            <p className="mt-1 text-xs text-slate-400">来場者の{rate(value, overview.visits)}%</p>
          </div>
        ))}
      </div>
    </section>
  )
}
