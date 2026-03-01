'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    Activity,
    History,
    Database,
    Bot,
    Wrench,
    Users,
    ClipboardList,
    Settings,
    FileSpreadsheet,
    BarChart3
} from 'lucide-react'
import { cn } from '@/utils'

// グローバルナビ（アプリ全体の画面遷移）
const globalNavItems = [
    { href: '/staff/home', label: 'スタッフ診断', icon: ClipboardList },
    { href: '/parent', label: '親御さん問診', icon: Users },
    { href: '/admin', label: '管理者用', icon: Settings, active: true },
]

// 管理画面内のタブ
const adminTabs = [
    { href: '/admin', label: 'リアルタイム', icon: Activity, exact: true },
    { href: '/admin/visits', label: '履歴管理', icon: History },
    { href: '/admin/analytics', label: '分析レポート', icon: BarChart3 },
    { href: '/admin/ai-test', label: 'AI設定', icon: Bot },
    { href: '/admin/recovery', label: '紙問診リカバリー', icon: FileSpreadsheet },
    { href: '/admin/dev-tools', label: 'テストデータ', icon: Wrench },
    { href: '/admin/schema-editor', label: 'スキーマ編集', icon: Database },
]

export default function AdminLayoutClient({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()

    const isTabActive = (tab: typeof adminTabs[0]) => {
        if (tab.exact) {
            return pathname === tab.href
        }
        return pathname.startsWith(tab.href)
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* グローバルナビゲーション（最上部） */}
            <header className="bg-slate-900 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center h-12 gap-6">
                        {/* ロゴ */}
                        <Link href="/" className="font-bold text-lg tracking-tight flex items-center gap-2">
                            <span className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center text-sm font-black">
                                c
                            </span>
                            <span className="hidden sm:inline">cOralup</span>
                        </Link>

                        {/* グローバルナビ */}
                        <nav className="flex items-center gap-1 ml-auto">
                            {globalNavItems.map((item) => {
                                const Icon = item.icon
                                const isActive = item.active || pathname.startsWith(item.href)

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            "flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all",
                                            isActive
                                                ? 'bg-white/20 text-white'
                                                : 'text-slate-400 hover:text-white hover:bg-white/10'
                                        )}
                                    >
                                        <Icon className="w-4 h-4" />
                                        <span className="hidden sm:inline">{item.label}</span>
                                    </Link>
                                )
                            })}
                        </nav>
                    </div>
                </div>
            </header>

            {/* 管理画面タブナビゲーション（2段目） */}
            <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center h-12 gap-1 overflow-x-auto">
                        {adminTabs.map((tab) => {
                            const Icon = tab.icon
                            const active = isTabActive(tab)

                            return (
                                <Link
                                    key={tab.href}
                                    href={tab.href}
                                    className={cn(
                                        "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                                        active
                                            ? 'bg-emerald-50 text-emerald-700'
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                    )}
                                >
                                    <Icon className={cn("w-4 h-4", active && 'text-emerald-600')} />
                                    <span>{tab.label}</span>
                                </Link>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* メインコンテンツ */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {children}
            </main>
        </div>
    )
}
