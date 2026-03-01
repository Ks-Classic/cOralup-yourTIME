'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle2, Clock, Camera, Brain, FileText, Send, UserCheck, Bell, BellOff, RefreshCw } from 'lucide-react'
import { getStepDisplayName, getStepOrder, type DiagnosisStep } from '@/lib/visit-steps'
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

const ALL_STEPS: DiagnosisStep[] = [
  'line_registered',
  'questionnaire_completed',
  'diagnosis_started',
  'photos_uploaded',
  'analysis_completed',
  'report_generated',
  'line_sent',
  'line_confirmed',
]

const STEP_ICONS: Record<string, React.ReactNode> = {
  line_registered: <UserCheck className="w-3.5 h-3.5" />,
  questionnaire_completed: <FileText className="w-3.5 h-3.5" />,
  diagnosis_started: <Clock className="w-3.5 h-3.5" />,
  photos_uploaded: <Camera className="w-3.5 h-3.5" />,
  analysis_completed: <Brain className="w-3.5 h-3.5" />,
  report_generated: <FileText className="w-3.5 h-3.5" />,
  line_sent: <Send className="w-3.5 h-3.5" />,
  line_confirmed: <CheckCircle2 className="w-3.5 h-3.5" />,
}

const STEP_COLORS: Record<string, string> = {
  line_registered: 'bg-blue-100 text-blue-800 border-blue-200',
  questionnaire_completed: 'bg-purple-100 text-purple-800 border-purple-200',
  diagnosis_started: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  photos_uploaded: 'bg-green-100 text-green-800 border-green-200',
  analysis_completed: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  report_generated: 'bg-pink-100 text-pink-800 border-pink-200',
  line_sent: 'bg-orange-100 text-orange-800 border-orange-200',
  line_confirmed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
}

const STEP_SHORT_LABELS: Record<string, string> = {
  line_registered: 'LINE',
  questionnaire_completed: '問診',
  diagnosis_started: '診断',
  photos_uploaded: '📷',
  analysis_completed: 'AI',
  report_generated: '📄',
  line_sent: '送信',
  line_confirmed: '✅',
}

function formatTime(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
}

function getElapsedMinutes(startIso: string): number {
  return Math.floor((Date.now() - new Date(startIso).getTime()) / 60000)
}

