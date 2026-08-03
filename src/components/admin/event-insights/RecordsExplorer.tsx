'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Search, Users } from 'lucide-react'
import { ageBucket } from '@/lib/event-insights'
import { RecordDetail } from './RecordDetail'
import type { EventInsightRecord } from '@/types/event-insights'

interface RecordsExplorerProps { records: EventInsightRecord[] }
type SortKey = 'arrival-asc' | 'arrival-desc' | 'age-asc' | 'age-desc' | 'duration-asc' | 'duration-desc'
const SORT_KEYS: SortKey[] = ['arrival-asc', 'arrival-desc', 'age-asc', 'age-desc', 'duration-asc', 'duration-desc']

function isSortKey(value: string): value is SortKey {
  return SORT_KEYS.some((key) => key === value)
}

function formatTime(value: string | null): string {
  if (!value) return '—'
  return new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function genderLabel(value: EventInsightRecord['gender']): string {
  if (value === 'male') return '男の子'
  if (value === 'female') return '女の子'
  return '未回答'
}

function compareNullable(a: number | null, b: number | null, direction: 1 | -1): number {
  if (a === null) return 1
  if (b === null) return -1
  return (a - b) * direction
}

export function RecordsExplorer({ records }: RecordsExplorerProps) {
  const [search, setSearch] = useState('')
  const [age, setAge] = useState('all')
  const [gender, setGender] = useState('all')
  const [siblings, setSiblings] = useState('all')
  const [completion, setCompletion] = useState('all')
  const [sort, setSort] = useState<SortKey>('arrival-asc')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(25)
  const ages = useMemo(() => [...new Set(records.map((record) => ageBucket(record.ageMonths)))].sort((a, b) => a.localeCompare(b, 'ja', { numeric: true })), [records])

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('ja')
    const result = records.filter((record) => {
      if (normalizedSearch && !record.reference.toLocaleLowerCase('ja').includes(normalizedSearch)) return false
      if (age !== 'all' && ageBucket(record.ageMonths) !== age) return false
      if (gender !== 'all' && record.gender !== gender) return false
      if (siblings === 'yes' && record.siblingCount <= 1) return false
      if (siblings === 'no' && record.siblingCount > 1) return false
      if (completion === 'diagnosed' && !record.diagnosisCompleted) return false
      if (completion === 'not-diagnosed' && record.diagnosisCompleted) return false
      return true
    })
    return result.sort((a, b) => {
      if (sort === 'arrival-asc' || sort === 'arrival-desc') {
        const av = a.arrivedAt ? new Date(a.arrivedAt).getTime() : null
        const bv = b.arrivedAt ? new Date(b.arrivedAt).getTime() : null
        return compareNullable(av, bv, sort === 'arrival-asc' ? 1 : -1)
      }
      if (sort === 'age-asc' || sort === 'age-desc') return compareNullable(a.ageMonths, b.ageMonths, sort === 'age-asc' ? 1 : -1)
      return compareNullable(a.diagnosisMinutes, b.diagnosisMinutes, sort === 'duration-asc' ? 1 : -1)
    })
  }, [records, search, age, gender, siblings, completion, sort])

  const visible = filtered.slice(0, visibleCount)
  return (
    <section aria-labelledby="records-title" className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-widest text-coral-700">Details</p><h2 id="records-title" className="text-xl font-black text-slate-950">一人ずつ確かめる</h2><p className="text-xs text-slate-500">絞り込んで開くと、問診と診断を分けて確認できます。</p></div>
        <span className="text-sm font-bold tabular-nums text-slate-700">{filtered.length}<span className="ml-1 text-xs font-normal text-slate-400">人</span></span>
      </div>

      <div className="grid gap-2 border border-slate-200 bg-white p-3 md:grid-cols-2 xl:grid-cols-6">
        <label className="relative md:col-span-2 xl:col-span-1"><span className="sr-only">受付番号を検索</span><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden="true" /><input value={search} onChange={(event) => { setSearch(event.target.value); setVisibleCount(25) }} placeholder="受付番号を検索" className="w-full border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-coral-500 focus:ring-2 focus:ring-coral-100" /></label>
        <FilterSelect label="年齢" value={age} onChange={setAge} options={[['all', '全年齢'], ...ages.map((item) => [item, item] as [string, string])]} />
        <FilterSelect label="性別" value={gender} onChange={setGender} options={[['all', '男女すべて'], ['male', '男の子'], ['female', '女の子'], ['other', 'その他'], ['unknown', '未回答']]} />
        <FilterSelect label="兄弟姉妹" value={siblings} onChange={setSiblings} options={[['all', '兄弟条件なし'], ['yes', '兄弟姉妹で来場'], ['no', '単独来場']]} />
        <FilterSelect label="診断状況" value={completion} onChange={setCompletion} options={[['all', '診断状況すべて'], ['diagnosed', '診断あり'], ['not-diagnosed', '診断なし']]} />
        <FilterSelect label="並び順" value={sort} onChange={(value) => { if (isSortKey(value)) setSort(value) }} options={[['arrival-asc', '来場が早い順'], ['arrival-desc', '来場が遅い順'], ['age-asc', '年齢が低い順'], ['age-desc', '年齢が高い順'], ['duration-asc', '診断が短い順'], ['duration-desc', '診断が長い順']]} />
      </div>

      <div className="space-y-2">
        {visible.map((record) => {
          const expanded = expandedId === record.id
          return (
            <article key={record.id} className="border border-slate-200 bg-white">
              <button type="button" aria-expanded={expanded} onClick={() => setExpandedId(expanded ? null : record.id)} className="grid w-full grid-cols-[1fr_auto] items-center gap-3 p-3 text-left hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-coral-500 sm:grid-cols-[1.2fr_0.7fr_0.8fr_0.8fr_1.2fr_auto] sm:p-4">
                <div><p className="text-sm font-black text-slate-900">{record.reference}</p><p className="mt-0.5 text-xs text-slate-400">来場 {formatTime(record.arrivedAt)}</p></div>
                <p className="hidden text-sm font-semibold text-slate-700 sm:block">{record.ageMonths === null ? '年齢不明' : `${Math.floor(record.ageMonths / 12)}歳${record.ageMonths % 12}か月`}</p>
                <p className="hidden text-sm text-slate-600 sm:block">{genderLabel(record.gender)}</p>
                <p className="hidden text-sm text-slate-600 sm:flex sm:items-center sm:gap-1"><Users className="h-3.5 w-3.5" aria-hidden="true" />{record.siblingCount > 1 ? `${record.siblingCount}人で来場` : '単独来場'}</p>
                <div className="hidden flex-wrap gap-1 sm:flex"><StatusBadge active={record.questionnaireCompleted} label="問診" /><StatusBadge active={record.diagnosisCompleted} label="診断" /><StatusBadge active={record.reportCompleted} label="レポート" />{record.diagnosisMinutes !== null && <span className="bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-800">{record.diagnosisMinutes}分</span>}</div>
                {expanded ? <ChevronUp className="h-5 w-5 text-slate-500" aria-hidden="true" /> : <ChevronDown className="h-5 w-5 text-slate-500" aria-hidden="true" />}
                <div className="col-span-2 flex flex-wrap gap-1 sm:hidden"><span className="mr-1 text-xs text-slate-500">{record.ageMonths === null ? '年齢不明' : `${Math.floor(record.ageMonths / 12)}歳`}・{genderLabel(record.gender)}・{record.siblingCount > 1 ? `${record.siblingCount}人で来場` : '単独来場'}</span><StatusBadge active={record.questionnaireCompleted} label="問診" /><StatusBadge active={record.diagnosisCompleted} label="診断" /></div>
              </button>
              {expanded && <RecordDetail questionnaire={record.questionnaire} diagnosis={record.diagnosis} />}
            </article>
          )
        })}
        {filtered.length === 0 && <div className="border border-dashed border-slate-300 bg-white py-12 text-center text-sm text-slate-500">条件に合う来場者はいません。フィルタを変えてください。</div>}
      </div>
      {visibleCount < filtered.length && <button type="button" onClick={() => setVisibleCount((count) => count + 25)} className="w-full border border-slate-300 bg-white py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-coral-500">さらに{Math.min(25, filtered.length - visibleCount)}人表示</button>}
    </section>
  )
}

function StatusBadge({ active, label }: { active: boolean; label: string }) {
  return <span className={`px-2 py-1 text-[11px] font-bold ${active ? 'bg-teal-50 text-teal-800' : 'bg-slate-100 text-slate-400'}`}>{label}{active ? 'あり' : 'なし'}</span>
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<[string, string]> }) {
  return <label><span className="sr-only">{label}</span><select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className="w-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-coral-500 focus:ring-2 focus:ring-coral-100">{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></label>
}
