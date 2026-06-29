import { redirect } from 'next/navigation'
import { getStaffSession } from '@/lib/staff-auth'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

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
      current_step,
      session_id,
      children (
        id,
        first_name,
        last_name,
        birthday,
        gender
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
    waiting: 'bg-amber-100 text-amber-700',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-emerald-100 text-emerald-700',
    published: 'bg-purple-100 text-purple-700',
    cancelled: 'bg-gray-100 text-gray-600',
  }

  const statusLabels: Record<string, string> = {
    waiting: '待機中',
    in_progress: '診断中',
    completed: '完了',
    published: '送信済',
    cancelled: '中止',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center px-4 py-3">
          <Link
            href="/staff/home"
            className="text-gray-600 hover:text-gray-900 mr-4 flex items-center gap-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold text-gray-900">対応履歴</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4">
        {Object.keys(groupedVisits).length > 0 ? (
          Object.entries(groupedVisits).map(([date, dateVisits]) => (
            <div key={date} className="mb-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-2 px-1">
                {date}
              </h2>
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100">
                {dateVisits?.map((visit) => {
                  const child = visit.children as any
                  const age = child?.birthday
                    ? Math.floor(
                      (Date.now() - new Date(child.birthday).getTime()) /
                      (365.25 * 24 * 60 * 60 * 1000)
                    )
                    : null

                  const honorific = child?.gender === 'male' ? 'くん' : 'ちゃん'

                  return (
                    <Link
                      key={visit.id}
                      href={`/staff/history/${visit.id}`}
                      className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 text-sm">
                          {child?.first_name}{honorific}
                          <span className="text-gray-400 font-normal ml-1 text-xs">
                            ({child?.last_name} {child?.first_name})
                          </span>
                          {age !== null && (
                            <span className="text-gray-500 ml-2 text-xs">
                              {age}歳
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {new Date(visit.visit_date).toLocaleString('ja-JP', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[visit.status] || 'bg-gray-100 text-gray-600'
                            }`}
                        >
                          {statusLabels[visit.status] || visit.status}
                        </span>
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm">対応履歴がありません</p>
            <p className="text-gray-400 text-xs mt-1">QRスキャンから診断を開始しましょう</p>
            <Link
              href="/staff/home"
              className="inline-flex items-center gap-2 text-coral-500 hover:text-coral-600 text-sm mt-4 font-medium"
            >
              ホームに戻る →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}








