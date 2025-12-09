"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'

const navigation = [
  {
    href: '/',
    label: 'ホーム',
    icon: '🏠',
    description: 'トップページに戻る'
  },
  {
    href: '/staff/scan',
    label: 'QRスキャン',
    icon: '📷',
    description: '親御さんのQRコードを読み取り'
  },
  {
    href: '/staff/diagnosis',
    label: '診断開始',
    icon: '📝',
    description: 'セッションID入力・診断実施'
  },
  {
    href: '/staff/settings',
    label: '設定',
    icon: '⚙️',
    description: '診断テンプレートや通知の設定'
  }
]

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isDemoPage = pathname?.includes('/demo')
  const isDiagnosisPage = pathname?.startsWith('/staff/diagnosis/')

  // 診断ページの場合は、レイアウトをスキップしてスマホネイティブにする
  if (isDiagnosisPage) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* 診断ページ用の最小限のヘッダー */}
        <header className="bg-white border-b shadow-sm">
          <div className="px-3 py-2.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-coral-500">Coralup Staff Console</p>
                <h1 className="text-sm font-semibold text-gray-900">診断オペレーションセンター</h1>
              </div>
              <div className="flex items-center gap-2">
                {isDemoPage && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('fillStaffSampleData'))
                    }}
                    className="bg-coral-50 border-coral-300 text-coral-700 hover:bg-coral-100 text-xs px-2 py-1 h-7"
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    サンプル入力
                  </Button>
                )}
                <Button asChild size="sm" variant="outline" className="text-xs px-2 py-1 h-7">
                  <Link href="/staff/scan">QRスキャン</Link>
                </Button>
              </div>
            </div>
          </div>
        </header>
        {/* 診断ページのコンテンツはそのまま表示（パディングなし） */}
        {children}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div>
              <p className="text-xs font-medium text-coral-500">Coralup Staff Console</p>
              <h1 className="text-xl font-semibold text-gray-900">診断オペレーションセンター</h1>
            </div>
            <div className="flex items-center space-x-3">
              {isDemoPage && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // サンプル入力ボタンのクリックイベントを発火
                    window.dispatchEvent(new CustomEvent('fillStaffSampleData'))
                  }}
                  className="bg-coral-50 border-coral-300 text-coral-700 hover:bg-coral-100"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  サンプル入力
                </Button>
              )}
              <div className="hidden sm:flex flex-col items-end text-xs text-gray-500">
                <span>本日の診断予定: <span className="font-semibold text-gray-900">12件</span></span>
                <span>ステータス: <span className="text-green-600 font-medium">稼働中</span></span>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href="/staff/scan">QRスキャン</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* モバイルナビゲーション */}
      <div className="lg:hidden border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-16 z-30 overflow-x-auto">
        <div className="flex gap-2 px-4 py-3">
          {navigation.map((item) => {
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex shrink-0 items-center space-x-2 rounded-full border px-4 py-2 text-sm transition-colors',
                  isActive
                    ? 'border-coral-500 bg-coral-50 text-coral-600'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-coral-200 hover:text-coral-600'
                )}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>

      <div className="flex min-h-[calc(100vh-4rem)]">
        {/* サイドナビゲーション */}
        <aside className="hidden w-72 flex-shrink-0 border-r bg-white lg:flex lg:flex-col">
          <div className="px-6 pt-8 pb-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
            ナビゲーション
          </div>
          <nav className="flex-1 space-y-2 px-4 pb-6">
            {navigation.map((item) => {
              const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    'group block rounded-xl border px-4 py-3 transition-all',
                    isActive
                      ? 'border-coral-200 bg-coral-50 shadow-sm'
                      : 'border-transparent hover:border-coral-100 hover:bg-coral-50/60'
                  )}
                >
                  <div className="flex items-center justify-between text-sm font-semibold text-gray-900">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg leading-none">{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                    {isActive && <span className="text-xs font-medium text-coral-500">Now</span>}
                  </div>
                  <p className="mt-1 text-xs text-gray-500 group-hover:text-gray-600">
                    {item.description}
                  </p>
                </Link>
              )
            })}
          </nav>
          <div className="border-t px-4 py-4 text-xs text-gray-500">
            📅 最終同期: <span className="font-medium text-gray-900">5分前</span>
          </div>
        </aside>

        {/* メインコンテンツ */}
        <main className="flex-1 bg-gray-50">
          <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}


