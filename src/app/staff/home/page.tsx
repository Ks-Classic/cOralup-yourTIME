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

  // 最近の対応を取得（診断完了または送信済みのみ）
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
        birthday,
        gender
      )
    `)
    .eq('staff_profile_id', session.staffId)
    .in('status', ['diagnosis_completed', 'report_sent'])
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
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-coral-500 rounded-xl flex items-center justify-center">
                <span className="text-white text-lg font-bold">🦷</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">cOralup Staff</h1>
                <p className="text-xs text-gray-500">
                  {session.staffName}さん
                </p>
              </div>
            </div>
            <Link
              href="/staff/logout"
              className="text-gray-400 hover:text-gray-600 text-sm px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              ログアウト
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* 統計カード */}
        <div className="bg-gradient-to-r from-coral-500 to-orange-400 rounded-2xl p-4 text-white shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-white/80 text-sm">今日の対応数</p>
              <p className="text-3xl font-bold">{todayCount || 0}<span className="text-lg ml-1">件</span></p>
            </div>
          </div>
        </div>

        {/* メインメニュー */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/staff/scan"
            className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl p-5 text-center transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md"
          >
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            <div className="font-bold text-base">QRスキャン</div>
            <div className="text-emerald-100 text-xs mt-0.5">診断を開始</div>
          </Link>

          <Link
            href="/staff/diagnosis/demo"
            className="bg-blue-500 hover:bg-blue-600 text-white rounded-2xl p-5 text-center transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md"
          >
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div className="font-bold text-base">デモモード</div>
            <div className="text-blue-100 text-xs mt-0.5">操作練習</div>
          </Link>

          <Link
            href="/staff/history"
            className="bg-white hover:bg-gray-50 border border-gray-200 rounded-2xl p-5 text-center transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm"
          >
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-2">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div className="font-bold text-base text-gray-800">対応履歴</div>
            <div className="text-gray-500 text-xs mt-0.5">過去の記録</div>
          </Link>

          <Link
            href="/staff/settings"
            className="bg-white hover:bg-gray-50 border border-gray-200 rounded-2xl p-5 text-center transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm"
          >
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-2">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="font-bold text-base text-gray-800">設定</div>
            <div className="text-gray-500 text-xs mt-0.5">アカウント情報</div>
          </Link>
        </div>

        {/* 最近の対応 */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-2 px-1">最近の対応</h2>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100">
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
                  waiting: 'bg-amber-100 text-amber-700',
                  in_progress: 'bg-blue-100 text-blue-700',
                  completed: 'bg-emerald-100 text-emerald-700',
                  report_sent: 'bg-purple-100 text-purple-700',
                  diagnosis_completed: 'bg-green-100 text-green-700',
                }

                const statusLabels: Record<string, string> = {
                  waiting: '待機中',
                  in_progress: '診断中',
                  completed: '完了',
                  report_sent: '送信済',
                  diagnosis_completed: '診断完了',
                }

                const honorific = child?.gender === 'male' ? 'くん' : 'ちゃん'

                return (
                  <Link
                    key={visit.id}
                    href={`/staff/history/${visit.session_id}`}
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
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          statusColors[visit.status] || 'bg-gray-100 text-gray-600'
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
              })
            ) : (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm">まだ対応履歴がありません</p>
                <p className="text-gray-400 text-xs mt-1">QRスキャンから診断を開始しましょう</p>
              </div>
            )}
          </div>

          {recentVisits && recentVisits.length > 0 && (
            <Link
              href="/staff/history"
              className="block text-center text-coral-500 hover:text-coral-600 text-sm mt-3 py-2 font-medium"
            >
              すべての履歴を見る →
            </Link>
          )}
        </div>

        {/* ヘルプカード */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-800">
            <strong>💡 使い方ヒント</strong><br />
            <span className="text-xs text-blue-600">
              1. QRスキャンで親御さんのQRコードを読み取り<br />
              2. お子様の情報を確認して診断開始<br />
              3. 写真撮影→診断入力→AI分析→LINE送信
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}





