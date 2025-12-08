'use client'

import Link from 'next/link'

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">管理ダッシュボード</h1>
        <p className="text-slate-600 mt-1">cOralupシステムの管理機能</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* スキーマエディタカード */}
        <Link
          href="/admin/schema-editor"
          className="block bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">
              📝
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">スキーマエディタ</h2>
              <p className="text-sm text-slate-500">問診票・診断項目の編集</p>
            </div>
          </div>
          <div className="mt-4 text-sm text-slate-600">
            <ul className="space-y-1">
              <li>• 問診票項目の追加・編集・削除</li>
              <li>• 診断項目の追加・編集・削除</li>
              <li>• リアルタイムプレビュー</li>
            </ul>
          </div>
        </Link>

        {/* セッション管理カード */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 opacity-60">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-2xl">
              📋
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">セッション管理</h2>
              <p className="text-sm text-slate-500">Coming Soon</p>
            </div>
          </div>
        </div>

        {/* データ分析カード */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 opacity-60">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-2xl">
              📊
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">データ分析</h2>
              <p className="text-sm text-slate-500">Coming Soon</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

