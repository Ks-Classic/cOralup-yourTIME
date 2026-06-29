'use client'

import { useMemo } from 'react'

interface ChildInfo {
    id: string
    firstName: string | null
    lastName: string | null
    birthday: string | null
    gender: string | null
    questionnaireStatus: string
    latestVisit: {
        id: string
        status: string
        sessionId: string
        visitDate: string
    } | null
}

interface ChildSelectorProps {
    children: ChildInfo[]
    onSelectChild: (child: ChildInfo) => void
    onAddNewChild: () => void
}

/**
 * 子供選択コンポーネント（兄弟対応）
 * 
 * 表示するもの:
 * - 既存の子供一覧（問診ステータス付き）
 * - 「新しいお子さまを追加」ボタン
 */
export default function ChildSelector({
    children,
    onSelectChild,
    onAddNewChild,
}: ChildSelectorProps) {
    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
            <div className="max-w-lg mx-auto px-4 py-8">
                {/* ヘッダー */}
                <div className="text-center mb-8">
                    <div className="text-4xl mb-3">👶</div>
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">
                        お子さまを選択
                    </h1>
                    <p className="text-gray-600">
                        どのお子さまの問診を行いますか？
                    </p>
                </div>

                {/* 子供一覧 */}
                <div className="space-y-3 mb-6">
                    {children.map((child) => (
                        <ChildCard
                            key={child.id}
                            child={child}
                            onSelect={() => onSelectChild(child)}
                        />
                    ))}
                </div>

                {/* 区切り線 */}
                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center">
                        <span className="bg-white px-4 text-sm text-gray-500">または</span>
                    </div>
                </div>

                {/* 新しい子供を追加ボタン */}
                <button
                    onClick={onAddNewChild}
                    className="w-full py-4 px-6 bg-white border-2 border-dashed border-blue-300 rounded-xl text-blue-600 font-medium hover:bg-blue-50 hover:border-blue-400 transition-all flex items-center justify-center gap-2"
                >
                    <span className="text-xl">＋</span>
                    <span>新しいお子さまを追加</span>
                </button>

                {/* 注意事項 */}
                <p className="text-center text-sm text-gray-500 mt-8">
                    ※ 兄弟それぞれの問診を入力し、<br />
                    別々のQRコードで診断を受けられます
                </p>
            </div>
        </div>
    )
}

/**
 * 子供カード（個別表示）
 */
function ChildCard({
    child,
    onSelect,
}: {
    child: ChildInfo
    onSelect: () => void
}) {
    // 年齢計算
    const ageDisplay = useMemo(() => {
        if (!child.birthday) return ''
        const birthday = new Date(child.birthday)
        const now = new Date()
        const ageYears = now.getFullYear() - birthday.getFullYear()
        const ageMonths = now.getMonth() - birthday.getMonth()
        const totalMonths = ageYears * 12 + ageMonths
        const years = Math.floor(totalMonths / 12)
        const months = totalMonths % 12
        return `${years}歳${months}ヶ月`
    }, [child.birthday])

    // ステータスバッジ
    const statusBadge = useMemo(() => {
        const status = child.questionnaireStatus
        if (status === 'questionnaire_completed' || status === 'completed' || status === 'published') {
            return {
                text: '問診完了',
                icon: '✓',
                className: 'bg-green-100 text-green-700 border-green-200',
            }
        }
        if (status === 'questionnaire_in_progress' || status === 'in_progress') {
            return {
                text: '入力中',
                icon: '📝',
                className: 'bg-yellow-100 text-yellow-700 border-yellow-200',
            }
        }
        return {
            text: '未入力',
            icon: '',
            className: 'bg-gray-100 text-gray-600 border-gray-200',
        }
    }, [child.questionnaireStatus])

    // 性別アイコン
    const genderIcon = child.gender === 'male' ? '👦' : child.gender === 'female' ? '👧' : '👶'

    // 名前表示
    const displayName = [child.lastName, child.firstName].filter(Boolean).join(' ') || '名前未設定'

    return (
        <button
            onClick={onSelect}
            className="w-full bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md hover:border-blue-200 transition-all text-left flex items-center gap-4"
        >
            {/* アイコン */}
            <div className="text-3xl flex-shrink-0">
                {genderIcon}
            </div>

            {/* 情報 */}
            <div className="flex-1 min-w-0">
                <div className="font-bold text-gray-800 text-lg truncate">
                    {displayName}
                </div>
                {ageDisplay && (
                    <div className="text-sm text-gray-500">
                        {ageDisplay}
                    </div>
                )}
            </div>

            {/* ステータスバッジ */}
            <div className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border ${statusBadge.className}`}>
                {statusBadge.icon && <span className="mr-1">{statusBadge.icon}</span>}
                {statusBadge.text}
            </div>

            {/* 矢印 */}
            <div className="flex-shrink-0 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
            </div>
        </button>
    )
}
