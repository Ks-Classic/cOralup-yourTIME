import { redirect, notFound } from 'next/navigation'
import { getStaffSession } from '@/lib/staff-auth'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

// Supabase クライアント (Service Role)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface PageProps {
  params: Promise<{ sessionId: string }>
}

export default async function StaffHistoryDetailPage({ params }: PageProps) {
  const session = await getStaffSession()

  if (!session) {
    redirect('/staff/login')
  }

  const { sessionId } = await params

  // セッション情報取得
  const { data: sessionData, error: sessionError } = await supabase
    .from('visits')
    .select('*')
    .eq('session_id', sessionId)
    .single()

  if (sessionError || !sessionData) {
    notFound()
  }

  // visit情報取得
  const { data: visitData } = await supabase
    .from('visits')
    .select(`
      *,
      children (
        id,
        first_name,
        last_name,
        birthday,
        gender
      )
    `)
    .eq('session_id', sessionId)
    .single()

  // 問診回答取得
  const { data: questionnaireResponses } = await supabase
    .from('questionnaire_responses')
    .select(`
      id,
      value,
      questionnaire_items (
        question,
        category_id,
        options,
        questionnaire_categories (
          name
        )
      )
    `)
    .eq('session_id', sessionId)
    .order('created_at')

  // 診断回答取得
  const { data: diagnosisResponses } = await supabase
    .from('diagnosis_responses')
    .select(`
      id,
      value,
      diagnosis_items (
        question,
        category_id,
        options,
        diagnosis_categories (
          name
        )
      )
    `)
    .eq('session_id', sessionId)
    .order('created_at')

  const child = visitData?.children as any
  const age = child?.birthday
    ? Math.floor(
        (Date.now() - new Date(child.birthday).getTime()) /
          (365.25 * 24 * 60 * 60 * 1000)
      )
    : null

  // 値からラベルを取得するヘルパー
  const getLabel = (value: string, options: any[] | null) => {
    if (!options) return value
    const option = options.find((o: any) => o.value === value)
    return option?.label || value
  }

  // カテゴリごとにグループ化
  const groupByCategory = (responses: any[]) => {
    const grouped: Record<string, any[]> = {}
    responses?.forEach((r) => {
      const categoryName = r.questionnaire_items?.questionnaire_categories?.name ||
        r.diagnosis_items?.diagnosis_categories?.name ||
        'その他'
      if (!grouped[categoryName]) {
        grouped[categoryName] = []
      }
      grouped[categoryName].push(r)
    })
    return grouped
  }

  const groupedQuestionnaire = groupByCategory(questionnaireResponses || [])
  const groupedDiagnosis = groupByCategory(diagnosisResponses || [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* ヘッダー */}
      <header className="bg-slate-800/50 backdrop-blur border-b border-slate-700 sticky top-0 z-10">
        <div className="flex items-center px-4 py-4">
          <Link
            href="/staff/history"
            className="text-emerald-400 hover:text-emerald-300 mr-4 flex items-center gap-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            戻る
          </Link>
          <h1 className="text-lg font-bold text-white">対応詳細</h1>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* 基本情報 */}
        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-5 border border-slate-700">
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            基本情報
          </h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-slate-400">お子様</dt>
              <dd className="text-white font-medium">
                {child?.last_name}{child?.first_name}
                {age !== null && <span className="text-slate-400 ml-1">({age}歳)</span>}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">性別</dt>
              <dd className="text-white">
                {child?.gender === 'male' ? '男の子' : child?.gender === 'female' ? '女の子' : '-'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">保護者</dt>
              <dd className="text-white">{sessionData.parent_name || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">対応日時</dt>
              <dd className="text-white">
                {visitData?.visit_date
                  ? new Date(visitData.visit_date).toLocaleString('ja-JP')
                  : new Date(sessionData.created_at).toLocaleString('ja-JP')}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">セッションID</dt>
              <dd className="text-slate-300 font-mono text-sm">{sessionId}</dd>
            </div>
          </dl>
        </div>

        {/* 問診結果 */}
        {Object.keys(groupedQuestionnaire).length > 0 && (
          <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-5 border border-slate-700">
            <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              問診結果
            </h2>
            {Object.entries(groupedQuestionnaire).map(([category, responses]) => (
              <div key={category} className="mb-4 last:mb-0">
                <h3 className="text-sm text-slate-400 mb-2 border-b border-slate-700 pb-1">
                  {category}
                </h3>
                <dl className="space-y-2">
                  {responses.map((r: any) => {
                    const item = r.questionnaire_items
                    return (
                      <div key={r.id} className="flex justify-between gap-4">
                        <dt className="text-slate-400 text-sm flex-shrink-0">
                          {item?.question}
                        </dt>
                        <dd className="text-white text-sm text-right">
                          {getLabel(r.value, item?.options)}
                        </dd>
                      </div>
                    )
                  })}
                </dl>
              </div>
            ))}
          </div>
        )}

        {/* 診断結果 */}
        {Object.keys(groupedDiagnosis).length > 0 && (
          <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-5 border border-slate-700">
            <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              診断結果
            </h2>
            {Object.entries(groupedDiagnosis).map(([category, responses]) => (
              <div key={category} className="mb-4 last:mb-0">
                <h3 className="text-sm text-slate-400 mb-2 border-b border-slate-700 pb-1">
                  {category}
                </h3>
                <dl className="space-y-2">
                  {responses.map((r: any) => {
                    const item = r.diagnosis_items
                    return (
                      <div key={r.id} className="flex justify-between gap-4">
                        <dt className="text-slate-400 text-sm flex-shrink-0">
                          {item?.question}
                        </dt>
                        <dd className="text-white text-sm text-right">
                          {getLabel(r.value, item?.options)}
                        </dd>
                      </div>
                    )
                  })}
                </dl>
              </div>
            ))}
          </div>
        )}

        {/* データなし */}
        {Object.keys(groupedQuestionnaire).length === 0 &&
          Object.keys(groupedDiagnosis).length === 0 && (
            <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 border border-slate-700 text-center">
              <p className="text-slate-400">問診・診断データがありません</p>
            </div>
          )}

        {/* レポートリンク */}
        <Link
          href={`/staff/report/${sessionId}`}
          className="block bg-emerald-500 hover:bg-emerald-600 text-white text-center py-4 rounded-2xl font-medium transition-colors"
        >
          レポートを見る
        </Link>
      </div>
    </div>
  )
}

