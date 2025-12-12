import { redirect } from 'next/navigation'
import { getStaffSession } from '@/lib/staff-auth'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

// Supabase クライアント (Service Role)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function StaffHomePage() {
  const session = await getStaffSession()

  if (!session) {
    redirect('/staff/login')
  }

  // 最近の対応を取得
  const { data: recentVisits } = await supabase
    .from('visits')
    .select(`
      id,
      visit_date,
      status,
      session_id,
      children (
        id,
        first_name,
        last_name,
        birthday
      )
    `)
    .eq('staff_profile_id', session.staffId)
    .order('visit_date', { ascending: false })
    .limit(5)

  // 今日の対応数
  const today = new Date().toISOString().split('T')[0]
  const { count: todayCount } = await supabase
    .from('visits')
    .select('*', { count: 'exact', head: true })
    .eq('staff_profile_id', session.staffId)
    .gte('visit_date', `${today}T00:00:00`)
    .lte('visit_date', `${today}T23:59:59`)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* ヘッダー */}
      <header className="bg-slate-800/50 backdrop-blur border-b border-slate-700 sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">cOralup Staff</h1>
            <p className="text-sm text-slate-400">
              ようこそ、{session.staffName}さん
            </p>
          </div>
          <Link
            href="/staff/logout"
            className="text-slate-400 hover:text-slate-300 text-sm"
          >
            ログアウト
          </Link>
        </div>
      </header>

      {/* 統計カード */}
      <div className="p-4">
        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-4 border border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-slate-400 text-sm">今日の対応数</p>
              <p className="text-2xl font-bold text-white">{todayCount || 0}件</p>
            </div>
          </div>
        </div>
      </div>

      {/* メインメニュー */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4">
          <Link
            href="/staff/session/new"
            className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl p-6 text-center transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            <div className="font-semibold">QRスキャン</div>
            <div className="text-emerald-100 text-sm mt-1">診断を開始</div>
          </Link>

          <Link
            href="/staff/history"
            className="bg-slate-800/50 backdrop-blur hover:bg-slate-700/50 border border-slate-700 rounded-2xl p-6 text-center transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="w-14 h-14 bg-slate-700 rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div className="font-semibold text-white">対応履歴</div>
            <div className="text-slate-400 text-sm mt-1">過去の記録</div>
          </Link>
        </div>
      </div>

      {/* 最近の対応 */}
      <div className="p-4">
        <h2 className="text-sm font-medium text-slate-400 mb-3 px-1">最近の対応</h2>
        <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700 divide-y divide-slate-700">
          {recentVisits && recentVisits.length > 0 ? (
            recentVisits.map((visit) => {
              const child = visit.children as any
              const age = child?.birthday
                ? Math.floor(
                    (Date.now() - new Date(child.birthday).getTime()) /
                      (365.25 * 24 * 60 * 60 * 1000)
                  )
                : null

              const statusColors: Record<string, string> = {
                waiting: 'bg-amber-500/20 text-amber-400',
                in_progress: 'bg-blue-500/20 text-blue-400',
                completed: 'bg-emerald-500/20 text-emerald-400',
                report_sent: 'bg-purple-500/20 text-purple-400',
              }

              const statusLabels: Record<string, string> = {
                waiting: '待機中',
                in_progress: '診断中',
                completed: '完了',
                report_sent: '送信済',
              }

              return (
                <Link
                  key={visit.id}
                  href={`/staff/history/${visit.session_id}`}
                  className="flex items-center justify-between p-4 hover:bg-slate-700/30 transition-colors"
                >
                  <div>
                    <div className="font-medium text-white">
                      {child?.last_name}
                      {child?.first_name}
                      {age !== null && (
                        <span className="text-slate-400 ml-2 text-sm">
                          ({age}歳)
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-slate-400">
                      {new Date(visit.visit_date).toLocaleString('ja-JP', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full ${
                        statusColors[visit.status] || 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {statusLabels[visit.status] || visit.status}
                    </span>
                    <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              )
            })
          ) : (
            <div className="p-8 text-center text-slate-400">
              <svg className="w-12 h-12 mx-auto mb-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              まだ対応履歴がありません
            </div>
          )}
        </div>

        {recentVisits && recentVisits.length > 0 && (
          <Link
            href="/staff/history"
            className="block text-center text-emerald-400 hover:text-emerald-300 text-sm mt-4 py-2"
          >
            すべての履歴を見る →
          </Link>
        )}
      </div>
    </div>
  )
}





