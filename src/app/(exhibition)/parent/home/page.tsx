'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import liff from '@line/liff'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { QRCodeSVG } from 'qrcode.react'
import { cn } from '@/utils'
import { Plus, ChevronRight, FileText, CheckCircle, Clock, User, Loader2, Home, RefreshCw } from 'lucide-react'

interface ChildData {
    id: string
    firstName: string
    lastName: string
    birthday: string
    gender: 'male' | 'female' | 'other'
    questionnaireStatus: string
    latestVisit: {
        id: string
        status: string
        sessionId: string
        visitDate: string
        childAgeMonths: number
    } | null
    visits: Array<{
        id: string
        status: string
        sessionId: string
        visitDate: string
    }>
}

interface ParentProfile {
    id: string
    displayName: string
    firstName: string
    lastName: string
    phoneNumber: string
}

// 年齢を計算
function calculateAge(birthday: string): { years: number; months: number } {
    const birthDate = new Date(birthday)
    const now = new Date()
    let years = now.getFullYear() - birthDate.getFullYear()
    let months = now.getMonth() - birthDate.getMonth()
    if (months < 0) {
        years--
        months += 12
    }
    return { years, months }
}

// ステータスに応じたバッジを表示
function StatusBadge({ status }: { status: string }) {
    const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
        'questionnaire_completed': { label: '問診完了', color: 'bg-blue-100 text-blue-700', icon: <CheckCircle className="w-3 h-3" /> },
        'diagnosis_started': { label: '診断中', color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="w-3 h-3" /> },
        'analysis_completed': { label: '分析完了', color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-3 h-3" /> },
        'report_generated': { label: 'レポート生成済み', color: 'bg-purple-100 text-purple-700', icon: <FileText className="w-3 h-3" /> },
        'line_sent': { label: 'レポート送信済み', color: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle className="w-3 h-3" /> },
        'questionnaire_in_progress': { label: '問診入力中', color: 'bg-orange-100 text-orange-700', icon: <Clock className="w-3 h-3" /> },
    }

    const config = statusConfig[status] || { label: '未入力', color: 'bg-gray-100 text-gray-600', icon: null }

    return (
        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", config.color)}>
            {config.icon}
            {config.label}
        </span>
    )
}

