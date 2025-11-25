'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight, Smartphone, QrCode, FileText, Bot, Send } from 'lucide-react'

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-coral-50 via-white to-blue-50">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-16 sm:px-6 lg:px-8">
        <header className="text-center space-y-4">
          <span className="inline-flex items-center rounded-full bg-coral-100 px-3 py-1 text-sm font-medium text-coral-700">
            Coralup Oral Development Platform
          </span>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Coralup 口腔育成診断システム
          </h1>
          <p className="text-lg text-gray-600">
            問診票のデジタル化からAI分析・レポート通知まで、イベント運営をワンストップで支援します。
          </p>
        </header>

        {/* ユーザーフロー体験セクション */}
        <section className="space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">実際のフローを体験</h2>
            <p className="text-gray-600">トップページから実際のユーザーフローを体験できます</p>
          </div>

          {/* 親御さんフロー */}
          <Card className="border-2 border-coral-200 bg-white shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-coral-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">👨‍👩‍👧</span>
                  </div>
                  <div>
                    <CardTitle className="text-2xl">親御さん向けフロー</CardTitle>
                    <CardDescription className="text-base mt-1">
                      LINE連携でセッションを開始し、問診・結果閲覧まで体験できます
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* フローステップ */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="flex flex-col items-center text-center p-4 bg-coral-50 rounded-lg">
                    <div className="w-10 h-10 bg-coral-500 text-white rounded-full flex items-center justify-center font-bold mb-2">
                      1
                    </div>
                    <Smartphone className="w-6 h-6 text-coral-600 mb-2" />
                    <p className="text-sm font-medium text-gray-900">LINE連携</p>
                    <p className="text-xs text-gray-600 mt-1">QRコード読み込み</p>
                  </div>
                  <div className="flex flex-col items-center text-center p-4 bg-blue-50 rounded-lg">
                    <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold mb-2">
                      2
                    </div>
                    <FileText className="w-6 h-6 text-blue-600 mb-2" />
                    <p className="text-sm font-medium text-gray-900">問診票入力</p>
                    <p className="text-xs text-gray-600 mt-1">基本情報・症状入力</p>
                  </div>
                  <div className="flex flex-col items-center text-center p-4 bg-green-50 rounded-lg">
                    <div className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center font-bold mb-2">
                      3
                    </div>
                    <QrCode className="w-6 h-6 text-green-600 mb-2" />
                    <p className="text-sm font-medium text-gray-900">QRコード表示</p>
                    <p className="text-xs text-gray-600 mt-1">スタッフに提示</p>
                  </div>
                  <div className="flex flex-col items-center text-center p-4 bg-purple-50 rounded-lg">
                    <div className="w-10 h-10 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold mb-2">
                      4
                    </div>
                    <Bot className="w-6 h-6 text-purple-600 mb-2" />
                    <p className="text-sm font-medium text-gray-900">結果受信</p>
                    <p className="text-xs text-gray-600 mt-1">LINEでレポート受信</p>
                  </div>
                </div>

                {/* アクションボタン */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link href="/parent" className="flex-1">
                    <Button size="lg" className="w-full bg-coral-500 hover:bg-coral-600">
                      親御さんフローを体験する
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </Link>
                  <Link href="/parent/questionnaire/SESSION001" className="flex-1">
                    <Button size="lg" variant="outline" className="w-full">
                      問診票入力から開始（デモ）
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* スタッフフロー */}
          <Card className="border-2 border-blue-200 bg-white shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">🧑‍⚕️</span>
                  </div>
                  <div>
                    <CardTitle className="text-2xl">スタッフ向けフロー</CardTitle>
                    <CardDescription className="text-base mt-1">
                      セッション検索から診断入力、AI分析、レポート送信まで体験できます
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* フローステップ */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="flex flex-col items-center text-center p-4 bg-blue-50 rounded-lg">
                    <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold mb-2">
                      1
                    </div>
                    <QrCode className="w-6 h-6 text-blue-600 mb-2" />
                    <p className="text-sm font-medium text-gray-900">QR読み込み</p>
                    <p className="text-xs text-gray-600 mt-1">親御さんQRをスキャン</p>
                  </div>
                  <div className="flex flex-col items-center text-center p-4 bg-green-50 rounded-lg">
                    <div className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center font-bold mb-2">
                      2
                    </div>
                    <FileText className="w-6 h-6 text-green-600 mb-2" />
                    <p className="text-sm font-medium text-gray-900">問診票確認</p>
                    <p className="text-xs text-gray-600 mt-1">入力内容を確認</p>
                  </div>
                  <div className="flex flex-col items-center text-center p-4 bg-purple-50 rounded-lg">
                    <div className="w-10 h-10 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold mb-2">
                      3
                    </div>
                    <Smartphone className="w-6 h-6 text-purple-600 mb-2" />
                    <p className="text-sm font-medium text-gray-900">診断入力</p>
                    <p className="text-xs text-gray-600 mt-1">写真撮影・診断項目</p>
                  </div>
                  <div className="flex flex-col items-center text-center p-4 bg-orange-50 rounded-lg">
                    <div className="w-10 h-10 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold mb-2">
                      4
                    </div>
                    <Bot className="w-6 h-6 text-orange-600 mb-2" />
                    <p className="text-sm font-medium text-gray-900">AI分析</p>
                    <p className="text-xs text-gray-600 mt-1">レポート生成</p>
                  </div>
                  <div className="flex flex-col items-center text-center p-4 bg-pink-50 rounded-lg">
                    <div className="w-10 h-10 bg-pink-500 text-white rounded-full flex items-center justify-center font-bold mb-2">
                      5
                    </div>
                    <Send className="w-6 h-6 text-pink-600 mb-2" />
                    <p className="text-sm font-medium text-gray-900">LINE送信</p>
                    <p className="text-xs text-gray-600 mt-1">親御さんに通知</p>
                  </div>
                </div>

                {/* アクションボタン */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link href="/staff/diagnosis/demo" className="flex-1">
                    <Button size="lg" variant="outline" className="w-full border-blue-500 text-blue-600 hover:bg-blue-50">
                      スタッフフローを体験する
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </Link>
                  <Link href="/staff/diagnosis/demo" className="flex-1">
                    <Button size="lg" variant="outline" className="w-full">
                      セッション詳細から開始（デモ）
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 従来のカードセクション（簡略版） */}
        <section className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">親御さん向け</h2>
                <span className="text-2xl">👨‍👩‍👧</span>
              </div>
              <p className="text-sm text-gray-600">
                LINE連携でセッションを開始し、問診・写真アップロード・結果閲覧までをスマートに体験できます。
              </p>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500">主な機能</p>
                <ul className="list-disc space-y-1 pl-5 text-sm text-gray-600">
                  <li>問診フォーム入力</li>
                  <li>AI結果の確認</li>
                  <li>QR表示によるスタッフ連携</li>
                </ul>
              </div>
              <Link href="/parent" className="block pt-4">
                <Button size="lg" className="w-full">親御さん用アプリへ</Button>
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">スタッフ向け</h2>
                <span className="text-2xl">🧑‍⚕️</span>
              </div>
              <p className="text-sm text-gray-600">
                セッション検索から診断入力、AI分析、レポート送信までイベント現場のオペレーションを効率化します。
              </p>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500">主な機能</p>
                <ul className="list-disc space-y-1 pl-5 text-sm text-gray-600">
                  <li>セッション・問診閲覧</li>
                  <li>診断フォーム入力</li>
                  <li>AI分析とLINE通知</li>
                </ul>
              </div>
              <Link href="/staff" className="block pt-4">
                <Button size="lg" variant="outline" className="w-full">スタッフ用ツールへ</Button>
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">管理者向け</h2>
                <span className="text-2xl">📊</span>
              </div>
              <p className="text-sm text-gray-600">
                ユーザー・問診・診断データの集計やフォーム作成、イベント管理、BI分析などを一元管理できます。
              </p>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500">主な機能</p>
                <ul className="list-disc space-y-1 pl-5 text-sm text-gray-600">
                  <li>ユーザー・診断管理</li>
                  <li>動的フォームビルダー</li>
                  <li>イベント進捗とBI分析</li>
                </ul>
              </div>
              <Link href="/admin" className="block pt-4">
                <Button size="lg" variant="secondary" className="w-full">管理者ダッシュボードへ</Button>
              </Link>
            </div>
          </div>
        </section>

        <footer className="rounded-2xl border border-dashed border-gray-300 bg-white/70 p-6 text-center text-sm text-gray-500">
          LINE連携・Lark Base同期・AI分析を含むハイブリッドアーキテクチャで、イベント運営をトータルサポートします。
        </footer>
      </div>
    </main>
  )
}
