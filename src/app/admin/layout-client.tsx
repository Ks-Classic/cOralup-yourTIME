'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
    { href: '/admin', label: 'ダッシュボード', icon: '📊' },
    { href: '/admin/schema-editor', label: 'スキーマエディタ', icon: '📝' },
]

export default function AdminLayoutClient({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()

    return (
        <div className="min-h-screen bg-slate-50">
            {/* ヘッダー */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-4">
                            <Link href="/admin" className="text-xl font-bold text-slate-800">
                                cOralup Admin
                            </Link>
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">
                                管理者
                            </span>
                        </div>
                        <nav className="flex gap-2">
                            {navItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${pathname === item.href
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'text-slate-600 hover:bg-slate-100'
                                        }`}
                                >
                                    <span className="mr-2">{item.icon}</span>
                                    {item.label}
                                </Link>
                            ))}
                        </nav>
                    </div>
                </div>
            </header>

            {/* メインコンテンツ */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
            </main>
        </div>
    )
}
