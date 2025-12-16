'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle2, Clock, Camera, Brain, FileText, Send, UserCheck } from 'lucide-react'
import { getStepDisplayName, type DiagnosisStep } from '@/lib/visit-steps'
import { cn } from '@/utils'

interface VisitRaw {
  id: string
  session_id: string
  current_step: DiagnosisStep | null
  step_timestamps: Record<string, string>
  booth_number: number | null
  error_info: any
  status: string
  children?: {
    first_name: string
    last_name: string
  }[]
  staff?: {
    display_name: string
  }[]
  created_at: string
}

interface Visit {
  id: string
  session_id: string
  current_step: DiagnosisStep | null
  step_timestamps: Record<string, string>
  booth_number: number | null
  error_info: any
  status: string
  children?: {
    first_name: string
    last_name: string
  }
  staff?: {
    display_name: string
  }
  created_at: string
}

const STEP_ICONS: Record<string, React.ReactNode> = {
  line_registered: <UserCheck className="w-4 h-4" />,
  questionnaire_completed: <FileText className="w-4 h-4" />,
  diagnosis_started: <Clock className="w-4 h-4" />,
  photos_uploaded: <Camera className="w-4 h-4" />,
  analysis_completed: <Brain className="w-4 h-4" />,
  report_generated: <FileText className="w-4 h-4" />,
  line_sent: <Send className="w-4 h-4" />,
  line_confirmed: <CheckCircle2 className="w-4 h-4" />,
}

const STEP_COLORS: Record<string, string> = {
  line_registered: 'bg-blue-100 text-blue-800',
  questionnaire_completed: 'bg-purple-100 text-purple-800',
  diagnosis_started: 'bg-yellow-100 text-yellow-800',
  photos_uploaded: 'bg-green-100 text-green-800',
  analysis_completed: 'bg-indigo-100 text-indigo-800',
  report_generated: 'bg-pink-100 text-pink-800',
  line_sent: 'bg-orange-100 text-orange-800',
  line_confirmed: 'bg-emerald-100 text-emerald-800',
}

export default function MonitorPage() {
  const [visits, setVisits] = useState<Visit[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errors, setErrors] = useState<any[]>([])

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 初期データ取得
    const fetchVisits = async () => {
      const { data, error } = await supabase
        .from('visits')
        .select(`
          id,
          session_id,
          current_step,
          step_timestamps,
          booth_number,
          error_info,
          status,
          created_at,
          children:child_id (
            first_name,
            last_name
          ),
          staff:staff_profile_id (
            display_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        console.error('Error fetching visits:', error)
      } else {
        // Supabaseのリレーションは配列で返されるので正規化
        const normalizedData: Visit[] = (data as VisitRaw[] || []).map(v => ({
          ...v,
          children: v.children?.[0] || undefined,
          staff: v.staff?.[0] || undefined,
        }))
        setVisits(normalizedData)
        // エラーがあるvisitsを抽出
        const errorVisits = normalizedData.filter(v => v.error_info && Array.isArray(v.error_info) && v.error_info.length > 0)
        setErrors(errorVisits)
      }
      setIsLoading(false)
    }

    fetchVisits()

    // リアルタイム購読
    const channel = supabase
      .channel('visits-monitor')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'visits',
        },
        (payload) => {
          console.log('Visit changed:', payload)
          fetchVisits()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // ブース別にグループ化
  const visitsByBooth = visits.reduce((acc, visit) => {
    const booth = visit.booth_number || 0
    if (!acc[booth]) acc[booth] = []
    acc[booth].push(visit)
    return acc
  }, {} as Record<number, Visit[]>)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">読み込み中...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">リアルタイム監視ダッシュボード</h1>
          <div className="flex gap-4">
            <Badge variant="outline">総数: {visits.length}</Badge>
            {errors.length > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                エラー: {errors.length}
              </Badge>
            )}
          </div>
        </div>

        {/* エラーポップアップ */}
        {errors.length > 0 && (
          <Card className="border-red-300 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-800 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                エラーが発生しています
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {errors.slice(0, 5).map((visit) => (
                  <div key={visit.id} className="bg-white p-3 rounded border border-red-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {visit.children ? `${visit.children.last_name} ${visit.children.first_name}` : visit.session_id}
                        </p>
                        <p className="text-sm text-gray-600">
                          {visit.error_info?.[0]?.type}: {visit.error_info?.[0]?.message}
                        </p>
                      </div>
                      <Badge variant="destructive">エラー</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ブース別表示 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((boothNum) => {
            const boothVisits = visitsByBooth[boothNum] || []
            return (
              <Card key={boothNum}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>ブース {boothNum}</span>
                    <Badge>{boothVisits.length}件</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {boothVisits.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">診断中の来場者なし</p>
                    ) : (
                      boothVisits.slice(0, 5).map((visit) => (
                        <div
                          key={visit.id}
                          className={cn(
                            "p-3 rounded-lg border",
                            visit.error_info ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"
                          )}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="font-medium text-sm">
                                {visit.children
                                  ? `${visit.children.last_name} ${visit.children.first_name}`
                                  : visit.session_id}
                              </p>
                              {visit.staff && (
                                <p className="text-xs text-gray-500">担当: {visit.staff.display_name}</p>
                              )}
                            </div>
                            {visit.error_info && (
                              <AlertCircle className="w-4 h-4 text-red-500" />
                            )}
                          </div>
                          {visit.current_step && (
                            <div className="flex items-center gap-2 mt-2">
                              {STEP_ICONS[visit.current_step]}
                              <Badge
                                className={cn(
                                  "text-xs",
                                  STEP_COLORS[visit.current_step] || "bg-gray-100 text-gray-800"
                                )}
                              >
                                {getStepDisplayName(visit.current_step)}
                              </Badge>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* 全体一覧 */}
        <Card>
          <CardHeader>
            <CardTitle>全体フロー一覧</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">セッションID</th>
                    <th className="text-left p-2">お子様名</th>
                    <th className="text-left p-2">担当スタッフ</th>
                    <th className="text-left p-2">ブース</th>
                    <th className="text-left p-2">現在のステップ</th>
                    <th className="text-left p-2">ステータス</th>
                    <th className="text-left p-2">エラー</th>
                  </tr>
                </thead>
                <tbody>
                  {visits.map((visit) => (
                    <tr key={visit.id} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-mono text-xs">{visit.session_id}</td>
                      <td className="p-2">
                        {visit.children
                          ? `${visit.children.last_name} ${visit.children.first_name}`
                          : '-'}
                      </td>
                      <td className="p-2">{visit.staff?.display_name || '-'}</td>
                      <td className="p-2">{visit.booth_number || '-'}</td>
                      <td className="p-2">
                        {visit.current_step ? (
                          <Badge
                            className={cn(
                              "text-xs",
                              STEP_COLORS[visit.current_step] || "bg-gray-100 text-gray-800"
                            )}
                          >
                            {getStepDisplayName(visit.current_step)}
                          </Badge>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="p-2">
                        <Badge variant="outline">{visit.status}</Badge>
                      </td>
                      <td className="p-2">
                        {visit.error_info && Array.isArray(visit.error_info) && visit.error_info.length > 0 ? (
                          <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                            <AlertCircle className="w-3 h-3" />
                            {visit.error_info.length}
                          </Badge>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


