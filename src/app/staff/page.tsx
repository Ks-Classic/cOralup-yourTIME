'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { QrCode, FileText, Smartphone, Bot, Send } from 'lucide-react'
import Link from 'next/link'
import { generateQRCode } from '@/utils'

interface Session {
  id: string
  sessionId: string
  status: 'active' | 'completed' | 'expired' | 'questionnaire_completed'
  createdAt: string
  childName?: string
  parentName?: string
}

export default function StaffPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<Session[]>([])
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'expired'>('all')
  const [viewMode, setViewMode] = useState<'list' | 'compact'>('list')

  // モックデータ用のセッション一覧
  const mockSessions: Session[] = [
    {
      id: '1',
      sessionId: 'SESSION001',
      status: 'active',
      createdAt: new Date().toISOString(),
      childName: 'お子様 花子',
      parentName: '保護者 太郎',
    },
    {
      id: '2',
      sessionId: 'SESSION002',
      status: 'completed',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      childName: 'お子様 次郎',
      parentName: '保護者 花子',
    },
  ]

  // セッション一覧を取得（モックデータ使用）
  useEffect(() => {
    // モックデータを設定
    setSessions(mockSessions)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchSessions = async () => {
    // モックデータ用なので、実際のAPI呼び出しはスキップ
    setSessions(mockSessions)
  }

  const createNewSession = async () => {
    setIsLoading(true)
    try {
      // モックデータ用なので、実際のAPI呼び出しはスキップ
      const newSession: Session = {
        id: `mock-${Date.now()}`,
        sessionId: `SESSION${Date.now()}`,
        status: 'active',
        createdAt: new Date().toISOString(),
      }

      setSessions(prev => [newSession, ...prev])

      // QRコード生成
      const currentUrl = window.location.origin
      const sessionUrl = `${currentUrl}/parent/questionnaire/${newSession.sessionId}`
      const qrCode = await generateQRCode(sessionUrl)
      setQrCodeUrl(qrCode)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error creating session:', error)
      alert('セッションの作成に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredSessions = sessions
    .filter(session => {
      const term = searchTerm.toLowerCase()
      const matchesKeyword =
        session.sessionId.toLowerCase().includes(term) ||
        session.childName?.toLowerCase().includes(term) ||
        session.parentName?.toLowerCase().includes(term)

      const matchesStatus = statusFilter === 'all' ? true : session.status === statusFilter

      return matchesKeyword && matchesStatus
    })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      case 'expired':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return '診断中'
      case 'completed':
        return '完了'
      case 'expired':
        return '期限切れ'
      default:
        return status
    }
  }

  return (
    <div className="space-y-6 pb-6">
      {/* フロー説明セクション */}
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <span>🧑‍⚕️</span>
            <span>スタッフ向けフロー</span>
          </CardTitle>
          <CardDescription className="text-base">
            以下のステップで診断を完了できます
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="flex flex-col items-center text-center p-4 bg-white rounded-lg border border-blue-200">
              <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold mb-2">
                1
              </div>
              <QrCode className="w-6 h-6 text-blue-600 mb-2" />
              <p className="text-sm font-medium text-gray-900">QR読み込み</p>
              <p className="text-xs text-gray-600 mt-1">親御さんQRをスキャン</p>
            </div>
            <div className="flex flex-col items-center text-center p-4 bg-white rounded-lg border border-green-200">
              <div className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center font-bold mb-2">
                2
              </div>
              <FileText className="w-6 h-6 text-green-600 mb-2" />
              <p className="text-sm font-medium text-gray-900">問診票確認</p>
              <p className="text-xs text-gray-600 mt-1">入力内容を確認</p>
            </div>
            <div className="flex flex-col items-center text-center p-4 bg-white rounded-lg border border-purple-200">
              <div className="w-10 h-10 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold mb-2">
                3
              </div>
              <Smartphone className="w-6 h-6 text-purple-600 mb-2" />
              <p className="text-sm font-medium text-gray-900">診断入力</p>
              <p className="text-xs text-gray-600 mt-1">写真撮影・診断項目</p>
            </div>
            <div className="flex flex-col items-center text-center p-4 bg-white rounded-lg border border-orange-200">
              <div className="w-10 h-10 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold mb-2">
                4
              </div>
              <Bot className="w-6 h-6 text-orange-600 mb-2" />
              <p className="text-sm font-medium text-gray-900">AI分析</p>
              <p className="text-xs text-gray-600 mt-1">レポート生成</p>
            </div>
            <div className="flex flex-col items-center text-center p-4 bg-white rounded-lg border border-pink-200">
              <div className="w-10 h-10 bg-pink-500 text-white rounded-full flex items-center justify-center font-bold mb-2">
                5
              </div>
              <Send className="w-6 h-6 text-pink-600 mb-2" />
              <p className="text-sm font-medium text-gray-900">LINE送信</p>
              <p className="text-xs text-gray-600 mt-1">親御さんに通知</p>
            </div>
          </div>

          {/* クイックアクション */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-4 border-t border-blue-200">
            <Link href="/staff/diagnosis/demo#step=session">
              <Button variant="outline" className="w-full justify-start h-auto py-3">
                <FileText className="w-5 h-5 mr-2 text-green-600" />
                <div className="text-left">
                  <p className="font-medium text-sm">セッション詳細</p>
                  <p className="text-xs text-gray-500">問診票確認</p>
                </div>
              </Button>
            </Link>
            <Link href="/staff/diagnosis/demo">
              <Button variant="outline" className="w-full justify-start h-auto py-3">
                <Smartphone className="w-5 h-5 mr-2 text-purple-600" />
                <div className="text-left">
                  <p className="font-medium text-sm">診断入力</p>
                  <p className="text-xs text-gray-500">写真撮影・診断</p>
                </div>
              </Button>
            </Link>
            <Link href="/staff/diagnosis/demo#step=review">
              <Button variant="outline" className="w-full justify-start h-auto py-3">
                <FileText className="w-5 h-5 mr-2 text-blue-600" />
                <div className="text-left">
                  <p className="font-medium text-sm">確認画面</p>
                  <p className="text-xs text-gray-500">内容確認</p>
                </div>
              </Button>
            </Link>
            <Link href="/staff/diagnosis/demo#step=analysis">
              <Button variant="outline" className="w-full justify-start h-auto py-3">
                <Bot className="w-5 h-5 mr-2 text-orange-600" />
                <div className="text-left">
                  <p className="font-medium text-sm">AI分析</p>
                  <p className="text-xs text-gray-500">レポート生成</p>
                </div>
              </Button>
            </Link>
            <Link href="/staff/diagnosis/demo#step=report">
              <Button variant="outline" className="w-full justify-start h-auto py-3">
                <Send className="w-5 h-5 mr-2 text-pink-600" />
                <div className="text-left">
                  <p className="font-medium text-sm">レポート送信</p>
                  <p className="text-xs text-gray-500">LINE送信</p>
                </div>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* ヘッダーアクション */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-gray-900 sm:text-2xl">診断セッション管理</h2>
          <p className="text-sm text-gray-600 sm:text-base">
            QRコード発行から診断開始、完了報告までをスマホでスムーズに管理
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-10 sm:h-11"
            onClick={() => fetchSessions()}
            disabled={isLoading}
          >
            🔄 再同期
          </Button>
          <Button
            onClick={createNewSession}
            disabled={isLoading}
            size="sm"
            className="h-10 sm:h-11"
          >
            {isLoading ? '作成中…' : '＋ 新規セッション'}
          </Button>
        </div>
      </div>

      {/* QRコード表示エリア */}
      {qrCodeUrl && (
        <Card className="border-coral-200 bg-coral-50/40">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <span className="text-2xl">📱</span>
              <span>親御さんに案内するQRコード</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              親御さんがスマホでスキャンすると、問診票入力ページに遷移します。
              QRコードをタップすると拡大表示されます。
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <button
              type="button"
              className="rounded-xl border border-white bg-white p-3 shadow-sm transition hover:shadow-md"
              onClick={() => window.open(qrCodeUrl, '_blank')}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrCodeUrl}
                alt="Session QR Code"
                className="h-56 w-56 rounded-lg object-contain sm:h-64 sm:w-64"
              />
            </button>
            <div className="flex w-full flex-col items-center gap-2 text-xs text-gray-600 sm:text-sm">
              <p className="text-center">
                親御さんが会場に到着したら、まずはこちらのQRコードを案内してください。
                スマホの画面明るさを最大にするとスキャンしやすくなります。
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-coral-600 hover:text-coral-700"
                onClick={() => setQrCodeUrl('')}
              >
                QRコードを閉じる
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 検索・フィルタ */}
      <Card>
        <CardContent className="flex flex-col gap-4 pt-5">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-gray-500">キーワードで検索</label>
            <div className="relative flex items-center">
              <Input
                placeholder="セッションID / お子さま氏名 / 保護者氏名"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-11 rounded-2xl border-gray-200 pr-10"
                inputMode="search"
              />
              <span className="pointer-events-none absolute right-3 text-lg">🔍</span>
            </div>
          </div>

          <Tabs
            value={viewMode}
            onValueChange={(value) => setViewMode(value as 'list' | 'compact')}
            className="flex flex-col gap-3"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <TabsList className="grid h-10 grid-cols-2 rounded-xl bg-gray-100 p-1 text-xs sm:text-sm">
                <TabsTrigger value="list" className="rounded-lg">リスト表示</TabsTrigger>
                <TabsTrigger value="compact" className="rounded-lg">コンパクト表示</TabsTrigger>
              </TabsList>
              <Select
                value={statusFilter}
                onValueChange={(value: 'all' | 'active' | 'completed' | 'expired') => setStatusFilter(value)}
              >
                <SelectTrigger className="h-10 rounded-xl border-gray-200 text-sm">
                  <SelectValue placeholder="ステータスで絞り込み" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-gray-100 text-sm shadow-lg">
                  <SelectItem value="all">すべて表示</SelectItem>
                  <SelectItem value="active">診断中 / 未完了</SelectItem>
                  <SelectItem value="completed">完了済み</SelectItem>
                  <SelectItem value="expired">期限切れ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <TabsContent value="list" className="mt-2" />
            <TabsContent value="compact" className="mt-2" />
          </Tabs>
        </CardContent>
      </Card>

      {/* セッション一覧 */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg sm:text-xl">セッション一覧</CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
            <span>表示件数: <span className="font-medium text-gray-900">{filteredSessions.length}</span></span>
            {statusFilter !== 'all' && (
              <span className="rounded-full bg-coral-100 px-3 py-1 text-coral-700">{getStatusLabel(statusFilter)}のみ表示</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredSessions.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <span className="text-4xl">🔍</span>
              <p className="text-sm font-medium text-gray-700">条件に一致するセッションがありません</p>
              <p className="text-xs text-gray-500">
                QRコードから問診票が送信されると自動でここに追加されます。
                検索キーワードやステータスを調整してください。
              </p>
            </div>
          ) : (
            <div
              className={
                viewMode === 'compact'
                  ? 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3'
                  : 'flex flex-col gap-4'
              }
            >
              {filteredSessions.map((session) => {
                const createdAt = new Date(session.createdAt)

                if (viewMode === 'compact') {
                  return (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => router.push(`/staff/diagnosis/${session.id}`)}
                      className="group flex flex-col rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-coral-200 hover:shadow-md"
                    >
                      <div className="flex items-center justify-between text-sm font-semibold text-gray-900">
                        <span className="truncate">{session.sessionId}</span>
                        <Badge className={getStatusColor(session.status)}>
                          {getStatusLabel(session.status)}
                        </Badge>
                      </div>
                      <div className="mt-2 space-y-1 text-xs text-gray-500">
                        {session.childName && <p>お子さま: {session.childName}</p>}
                        {session.parentName && <p>保護者: {session.parentName}</p>}
                        <p>{createdAt.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} 作成</p>
                      </div>
                    </button>
                  )
                }

                return (
                  <div
                    key={session.id}
                    className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-coral-200 hover:shadow-md"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-gray-900 sm:text-lg">
                            {session.sessionId}
                          </h3>
                          <Badge className={getStatusColor(session.status)}>
                            {getStatusLabel(session.status)}
                          </Badge>
                        </div>
                        <div className="grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">👧</span>
                            <span>{session.childName ?? '未入力'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">👩‍👦</span>
                            <span>{session.parentName ?? '未入力'}</span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          作成日時: {createdAt.toLocaleString('ja-JP')}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 sm:items-end">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full"
                          onClick={() => router.push(`/staff/diagnosis/${session.id}`)}
                        >
                          詳細を見る
                        </Button>
                        {session.status === 'active' && (
                          <Button
                            size="sm"
                            className="rounded-full bg-coral-500 hover:bg-coral-600"
                            onClick={() => router.push(`/staff/diagnosis/${session.id}`)}
                          >
                            診断を開始
                          </Button>
                        )}
                        {session.status === 'questionnaire_completed' && (
                          <Button
                            size="sm"
                            className="rounded-full bg-coral-500 hover:bg-coral-600"
                            onClick={() => router.push(`/staff/diagnosis/${session.id}`)}
                          >
                            診断を続ける
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
