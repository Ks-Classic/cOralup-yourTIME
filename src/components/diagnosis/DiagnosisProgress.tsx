'use client'

import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2 } from 'lucide-react'
import type { DiagnosisStep } from '@/types/diagnosis'

interface DiagnosisProgressProps {
    currentStep: DiagnosisStep
    completedSteps: DiagnosisStep[]
}

const stepLabels: Record<DiagnosisStep, string> = {
    start: '開始',
    session: 'セッション',
    photos: '写真撮影',
    diagnosis: '診断入力',
    review: '確認',
    analysis: 'AI分析',
    report: 'レポート'
}

const stepOrder: DiagnosisStep[] = [
    'session',
    'photos',
    'diagnosis',
    'review',
    'analysis',
    'report'
]

export function DiagnosisProgress({ currentStep, completedSteps }: DiagnosisProgressProps) {
    const currentIndex = stepOrder.indexOf(currentStep)
    const progress = ((currentIndex + 1) / stepOrder.length) * 100

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700">診断の進捗</h3>
                <Badge variant="outline" className="text-xs">
                    {currentIndex + 1} / {stepOrder.length}
                </Badge>
            </div>

            <Progress value={progress} className="h-2" />

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {stepOrder.map((step, index) => {
                    const isCompleted = completedSteps.includes(step)
                    const isCurrent = step === currentStep

                    return (
                        <div
                            key={step}
                            className={`
                flex flex-col items-center gap-1 p-2 rounded-lg transition-all
                ${isCurrent ? 'bg-coral-50 border border-coral-200' : ''}
                ${isCompleted ? 'bg-green-50' : ''}
              `}
                        >
                            <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium
                ${isCompleted ? 'bg-green-500 text-white' : ''}
                ${isCurrent ? 'bg-coral-500 text-white' : ''}
                ${!isCompleted && !isCurrent ? 'bg-gray-200 text-gray-600' : ''}
              `}>
                                {isCompleted ? (
                                    <CheckCircle2 className="w-4 h-4" />
                                ) : (
                                    index + 1
                                )}
                            </div>
                            <span className={`
                text-xs text-center
                ${isCurrent ? 'font-medium text-coral-700' : ''}
                ${isCompleted ? 'text-green-700' : ''}
                ${!isCompleted && !isCurrent ? 'text-gray-500' : ''}
              `}>
                                {stepLabels[step]}
                            </span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
