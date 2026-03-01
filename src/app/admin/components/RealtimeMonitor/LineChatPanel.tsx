'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send, Search, MessageCircle, Loader2, ChevronLeft } from 'lucide-react';

// チャットメッセージ型
interface ChatMessage {
    id: string;
    direction: 'inbound' | 'outbound';
    messageType: string;
    content: string;
    status: string;
    createdAt: string;
    staffName?: string;
}

// 検索結果型
interface SearchResult {
    profileId: string;
    lineUserId: string;
    displayName: string | null;
    fullName: string | null;
    kanaName: string | null;
    avatarUrl: string | null;
    childName: string | null;
    role: string;
}

interface LineChatPanelProps {
    /** 初期表示するLINE User ID（セッションカードから開く場合） */
    initialLineUserId?: string | null;
    /** 初期表示する表示名 */
    initialDisplayName?: string | null;
    /** 閉じるコールバック */
    onClose: () => void;
}

type PanelView = 'search' | 'chat';

export function LineChatPanel({ initialLineUserId, initialDisplayName, onClose }: LineChatPanelProps) {
    const [view, setView] = useState<PanelView>(initialLineUserId ? 'chat' : 'search');
    const [activeUserId, setActiveUserId] = useState<string | null>(initialLineUserId || null);
    const [activeUserName, setActiveUserName] = useState<string | null>(initialDisplayName || null);

    // 検索
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // チャット
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const searchTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);

    // チャット履歴読み込み
    const loadChatHistory = useCallback(async (lineUserId: string) => {
        setIsLoadingHistory(true);
        try {
            const res = await fetch(`/api/staff/line-chat/history?lineUserId=${lineUserId}`);
            if (res.ok) {
                const data = await res.json();
                setMessages(data.messages || []);
            }
        } catch (err) {
            console.error('Failed to load chat history:', err);
        } finally {
            setIsLoadingHistory(false);
        }
    }, []);

    // 初期ロード
    useEffect(() => {
        if (activeUserId && view === 'chat') {
            loadChatHistory(activeUserId);
        }
    }, [activeUserId, view, loadChatHistory]);

    // メッセージ末尾へスクロール
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // フォーカス
    useEffect(() => {
        if (view === 'chat') {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [view]);

    // 検索（デバウンス）
    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        if (value.trim().length < 1) {
            setSearchResults([]);
            return;
        }
        searchTimerRef.current = setTimeout(async () => {
            setIsSearching(true);
            try {
                const res = await fetch(`/api/staff/line-chat/search?q=${encodeURIComponent(value.trim())}`);
                if (res.ok) {
                    const data = await res.json();
                    setSearchResults(data.results || []);
                }
            } catch (err) {
                console.error('Search failed:', err);
            } finally {
                setIsSearching(false);
            }
        }, 300);
    };

    // ユーザー選択
    const selectUser = (user: SearchResult) => {
        setActiveUserId(user.lineUserId);
        setActiveUserName(user.displayName || user.fullName || 'Unknown');
        setView('chat');
    };

    // メッセージ送信
    const handleSend = async () => {
        if (!inputText.trim() || !activeUserId || isSending) return;

        const text = inputText.trim();
        setInputText('');
        setIsSending(true);

        // 楽観的UI更新
        const optimisticMsg: ChatMessage = {
            id: `temp-${Date.now()}`,
            direction: 'outbound',
            messageType: 'text',
            content: text,
            status: 'sending',
            createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, optimisticMsg]);

        try {
            const res = await fetch('/api/staff/line-chat/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lineUserId: activeUserId, content: text }),
            });

            const data = await res.json();

            if (res.ok && data.success) {
                // 楽観的メッセージを本物に置換
                setMessages(prev =>
                    prev.map(m =>
                        m.id === optimisticMsg.id
                            ? { ...data.message, direction: 'outbound', status: 'sent' }
                            : m
                    )
                );
            } else {
                // エラー時：楽観的メッセージにエラー表示
                setMessages(prev =>
                    prev.map(m =>
                        m.id === optimisticMsg.id
                            ? { ...m, status: 'failed' }
                            : m
                    )
                );
                alert(`送信失敗: ${data.error || '不明なエラー'}`);
            }
        } catch (err) {
            setMessages(prev =>
                prev.map(m =>
                    m.id === optimisticMsg.id
                        ? { ...m, status: 'failed' }
                        : m
                )
            );
            alert('送信に失敗しました。ネットワークを確認してください。');
        } finally {
            setIsSending(false);
            inputRef.current?.focus();
        }
    };

    // キーダウン
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden"
                style={{ height: 'min(85vh, 700px)' }}>

                {/* ヘッダー */}
                <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white shrink-0">
                    {view === 'chat' && !initialLineUserId && (
                        <button onClick={() => setView('search')}
                            className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                    )}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                        </svg>
                        <span className="font-bold text-lg truncate">
                            {view === 'chat' ? (activeUserName || 'チャット') : 'LINE チャット'}
                        </span>
                    </div>
                    <button onClick={onClose}
                        className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* 検索ビュー */}
                {view === 'search' && (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* 検索入力 */}
                        <div className="p-3 border-b border-slate-100">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => handleSearchChange(e.target.value)}
                                    placeholder="名前・LINE表示名・子ども名で検索..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm
                                               focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400
                                               transition-all"
                                    autoFocus
                                />
                                {isSearching && (
                                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500 animate-spin" />
                                )}
                            </div>
                        </div>

                        {/* 検索結果 */}
                        <div className="flex-1 overflow-y-auto">
                            {searchResults.length > 0 ? (
                                <div className="divide-y divide-slate-50">
                                    {searchResults.map((user) => (
                                        <button
                                            key={user.profileId}
                                            onClick={() => selectUser(user)}
                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left transition-colors"
                                        >
                                            {/* アバター */}
                                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0 overflow-hidden">
                                                {user.avatarUrl ? (
                                                    <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-green-600 font-bold text-sm">
                                                        {(user.displayName || user.fullName || '?')[0]}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-slate-900 truncate">
                                                    {user.displayName || user.fullName || 'Unknown'}
                                                </div>
                                                <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                                                    {user.fullName && user.displayName && (
                                                        <span>{user.fullName}</span>
                                                    )}
                                                    {user.childName && (
                                                        <span className="text-orange-600">👶 {user.childName}</span>
                                                    )}
                                                    {user.kanaName && (
                                                        <span className="text-slate-400">({user.kanaName})</span>
                                                    )}
                                                </div>
                                            </div>
                                            <MessageCircle className="w-4 h-4 text-green-500 shrink-0" />
                                        </button>
                                    ))}
                                </div>
                            ) : searchQuery.length > 0 && !isSearching ? (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                    <Search className="w-8 h-8 mb-2" />
                                    <p className="text-sm">該当するユーザーが見つかりません</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                    <MessageCircle className="w-8 h-8 mb-2" />
                                    <p className="text-sm">名前やLINE表示名で検索してください</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* チャットビュー */}
                {view === 'chat' && (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* メッセージ一覧 */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-green-50/30 to-slate-50/30">
                            {isLoadingHistory ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-6 h-6 text-green-500 animate-spin" />
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                    <MessageCircle className="w-8 h-8 mb-2" />
                                    <p className="text-sm">まだメッセージはありません</p>
                                    <p className="text-xs mt-1">メッセージを送信して会話を開始しましょう</p>
                                </div>
                            ) : (
                                messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.direction === 'outbound'
                                                ? 'bg-green-500 text-white rounded-br-md'
                                                : 'bg-white text-slate-800 border border-slate-100 rounded-bl-md'
                                                }`}
                                        >
                                            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                            <div className={`flex items-center gap-1 mt-1 text-[10px] ${msg.direction === 'outbound' ? 'text-green-100 justify-end' : 'text-slate-400'
                                                }`}>
                                                <span>
                                                    {new Date(msg.createdAt).toLocaleTimeString('ja-JP', {
                                                        hour: '2-digit', minute: '2-digit',
                                                    })}
                                                </span>
                                                {msg.status === 'sending' && <Loader2 className="w-3 h-3 animate-spin" />}
                                                {msg.status === 'failed' && <span className="text-red-300">⚠️</span>}
                                                {msg.staffName && (
                                                    <span className="ml-1">({msg.staffName})</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* 入力エリア */}
                        <div className="p-3 border-t border-slate-100 bg-white shrink-0">
                            <div className="flex items-center gap-2">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="メッセージを入力..."
                                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm
                                               focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400
                                               transition-all"
                                    disabled={isSending}
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!inputText.trim() || isSending}
                                    className="p-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600
                                               disabled:opacity-40 disabled:cursor-not-allowed
                                               transition-all active:scale-95 shrink-0"
                                >
                                    {isSending ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Send className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
