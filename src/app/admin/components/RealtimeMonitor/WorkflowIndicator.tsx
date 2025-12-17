import React from 'react';
import { cn } from '@/utils';

interface WorkflowIndicatorProps {
    status: string;
    hasReport?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

export function WorkflowIndicator({ status, hasReport = false, size = 'md' }: WorkflowIndicatorProps) {
    // 6 steps
    const steps = [
        { key: 'questionnaire_in_progress', label: '問診' },
        { key: 'questionnaire_completed', label: 'QR' },
        { key: 'in_progress', label: '診断' },
        { key: 'diagnosis_completed', label: '完了' },
        { key: 'report_created', label: 'レポート' },
        { key: 'report_sent', label: '送信' },
    ];

    const getStepState = (stepKey: string): 'completed' | 'current' | 'pending' => {
        const statusOrder = ['questionnaire_in_progress', 'questionnaire_completed', 'in_progress', 'diagnosis_completed', 'report_sent'];
        const currentStatusIndex = statusOrder.indexOf(status);

        // Special handling for report_created
        if (stepKey === 'report_created') {
            if (status === 'report_sent') return 'completed';
            if (status === 'diagnosis_completed' && hasReport) return 'current';
            if (currentStatusIndex >= statusOrder.indexOf('diagnosis_completed') && hasReport) return 'completed';
            return 'pending';
        }

        // Special handling for report_sent
        if (stepKey === 'report_sent') {
            if (status === 'report_sent') return 'current';
            return 'pending';
        }

        const stepStatusIndex = statusOrder.indexOf(stepKey);
        // If stepKey is not in statusOrder (e.g. invalid status), default to pending
        if (stepStatusIndex === -1) return 'pending';

        if (stepStatusIndex < currentStatusIndex) return 'completed';
        if (stepStatusIndex === currentStatusIndex) return 'current';
        return 'pending';
    };

    const getStepLabel = (stepKey: string) => {
        return steps.find(s => s.key === stepKey)?.label;
    };

    return (
        <div className="flex items-center gap-0.5">
            {steps.map((step, index) => {
                const state = getStepState(step.key);
                return (
                    <React.Fragment key={step.key}>
                        <div className="flex flex-col items-center group relative">
                            <span className={cn(
                                'text-lg leading-none transition-colors duration-300',
                                state === 'completed' && 'text-emerald-500',
                                state === 'current' && 'text-emerald-600 animate-pulse font-bold',
                                state === 'pending' && 'text-slate-300',
                            )}>
                                {state === 'completed' ? '●' : state === 'current' ? '◉' : '○'}
                            </span>
                            {/* Tooltip on hover */}
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                {step.label}
                            </div>
                        </div>

                        {index < steps.length - 1 && (
                            <span className="text-slate-300 text-sm">─</span>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}
