'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'
import { cn } from '@/utils'

const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Staff {
    id: string
    first_name: string | null
    last_name: string | null
    display_name: string | null
}

interface Visit {
    id: string
    visit_date: string
    created_at: string
    status: string
    session_id: string
    staff_profile_id: string | null
    children: {
        id: string
        first_name: string
        last_name: string
        birthday: string | null
        gender: string | null
    } | null
    profiles: Staff | null
}

export function VisitsHistory() {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [staffList, setStaffList] = useState<Staff[]>([])
    const [visits, setVisits] = useState<Visit[]>([])
    const [loading, setLoading] = useState(true)

    const staffId = searchParams.get('staffId') || ''
    const status = searchParams.get('status') || ''

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)

            // スタッフ一覧取得
            const { data: staffData } = await supabase
                .from('profiles')
                .select('id, first_name, last_name, display_name')
                .or('role.eq.staff,secondary_role.eq.staff,role.eq.admin')
                .order('last_name')

            if (staffData) {
                setStaffList(staffData)
            }

            // 履歴取得
            let query = supabase
                .from('visits')
                .select(`
          id,
          visit_date,
          created_at,
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
        `)
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

            const { data: visitsData } = await query

            if (visitsData) {
                setVisits(visitsData as unknown as Visit[])
            }

            setLoading(false)
        }

        fetchData()
    }, [staffId, status])

    const handleFilterChange = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString())
        if (value) {
            params.set(key, value)
        } else {
            params.delete(key)
        }
        // Maintain tab if on admin dashboard
        if (!params.has('tab') && pathname === '/admin') {
            params.set('tab', 'history')
        }
        router.push(`${pathname}?${params.toString()}`)
    }

    // 日付でグループ化
    const groupedVisits: Record<string, Visit[]> = {}
    visits.forEach((visit) => {
        const date = new Date(visit.visit_date || visit.created_at).toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        })
        if (!groupedVisits[date]) {
            groupedVisits[date] = []
        }
        groupedVisits[date].push(visit)
    })

    // White theme colors
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

    return (
        <div className="space-y-4">
            {/* フィルタ */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                <div className="flex flex-wrap gap-3">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-medium text-slate-500 mb-1">スタッフ</label>
                        <select
                            className="w-full bg-slate-50 text-slate-900 rounded-lg px-3 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            value={staffId}
                            onChange={(e) => handleFilterChange('staffId', e.target.value)}
                        >
                            <option value="">全スタッフ</option>
                            {staffList.map((staff) => (
                                <option key={staff.id} value={staff.id}>
                                    {staff.display_name || `${staff.last_name || ''}${staff.first_name || ''}`}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-medium text-slate-500 mb-1">ステータス</label>
                        <select
                            className="w-full bg-slate-50 text-slate-900 rounded-lg px-3 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            value={status}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
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
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto"></div>
                        <p className="text-slate-400 mt-2">読み込み中...</p>
                    </div>
                ) : visits.length > 0 ? (
                    Object.entries(groupedVisits).map(([date, dateVisits]) => (
                        <div key={date} className="border-b border-slate-100 last:border-b-0">
                            <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                                <h2 className="text-xs font-semibold text-slate-500">{date}</h2>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {dateVisits.map((visit) => {
                                    const child = visit.children
                                    const staff = visit.profiles
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
                                            className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-slate-900 flex items-center gap-2">
                                                    {child?.last_name} {child?.first_name}
                                                    {age !== null && (
                                                        <span className="text-slate-500 font-normal text-sm">
                                                            ({age}歳)
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                                                    <span className="bg-slate-100 px-1.5 rounded text-xs text-slate-600">担当</span>
                                                    {staff?.display_name || `${staff?.last_name || ''}${staff?.first_name || ''}` || '未設定'}
                                                </div>
                                                <div className="text-xs text-slate-400 mt-1">
                                                    {new Date(visit.visit_date || visit.created_at).toLocaleTimeString('ja-JP', {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span
                                                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[visit.status] || 'bg-slate-100 text-slate-500'
                                                        }`}
                                                >
                                                    {statusLabels[visit.status] || visit.status}
                                                </span>
                                                <svg className="w-5 h-5 text-slate-300 group-hover:text-slate-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    )
}
