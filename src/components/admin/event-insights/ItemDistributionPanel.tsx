import { ClipboardList, Stethoscope } from 'lucide-react'
import type { InsightItemDistribution } from '@/types/event-insights'

interface ItemDistributionPanelProps {
  kind: 'questionnaire' | 'diagnosis'
  items: InsightItemDistribution[]
}

function percentage(value: number, total: number): number {
  return total > 0 ? Math.round((value / total) * 100) : 0
}

export function ItemDistributionPanel({ kind, items }: ItemDistributionPanelProps) {
  const isQuestionnaire = kind === 'questionnaire'
  const Icon = isQuestionnaire ? ClipboardList : Stethoscope
  const accent = isQuestionnaire ? 'bg-sky-500' : 'bg-coral-500'

  return (
    <section aria-labelledby={`${kind}-map-title`} className="border-t-2 border-slate-950 bg-white">
      <header className="border-b border-slate-200 px-5 py-5 sm:px-7">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 p-2 ${isQuestionnaire ? 'bg-sky-50 text-sky-700' : 'bg-coral-50 text-coral-700'}`}><Icon className="h-5 w-5" aria-hidden="true" /></div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{isQuestionnaire ? 'Questionnaire map' : 'Diagnosis map'}</p>
            <h3 id={`${kind}-map-title`} className="mt-1 text-lg font-black tracking-tight text-slate-950">{isQuestionnaire ? '問診の全体像' : '診断結果の全体像'}</h3>
            <p className="mt-1 text-sm text-slate-600">全設問を同じ尺度で並べ、回答の偏りをひと目で比べられます。</p>
          </div>
        </div>
      </header>
      {items.length > 0 ? (
        <div className="divide-y divide-slate-100">
          {items.map((item) => (
            <article key={item.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(12rem,0.8fr)_minmax(0,1.8fr)] sm:items-center sm:px-7">
              <div>
                <p className="text-[11px] font-bold tracking-wide text-slate-400">{item.category}</p>
                <h4 className="mt-0.5 text-sm font-bold leading-relaxed text-slate-900">{item.label}</h4>
                <p className="mt-1 text-xs tabular-nums text-slate-500">{item.total}件</p>
              </div>
              <div>
                <div aria-label={`${item.label}の回答構成`} className="flex h-3 overflow-hidden bg-slate-100">
                  {item.values.map((value, index) => (
                    <span
                      key={value.label}
                      title={`${value.label} ${percentage(value.count, item.total)}%`}
                      className={`${index === 0 ? accent : index % 2 === 0 ? 'bg-slate-300' : 'bg-slate-400'}`}
                      style={{ width: `${(value.count / item.total) * 100}%` }}
                    />
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
                  {item.values.slice(0, 4).map((value) => <span key={value.label}><strong className="font-bold text-slate-900">{percentage(value.count, item.total)}%</strong> {value.label}</span>)}
                  {item.values.length > 4 && <span>ほか {item.values.length - 4}項目</span>}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="px-7 py-12 text-center text-sm text-slate-500">集計できる回答がありません。</p>
      )}
    </section>
  )
}
