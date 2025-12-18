import { ActiveSession } from '@/types/admin';
import { WorkflowIndicator } from './WorkflowIndicator';
import { cn } from '@/utils';

interface ActiveSessionCardProps {
    session: ActiveSession;
    hasAlert?: boolean;
}

const statusLabels: Record<string, string> = {
    waiting: '待機中',
    in_progress: '対応中',
    completed: '完了',
    published: '公開済',
    cancelled: '中止',
};

const stepLabels: Record<string, string> = {
    line_registered: 'LINE登録',
    questionnaire_started: '問診中',
    questionnaire_completed: 'QR待ち',
    diagnosis_started: '診断中',
    photos_uploaded: '写真OK',
    analysis_completed: '診断完了',
    report_generated: 'レポート済',
    line_sent: '送信済',
    line_confirmed: '確認済'
};

export function ActiveSessionCard({ session, hasAlert }: ActiveSessionCardProps) {
    return (
        <div className={cn(
            'p-4 bg-white rounded-lg border shadow-sm transition-all duration-200 hover:shadow-md',
            hasAlert ? 'border-amber-200 bg-amber-50' : 'border-slate-100'
        )}>
            {/* PC Layout - Grid */}
            <div className="hidden md:grid grid-cols-12 gap-4 items-center">

                {/* Left: Name and Basic Info (3 cols) */}
                <div className="col-span-3">
                    <div className="font-bold text-slate-900 text-lg whitespace-nowrap overflow-hidden text-ellipsis">
                        {session.childName} <span className="text-base font-normal text-slate-500">({session.childAge}歳)</span>
                    </div>
                    <div className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                        <span className={cn(
                            "px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap",
                            session.status === 'in_progress' ? "bg-blue-100 text-blue-700" :
                                session.status === 'completed' ? "bg-green-100 text-green-700" :
                                    session.status === 'published' ? "bg-purple-100 text-purple-700" :
                                        "bg-slate-100 text-slate-700"
                        )}>
                            {session.currentStep && stepLabels[session.currentStep]
                                ? stepLabels[session.currentStep]
                                : statusLabels[session.status] || session.status}
                        </span>
                        {session.staffName && (
                            <div className="flex items-center gap-1 whitespace-nowrap overflow-hidden text-ellipsis">
                                <span className="text-slate-300">|</span>
                                <span>{session.staffName}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Center: Workflow Indicator (6 cols) */}
                <div className="col-span-6 flex justify-center">
                    <WorkflowIndicator status={session.status} hasReport={session.hasReport} />
                </div>

                {/* Right: Time and Photos (3 cols) */}
                <div className="col-span-3 flex items-center justify-end gap-4">
                    <div className="text-right">
                        <div className={cn("text-2xl font-bold font-mono",
                            hasAlert ? "text-amber-600 animate-pulse" : "text-slate-700"
                        )}>
                            {session.elapsedMinutes}<span className="text-sm font-sans font-normal text-slate-500 ml-1">分</span>
                        </div>
                        <div className="text-xs text-slate-400">
                            ~ {new Date(session.currentStatusSince).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>

                    {session.progress?.photos && (
                        <div className="min-w-[60px] text-right bg-slate-50 px-2 py-1 rounded border border-slate-100">
                            <div className="text-xs text-slate-500 mb-0.5">写真</div>
                            <div className="text-sm font-bold text-slate-700 leading-none">
                                {session.progress.photos.current}<span className="text-slate-400 text-xs font-normal">/{session.progress.photos.total}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile Layout */}
            <div className="md:hidden space-y-4">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="font-bold text-slate-900 text-lg">
                            {session.childName} <span className="text-sm font-normal text-slate-500">({session.childAge}歳)</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                            <span>{session.staffName || '担当未定'}</span>
                            <span className={cn(
                                "px-1.5 py-0.5 rounded text-[10px] font-medium",
                                session.status === 'in_progress' ? "bg-blue-100 text-blue-700" :
                                    session.status === 'completed' ? "bg-green-100 text-green-700" :
                                        session.status === 'published' ? "bg-purple-100 text-purple-700" :
                                            "bg-slate-100 text-slate-700"
                            )}>
                                {session.currentStep && stepLabels[session.currentStep]
                                    ? stepLabels[session.currentStep]
                                    : statusLabels[session.status] || session.status}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-col items-end">
                        <div className={cn(
                            "text-xl font-bold font-mono",
                            hasAlert ? "text-amber-600" : "text-slate-700"
                        )}>
                            {session.elapsedMinutes}<span className="text-xs font-normal ml-0.5">分</span>
                        </div>
                        {session.progress?.photos && (
                            <div className="text-xs text-slate-500 mt-0.5">
                                📸 {session.progress.photos.current}/{session.progress.photos.total}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-center py-2 bg-slate-50/50 rounded-lg overflow-x-auto">
                    <WorkflowIndicator status={session.status} hasReport={session.hasReport} size="sm" />
                </div>
            </div>
        </div>
    );
}
