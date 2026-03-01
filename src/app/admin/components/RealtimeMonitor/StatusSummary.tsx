import { Card, CardContent } from '@/components/ui/card';
import { WaitingQueueInfo, StatusFilter } from '@/types/admin';

interface StatusSummaryProps {
    summary: {
        lineRegistered: number;
        waitingForQuestionnaire: WaitingQueueInfo;
        questionnaireInProgress: WaitingQueueInfo;
        questionnaireCompleted: number;
        waitingForScan: WaitingQueueInfo;
        inProgress: number;
        diagnosisCompleted: number;
        reportSent: number;
    };
    activeFilter: StatusFilter;
    onFilterChange: (filter: StatusFilter) => void;
}

function waitSub(info: WaitingQueueInfo): string | undefined {
    return info.count > 0
        ? `最長${info.maxWaitMinutes}分 / 平均${info.avgWaitMinutes}分`
        : undefined;
}

export function StatusSummary({ summary, activeFilter, onFilterChange }: StatusSummaryProps) {
    const items: Array<{
        label: string;
        count: number;
        color: string;
        bg: string;
        filterId: StatusFilter;
        highlight?: boolean;
        sub?: string;
    }> = [
            { label: 'LINE登録', count: summary.lineRegistered, color: 'text-slate-600', bg: 'bg-slate-50', filterId: 'all' },
            {
                label: '問診未着手',
                count: summary.waitingForQuestionnaire.count,
                color: 'text-orange-600',
                bg: 'bg-orange-50',
                filterId: 'waitingForQuestionnaire',
                highlight: summary.waitingForQuestionnaire.count > 0,
                sub: waitSub(summary.waitingForQuestionnaire),
            },
            {
                label: '問診入力中',
                count: summary.questionnaireInProgress.count,
                color: 'text-indigo-600',
                bg: 'bg-indigo-50',
                filterId: 'questionnaireInProgress',
                sub: waitSub(summary.questionnaireInProgress),
            },
            {
                label: '受付待ち',
                count: summary.waitingForScan.count,
                color: 'text-rose-600',
                bg: 'bg-rose-50',
                filterId: 'waitingForScan',
                highlight: summary.waitingForScan.count > 0,
                sub: waitSub(summary.waitingForScan),
            },
            { label: '診断中', count: summary.inProgress, color: 'text-amber-600', bg: 'bg-amber-50', filterId: 'inProgress' },
            { label: '診断完了', count: summary.diagnosisCompleted, color: 'text-emerald-600', bg: 'bg-emerald-50', filterId: 'diagnosisCompleted' },
            { label: '送信済', count: summary.reportSent, color: 'text-purple-600', bg: 'bg-purple-50', filterId: 'reportSent' },
        ];

    return (
        <Card className="border-none shadow-sm bg-white overflow-hidden">
            <CardContent className="p-0">
                <div className="grid grid-cols-4 md:grid-cols-7 divide-x divide-y md:divide-y-0 divide-slate-100">
                    {items.map((item, index) => {
                        const isActive = activeFilter === item.filterId;
                        return (
                            <button
                                key={index}
                                onClick={() => onFilterChange(isActive ? 'all' : item.filterId)}
                                className={`flex flex-col items-center justify-center p-3 md:p-4 transition-all duration-150 cursor-pointer
                                    ${isActive ? 'ring-2 ring-inset ring-blue-400 bg-blue-50/50' : item.bg}
                                    ${item.highlight && !isActive ? 'ring-1 ring-inset ring-current/10' : ''}
                                    hover:brightness-95 active:scale-[0.97]`}
                            >
                                <span className="text-[10px] md:text-xs text-slate-500 font-medium mb-1 whitespace-nowrap">{item.label}</span>
                                <span className={`text-xl md:text-2xl font-bold ${item.color}`}>{item.count}</span>
                                {item.sub && (
                                    <span className="text-[9px] md:text-[10px] text-slate-400 mt-0.5 whitespace-nowrap">{item.sub}</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
