'use client';

import { useState } from 'react';
import RealtimeMonitor from './components/RealtimeMonitor';

export default function AdminDashboard() {
  // 開発環境の場合はデフォルトでサンプルデータを表示
  const [useSampleData, setUseSampleData] = useState(process.env.NODE_ENV === 'development');

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">リアルタイムモニター</h1>
          <p className="text-sm text-slate-500 mt-1">現在進行中のセッションを監視</p>
        </div>

        {/* サンプルデータトグル */}
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

      {/* リアルタイムモニター */}
      <RealtimeMonitor useSampleData={useSampleData} />
    </div>
  );
}
