import { ActiveSession } from '@/types/admin';
import { WorkflowIndicator } from './WorkflowIndicator';
import { cn } from '@/utils';
import { MessageCircle } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface ActiveSessionCardProps {
    session: ActiveSession;
    hasAlert?: boolean;
    onOpenChat?: (lineUserId: string, displayName: string | null) => void;
    onUpdateReceptionNumber?: (profileId: string, number: string) => void;
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

function ReceptionNumberInput({ value, profileId, onSave }: {
    value: string | null | undefined;
    profileId: string | null | undefined;
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
        if (profileId) {
            onSave(profileId, inputValue.trim());
        }
        setEditing(false);
    };

    if (!profileId) return null;

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

export function ActiveSessionCard({ session, hasAlert, onOpenChat, onUpdateReceptionNumber }: ActiveSessionCardProps) {
    const canChat = !!session.lineUserId;

    const handleCardClick = () => {
        if (canChat && onOpenChat) {
            onOpenChat(session.lineUserId!, session.parentLineDisplayName);
        }
    };

    const handleReceptionSave = (profileId: string, number: string) => {
        onUpdateReceptionNumber?.(profileId, number);
    };

    return (
        <div
            className={cn(
                'p-4 bg-white rounded-lg border shadow-sm transition-all duration-200 hover:shadow-md',
                hasAlert ? 'border-amber-200 bg-amber-50' : 'border-slate-100',
                canChat ? 'cursor-pointer' : ''
            )}
            onClick={handleCardClick}
        >
            {/* PC Layout - Grid */}
            <div className="hidden md:grid grid-cols-12 gap-4 items-center">

                {/* Left: Reception Number + Name and Basic Info (3 cols) */}
                <div className="col-span-3 flex items-center gap-2">
                    <ReceptionNumberInput
                        value={session.receptionNumber}
                        profileId={session.parentProfileId}
                        onSave={handleReceptionSave}
                    />
                    <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-900 text-lg whitespace-nowrap overflow-hidden text-ellipsis">
                            {session.childName} <span className="text-base font-normal text-slate-500">({session.childAge}歳)</span>
                        </div>
                        <div className="text-sm text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                            {session.parentLineDisplayName && (
                                <span
                                    className={cn(
                                        "inline-flex items-center gap-1 text-xs bg-green-50 px-1.5 py-0.5 rounded whitespace-nowrap transition-colors",
                                        canChat
                                            ? "text-green-600 hover:bg-green-100"
                                            : "text-green-600"
                                    )}
                                >
                                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" /></svg>
                                    {session.parentLineDisplayName}
                                    {canChat && <MessageCircle className="w-3 h-3 ml-0.5" />}
                                </span>
                            )}
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
                </div>

                <div className="col-span-6 flex justify-center">
                    <WorkflowIndicator status={session.status} step={session.currentStep} hasReport={session.hasReport} />
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
                    <div className="flex items-start gap-2">
                        <ReceptionNumberInput
                            value={session.receptionNumber}
                            profileId={session.parentProfileId}
                            onSave={handleReceptionSave}
                        />
                        <div>
                            <div className="font-bold text-slate-900 text-lg">
                                {session.childName} <span className="text-sm font-normal text-slate-500">({session.childAge}歳)</span>
                            </div>
                            <div className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                                {session.parentLineDisplayName && (
                                    <span
                                        className={cn(
                                            "inline-flex items-center gap-0.5 text-[10px] bg-green-50 px-1 py-0.5 rounded",
                                            canChat ? "text-green-600 hover:bg-green-100" : "text-green-600"
                                        )}
                                    >
                                        LINE: {session.parentLineDisplayName}
                                        {canChat && <MessageCircle className="w-3 h-3 ml-0.5" />}
                                    </span>
                                )}
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
                    <WorkflowIndicator status={session.status} step={session.currentStep} hasReport={session.hasReport} size="sm" />
                </div>
            </div>
        </div>
    );
}
