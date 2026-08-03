import { CalendarDays, MapPin, Users } from 'lucide-react'
import type { EventInsightEvent } from '@/types/event-insights'

interface EventPickerProps {
  events: EventInsightEvent[]
  selectedEventKey: string
  disabled: boolean
  onSelect: (eventKey: string) => void
}

function eventDate(value: string | null): string {
  if (!value) return '日付未設定'
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))
}

export function EventPicker({ events, selectedEventKey, disabled, onSelect }: EventPickerProps) {
  return (
    <section aria-labelledby="event-picker-title" className="pt-2">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="event-picker-title" className="text-xs font-semibold tracking-wide text-slate-500">イベントを切り替え</h2>
        <span className="text-xs text-slate-400">{events.length}イベント</span>
      </div>
      <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1" role="list">
        {events.map((event) => {
          const selected = event.eventKey === selectedEventKey
          return (
            <button
              key={event.id}
              type="button"
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => onSelect(event.eventKey)}
              className={`min-w-56 rounded-xl border px-4 py-3 text-left transition-all focus:outline-none focus:ring-2 focus:ring-coral-500 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60 ${
                selected
                  ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:shadow-sm'
              }`}
            >
              <span className={`mb-1 flex items-center gap-1.5 text-xs font-semibold ${selected ? 'text-coral-200' : 'text-coral-700'}`}>
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                {eventDate(event.startDate)}
              </span>
              <span className="block truncate text-sm font-bold">{event.name}</span>
              <span className={`mt-2 flex items-center gap-3 text-xs ${selected ? 'text-slate-300' : 'text-slate-500'}`}>
                <span className="flex items-center gap-1"><Users className="h-3 w-3" aria-hidden="true" />{event.visitCount}人</span>
                {event.venue && <span className="flex min-w-0 items-center gap-1"><MapPin className="h-3 w-3 shrink-0" aria-hidden="true" /><span className="truncate">{event.venue}</span></span>}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
