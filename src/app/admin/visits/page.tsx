'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { VisitsHistory } from '../components/VisitsHistory'

export default function AdminVisitsPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* ヘッダー */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="text-slate-600 hover:text-slate-900 flex items-center gap-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              管理ダッシュボード
            </Link>
            <h1 className="text-lg font-bold text-slate-900">対応履歴管理</h1>
          </div>
        </div>
      </header>

      <div className="p-4 bg-slate-50 min-h-[calc(100vh-65px)]">
        <div className="max-w-4xl mx-auto">
          <Suspense fallback={
            <div className="p-8 text-center text-slate-500">読み込み中...</div>
          }>
            <VisitsHistory />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
