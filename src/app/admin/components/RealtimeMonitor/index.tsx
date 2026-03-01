'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRealtimeStatus } from '../../hooks/useRealtimeStatus';
import { StatusSummary } from './StatusSummary';
import { AlertPanel } from './AlertPanel';
import { ActiveSessionCard } from './ActiveSessionCard';
import { LineChatPanel } from './LineChatPanel';
import Link from 'next/link';
import { RefreshCw, Beaker, User, Clock, ChevronDown, MessageCircle } from 'lucide-react';
import { StatusFilter, ActiveSession, WaitingUser } from '@/types/admin';
import { cn } from '@/utils';

interface RealtimeMonitorProps {
    useSampleData?: boolean;
}

// フィルタに基づいてセッションを絞り込む
function filterSessions(sessions: ActiveSession[], filter: StatusFilter): ActiveSession[] {
    if (filter === 'all') return sessions;

    const stepMap: Record<string, string[]> = {
        waitingForScan: ['questionnaire_completed'],
        inProgress: ['diagnosis_started', 'photos_uploaded'],
        diagnosisCompleted: ['analysis_completed', 'report_generated'],
        reportSent: ['line_sent', 'line_confirmed'],
    };

    const targetSteps = stepMap[filter];
    if (!targetSteps) return sessions;

    return sessions.filter(s => {
        if (!s.currentStep) return false;
        return targetSteps.includes(s.currentStep);
    });
}

// 問診未着手・入力中リストの表示（折りたたみ対応）
// 受付番号インライン入力（WaitingUser用）
function WaitingReceptionInput({ value, profileId, onSave }: {
    value: string | null;
    profileId: string;
    onSave: (profileId: string, number: string) => void;
}) {
    const [editing, setEditing] = useState(false);
    const [inputValue, setInputValue] = useState(value || '');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editing]);

    const handleSave = () => {
        onSave(profileId, inputValue.trim());
        setEditing(false);
    };

    if (editing) {
        return (
            <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onBlur={handleSave}
                onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
                className="w-10 h-6 text-center text-xs font-bold border border-blue-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                maxLength={4}
                onClick={e => e.stopPropagation()}
            />
        );
    }

    return (
        <button
            onClick={e => { e.stopPropagation(); setEditing(true); }}
            className={cn(
                "min-w-[28px] h-6 px-1.5 rounded text-xs font-bold border transition-colors",
                value
                    ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                    : "bg-slate-50 text-slate-400 border-dashed border-slate-300 hover:bg-slate-100 hover:text-slate-600"
            )}
            title="受付番号を入力"
        >
            {value || '#'}
        </button>
    );
}

