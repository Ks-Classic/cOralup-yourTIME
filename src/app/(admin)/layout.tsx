import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Coralup 管理者管理画面',
  description: 'Coralupシステムの管理者用管理画面',
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 管理者ヘッダー */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Coralup 管理者管理画面
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">管理者</span>
              <button className="text-sm text-gray-500 hover:text-gray-700">
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* サイドバーナビゲーション */}
        <nav className="w-64 bg-white shadow-sm min-h-[calc(100vh-4rem)]">
          <div className="p-4 space-y-2">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">管理メニュー</h2>

                      <a
                        href="/admin"
                        className="block px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md"
                      >
                        📊 ダッシュボード
                      </a>

              <a
                href="/admin/users"
                className="block px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
              >
                👥 ユーザー管理
              </a>

              <a
                href="/admin/diagnosis"
                className="block px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
              >
                📋 診断データ管理
              </a>

                      <a
                        href="/admin/forms"
                        className="block px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
                      >
                        🛠️ フォーム管理
                      </a>

              <a
                href="/admin/base-schemas"
                className="block px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
              >
                📝 基本スキーマ編集（開発モード）
              </a>

              <a
                href="/admin/events"
                className="block px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
              >
                📅 イベント管理
              </a>

              <a
                href="/admin/bi"
                className="block px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
              >
                📈 BI分析
              </a>

              <a
                href="/admin/settings"
                className="block px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
              >
                ⚙️ 設定
              </a>
            </div>
          </div>
        </nav>

        {/* メインコンテンツ */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}

