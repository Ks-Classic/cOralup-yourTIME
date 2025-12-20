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
    step?: string | null; // currentStep from DB
    hasReport?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

export function WorkflowIndicator({ status, step, hasReport = false, size = 'md' }: WorkflowIndicatorProps) {
    // ステップ定義（実際のcurrentStep値に合わせる）
    const steps = [
        { key: 'questionnaire_started', label: '問診', icon: ClipboardList },
        { key: 'questionnaire_completed', label: 'QR待', icon: QrCode },
        { key: 'diagnosis_started', label: '診断', icon: Stethoscope },
        { key: 'photos_uploaded', label: '写真', icon: CheckCircle2 },
        { key: 'analysis_completed', label: '完了', icon: FileText },
        { key: 'line_sent', label: '送信', icon: Send },
    ];

    const getStepState = (stepKey: string): 'completed' | 'current' | 'pending' => {
        // currentStepの順序（DBの実際の値）
        const stepOrder = [
            'questionnaire_started',
            'questionnaire_completed',
            'diagnosis_started',
            'photos_uploaded',
            'analysis_completed',
            'line_sent'
        ];

        // stepまたはstatusから現在位置を特定
        const currentStep = step || mapStatusToStep(status);
        const currentStepIndex = stepOrder.indexOf(currentStep);
        const targetStepIndex = stepOrder.indexOf(stepKey);

        // ステップが見つからない場合
        if (targetStepIndex === -1) return 'pending';

        // 完了ステータスの場合は全ステップ完了
        if (status === 'published') {
            return 'completed';
        }

        if (status === 'completed' && hasReport) {
            // analysis_completedまで完了、line_sentはpending
            if (stepKey === 'line_sent') return 'pending';
            return 'completed';
        }

        if (currentStepIndex === -1) return 'pending';

        if (targetStepIndex < currentStepIndex) return 'completed';
        if (targetStepIndex === currentStepIndex) return 'current';
        return 'pending';
    };

    // statusからstepへのマッピング（fallback用）
    const mapStatusToStep = (s: string): string => {
        switch (s) {
            case 'waiting': return 'questionnaire_started';
            case 'in_progress': return 'diagnosis_started';
            case 'completed': return 'analysis_completed';
            case 'published': return 'line_sent';
            default: return 'questionnaire_started';
        }
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