// 問診未着手・入力中リストの表示（折りたたみ対応 + チャット + 受付番号）
function WaitingUsersList({ users, filter, onOpenChat, onUpdateReceptionNumber }: {
    users: WaitingUser[];
    filter: StatusFilter;
    onOpenChat: (lineUserId: string, displayName: string | null) => void;
    onUpdateReceptionNumber: (profileId: string, number: string) => void;
}) {
    const [isExpanded, setIsExpanded] = useState(true);

    const filtered = filter === 'all' ? users
        : filter === 'waitingForQuestionnaire' ? users.filter(u => u.status === 'not_started')
            : filter === 'questionnaireInProgress' ? users.filter(u => u.status === 'in_progress' && u.currentStep !== 'questionnaire_completed')
                : filter === 'waitingForScan' ? users.filter(u => u.currentStep === 'questionnaire_completed')
                    : [];

    if (filtered.length === 0) return null;

    const statusLabel = (u: WaitingUser) =>
        u.status === 'not_started' ? '問診未着手'
            : u.currentStep === 'questionnaire_completed' ? 'QR待ち'
                : u.currentStep === 'questionnaire_started' ? '問診入力中' : 'LIFF起動済';
    const statusColor = (u: WaitingUser) =>
        u.status === 'not_started' ? 'bg-orange-100 text-orange-700'
            : u.currentStep === 'questionnaire_completed' ? 'bg-teal-100 text-teal-700'
                : 'bg-indigo-100 text-indigo-700';

    return (
        <div className="space-y-0">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-3 bg-white rounded-t-lg border border-slate-100 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors"
            >
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <span>👤 問診待ちユーザー</span>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs">
                        {filtered.length}
                    </span>
                </h2>
                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            <div
                className="overflow-hidden transition-all duration-300 ease-in-out"
                style={{ maxHeight: isExpanded ? `${filtered.length * 80 + 20}px` : '0px' }}
            >
                <div className="bg-white rounded-b-lg border border-t-0 border-slate-100 shadow-sm divide-y divide-slate-50">
                    {filtered.map(user => {
                        const canChat = !!user.lineUserId;
                        return (
                            <div
                                key={user.profileId}
                                className={cn(
                                    "p-3 flex items-center justify-between transition-colors",
                                    canChat ? "cursor-pointer hover:bg-green-50/30" : ""
                                )}
                                onClick={() => canChat && onOpenChat(user.lineUserId!, user.lineDisplayName)}
                            >
                                <div className="flex items-center gap-3">
                                    <WaitingReceptionInput
                                        value={user.receptionNumber}
                                        profileId={user.profileId}
                                        onSave={onUpdateReceptionNumber}
                                    />
                                    <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                                        <User className="w-4 h-4 text-green-600" />
                                    </div>
                                    <div>
                                        <div className="font-medium text-slate-800 text-sm flex items-center gap-1.5">
                                            <span>{user.lineDisplayName || '(LINE名未取得)'}</span>
                                            {user.childName && (
                                                <span className="text-slate-500 text-xs">
                                                    お子様: {user.childName}
                                                </span>
                                            )}
                                            {canChat && (
                                                <MessageCircle className="w-3.5 h-3.5 text-green-500 ml-1" />
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColor(user)}`}>
                                                {statusLabel(user)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <div className="flex items-center gap-1 text-sm">
                                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                                        <span className={`font-bold font-mono ${user.waitMinutes >= 15 ? 'text-orange-600' : 'text-slate-600'}`}>
                                            {user.waitMinutes}
                                        </span>
                                        <span className="text-xs text-slate-400">分</span>
                                    </div>
                                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                        ({new Date(user.registeredAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} 受付)
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default function RealtimeMonitor({ useSampleData = false }: RealtimeMonitorProps) {
    const { data, loading, error, lastUpdated } = useRealtimeStatus(useSampleData);
    const [activeFilter, setActiveFilter] = useState<StatusFilter>('all');

    // LINE Chat state
    const [chatOpen, setChatOpen] = useState(false);
    const [chatLineUserId, setChatLineUserId] = useState<string | null>(null);
    const [chatDisplayName, setChatDisplayName] = useState<string | null>(null);

    const handleOpenChat = (lineUserId: string, displayName: string | null) => {
        setChatLineUserId(lineUserId);
        setChatDisplayName(displayName);
        setChatOpen(true);
    };

    const handleCloseChat = () => {
        setChatOpen(false);
        setChatLineUserId(null);
        setChatDisplayName(null);
    };

    const handleUpdateReceptionNumber = useCallback(async (profileId: string, number: string) => {
        try {
            await fetch('/api/staff/reception-number', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profileId, receptionNumber: number }),
            });
        } catch (err) {
            console.error('[Reception Number] Failed:', err);
        }
    }, []);

    if (error) {
        return (
            <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <h3 className="font-bold text-lg mb-2">データの読み込みエラー</h3>
                <p className="text-sm mb-4">リアルタイムデータの取得中にエラーが発生しました。</p>
                <pre className="bg-white p-3 rounded border border-red-100 text-xs overflow-auto max-h-40">
                    {error.message || JSON.stringify(error, null, 2)}
                </pre>
            </div>
        );
    }

    if (loading && !data) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    if (!data) return null;

    const filteredSessions = filterSessions(data.activeSessions, activeFilter);
    const showWaitingUsers = activeFilter === 'all' || activeFilter === 'waitingForQuestionnaire' || activeFilter === 'questionnaireInProgress' || activeFilter === 'waitingForScan';
    const showActiveSessions = activeFilter !== 'waitingForQuestionnaire' && activeFilter !== 'questionnaireInProgress';

    return (
        <div className="space-y-6">
            {/* サンプルデータバナー */}
            {useSampleData && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center gap-3">
                    <Beaker className="w-5 h-5 text-amber-600" />
                    <div>
                        <span className="text-amber-800 font-medium">サンプルデータモード</span>
                        <span className="text-amber-600 text-sm ml-2">
                            ローカル開発用のモックデータを表示しています
                        </span>
                    </div>
                </div>
            )}

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

            <StatusSummary
                summary={data.summary}
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
            />

            {/* フィルタ表示 */}
            {activeFilter !== 'all' && (
                <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg">
                    <span>🔍 フィルタ中</span>
                    <button
                        onClick={() => setActiveFilter('all')}
                        className="text-xs text-blue-500 underline hover:text-blue-700"
                    >
                        解除
                    </button>
                </div>
            )}

            <AlertPanel alerts={data.alerts} />

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left/Center - 2 cols */}
                <div className="lg:col-span-2 space-y-6">
                    {/* 問診待ちユーザーリスト */}
                    {showWaitingUsers && data.waitingUsers.length > 0 && (
                        <WaitingUsersList
                            users={data.waitingUsers}
                            filter={activeFilter}
                            onOpenChat={handleOpenChat}
                            onUpdateReceptionNumber={handleUpdateReceptionNumber}
                        />
                    )}

                    {/* Active Sessions */}
                    {showActiveSessions && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <span>🔄 進行中</span>
                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs">
                                        {filteredSessions.length}
                                    </span>
                                </h2>
                            </div>

                            <div className="space-y-3">
                                {filteredSessions.length > 0 ? (
                                    filteredSessions.map(session => (
                                        <ActiveSessionCard
                                            key={session.id}
                                            session={session}
                                            hasAlert={data.alerts.some(a => a.sessionId === session.sessionId)}
                                            onOpenChat={handleOpenChat}
                                            onUpdateReceptionNumber={handleUpdateReceptionNumber}
                                        />
                                    ))
                                ) : (
                                    <div className="text-center py-10 bg-white rounded-lg border border-slate-100/50 border-dashed text-slate-400">
                                        {activeFilter !== 'all' ? 'このステータスのセッションはありません' : '進行中のセッションはありません'}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
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
                                        <div className="flex items-center gap-2">
                                            <span>送: {session.reportSentAt ? '済' : '未'}</span>
                                            {session.parentLineDisplayName && (
                                                <span className="text-green-600">LINE: {session.parentLineDisplayName}</span>
                                            )}
                                        </div>
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

            {/* LINE Chat Panel */}
            {chatOpen && (
                <LineChatPanel
                    initialLineUserId={chatLineUserId}
                    initialDisplayName={chatDisplayName}
                    onClose={handleCloseChat}
                />
            )}
        </div>
    );
}
