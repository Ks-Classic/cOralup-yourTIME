'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-coral-50 via-white to-blue-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900">デザイン確認用デモページ一覧</h1>
          <p className="text-gray-600">各画面のデザインを確認できます</p>
        </div>

        {/* 親御さん向け画面 */}
        <Card className="border-coral-200">
          <CardHeader>
            <CardTitle className="text-2xl">👨‍👩‍👧 親御さん向け画面</CardTitle>
            <CardDescription>問診票入力から結果表示まで</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link href="/parent">
                <Button variant="outline" className="w-full h-20 flex flex-col">
                  <span className="font-semibold">親御さんトップ</span>
                  <span className="text-xs text-gray-500">/parent</span>
                </Button>
              </Link>
              <Link href="/parent/questionnaire/demo">
                <Button variant="outline" className="w-full h-20 flex flex-col">
                  <span className="font-semibold">問診票入力</span>
                  <span className="text-xs text-gray-500">/parent/questionnaire/demo</span>
                </Button>
              </Link>
              <Link href="/parent/result/demo">
                <Button variant="outline" className="w-full h-20 flex flex-col">
                  <span className="font-semibold">結果表示</span>
                  <span className="text-xs text-gray-500">/parent/result/demo</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* スタッフ向け画面 */}
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="text-2xl">🧑‍⚕️ スタッフ向け画面</CardTitle>
          <CardDescription>本番導線と同じ統合診断フローを確認できます</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link href="/staff/home">
                <Button variant="outline" className="w-full h-20 flex flex-col">
                  <span className="font-semibold">スタッフホーム</span>
                  <span className="text-xs text-gray-500">/staff/home</span>
                </Button>
              </Link>
              <Link href="/staff/diagnosis/demo">
                <Button variant="outline" className="w-full h-20 flex flex-col">
                  <span className="font-semibold">統合診断デモ</span>
                  <span className="text-xs text-gray-500">/staff/diagnosis/demo</span>
                </Button>
              </Link>
              <Link href="/staff/scan">
                <Button variant="outline" className="w-full h-20 flex flex-col">
                  <span className="font-semibold">QRスキャン</span>
                  <span className="text-xs text-gray-500">/staff/scan</span>
                </Button>
              </Link>
              <Link href="/staff/monitor">
                <Button variant="outline" className="w-full h-20 flex flex-col">
                  <span className="font-semibold">リアルタイム監視</span>
                  <span className="text-xs text-gray-500">/staff/monitor</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* 管理者向け画面 */}
        <Card className="border-purple-200">
          <CardHeader>
            <CardTitle className="text-2xl">📊 管理者向け画面</CardTitle>
            <CardDescription>ダッシュボード、フォーム管理、スキーマ編集</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link href="/admin">
                <Button variant="outline" className="w-full h-20 flex flex-col">
                  <span className="font-semibold">管理者ダッシュボード</span>
                  <span className="text-xs text-gray-500">/admin</span>
                </Button>
              </Link>
              <Link href="/admin/forms">
                <Button variant="outline" className="w-full h-20 flex flex-col">
                  <span className="font-semibold">フォーム管理</span>
                  <span className="text-xs text-gray-500">/admin/forms</span>
                </Button>
              </Link>
              <Link href="/admin/base-schemas">
                <Button variant="outline" className="w-full h-20 flex flex-col">
                  <span className="font-semibold">ベーススキーマ編集</span>
                  <span className="text-xs text-gray-500">/admin/base-schemas</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* トップページ */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-2xl">🏠 トップページ</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button variant="outline" className="w-full h-20 flex flex-col">
                <span className="font-semibold">ランディングページ</span>
                <span className="text-xs text-gray-500">/</span>
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