export default function MonitorPage() {
  const [visits, setVisits] = useState<Visit[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorVisits, setErrorVisits] = useState<Visit[]>([])
  const [newErrorCount, setNewErrorCount] = useState(0)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const prevErrorCountRef = useRef(0)

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
        const errors = normalizedData.filter(v =>
          v.error_info && Array.isArray(v.error_info) && v.error_info.length > 0
        )

        // 新しいエラーが増えたかチェック
        const totalErrors = errors.reduce((sum, v) => sum + (v.error_info?.length || 0), 0)
        if (totalErrors > prevErrorCountRef.current && prevErrorCountRef.current > 0) {
          setNewErrorCount(prev => prev + (totalErrors - prevErrorCountRef.current))
          // 音声通知
          if (soundEnabled) {
            try {
              const audioContext = new AudioContext()
              const oscillator = audioContext.createOscillator()
              const gainNode = audioContext.createGain()
              oscillator.connect(gainNode)
              gainNode.connect(audioContext.destination)
              oscillator.frequency.value = 880
              oscillator.type = 'sine'
              gainNode.gain.value = 0.3
              oscillator.start()
              setTimeout(() => {
                oscillator.stop()
                audioContext.close()
              }, 200)
            } catch { /* 音声は最善努力 */ }
          }
        }
        prevErrorCountRef.current = totalErrors

        setErrorVisits(errors)
        setLastUpdate(new Date())
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
        () => {
          fetchVisits()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [soundEnabled])

  // タブタイトル更新
  useEffect(() => {
    const totalErrors = errorVisits.reduce((sum, v) => sum + (v.error_info?.length || 0), 0)
    const activeVisits = visits.filter(v => v.status === 'in_progress').length
    if (totalErrors > 0) {
      document.title = `🔴 (${totalErrors}) エラー - 監視ダッシュボード`
    } else if (activeVisits > 0) {
      document.title = `🟢 ${activeVisits}件進行中 - 監視ダッシュボード`
    } else {
      document.title = '監視ダッシュボード'
    }
  }, [errorVisits, visits])

  // ブース別にグループ化
  const visitsByBooth = visits.reduce((acc, visit) => {
    const booth = visit.booth_number || 0
    if (!acc[booth]) acc[booth] = []
    acc[booth].push(visit)
    return acc
  }, {} as Record<number, Visit[]>)

  // 進行中のvisitsのみ
  const activeVisits = visits.filter(v =>
    v.status === 'in_progress' ||
    v.status === 'questionnaire_in_progress' ||
    v.status === 'diagnosis_completed'
  )

  // 統計
  const stats = {
    total: visits.length,
    active: activeVisits.length,
    completed: visits.filter(v => v.status === 'report_sent' || v.status === 'completed').length,
    errors: errorVisits.length,
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse text-gray-400">読み込み中...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* ヘッダー */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">リアルタイム監視</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              最終更新: {formatTime(lastUpdate.toISOString())}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* 統計バッジ */}
            <div className="flex gap-2 text-xs">
              <span className="px-2 py-1 bg-gray-800 rounded-full text-gray-300">
                全 {stats.total}
              </span>
              <span className="px-2 py-1 bg-blue-900/50 rounded-full text-blue-300">
                🔵 進行中 {stats.active}
              </span>
              <span className="px-2 py-1 bg-green-900/50 rounded-full text-green-300">
                🟢 完了 {stats.completed}
              </span>
              {stats.errors > 0 && (
                <span className="px-2 py-1 bg-red-900/50 rounded-full text-red-300 animate-pulse">
                  🔴 エラー {stats.errors}
                </span>
              )}
            </div>
            {/* 音声トグル */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={cn(
                "p-2 rounded-lg transition-colors",
                soundEnabled ? "bg-gray-800 text-white" : "bg-gray-900 text-gray-600"
              )}
              title={soundEnabled ? 'エラー通知音ON' : 'エラー通知音OFF'}
            >
              {soundEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* エラーアラートバナー */}
        {errorVisits.length > 0 && (
          <div className="bg-red-950 border border-red-800 rounded-xl p-4 animate-pulse-subtle">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <h2 className="font-bold text-red-300">
                エラー発生中 ({errorVisits.reduce((sum, v) => sum + (v.error_info?.length || 0), 0)}件)
              </h2>
              {newErrorCount > 0 && (
                <Badge className="bg-red-600 text-white text-xs">
                  +{newErrorCount} NEW
                </Badge>
              )}
              <button
                onClick={() => setNewErrorCount(0)}
                className="ml-auto text-xs text-red-400 hover:text-red-200 transition-colors"
              >
                既読にする
              </button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {errorVisits.map((visit) => (
                <div key={visit.id} className="bg-red-900/40 p-3 rounded-lg border border-red-800/50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm text-red-200">
                        {visit.children ? `${visit.children.last_name} ${visit.children.first_name}` : visit.session_id.slice(0, 8)}
                        {visit.staff && <span className="text-red-400 ml-2 text-xs">担当: {visit.staff.display_name}</span>}
                      </p>
                      {visit.error_info?.map((err: any, i: number) => (
                        <p key={i} className="text-xs text-red-300 mt-1">
                          <span className="bg-red-800 px-1.5 py-0.5 rounded text-red-200 mr-1.5">{err.type}</span>
                          {err.message}
                          {err.occurred_at && (
                            <span className="text-red-500 ml-2">{formatTime(err.occurred_at)}</span>
                          )}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 進行中カード一覧 */}
        {activeVisits.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">進行中</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {activeVisits.map((visit) => {
                const hasError = visit.error_info && Array.isArray(visit.error_info) && visit.error_info.length > 0
                const elapsed = getElapsedMinutes(visit.created_at)
                const isLong = elapsed > 30

                return (
                  <div
                    key={visit.id}
                    className={cn(
                      "rounded-xl border p-4 transition-all",
                      hasError
                        ? "bg-red-950/50 border-red-800"
                        : isLong
                          ? "bg-yellow-950/30 border-yellow-800/50"
                          : "bg-gray-900 border-gray-800"
                    )}
                  >
                    {/* 名前・スタッフ */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-bold text-sm text-white">
                          {visit.children
                            ? `${visit.children.last_name} ${visit.children.first_name}`
                            : visit.session_id.slice(0, 8)}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {visit.staff && (
                            <span className="text-xs text-gray-500">👤 {visit.staff.display_name}</span>
                          )}
                          {visit.booth_number && (
                            <span className="text-xs text-gray-500">🪑 B{visit.booth_number}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {hasError && <AlertCircle className="w-4 h-4 text-red-400" />}
                        <span className={cn(
                          "text-xs",
                          isLong ? "text-yellow-400" : "text-gray-500"
                        )}>
                          {elapsed}分
                        </span>
                      </div>
                    </div>

                    {/* 進捗タイムライン */}
                    <div className="flex gap-0.5">
                      {ALL_STEPS.map((step) => {
                        const isDone = visit.step_timestamps?.[step]
                        const isCurrent = visit.current_step === step
                        return (
                          <div
                            key={step}
                            className={cn(
                              "flex-1 h-7 rounded flex items-center justify-center text-xs font-medium transition-all",
                              isDone
                                ? STEP_COLORS[step] || 'bg-green-800 text-green-200'
                                : isCurrent
                                  ? "bg-blue-600 text-white animate-pulse"
                                  : "bg-gray-800 text-gray-600"
                            )}
                            title={`${getStepDisplayName(step)}${isDone ? ` (${formatTime(visit.step_timestamps[step])})` : ''}`}
                          >
                            {STEP_SHORT_LABELS[step]}
                          </div>
                        )
                      })}
                    </div>

                    {/* 最新エラー表示 */}
                    {hasError && (
                      <div className="mt-2 text-xs text-red-300 bg-red-900/30 rounded px-2 py-1 truncate">
                        ⚠ {visit.error_info[visit.error_info.length - 1]?.message}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 全体一覧テーブル */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-gray-200 flex items-center justify-between">
              <span>全体フロー一覧</span>
              <span className="text-xs text-gray-500 font-normal">{visits.length}件</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400">
                    <th className="text-left p-2 text-xs">お子様名</th>
                    <th className="text-left p-2 text-xs">担当</th>
                    <th className="text-left p-2 text-xs">ブース</th>
                    <th className="text-left p-2 text-xs">進捗</th>
                    <th className="text-left p-2 text-xs">ステータス</th>
                    <th className="text-left p-2 text-xs">開始</th>
                    <th className="text-left p-2 text-xs">エラー</th>
                  </tr>
                </thead>
                <tbody>
                  {visits.map((visit) => {
                    const hasError = visit.error_info && Array.isArray(visit.error_info) && visit.error_info.length > 0
                    return (
                      <tr
                        key={visit.id}
                        className={cn(
                          "border-b border-gray-800/50 hover:bg-gray-800/50 transition-colors",
                          hasError && "bg-red-950/20"
                        )}
                      >
                        <td className="p-2 text-gray-200">
                          {visit.children
                            ? `${visit.children.last_name} ${visit.children.first_name}`
                            : <span className="text-gray-500 font-mono text-xs">{visit.session_id.slice(0, 8)}</span>}
                        </td>
                        <td className="p-2 text-gray-400 text-xs">{visit.staff?.display_name || '-'}</td>
                        <td className="p-2 text-gray-400 text-xs">{visit.booth_number || '-'}</td>
                        <td className="p-2">
                          {/* ミニ進捗バー */}
                          <div className="flex gap-px">
                            {ALL_STEPS.map((step) => {
                              const isDone = visit.step_timestamps?.[step]
                              return (
                                <div
                                  key={step}
                                  className={cn(
                                    "w-4 h-4 rounded-sm flex items-center justify-center",
                                    isDone
                                      ? STEP_COLORS[step]?.split(' ')[0] || 'bg-green-600'
                                      : visit.current_step === step
                                        ? "bg-blue-600"
                                        : "bg-gray-800"
                                  )}
                                  title={`${getStepDisplayName(step)}${isDone ? ` ✓` : ''}`}
                                >
                                  {isDone && <CheckCircle2 className="w-2.5 h-2.5" />}
                                </div>
                              )
                            })}
                          </div>
                        </td>
                        <td className="p-2">
                          <Badge variant="outline" className="text-xs border-gray-700 text-gray-400">
                            {visit.status}
                          </Badge>
                        </td>
                        <td className="p-2 text-gray-500 text-xs">
                          {formatTime(visit.created_at)}
                        </td>
                        <td className="p-2">
                          {hasError ? (
                            <Badge variant="destructive" className="flex items-center gap-1 w-fit text-xs">
                              <AlertCircle className="w-3 h-3" />
                              {visit.error_info.length}
                            </Badge>
                          ) : (
                            <span className="text-gray-600">-</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
