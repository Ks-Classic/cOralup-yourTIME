'use client';

import { useRealtimeStatus } from '../../hooks/useRealtimeStatus';
import { StatusSummary } from './StatusSummary';
import { AlertPanel } from './AlertPanel';
import { ActiveSessionCard } from './ActiveSessionCard';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';

export default function RealtimeMonitor() {
    const { data, loading, lastUpdated } = useRealtimeStatus();

    if (loading && !data) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="space-y-6">
            {/* Header Info */}
            <div className="flex items-center justify-between text-sm text-slate-500 bg-white px-4 py-2 rounded-lg border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span>リアルタイム監視中</span>
                </div>
                <div className="flex items-center gap-4">
                    <span>最終更新: {lastUpdated.toLocaleTimeString()}</span>
                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-slate-100 rounded text-slate-400">
                        <RefreshCw className="w-3 h-3" />
                        5秒自動更新
                    </span>
                </div>
            </div>

            <StatusSummary summary={data.summary} />

            <AlertPanel alerts={data.alerts} />

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Active Sessions (Left/Center - 2 cols) */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <span>🔄 進行中</span>
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs">
                                {data.activeSessions.length}
                            </span>
                        </h2>
                    </div>

                    <div className="space-y-3">
                        {data.activeSessions.length > 0 ? (
                            data.activeSessions.map(session => (
                                <ActiveSessionCard
                                    key={session.id}
                                    session={session}
                                    hasAlert={data.alerts.some(a => a.sessionId === session.sessionId)}
                                />
                            ))
                        ) : (
                            <div className="text-center py-10 bg-white rounded-lg border border-slate-100/50 border-dashed text-slate-400">
                                進行中のセッションはありません
                            </div>
                        )}
                    </div>
                </div>

                {/* Recently Completed (Right - 1 col) */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-slate-800">✅ 本日完了</h2>
                        <Link href="/admin?tab=history" className="text-sm text-emerald-600 hover:text-emerald-700">
                            すべて見る
                        </Link>
                    </div>

                    <div className="bg-white rounded-lg border border-slate-100 shadow-sm divide-y divide-slate-50">
                        {data.recentCompleted.length > 0 ? (
                            data.recentCompleted.map(session => (
                                <div key={session.id} className="p-3">
                                    <div className="flex justify-between items-start">
                                        <span className="font-medium text-slate-800">
                                            {session.childName} <span className="text-xs text-slate-500">({session.childAge}歳)</span>
                                        </span>
                                        <span className="text-xs text-slate-400">
                                            {new Date(session.completedAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className="flex justify-between mt-1 text-xs text-slate-500">
                                        <span>送: {session.reportSentAt ? '済' : '未'}</span>
                                        <span>処: {session.staffName}</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-4 text-center text-slate-400 text-sm">
                                まだ完了したセッションはありません
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
