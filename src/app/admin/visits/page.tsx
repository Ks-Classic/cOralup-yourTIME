import { redirect } from 'next/navigation'
import { getStaffSession } from '@/lib/staff-auth'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface PageProps {
  searchParams: Promise<{ staffId?: string; status?: string }>
}

export default async function AdminVisitsPage({ searchParams }: PageProps) {
  const session = await getStaffSession()
  const params = await searchParams

  // 管理者チェック（暫定対応）
  const adminApiKey = process.env.ADMIN_API_KEY
  const isAdmin = 
    (session && (session.role === 'admin' || session.role === 'staff')) ||
    !adminApiKey // 開発環境では許可

  if (!isAdmin && adminApiKey) {
    redirect('/staff/login')
  }

  // スタッフ一覧取得
  const { data: staffList } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, display_name')
    .or('role.eq.staff,secondary_role.eq.staff,role.eq.admin')
    .order('last_name')

  // 履歴取得
  const staffId = params.staffId
  const status = params.status

  let query = supabase
    .from('visits')
    .select(
      `
      id,
      visit_date,
      status,
      session_id,
      staff_profile_id,
      children (
        id,
        first_name,
        last_name,
        birthday,
        gender
      ),
      profiles!visits_staff_profile_id_fkey (
        id,
        first_name,
        last_name,
        display_name
      )
    `
    )
    .order('visit_date', { ascending: false })
    .limit(100)

  if (staffId) {
    query = query.eq('staff_profile_id', staffId)
  }

  if (status) {
    query = query.eq('status', status)
  } else {
    query = query.in('status', ['diagnosis_completed', 'report_sent'])
  }

  const { data: visits } = await query

  // 日付でグループ化
  const groupedVisits: Record<string, typeof visits> = {}
  visits?.forEach((visit) => {
    const date = new Date(visit.visit_date || visit.created_at).toLocaleDateString('ja-JP', {
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
    diagnosis_completed: 'bg-green-500/20 text-green-400',
  }

  const statusLabels: Record<string, string> = {
    waiting: '待機中',
    in_progress: '診断中',
    completed: '完了',
    report_sent: '送信済',
    diagnosis_completed: '診断完了',
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* ヘッダー */}
      <header className="bg-slate-800/50 backdrop-blur border-b border-slate-700 sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              管理ダッシュボード
            </Link>
            <h1 className="text-lg font-bold text-white">対応履歴管理</h1>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* フィルタ */}
        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-4 border border-slate-700">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm text-slate-400 mb-1">スタッフ</label>
              <select
                className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 border border-slate-600"
                defaultValue={staffId || ''}
                onChange={(e) => {
                  const url = new URL(window.location.href)
                  if (e.target.value) {
                    url.searchParams.set('staffId', e.target.value)
                  } else {
                    url.searchParams.delete('staffId')
                  }
                  window.location.href = url.toString()
                }}
              >
                <option value="">全スタッフ</option>
                {staffList?.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.display_name || `${staff.last_name || ''}${staff.first_name || ''}`}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm text-slate-400 mb-1">ステータス</label>
              <select
                className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 border border-slate-600"
                defaultValue={status || ''}
                onChange={(e) => {
                  const url = new URL(window.location.href)
                  if (e.target.value) {
                    url.searchParams.set('status', e.target.value)
                  } else {
                    url.searchParams.delete('status')
                  }
                  window.location.href = url.toString()
                }}
              >
                <option value="">全て</option>
                <option value="diagnosis_completed">診断完了</option>
                <option value="report_sent">送信済</option>
                <option value="in_progress">診断中</option>
                <option value="waiting">待機中</option>
              </select>
            </div>
          </div>
        </div>

        {/* 履歴一覧 */}
        <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700 overflow-hidden">
          {visits && visits.length > 0 ? (
            Object.entries(groupedVisits).map(([date, dateVisits]) => (
              <div key={date} className="border-b border-slate-700 last:border-b-0">
                <div className="px-4 py-3 bg-slate-700/50">
                  <h2 className="text-sm font-semibold text-slate-300">{date}</h2>
                </div>
                <div className="divide-y divide-slate-700">
                  {dateVisits?.map((visit) => {
                    const child = visit.children as any
                    const staff = visit.profiles as any
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
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-white">
                            {child?.last_name}
                            {child?.first_name}
                            {age !== null && (
                              <span className="text-slate-400 ml-2 text-sm">
                                ({age}歳)
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-slate-400 mt-1">
                            スタッフ: {staff?.display_name || `${staff?.last_name || ''}${staff?.first_name || ''}` || '未設定'}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {new Date(visit.visit_date || visit.created_at).toLocaleTimeString('ja-JP', {
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
            <div className="p-8 text-center">
              <p className="text-slate-400">対応履歴がありません</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


