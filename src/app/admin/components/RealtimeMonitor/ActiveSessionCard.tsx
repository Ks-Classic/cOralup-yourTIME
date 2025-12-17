import { ActiveSession } from '@/types/admin';
import { WorkflowIndicator } from './WorkflowIndicator';
import { cn } from '@/utils';

interface ActiveSessionCardProps {
    session: ActiveSession;
    hasAlert?: boolean;
}

const statusLabels: Record<string, string> = {
    questionnaire_in_progress: '問診中',
    questionnaire_completed: 'QR待ち',
    in_progress: '診断中',
    diagnosis_completed: '診断完了',
    report_sent: '送信済',
};

export function ActiveSessionCard({ session, hasAlert }: ActiveSessionCardProps) {
    return (
        <div className={cn(
            'p-4 bg-white rounded-lg border shadow-sm transition-all duration-200 hover:shadow-md',
            hasAlert ? 'border-amber-200 bg-amber-50' : 'border-slate-100'
        )}>
            {/* PC Layout */}
            <div className="hidden md:flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <div className="min-w-[180px]">
                        <div className="font-bold text-slate-900 text-lg">
                            {session.childName} <span className="text-base font-normal text-slate-500">({session.childAge}歳)</span>
                        </div>
                        <div className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                            <span className={cn(
                                "px-2 py-0.5 rounded text-xs font-medium",
                                session.status === 'in_progress' ? "bg-blue-100 text-blue-700" :
                                    session.status === 'questionnaire_completed' ? "bg-orange-100 text-orange-700" :
                                        "bg-slate-100 text-slate-700"
                            )}>
                                {statusLabels[session.status] || session.status}
                            </span>
                            {session.staffName && (
                                <>
                                    <span className="text-slate-300">|</span>
                                    <span>担当: {session.staffName}</span>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col items-center">
                        <WorkflowIndicator status={session.status} hasReport={session.hasReport} />
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <div className={cn("text-2xl font-bold font-mono",
                            hasAlert ? "text-amber-600 animate-pulse" : "text-slate-700"
                        )}>
                            {session.elapsedMinutes}<span className="text-sm font-sans font-normal text-slate-500 ml-1">分経過</span>
                        </div>
                        <div className="text-xs text-slate-400">
                            {new Date(session.currentStatusSince).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} ~
                        </div>
                    </div>

                    {session.progress && (
                        <div className="min-w-[80px] text-right">
                            <div className="text-sm font-medium text-slate-600">
                                📸 {session.progress.photos.current}/{session.progress.photos.total}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile Layout */}
            <div className="md:hidden space-y-3">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="font-bold text-slate-900">
                            {session.childName} ({session.childAge}歳)
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                            {session.staffName || '担当未定'}
                        </div>
                    </div>
                    <div className={cn(
                        "text-lg font-bold font-mono",
                        hasAlert ? "text-amber-600" : "text-slate-700"
                    )}>
                        {session.elapsedMinutes}分
                    </div>
                </div>

                <div className="flex justify-center py-1">
                    <WorkflowIndicator status={session.status} hasReport={session.hasReport} size="sm" />
                </div>

                <div className="flex justify-between items-center text-sm">
                    <span className={cn(
                        "px-2 py-0.5 rounded text-xs font-medium",
                        session.status === 'in_progress' ? "bg-blue-100 text-blue-700" :
                            session.status === 'questionnaire_completed' ? "bg-orange-100 text-orange-700" :
                                "bg-slate-100 text-slate-700"
                    )}>
                        {statusLabels[session.status] || session.status}
                    </span>
                    {session.progress && (
                        <span className="text-slate-500 text-xs">
                            📸 {session.progress.photos.current}/{session.progress.photos.total}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
