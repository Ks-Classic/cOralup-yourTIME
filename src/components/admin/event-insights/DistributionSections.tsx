import { Clock3, UserRound } from 'lucide-react'
import { BarChart } from './BarChart'
import type { EventInsightsResponse } from '@/types/event-insights'

interface DistributionSectionsProps {
  distributions: EventInsightsResponse['distributions']
}

function ChartCard({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <article className="border border-slate-200 bg-white p-4 sm:p-5">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        {note && <p className="mt-0.5 text-xs text-slate-400">{note}</p>}
      </div>
      {children}
    </article>
  )
}

export function DistributionSections({ distributions }: DistributionSectionsProps) {
  return (
    <div className="space-y-8">
      <section aria-labelledby="people-title">
        <div className="mb-4 flex items-center gap-3">
          <div className="border border-slate-300 bg-white p-2"><UserRound className="h-5 w-5 text-slate-700" aria-hidden="true" /></div>
          <div><h2 id="people-title" className="text-lg font-black text-slate-950">どんな子が来た？</h2><p className="text-xs text-slate-500">年齢・男女・兄弟姉妹の構成</p></div>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          <ChartCard title="年齢分布"><BarChart data={distributions.age} tone="coral" /></ChartCard>
          <ChartCard title="男女分布"><BarChart data={distributions.gender} tone="blue" /></ChartCard>
          <ChartCard title="兄弟姉妹での来場"><BarChart data={distributions.siblings} tone="teal" /></ChartCard>
        </div>
      </section>

      <section aria-labelledby="time-title">
        <div className="mb-4 flex items-center gap-3">
          <div className="border border-slate-300 bg-white p-2"><Clock3 className="h-5 w-5 text-slate-700" aria-hidden="true" /></div>
          <div><h2 id="time-title" className="text-lg font-black text-slate-950">いつ来て、いつ診断した？</h2><p className="text-xs text-slate-500">30分単位の混み方と、記録された所要時間</p></div>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          <ChartCard title="来場時間分布" note="受付時刻"><BarChart data={distributions.arrivalTime} tone="blue" /></ChartCard>
          <ChartCard title="診断開始時間分布" note="診断開始の記録がある人"><BarChart data={distributions.diagnosisTime} tone="coral" /></ChartCard>
          <ChartCard title="診断所要時間分布" note="開始・完了時刻が揃う人"><BarChart data={distributions.diagnosisDuration} tone="amber" /></ChartCard>
        </div>
      </section>
    </div>
  )
}
