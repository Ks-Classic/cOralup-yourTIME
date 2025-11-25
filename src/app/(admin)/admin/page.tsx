'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

interface DashboardData {
  totalUsers: number
  todayDiagnoses: number
  activeSessions: number
  averageDiagnosisTime: number
  events: Array<{
    id: string
    name: string
    participants: number
    target: number
    status: string
  }>
  recentActivities: Array<{
    id: string
    type: string
    description: string
    timestamp: string
    user?: string
  }>
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // 実際の実装では、複数のテーブルから集計データを取得
        // 今回はモックデータを使用
        const mockData: DashboardData = {
          totalUsers: 125,
          todayDiagnoses: 8,
          activeSessions: 3,
          averageDiagnosisTime: 12, // 分
          events: [
            {
              id: '1',
              name: '口腔育成セミナー',
              participants: 20,
              target: 25,
              status: '進行中'
            },
            {
              id: '2',
              name: '姿勢改善ワークショップ',
              participants: 15,
              target: 20,
              status: '準備中'
            },
            {
              id: '3',
              name: '親子口腔ケア講座',
              participants: 8,
              target: 15,
              status: '受付中'
            }
          ],
          recentActivities: [
            {
              id: '1',
              type: 'diagnosis',
              description: '田中太郎様の診断が完了しました',
              timestamp: '2024-01-15 14:30:00',
              user: '田中 太郎'
            },
            {
              id: '2',
              type: 'session',
              description: '新規セッションが開始されました',
              timestamp: '2024-01-15 14:15:00',
              user: '鈴木 次郎'
            },
            {
              id: '3',
              type: 'report',
              description: '診断レポートが送信されました',
              timestamp: '2024-01-15 14:00:00',
              user: '高橋 三郎'
            },
            {
              id: '4',
              type: 'user',
              description: '新規ユーザーが登録されました',
              timestamp: '2024-01-15 13:45:00',
              user: '佐藤 四郎'
            }
          ]
        }

        setData(mockData)
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'diagnosis': return '🏥'
      case 'session': return '📋'
      case 'report': return '📄'
      case 'user': return '👤'
      default: return '📌'
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'diagnosis': return 'bg-blue-100 text-blue-800'
      case 'session': return 'bg-green-100 text-green-800'
      case 'report': return 'bg-purple-100 text-purple-800'
      case 'user': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">ダッシュボードを読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-8">
        <p className="text-red-600">データの取得に失敗しました</p>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8">
      {/* ヘッダー */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          管理者ダッシュボード
        </h1>
        <p className="text-gray-600">
          Coralupシステム全体の状況をリアルタイムで確認できます
        </p>
      </div>

      {/* KPIカード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              総ユーザー数
            </CardTitle>
            <div className="text-2xl">👥</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              本日の診断数
            </CardTitle>
            <div className="text-2xl">📋</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.todayDiagnoses}</div>
            <p className="text-xs text-muted-foreground">
              +2 from yesterday
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              アクティブセッション
            </CardTitle>
            <div className="text-2xl">🔄</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.activeSessions}</div>
            <p className="text-xs text-muted-foreground">
              Currently in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              平均診断時間
            </CardTitle>
            <div className="text-2xl">⏱️</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.averageDiagnosisTime}分</div>
            <p className="text-xs text-muted-foreground">
              -3分 from last week
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* イベント状況 */}
        <Card>
          <CardHeader>
            <CardTitle>📅 イベント状況</CardTitle>
            <CardDescription>
              開催中のイベントと参加状況
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.events.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <h3 className="font-medium text-gray-900">{event.name}</h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>参加者: {event.participants}/{event.target}</span>
                      <Badge
                        className={
                          event.status === '進行中' ? 'bg-green-100 text-green-800' :
                          event.status === '準備中' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }
                      >
                        {event.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">
                      {Math.round((event.participants / event.target) * 100)}%
                    </div>
                    <div className="text-xs text-gray-500">達成率</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 最新アクティビティ */}
        <Card>
          <CardHeader>
            <CardTitle>📋 最新アクティビティ</CardTitle>
            <CardDescription>
              システム全体の最新の動き
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${getActivityColor(activity.type)}`}>
                    <span className="text-sm">
                      {getActivityIcon(activity.type)}
                    </span>
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.description}
                    </p>
                    {activity.user && (
                      <p className="text-sm text-gray-600">
                        対象: {activity.user}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      {new Date(activity.timestamp).toLocaleString('ja-JP')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* クイックアクション */}
      <Card>
        <CardHeader>
          <CardTitle>🔧 クイックアクション</CardTitle>
          <CardDescription>
            よく使う管理機能を素早くアクセス
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Button
              variant="outline"
              className="h-20 flex flex-col space-y-2"
              onClick={() => window.location.href = '/admin/users'}
            >
              <span className="text-2xl">👥</span>
              <span className="text-sm">ユーザー管理</span>
            </Button>

            <Button
              variant="outline"
              className="h-20 flex flex-col space-y-2"
              onClick={() => window.location.href = '/admin/diagnosis'}
            >
              <span className="text-2xl">📊</span>
              <span className="text-sm">診断データ</span>
            </Button>

            <Button
              variant="outline"
              className="h-20 flex flex-col space-y-2"
              onClick={() => window.location.href = '/admin/forms'}
            >
              <span className="text-2xl">🛠️</span>
              <span className="text-sm">フォーム作成</span>
            </Button>

            <Button
              variant="outline"
              className="h-20 flex flex-col space-y-2"
              onClick={() => window.location.href = '/admin/events'}
            >
              <span className="text-2xl">📅</span>
              <span className="text-sm">イベント管理</span>
            </Button>

            <Button
              variant="outline"
              className="h-20 flex flex-col space-y-2"
              onClick={() => window.location.href = '/admin/bi'}
            >
              <span className="text-2xl">📈</span>
              <span className="text-sm">BI分析</span>
            </Button>

            <Button
              variant="outline"
              className="h-20 flex flex-col space-y-2"
              onClick={() => window.location.href = '/admin/settings'}
            >
              <span className="text-2xl">⚙️</span>
              <span className="text-sm">設定</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* システムステータス */}
      <Card>
        <CardHeader>
          <CardTitle>🔍 システムステータス</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl mb-2">✅</div>
              <div className="font-medium text-green-800">データベース</div>
              <div className="text-sm text-green-600">正常稼働</div>
            </div>

            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl mb-2">🔄</div>
              <div className="font-medium text-blue-800">LINE連携</div>
              <div className="text-sm text-blue-600">正常稼働</div>
            </div>

            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl mb-2">🤖</div>
              <div className="font-medium text-purple-800">AI分析</div>
              <div className="text-sm text-purple-600">正常稼働</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
