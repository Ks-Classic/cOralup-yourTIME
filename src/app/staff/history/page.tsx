import { redirect } from 'next/navigation'
import { getStaffSession } from '@/lib/staff-auth'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

// Supabase クライアント (Service Role)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function StaffHistoryPage() {
  const session = await getStaffSession()

  if (!session) {
    redirect('/staff/login')
  }

  const { data: visits } = await supabase
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
    .limit(50)

  // 日付でグループ化
  const groupedVisits: Record<string, typeof visits> = {}
  visits?.forEach((visit) => {
    const date = new Date(visit.visit_date).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    if (!groupedVisits[date]) {
      groupedVisits[date] = []
    }
    groupedVisits[date]!.push(visit)
  })

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* ヘッダー */}
      <header className="bg-slate-800/50 backdrop-blur border-b border-slate-700 sticky top-0 z-10">
        <div className="flex items-center px-4 py-4">
          <Link
            href="/staff/home"
            className="text-emerald-400 hover:text-emerald-300 mr-4 flex items-center gap-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            戻る
          </Link>
          <h1 className="text-lg font-bold text-white">対応履歴</h1>
        </div>
      </header>

      <div className="p-4">
        {Object.keys(groupedVisits).length > 0 ? (
          Object.entries(groupedVisits).map(([date, dateVisits]) => (
            <div key={date} className="mb-6">
              <h2 className="text-sm font-medium text-slate-400 mb-3 px-1">
                {date}
              </h2>
              <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700 divide-y divide-slate-700">
                {dateVisits?.map((visit) => {
                  const child = visit.children as any
                  const age = child?.birthday
                    ? Math.floor(
                        (Date.now() - new Date(child.birthday).getTime()) /
                          (365.25 * 24 * 60 * 60 * 1000)
                      )
                    : null

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
                          {new Date(visit.visit_date).toLocaleTimeString('ja-JP', {
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
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700 p-12 text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-slate-400 mb-4">対応履歴がありません</p>
            <Link
              href="/staff/home"
              className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              QRスキャンで診断を開始
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

