'use client'

import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'

export default function ParentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isDemoPage = pathname?.includes('/demo')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Coralup - 問診票
              </h1>
            </div>
            <div className="flex items-center gap-4">
              {isDemoPage && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // サンプル入力ボタンのクリックイベントを発火
                    window.dispatchEvent(new CustomEvent('fillSampleData'))
                  }}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  サンプル入力
                </Button>
              )}
              <div className="text-sm text-gray-500">
                親御さん用
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}

