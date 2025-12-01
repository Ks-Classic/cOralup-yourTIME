import { formatDateTime } from '@/utils'
import type { Database } from '@/types/database'

type SessionRow = Database['public']['Tables']['sessions']['Row']

interface SessionSummaryProps {
  session?: SessionRow | null
  sessionId?: string
  parentName?: string | null
  parentPhone?: string | null
  childName?: string | null
  childAge?: number | null
  childGender?: string | null
  status?: string | null
  createdAt?: string | null
}

export function SessionSummary({
  session,
  sessionId,
  parentName,
  parentPhone,
  childName,
  childAge,
  childGender,
  status,
  createdAt,
}: SessionSummaryProps) {
  const displaySession = session || null
  const displaySessionId = sessionId || displaySession?.session_id
  const displayParentName = parentName ?? displaySession?.parent_name ?? '未入力'
  const displayParentPhone = parentPhone ?? displaySession?.parent_phone ?? '未入力'
  const displayChildName = childName ?? '未入力'
  const displayChildAge = childAge ?? null
  const displayChildGender = childGender ?? null
  const displayStatus = status ?? displaySession?.status ?? '未設定'
  const displayCreatedAt = createdAt ?? displaySession?.created_at ?? null

  if (!displaySession && !sessionId) {
    return null
  }

  const formatStatus = (value: string | null) => {
    switch (value) {
      case 'active':
        return '受付中'
      case 'questionnaire_completed':
        return '問診完了'
      case 'diagnosis_in_progress':
        return '診断中'
      case 'diagnosis_completed':
        return '診断完了'
      case 'completed':
        return '完了'
      case 'expired':
        return '期限切れ'
      default:
        return value || '未設定'
    }
  }

  const formatGender = (value: string | null) => {
    switch (value) {
      case 'male':
        return '男'
      case 'female':
        return '女'
      case 'other':
        return 'その他'
      default:
        return '未入力'
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">診断セッション情報</h2>
          <p className="text-sm text-gray-500">セッションID: {displaySessionId}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">保護者名</p>
            <p className="text-base font-medium text-gray-900">{displayParentName}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">電話番号</p>
            <p className="text-base font-medium text-gray-900">{displayParentPhone}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">児童名</p>
            <p className="text-base font-medium text-gray-900">{displayChildName}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">年齢 / 性別</p>
            <p className="text-base font-medium text-gray-900">
              {displayChildAge ? `${displayChildAge}歳` : '未入力'} / {formatGender(displayChildGender)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">ステータス</p>
            <p className="text-base font-medium text-coral-600">
              {formatStatus(displayStatus)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">作成日時</p>
            <p className="text-base font-medium text-gray-900">
              {displayCreatedAt ? formatDateTime(displayCreatedAt) : '未入力'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