export default function ParentHomePage() {
    const router = useRouter()
    const [liffProfile, setLiffProfile] = useState<{ userId: string; displayName: string } | null>(null)
    const [parentProfile, setParentProfile] = useState<ParentProfile | null>(null)
    const [children, setChildren] = useState<ChildData[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedChild, setSelectedChild] = useState<ChildData | null>(null)

    // データ読み込み（useEffectより先に定義）
    const loadData = useCallback(async (lineUserId: string) => {
        try {
            setIsLoading(true)
            const res = await fetch(`/api/parent/visit?line_user_id=${encodeURIComponent(lineUserId)}`)
            const data = await res.json()

            if (data.success) {
                setParentProfile(data.profile)
                setChildren(data.children || [])
            } else {
                setError('データの取得に失敗しました')
            }
        } catch (err) {
            console.error('[Parent Home] Load Error:', err)
            setError('データの読み込みに失敗しました')
        } finally {
            setIsLoading(false)
        }
    }, [])

    // LIFF初期化
    useEffect(() => {
        const initLiff = async () => {
            try {
                // 問診ページと同じLIFF_IDを使用（親御さん用LIFF）
                const liffId = process.env.NEXT_PUBLIC_PARENT_LIFF_ID || process.env.NEXT_PUBLIC_LIFF_ID
                if (!liffId) {
                    throw new Error('LIFF_ID not configured')
                }

                await liff.init({ liffId })

                // LINEアプリ外で開かれた場合はエラーにせず処理を続行
                if (!liff.isInClient()) {
                    setError('このページはLINEアプリ内で開いてください')
                    setIsLoading(false)
                    return
                }

                if (!liff.isLoggedIn()) {
                    liff.login()
                    return
                }

                const profile = await liff.getProfile()
                setLiffProfile({
                    userId: profile.userId,
                    displayName: profile.displayName,
                })

                // データを読み込む
                await loadData(profile.userId)
            } catch (err) {
                console.error('[Parent Home] LIFF Error:', err)
                setError('LIFFの初期化に失敗しました。LINEアプリ内で開いてください。')
                setIsLoading(false)
            }
        }

        initLiff()
    }, [loadData])

    // 新しい子どもの問診を開始
    const handleAddChild = () => {
        router.push('/parent/questionnaire/liff?mode=new')
    }

    // 既存の子どもの問診詳細を表示
    const handleSelectChild = (child: ChildData) => {
        setSelectedChild(child)
    }

    // 問診を続ける/再入力
    const handleContinueQuestionnaire = (child: ChildData) => {
        router.push(`/parent/questionnaire/liff?childId=${child.id}`)
    }

    // 更新
    const handleRefresh = () => {
        if (liffProfile?.userId) {
            loadData(liffProfile.userId)
        }
    }

    // レポートを表示
    const handleViewReport = (child: ChildData) => {
        if (child.latestVisit?.sessionId) {
            router.push(`/parent/report/${child.latestVisit.sessionId}`)
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-coral-50 to-white">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-coral-500 mx-auto mb-3" />
                    <p className="text-gray-600">読み込み中...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-coral-50 to-white p-4">
                <Card className="w-full max-w-sm">
                    <CardHeader className="text-center pb-2">
                        <div className="w-16 h-16 bg-[#06C755]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#06C755">
                                <path d="M19.11 17.205c-.372 0-1.088 1.39-1.518 1.39a.63.63 0 0 1-.315-.1c-.802-.402-1.504-.817-2.163-1.447-.545-.516-1.146-1.29-1.46-1.963a.426.426 0 0 1-.073-.215c0-.33.99-.945.99-1.49 0-.143-.73-2.09-.832-2.335-.143-.372-.214-.487-.6-.487-.187 0-.36-.043-.53-.043-.302 0-.53.115-.746.315-.688.645-1.032 1.318-1.06 2.264v.114c-.015.99.472 1.977 1.017 2.78 1.23 1.82 2.506 3.41 4.554 4.34.616.287 2.035.888 2.722.888.817 0 2.15-.515 2.478-1.318.13-.33.244-.73.244-1.088 0-.058 0-.144-.03-.215-.1-.172-2.434-1.39-2.678-1.39zm-2.908 7.795c-1.79 0-3.378-.359-4.91-1.05C5.893 21.66 1.845 17.5.674 12.14c-.659-3.264-.058-6.6 1.6-9.35C4.12-.31 7.36-1.605 10.91-.94c.687.13 1.373.345 2.006.6.4.158.315.258.415.544.1.287.158.673-.072 1.03-.158.243-.315.43-.43.587-.143.186-.372.344-.63.516-.5.33-.53.53-.23.887.402.473.888.888 1.375 1.318.687.602 1.432 1.14 2.192 1.663.33.23.63.358.86.358.258 0 .5-.13.773-.344.544-.416 1.232-.959 1.847-1.389.458-.33.6-.315.945-.058 1.432 1.088 2.721 2.335 3.864 3.724.187.23.258.515.143.773-.116.286-.315.515-.53.73-.487.502-1.003.988-1.49 1.49-.257.258-.386.53-.386.788 0 .257.13.53.344.745 1.003 1.003 1.79 2.135 2.42 3.394.33.63.515 1.375.515 2.135 0 2.003-1.79 3.58-3.837 3.58z" />
                            </svg>
                        </div>
                        <CardTitle className="text-lg">LINEアプリで開いてください</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-center">
                        <p className="text-sm text-gray-600">
                            このページはLINEアプリ内でのみ<br />ご利用いただけます。
                        </p>
                        <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-xs text-gray-500">
                                LINE公式アカウント「cOralup」の<br />メニューから開いてください
                            </p>
                        </div>
                        <Button onClick={() => window.location.reload()} variant="outline" className="w-full">
                            再読み込み
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // 子どもの詳細画面
    if (selectedChild) {
        const age = calculateAge(selectedChild.birthday)
        const hasReport = ['report_generated', 'line_sent', 'line_confirmed'].includes(selectedChild.latestVisit?.status || '')

        return (
            <div className="min-h-screen bg-gradient-to-b from-coral-50 to-white">
                <div className="max-w-md mx-auto p-4 space-y-4">
                    {/* ヘッダー */}
                    <div className="flex items-center justify-between">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedChild(null)}>
                            ← 戻る
                        </Button>
                    </div>

                    {/* 子ども情報 */}
                    <Card className="border-coral-200">
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-coral-100 rounded-full flex items-center justify-center">
                                    <span className="text-xl">{selectedChild.gender === 'male' ? '👦' : '👧'}</span>
                                </div>
                                <div>
                                    <CardTitle className="text-xl">
                                        {selectedChild.lastName} {selectedChild.firstName}
                                    </CardTitle>
                                    <p className="text-sm text-gray-500">
                                        {age.years}歳{age.months}ヶ月
                                    </p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between py-2 border-t border-gray-100">
                                <span className="text-sm text-gray-600">ステータス</span>
                                <StatusBadge status={selectedChild.latestVisit?.status || 'not_started'} />
                            </div>
                        </CardContent>
                    </Card>

                    {/* QRコード（問診完了後のみ表示） */}
                    {selectedChild.latestVisit?.id && selectedChild.latestVisit.status !== 'not_started' && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">診断用QRコード</CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-col items-center">
                                <div className="bg-white p-4 rounded-lg border">
                                    <QRCodeSVG
                                        value={JSON.stringify({
                                            type: 'coralup_visit',
                                            visitId: selectedChild.latestVisit.id,
                                            version: 1,
                                        })}
                                        size={180}
                                        level="M"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    受付番号: {selectedChild.latestVisit.id.slice(0, 8).toUpperCase()}
                                </p>
                                <p className="text-sm text-gray-600 mt-2 text-center">
                                    このQRコードをスタッフにお見せください
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {/* visitがない or 問診未完了の場合のメッセージ */}
                    {(!selectedChild.latestVisit || selectedChild.latestVisit.status === 'not_started') && (
                        <Card className="border-orange-200 bg-orange-50">
                            <CardContent className="py-4 text-center">
                                <p className="text-sm text-orange-700">
                                    問診が完了するとQRコードが表示されます
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {/* アクションボタン */}
                    <div className="space-y-2">
                        {/* レポート表示 */}
                        {hasReport && (
                            <Button
                                onClick={() => handleViewReport(selectedChild)}
                                className="w-full bg-emerald-600 hover:bg-emerald-700"
                            >
                                <FileText className="w-4 h-4 mr-2" />
                                診断レポートを見る
                            </Button>
                        )}

                        {/* 問診開始/続ける/再入力 */}
                        <Button
                            onClick={() => handleContinueQuestionnaire(selectedChild)}
                            variant={selectedChild.latestVisit?.sessionId ? "outline" : "default"}
                            className={cn(
                                "w-full",
                                !selectedChild.latestVisit?.sessionId && "bg-coral-500 hover:bg-coral-600"
                            )}
                        >
                            {!selectedChild.latestVisit
                                ? '問診を開始する'
                                : selectedChild.latestVisit.status === 'questionnaire_in_progress'
                                    ? '問診の続きを入力'
                                    : '問診内容を確認・編集'}
                        </Button>
                    </div>

                    {/* 過去の診断履歴 */}
                    {selectedChild.visits.length > 1 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">過去の診断履歴</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {selectedChild.visits.slice(1).map((visit) => (
                                    <div
                                        key={visit.id}
                                        className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                                    >
                                        <div>
                                            <p className="text-sm text-gray-700">
                                                {new Date(visit.visitDate).toLocaleDateString('ja-JP')}
                                            </p>
                                        </div>
                                        <StatusBadge status={visit.status} />
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        )
    }

    // メイン画面（子ども一覧）
    return (
        <div className="min-h-screen bg-gradient-to-b from-coral-50 to-white">
            <div className="max-w-md mx-auto p-4 space-y-4">
                {/* ヘッダー */}
                <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                        <Home className="w-5 h-5 text-coral-500" />
                        <h1 className="text-lg font-bold text-gray-800">マイページ</h1>
                    </div>
                    <Button variant="ghost" size="icon" onClick={handleRefresh}>
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                </div>

                {/* 親御さん情報 */}
                {parentProfile && (
                    <Card className="border-gray-200">
                        <CardContent className="py-3 flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                <User className="w-5 h-5 text-gray-500" />
                            </div>
                            <div>
                                <p className="font-medium text-gray-800">
                                    {parentProfile.lastName} {parentProfile.firstName || parentProfile.displayName}さん
                                </p>
                                <p className="text-xs text-gray-500">保護者</p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* お子さま一覧 */}
                <div>
                    <h2 className="text-sm font-medium text-gray-600 mb-2">お子さま</h2>
                    <div className="space-y-2">
                        {children.map((child) => {
                            const age = calculateAge(child.birthday)
                            return (
                                <Card
                                    key={child.id}
                                    className="border-gray-200 hover:border-coral-300 transition-colors cursor-pointer"
                                    onClick={() => handleSelectChild(child)}
                                >
                                    <CardContent className="py-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-coral-100 rounded-full flex items-center justify-center">
                                                    <span className="text-lg">{child.gender === 'male' ? '👦' : '👧'}</span>
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-800">
                                                        {child.lastName} {child.firstName}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-xs text-gray-500">
                                                            {age.years}歳{age.months}ヶ月
                                                        </span>
                                                        <StatusBadge status={child.latestVisit?.status || 'not_started'} />
                                                    </div>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-gray-400" />
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}

                        {/* 子ども追加ボタン */}
                        <Card
                            className="border-dashed border-2 border-gray-300 hover:border-coral-400 transition-colors cursor-pointer"
                            onClick={handleAddChild}
                        >
                            <CardContent className="py-4 flex items-center justify-center gap-2 text-gray-500 hover:text-coral-600">
                                <Plus className="w-5 h-5" />
                                <span className="font-medium">お子さまを追加</span>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* ヘルプ */}
                <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="py-3">
                        <p className="text-sm text-blue-700">
                            💡 お子さまを選択すると、QRコードや診断レポートを確認できます
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
