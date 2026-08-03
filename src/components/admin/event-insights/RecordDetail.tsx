'use client'

import { useState } from 'react'
import { ClipboardList, Stethoscope } from 'lucide-react'
import type { InsightResponse } from '@/types/event-insights'

interface RecordDetailProps {
  questionnaire: InsightResponse[]
  diagnosis: InsightResponse[]
}

function ResponseList({ responses, emptyLabel }: { responses: InsightResponse[]; emptyLabel: string }) {
  if (responses.length === 0) return <p className="border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-400">{emptyLabel}</p>
  const grouped = new Map<string, InsightResponse[]>()
  for (const response of responses) {
    grouped.set(response.category, [...(grouped.get(response.category) ?? []), response])
  }

  return (
    <div className="space-y-4">
      {[...grouped.entries()].map(([category, items]) => (
        <section key={category} aria-label={category}>
          <h4 className="mb-1.5 text-xs font-black uppercase tracking-wide text-slate-500">{category}</h4>
          <dl className="divide-y divide-slate-100 border border-slate-200 bg-white">
            {items.map((item) => (
              <div key={item.id} className="grid gap-1 p-3 sm:grid-cols-[minmax(10rem,0.8fr)_1.2fr] sm:gap-4">
                <dt className="text-xs leading-relaxed text-slate-500">{item.label}</dt>
                <dd className="break-words text-sm font-semibold leading-relaxed text-slate-900">{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  )
}

export function RecordDetail({ questionnaire, diagnosis }: RecordDetailProps) {
  const [tab, setTab] = useState<'questionnaire' | 'diagnosis'>('questionnaire')
  return (
    <div className="border-t border-slate-200 bg-slate-50 p-3 sm:p-5">
      <div className="mb-4 flex border-b border-slate-300" role="tablist" aria-label="個別データの種類">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'questionnaire'}
          onClick={() => setTab('questionnaire')}
          className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-bold ${tab === 'questionnaire' ? 'border-sky-600 text-sky-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <ClipboardList className="h-4 w-4" aria-hidden="true" />問診内容 <span className="text-xs font-medium">{questionnaire.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'diagnosis'}
          onClick={() => setTab('diagnosis')}
          className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-bold ${tab === 'diagnosis' ? 'border-coral-600 text-coral-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <Stethoscope className="h-4 w-4" aria-hidden="true" />診断内容 <span className="text-xs font-medium">{diagnosis.length}</span>
        </button>
      </div>
      <div role="tabpanel">
        {tab === 'questionnaire'
          ? <ResponseList responses={questionnaire} emptyLabel="問診内容は保存されていません" />
          : <ResponseList responses={diagnosis} emptyLabel="診断内容は保存されていません" />}
      </div>
    </div>
  )
}
