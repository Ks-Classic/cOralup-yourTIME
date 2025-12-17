import { Alert } from '@/types/admin';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { cn } from '@/utils';

interface AlertPanelProps {
    alerts: Alert[];
}

export function AlertPanel({ alerts }: AlertPanelProps) {
    if (alerts.length === 0) return null;

    return (
        <Card className="border-red-200 bg-red-50/50 shadow-sm overflow-hidden">
            <div className="bg-red-100/50 px-4 py-2 border-b border-red-200 flex justify-between items-center">
                <h3 className="text-red-800 font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    アラート ({alerts.length}件)
                </h3>
                {/* Optional: 'Check All' button */}
            </div>
            <CardContent className="p-0 divide-y divide-red-100">
                {alerts.map((alert) => (
                    <div key={alert.id} className="p-3 flex items-start justify-between hover:bg-red-50 transition-colors">
                        <div className="flex items-start gap-3">
                            <span className="text-xl">⚠️</span>
                            <div>
                                <div className="font-bold text-slate-800">
                                    {alert.childName} <span className="text-sm font-normal text-slate-600">({alert.childAge}歳)</span>
                                </div>
                                <div className="text-red-600 text-sm font-medium mt-0.5">
                                    {alert.message}
                                </div>
                                <div className="text-xs text-slate-500 mt-1">
                                    {alert.condition === 'qr_waiting_long' ? 'QR待ち' : '診断中'} {alert.elapsedMinutes}分経過
                                </div>
                            </div>
                        </div>
                        <button className="text-slate-400 hover:text-slate-600 p-1">
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
