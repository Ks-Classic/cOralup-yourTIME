import React from 'react';
import { cn } from '@/utils';
import {
    ClipboardList,
    QrCode,
    Stethoscope,
    CheckCircle2,
    FileText,
    Send
} from 'lucide-react';

interface WorkflowIndicatorProps {
    status: string;
    hasReport?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

export function WorkflowIndicator({ status, hasReport = false, size = 'md' }: WorkflowIndicatorProps) {
    const steps = [
        { key: 'questionnaire_in_progress', label: '問診', icon: ClipboardList },
        { key: 'questionnaire_completed', label: 'QR待', icon: QrCode },
        { key: 'in_progress', label: '診断', icon: Stethoscope },
        { key: 'diagnosis_completed', label: '完了', icon: CheckCircle2 },
        { key: 'report_created', label: 'レポ', icon: FileText },
        { key: 'report_sent', label: '送信', icon: Send },
    ];

    const getStepState = (stepKey: string): 'completed' | 'current' | 'pending' => {
        const statusOrder = ['questionnaire_in_progress', 'questionnaire_completed', 'in_progress', 'diagnosis_completed', 'report_sent'];
        const currentStatusIndex = statusOrder.indexOf(status);

        // Special handling for report_created
        if (stepKey === 'report_created') {
            if (status === 'report_sent') return 'completed';
            if (status === 'diagnosis_completed' && hasReport) return 'current'; // This logic might need strict 'hasReport' check if available
            // Simplified: if sent, report must have been created. If diagnosis completed, report creation is next.
            if (currentStatusIndex >= statusOrder.indexOf('report_sent')) return 'completed';
            return 'pending';
        }

        // Special handling for report_sent
        if (stepKey === 'report_sent') {
            if (status === 'report_sent') return 'current';
            if (currentStatusIndex >= statusOrder.indexOf('report_sent')) return 'completed'; // Should be 'current' if final state? 'report_sent' is final.
            return 'pending';
        }

        const stepStatusIndex = statusOrder.indexOf(stepKey);
        // If stepKey is not in statusOrder, default to pending
        if (stepStatusIndex === -1) return 'pending';

        if (stepStatusIndex < currentStatusIndex) return 'completed';
        if (stepStatusIndex === currentStatusIndex) return 'current';
        return 'pending';
    };

    return (
        <div className="flex items-center">
            {steps.map((step, index) => {
                const state = getStepState(step.key);
                const Icon = step.icon;

                // Size adjustments
                const isSmall = size === 'sm';
                const iconSizeBase = isSmall ? "w-6 h-6" : "w-8 h-8";
                const iconSizeInner = isSmall ? "w-3 h-3" : "w-4 h-4";
                const textSize = isSmall ? "text-[8px]" : "text-[10px]";

                // Color mapping
                const completedColor = "text-emerald-500 bg-emerald-50 border-emerald-200";
                const currentColor = "text-white bg-emerald-500 border-emerald-600 shadow-md ring-2 ring-emerald-100";
                const pendingColor = "text-slate-300 bg-slate-50 border-slate-100";

                // Line color
                const lineCompleted = "bg-emerald-300";
                const linePending = "bg-slate-100";

                return (
                    <React.Fragment key={step.key}>
                        <div className="flex flex-col items-center gap-1 min-w-[36px]">
                            <div className={cn(
                                "rounded-full flex items-center justify-center border transition-all duration-300",
                                iconSizeBase,
                                state === 'completed' && completedColor,
                                state === 'current' && currentColor,
                                state === 'pending' && pendingColor,
                            )}>
                                <Icon className={iconSizeInner} />
                            </div>
                            {/* Hide labels on small size unless it's the current step, to save space */}
                            <span className={cn(
                                "font-medium transition-colors duration-300 whitespace-nowrap",
                                textSize,
                                isSmall && state !== 'current' ? "hidden" : "block",
                                state === 'current' ? "text-emerald-600 font-bold" :
                                    state === 'completed' ? "text-emerald-600/70" : "text-slate-300"
                            )}>
                                {step.label}
                            </span>
                        </div>

                        {index < steps.length - 1 && (
                            <div className={cn(
                                "h-0.5 mx-0.5 mb-4",
                                isSmall ? "w-2" : "w-4"
                            )}>
                                <div className={cn(
                                    "h-full w-full rounded-full transition-colors duration-500",
                                    state === 'completed' ? lineCompleted : linePending
                                )} />
                            </div>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}
