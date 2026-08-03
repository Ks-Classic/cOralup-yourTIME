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
    <section aria-labelledby="event-picker-title" className="border-y border-slate-200 bg-white py-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 id="event-picker-title" className="text-sm font-bold text-slate-900">イベントを切り替える</h2>
          <p className="text-xs text-slate-500">見たいイベントを押すだけで、すべての集計が切り替わります。</p>
        </div>
        <span className="hidden text-xs text-slate-400 sm:inline">{events.length}イベント</span>
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
              className={`min-w-56 border px-4 py-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-coral-500 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60 ${
                selected
                  ? 'border-coral-500 bg-coral-50 text-slate-950'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50'
              }`}
            >
              <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-coral-700">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                {eventDate(event.startDate)}
              </span>
              <span className="block truncate text-sm font-bold">{event.name}</span>
              <span className="mt-2 flex items-center gap-3 text-xs text-slate-500">
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
