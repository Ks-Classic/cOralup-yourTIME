import { Card, CardContent } from '@/components/ui/card';

interface StatusSummaryProps {
    summary: {
        lineRegistered: number;
        questionnaireCompleted: number;
        inProgress: number;
        diagnosisCompleted: number;
        reportSent: number;
    };
}

export function StatusSummary({ summary }: StatusSummaryProps) {
    const items = [
        { label: 'LINE登録', count: summary.lineRegistered, color: 'text-slate-600', bg: 'bg-slate-50' },
        { label: '問診完了', count: summary.questionnaireCompleted, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: '診断中', count: summary.inProgress, color: 'text-amber-600', bg: 'bg-amber-50' },
        { label: '診断完了', count: summary.diagnosisCompleted, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: '送信済', count: summary.reportSent, color: 'text-purple-600', bg: 'bg-purple-50' },
    ];

    return (
        <Card className="border-none shadow-sm bg-white overflow-hidden">
            <CardContent className="p-0">
                <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-y md:divide-y-0 divide-slate-100">
                    {items.map((item, index) => (
                        <div key={index} className={`flex flex-col items-center justify-center p-4 ${item.bg}`}>
                            <span className="text-xs text-slate-500 font-medium mb-1">{item.label}</span>
                            <span className={`text-2xl font-bold ${item.color}`}>{item.count}</span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
