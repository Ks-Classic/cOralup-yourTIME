'use client';

import { useState } from 'react';
import { Alert } from '@/types/admin';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, ArrowRight, ChevronDown } from 'lucide-react';
import { cn } from '@/utils';

interface AlertPanelProps {
    alerts: Alert[];
}

export function AlertPanel({ alerts }: AlertPanelProps) {
    const [isExpanded, setIsExpanded] = useState(true);

    if (alerts.length === 0) return null;

    const criticalCount = alerts.filter(a => a.type === 'critical').length;

    return (
        <Card className="border-red-200 bg-red-50/50 shadow-sm overflow-hidden">
            <button
                onClick={() => setIsExpanded(prev => !prev)}
                className="w-full bg-red-100/50 px-4 py-2 border-b border-red-200 flex justify-between items-center cursor-pointer hover:bg-red-100/80 transition-colors"
            >
                <h3 className="text-red-800 font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    アラート ({alerts.length}件)
                    {criticalCount > 0 && (
                        <span className="text-xs bg-red-600 text-white px-1.5 py-0.5 rounded-full animate-pulse">
                            緊急 {criticalCount}
                        </span>
                    )}
                </h3>
                <ChevronDown className={cn(
                    "w-4 h-4 text-red-600 transition-transform duration-200",
                    isExpanded ? "rotate-180" : "rotate-0"
                )} />
            </button>
            <div
                className={cn(
                    "transition-all duration-300 ease-in-out overflow-hidden",
                    isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                )}
            >
                <CardContent className="p-0 divide-y divide-red-100">
                    {alerts.map((alert) => (
                        <div key={alert.id} className={cn(
                            "p-3 flex items-start justify-between hover:bg-red-50 transition-colors",
                            alert.type === 'critical' && "bg-red-50/80"
                        )}>
                            <div className="flex items-start gap-3">
                                <span className="text-xl">{alert.type === 'critical' ? '🚨' : '⚠️'}</span>
                                <div>
                                    <div className="font-bold text-slate-800">
                                        {alert.childName} <span className="text-sm font-normal text-slate-600">({alert.childAge}歳)</span>
                                    </div>
                                    <div className={cn(
                                        "text-sm font-medium mt-0.5",
                                        alert.type === 'critical' ? "text-red-700" : "text-red-600"
                                    )}>
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
            </div>
        </Card>
    );
}
