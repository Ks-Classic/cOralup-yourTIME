'use client';

import { useCallback, useEffect, useState } from 'react';
import { cn } from '@/utils';
import { Wrench, Trash2, RefreshCcw, Plus } from 'lucide-react';

export default function DevToolsPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [resetVisitId, setResetVisitId] = useState('');

    const handleGenerateTestData = async () => {
        setIsLoading(true);
        setResult(null);
        try {
            const res = await fetch('/api/admin/test-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    childName: `テスト_${Date.now().toString(36)}`,
                    withQuestionnaire: true,
                }),
            });
            const data = await res.json();
            setResult({ type: 'generate', success: data.success, data });
        } catch (error) {
            setResult({ type: 'generate', success: false, error: String(error) });
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetVisit = async () => {
        if (!resetVisitId.trim()) {
            alert('Visit IDを入力してください');
            return;
        }
        setIsLoading(true);
        setResult(null);
        try {
            const res = await fetch('/api/admin/test-data/reset-visit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    visitId: resetVisitId.trim(),
                    deleteResponses: true,
                    deletePhotos: true,
                    deleteReports: true,
                }),
            });
            const data = await res.json();
            setResult({ type: 'reset', success: data.success, data });
        } catch (error) {
            setResult({ type: 'reset', success: false, error: String(error) });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCleanupTestData = async () => {
        if (!confirm('テストデータ（is_test_data=true）をすべて削除します。よろしいですか？')) {
            return;
        }
        setIsLoading(true);
        setResult(null);
        try {
            const res = await fetch('/api/admin/test-data', {
                method: 'DELETE',
            });
            const data = await res.json();
            setResult({ type: 'cleanup', success: data.success, data });
        } catch (error) {
            setResult({ type: 'cleanup', success: false, error: String(error) });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* ヘッダー */}
            <div>
                <h1 className="text-2xl font-bold text-slate-800">テストデータ管理</h1>
                <p className="text-sm text-slate-500 mt-1">開発・テスト用データの生成・リセット・削除</p>
            </div>

            {/* 説明 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-blue-800 font-semibold flex items-center gap-2">
                    <Wrench className="w-5 h-5" />
                    テストデータ管理ツール
                </h3>
                <p className="text-blue-700 text-sm mt-1">
                    テスト用データの生成・リセット・削除ができます。本番イベント前に「一括削除」でテストデータをクリーンアップしてください。
                </p>
            </div>

            {/* アクションカード */}
            <div className="grid gap-6 md:grid-cols-3">
                {/* テストデータ生成 */}
                <div className="bg-white rounded-lg border border-slate-200 p-6">
                    <h4 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
                        <Plus className="w-5 h-5 text-emerald-500" />
                        テストデータ生成
                    </h4>
                    <p className="text-sm text-slate-500 mb-4">
                        テスト用の子供とvisitを作成します。問診回答も自動生成されます。
                    </p>
                    <button
                        onClick={handleGenerateTestData}
                        disabled={isLoading}
                        className="w-full px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                    >
                        {isLoading ? '処理中...' : 'テストデータ生成'}
                    </button>
                </div>

                {/* Visitリセット */}
                <div className="bg-white rounded-lg border border-slate-200 p-6">
                    <h4 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
                        <RefreshCcw className="w-5 h-5 text-blue-500" />
                        Visitリセット
                    </h4>
                    <p className="text-sm text-slate-500 mb-2">
                        指定したvisitをリセット（問診・診断・写真・レポートを削除）
                    </p>
                    <input
                        type="text"
                        value={resetVisitId}
                        onChange={(e) => setResetVisitId(e.target.value)}
                        placeholder="Visit ID (UUID)"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg mb-3 text-sm"
                    />
                    <button
                        onClick={handleResetVisit}
                        disabled={isLoading}
                        className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
                    >
                        {isLoading ? '処理中...' : 'リセット実行'}
                    </button>
                </div>

                {/* テストデータ削除 */}
                <div className="bg-white rounded-lg border border-slate-200 p-6">
                    <h4 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
                        <Trash2 className="w-5 h-5 text-red-500" />
                        テストデータ削除
                    </h4>
                    <p className="text-sm text-slate-500 mb-4">
                        is_test_data=true のデータをすべて削除します。本番運用前に実行してください。
                    </p>
                    <button
                        onClick={handleCleanupTestData}
                        disabled={isLoading}
                        className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
                    >
                        {isLoading ? '処理中...' : '一括削除'}
                    </button>
                </div>
            </div>

            {/* 結果表示 */}
            {result && (
                <div className={cn(
                    "rounded-lg p-4 border",
                    result.success ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
                )}>
                    <h4 className={cn("font-semibold", result.success ? "text-emerald-800" : "text-red-800")}>
                        {result.success ? '成功' : 'エラー'}
                    </h4>
                    <pre className="mt-2 text-sm overflow-auto max-h-40">
                        {JSON.stringify(result.data || result.error, null, 2)}
                    </pre>
                </div>
            )}

            {/* データ一覧 */}
            <DataListViewer />
        </div>
    );
}

