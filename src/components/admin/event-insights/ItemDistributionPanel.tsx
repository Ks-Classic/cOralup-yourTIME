'use client'

import { useState } from 'react'
import { BarChart3, ClipboardList, Stethoscope } from 'lucide-react'
import { BarChart } from './BarChart'
import type { InsightItemDistribution } from '@/types/event-insights'

interface ItemDistributionPanelProps {
  kind: 'questionnaire' | 'diagnosis'
  items: InsightItemDistribution[]
}

export function ItemDistributionPanel({ kind, items }: ItemDistributionPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = items.find((item) => item.id === selectedId) ?? items[0]
  const isQuestionnaire = kind === 'questionnaire'
  const Icon = isQuestionnaire ? ClipboardList : Stethoscope

  return (
    <article className="border border-slate-200 bg-white">
      <header className="border-b border-slate-200 p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <Icon className={`h-5 w-5 ${isQuestionnaire ? 'text-sky-600' : 'text-coral-600'}`} aria-hidden="true" />
          <div>
            <h3 className="text-sm font-black text-slate-950">{isQuestionnaire ? '問診回答の分布' : '診断結果の分布'}</h3>
            <p className="text-xs text-slate-500">項目を選ぶと、回答の内訳が切り替わります。</p>
          </div>
        </div>
        {items.length > 0 && (
          <label className="block text-xs font-semibold text-slate-600">
            表示する項目
            <select
              value={selected?.id ?? ''}
              onChange={(event) => setSelectedId(event.target.value)}
              className="mt-1.5 w-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-coral-500 focus:ring-2 focus:ring-coral-100"
            >
              {items.map((item) => <option key={item.id} value={item.id}>{item.category}｜{item.label}</option>)}
            </select>
          </label>
        )}
      </header>
      <div className="p-4 sm:p-5">
        {selected ? (
          <>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div><p className="text-xs font-bold text-slate-400">{selected.category}</p><p className="mt-0.5 text-sm font-bold leading-relaxed text-slate-900">{selected.label}</p></div>
              <span className="shrink-0 bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{selected.total}回答</span>
            </div>
            <BarChart data={selected.values} tone={isQuestionnaire ? 'blue' : 'coral'} valueSuffix="人" />
          </>
        ) : (
          <div className="flex flex-col items-center py-10 text-center text-slate-400">
            <BarChart3 className="mb-2 h-7 w-7" aria-hidden="true" />
            <p className="text-sm">集計できる回答がありません</p>
          </div>
        )}
      </div>
    </article>
  )
}
