'use client'

import { Suspense } from 'react'
import { VisitsHistory } from '../components/VisitsHistory'

export default function AdminVisitsPage() {
  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">履歴管理</h1>
        <p className="text-sm text-slate-500 mt-1">過去の対応履歴を検索・確認</p>
      </div>

      {/* 履歴一覧 */}
      <Suspense fallback={
        <div className="p-8 text-center text-slate-500">読み込み中...</div>
      }>
        <VisitsHistory />
      </Suspense>
    </div>
  )
}