// データ一覧ビューア
function DataListViewer() {
    const [activeTab, setActiveTab] = useState<'visits' | 'children' | 'profiles'>('visits');
    const [data, setData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/admin/data-list?type=${activeTab}&limit=50`);
            const result = await res.json();
            if (result.success) {
                setData(result.data);
            }
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setIsLoading(false);
        }
    }, [activeTab]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleDelete = async (type: string, id: string) => {
        if (!confirm('本当に削除しますか？関連データもすべて削除されます。')) return;

        try {
            const res = await fetch('/api/admin/data-list', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, id }),
            });
            const result = await res.json();
            if (result.success) {
                fetchData();
            } else {
                alert('削除に失敗しました');
            }
        } catch (error) {
            alert('エラーが発生しました');
        }
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const tabs = [
        { id: 'visits', label: 'Visits' },
        { id: 'children', label: 'Children' },
        { id: 'profiles', label: 'Profiles' },
    ];

    return (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div className="flex gap-4">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={cn(
                                "text-sm font-medium pb-1 border-b-2 transition-colors",
                                activeTab === tab.id
                                    ? "border-blue-500 text-blue-600"
                                    : "border-transparent text-slate-500 hover:text-slate-700"
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                <button
                    onClick={fetchData}
                    disabled={isLoading}
                    className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
                >
                    <RefreshCcw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                    更新
                </button>
            </div>

            <div className="overflow-x-auto max-h-96">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 sticky top-0">
                        <tr>
                            {activeTab === 'visits' && (
                                <>
                                    <th className="text-left px-4 py-2 font-medium text-slate-600">子供</th>
                                    <th className="text-left px-4 py-2 font-medium text-slate-600">担当</th>
                                    <th className="text-left px-4 py-2 font-medium text-slate-600">Status</th>
                                    <th className="text-left px-4 py-2 font-medium text-slate-600">Step</th>
                                    <th className="text-left px-4 py-2 font-medium text-slate-600">Test</th>
                                    <th className="text-left px-4 py-2 font-medium text-slate-600">作成日時</th>
                                    <th className="text-left px-4 py-2 font-medium text-slate-600"></th>
                                </>
                            )}
                            {activeTab === 'children' && (
                                <>
                                    <th className="text-left px-4 py-2 font-medium text-slate-600">名前</th>
                                    <th className="text-left px-4 py-2 font-medium text-slate-600">親</th>
                                    <th className="text-left px-4 py-2 font-medium text-slate-600">Test</th>
                                    <th className="text-left px-4 py-2 font-medium text-slate-600">作成日時</th>
                                    <th className="text-left px-4 py-2 font-medium text-slate-600"></th>
                                </>
                            )}
                            {activeTab === 'profiles' && (
                                <>
                                    <th className="text-left px-4 py-2 font-medium text-slate-600">表示名</th>
                                    <th className="text-left px-4 py-2 font-medium text-slate-600">氏名</th>
                                    <th className="text-left px-4 py-2 font-medium text-slate-600">LINE ID</th>
                                    <th className="text-left px-4 py-2 font-medium text-slate-600">作成日時</th>
                                    <th className="text-left px-4 py-2 font-medium text-slate-600"></th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                                    データがありません
                                </td>
                            </tr>
                        )}
                        {activeTab === 'visits' && data.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50">
                                <td className="px-4 py-2">
                                    {item.children ? `${item.children.last_name} ${item.children.first_name}` : '-'}
                                </td>
                                <td className="px-4 py-2 text-slate-500 text-xs">
                                    {item.staff?.display_name || item.staff?.last_name || '-'}
                                </td>
                                <td className="px-4 py-2">
                                    <span className={cn(
                                        "text-xs px-2 py-0.5 rounded",
                                        item.status === 'completed' || item.status === 'published'
                                            ? "bg-emerald-100 text-emerald-700"
                                            : item.status === 'in_progress'
                                                ? "bg-blue-100 text-blue-700"
                                                : "bg-slate-100 text-slate-600"
                                    )}>
                                        {item.status}
                                    </span>
                                </td>
                                <td className="px-4 py-2">
                                    <span className="text-xs text-slate-500">{item.current_step || '-'}</span>
                                </td>
                                <td className="px-4 py-2">
                                    {item.is_test_data && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">TEST</span>}
                                </td>
                                <td className="px-4 py-2 text-slate-500">{formatDate(item.created_at)}</td>
                                <td className="px-4 py-2">
                                    <button
                                        onClick={() => handleDelete('visit', item.id)}
                                        className="text-red-500 hover:text-red-700 text-xs"
                                    >
                                        削除
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {activeTab === 'children' && data.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50">
                                <td className="px-4 py-2">{item.last_name} {item.first_name}</td>
                                <td className="px-4 py-2 text-slate-500">{item.profiles?.display_name || '-'}</td>
                                <td className="px-4 py-2">
                                    {item.is_test_data && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">TEST</span>}
                                </td>
                                <td className="px-4 py-2 text-slate-500">{formatDate(item.created_at)}</td>
                                <td className="px-4 py-2">
                                    <button
                                        onClick={() => handleDelete('child', item.id)}
                                        className="text-red-500 hover:text-red-700 text-xs"
                                    >
                                        削除
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {activeTab === 'profiles' && data.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50">
                                <td className="px-4 py-2">{item.display_name || '-'}</td>
                                <td className="px-4 py-2">{item.last_name} {item.first_name}</td>
                                <td className="px-4 py-2 font-mono text-xs text-slate-400">
                                    {item.line_user_id ? `${item.line_user_id.slice(0, 8)}...` : '-'}
                                </td>
                                <td className="px-4 py-2 text-slate-500">{formatDate(item.created_at)}</td>
                                <td className="px-4 py-2">
                                    <button
                                        onClick={() => handleDelete('profile', item.id)}
                                        className="text-red-500 hover:text-red-700 text-xs"
                                    >
                                        削除
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
