'use client'

import { Brain, Camera, CheckCircle2, FileText, StickyNote } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/utils'
import type { StaffDiagnosisMainView } from '@/types/staff-diagnosis'

interface StaffDiagnosisBottomNavProps {
  currentView: StaffDiagnosisMainView
  completedViews: Partial<Record<StaffDiagnosisMainView, boolean>>
  onChangeView: (view: StaffDiagnosisMainView) => void
}

const NAV_ITEMS: Array<{
  view: StaffDiagnosisMainView
  label: string
  icon: ReactNode
}> = [
  { view: 'questionnaire', label: '問診', icon: <FileText className="w-4 h-4" /> },
  { view: 'photos', label: '写真', icon: <Camera className="w-4 h-4" /> },
  { view: 'diagnosis', label: '診断', icon: <CheckCircle2 className="w-4 h-4" /> },
  { view: 'review', label: '分析', icon: <Brain className="w-4 h-4" /> },
  { view: 'memo', label: 'メモ', icon: <StickyNote className="w-4 h-4" /> },
]

export function StaffDiagnosisBottomNav({
  currentView,
  completedViews,
  onChangeView,
}: StaffDiagnosisBottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50 safe-area-inset-bottom">
      <div className="flex">
        {NAV_ITEMS.map(({ view, label, icon }) => (
          <button
            key={view}
            type="button"
            onClick={(event) => {
              event.preventDefault()
              onChangeView(view)
            }}
            className={cn(
              'flex-1 flex flex-col items-center justify-center py-2.5 px-1 transition-colors min-h-[60px] touch-manipulation',
              currentView === view
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-600 active:bg-gray-50'
            )}
          >
            <div className="relative">
              {icon}
              {completedViews[view] && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
              )}
            </div>
            <span className="text-[10px] mt-0.5 leading-tight">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
