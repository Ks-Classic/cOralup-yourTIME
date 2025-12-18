'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/utils';
import RealtimeMonitor from './components/RealtimeMonitor';
import { VisitsHistory } from './components/VisitsHistory';
import { Activity, ClipboardList, PenTool, LayoutDashboard, LineChart, Wrench, Trash2, RefreshCcw, Plus } from 'lucide-react';

// 開発ツールパネル
function DevToolsPanel() {
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
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-blue-800 font-semibold flex items-center gap-2">
          <Wrench className="w-5 h-5" />
          テストデータ管理ツール
        </h3>
        <p className="text-blue-700 text-sm mt-1">
          テスト用データの生成・リセット・削除ができます。本番イベント前に「一括削除」でテストデータをクリーンアップしてください。
        </p>
      </div>

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
    </div>
  );
}

function AdminDashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const tab = searchParams.get('tab') || 'realtime';
  // 開発環境の場合はデフォルトでサンプルデータを表示
  const [useSampleData, setUseSampleData] = useState(process.env.NODE_ENV === 'development');

  const tabs = [
    { id: 'realtime', label: 'リアルタイム', icon: Activity },
    { id: 'history', label: '履歴管理', icon: ClipboardList },
    { id: 'schema', label: 'スキーマ編集', icon: PenTool, href: '/admin/schema-editor' },
    { id: 'devtools', label: '開発ツール', icon: Wrench, devOnly: true },
    { id: 'analytics', label: '分析', icon: LineChart, disabled: true },
  ];

  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tabId);
    // Remove other filters possibly set by VisitsHistory if switching away? 
    // Actually typically we want to keep them if we switch back, but here we are replacing query.
    // For simplicity, just set tab.
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                  A
                </div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">管理ダッシュボード</h1>
              </div>

              {/* Desktop Tabs */}
              <div className="hidden sm:ml-10 sm:flex sm:space-x-8">
                {tabs.map((t) => {
                  const Icon = t.icon;
                  const isActive = tab === t.id;

                  if (t.href) {
                    return (
                      <Link
                        key={t.id}
                        href={t.href}
                        className={cn(
                          "inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors",
                          "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                        )}
                      >
                        <Icon className="w-4 h-4 mr-2" />
                        {t.label}
                      </Link>
                    );
                  }

                  if (t.disabled) {
                    return (
                      <span
                        key={t.id}
                        className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-slate-300 cursor-not-allowed"
                      >
                        <Icon className="w-4 h-4 mr-2" />
                        {t.label} (Coming)
                      </span>
                    );
                  }

                  return (
                    <button
                      key={t.id}
                      onClick={() => handleTabChange(t.id)}
                      className={cn(
                        "inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors focus:outline-none",
                        isActive
                          ? "border-emerald-500 text-emerald-600"
                          : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                      )}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center">
              {/* Optional User Menu? */}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Tabs */}
      <div className="sm:hidden border-b border-slate-200 bg-white overflow-x-auto">
        <div className="flex px-4 space-x-6 min-w-max">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = tab === t.id;
            if (t.disabled) return null;

            const className = cn(
              "flex items-center py-3 text-sm font-medium border-b-2 whitespace-nowrap",
              isActive ? "border-emerald-500 text-emerald-600" : "border-transparent text-slate-500"
            );

            if (t.href) {
              return <Link key={t.id} href={t.href} className={className}><Icon className="w-4 h-4 mr-2" />{t.label}</Link>;
            }

            return (
              <button key={t.id} onClick={() => handleTabChange(t.id)} className={className}>
                <Icon className="w-4 h-4 mr-2" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {tab === 'realtime' && (
            <div className="space-y-4">
              {/* Demo Toggle (Only in Dev or explicit) */}
              <div className="flex justify-end">
                <label className="flex items-center cursor-pointer gap-2 text-sm text-slate-500 hover:text-slate-700">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={useSampleData}
                      onChange={(e) => setUseSampleData(e.target.checked)}
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                  </div>
                  <span>サンプルデータ</span>
                </label>
              </div>
              <RealtimeMonitor useSampleData={useSampleData} />
            </div>
          )}

          {tab === 'history' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800">対応履歴</h2>
              </div>
              <VisitsHistory />
            </div>
          )}

          {tab === 'devtools' && <DevToolsPanel />}

          {/* Fallback for unknown tabs */}
          {!['realtime', 'history', 'devtools'].includes(tab) && (
            <div className="text-center py-20 bg-white rounded-lg border border-slate-200">
              <p className="text-slate-500">タブが見つかりません: {tab}</p>
              <button
                onClick={() => handleTabChange('realtime')}
                className="mt-4 text-emerald-600 font-medium hover:underline"
              >
                リアルタイムモニターに戻る
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    }>
      <AdminDashboardContent />
    </Suspense>
  );
}
