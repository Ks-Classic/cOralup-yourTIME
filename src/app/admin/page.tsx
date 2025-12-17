'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/utils';
import RealtimeMonitor from './components/RealtimeMonitor';
import { VisitsHistory } from './components/VisitsHistory';
import { Activity, ClipboardList, PenTool, LayoutDashboard, LineChart } from 'lucide-react';

function AdminDashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const tab = searchParams.get('tab') || 'realtime';

  const tabs = [
    { id: 'realtime', label: 'リアルタイム', icon: Activity },
    { id: 'history', label: '履歴管理', icon: ClipboardList },
    { id: 'schema', label: 'スキーマ編集', icon: PenTool, href: '/admin/schema-editor' }, // Direct link as per design doc? Doc says `/admin/schema-editor` which is a separate page.
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
          {tab === 'realtime' && <RealtimeMonitor />}

          {tab === 'history' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800">対応履歴</h2>
              </div>
              <VisitsHistory />
            </div>
          )}

          {/* Fallback for unknown tabs */}
          {!['realtime', 'history'].includes(tab) && (
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
