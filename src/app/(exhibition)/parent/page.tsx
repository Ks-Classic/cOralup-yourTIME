'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import liff from '@line/liff'
import { Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Smartphone, QrCode, FileText, MessageCircle } from 'lucide-react'

/**
 * 親御さん用ページ / LIFFエントリーポイント
 * 
 * LINEアプリ内から開かれた場合:
 *   - liff.state パラメータに応じてルーティング
 *   - /home → /parent/home
 *   - /questionnaire → /parent/questionnaire/liff
 *   - デフォルト → /parent/questionnaire/liff
 * 
 * ブラウザから開かれた場合:
 *   - デモ説明ページを表示
 */
export default function ParentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLiffMode, setIsLiffMode] = useState<boolean | null>(null)
  const [status, setStatus] = useState<'initializing' | 'redirecting' | 'error' | 'demo'>('initializing')
  const [errorMessage, setErrorMessage] = useState('')
  const [isStarting, setIsStarting] = useState(false)

  useEffect(() => {
    const initAndRoute = async () => {
      const liffId = process.env.NEXT_PUBLIC_PARENT_LIFF_ID

      // LIFF IDがない場合はデモモード
      if (!liffId) {
        setIsLiffMode(false)
        setStatus('demo')
        return
      }

      try {
        // LIFF初期化
        await liff.init({ liffId })

        // LINEアプリ外の場合はデモモード
        if (!liff.isInClient()) {
          setIsLiffMode(false)
          setStatus('demo')
          return
        }

        setIsLiffMode(true)

        // ログインしていない場合
        if (!liff.isLoggedIn()) {
          liff.login()
          return
        }

        // ルーティング先を決定
        const liffState = searchParams.get('liff.state')

        let targetPath = '/parent/questionnaire/liff' // デフォルトは問診ページ

        if (liffState) {
          if (liffState === '/home' || liffState.startsWith('/home')) {
            targetPath = '/parent/home'
          } else if (liffState === '/questionnaire' || liffState.startsWith('/questionnaire')) {
            targetPath = '/parent/questionnaire/liff'
          } else if (liffState.startsWith('/parent/')) {
            targetPath = liffState
          }
        }

        // console.log('[Parent LIFF] Routing to:', targetPath, 'from liff.state:', liffState)
        setStatus('redirecting')
        router.replace(targetPath)

      } catch (error) {
        console.error('[Parent LIFF] Error:', error)
        // エラー時もデモモードにフォールバック
        setIsLiffMode(false)
        setStatus('demo')
      }
    }

    initAndRoute()
  }, [router, searchParams])

  // LIFF読み込み中
  if (status === 'initializing' || status === 'redirecting') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-coral-50 to-white">
        <div className="text-center p-4">
          <Loader2 className="w-10 h-10 animate-spin text-coral-500 mx-auto mb-4" />
          <p className="text-gray-600">
            {status === 'initializing' ? '読み込み中...' : 'ページに移動中...'}
          </p>
        </div>
      </div>
    )
  }

  // デモモード（ブラウザアクセス）
  const handleStartSession = () => {
    setIsStarting(true)
    router.push('/parent/questionnaire/demo')
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => router.push('/')}>
          ホームに戻る
        </Button>
      </div>

      {/* フロー説明セクション */}
      <Card className="border-coral-200 bg-gradient-to-br from-coral-50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <span>👨‍👩‍👧</span>
            <span>親御さん向けフロー</span>
          </CardTitle>
          <CardDescription className="text-base">
            以下のステップで診断を開始できます
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex flex-col items-center text-center p-4 bg-white rounded-lg border border-coral-200">
              <div className="w-10 h-10 bg-coral-500 text-white rounded-full flex items-center justify-center font-bold mb-2">
                1
              </div>
              <Smartphone className="w-6 h-6 text-coral-600 mb-2" />
              <p className="text-sm font-medium text-gray-900">LINE連携</p>
              <p className="text-xs text-gray-600 mt-1">QRコード読み込み</p>
            </div>
            <div className="flex flex-col items-center text-center p-4 bg-white rounded-lg border border-blue-200">
              <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold mb-2">
                2
              </div>
              <FileText className="w-6 h-6 text-blue-600 mb-2" />
              <p className="text-sm font-medium text-gray-900">問診票入力</p>
              <p className="text-xs text-gray-600 mt-1">基本情報・症状入力</p>
            </div>
            <div className="flex flex-col items-center text-center p-4 bg-white rounded-lg border border-green-200">
              <div className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center font-bold mb-2">
                3
              </div>
              <QrCode className="w-6 h-6 text-green-600 mb-2" />
              <p className="text-sm font-medium text-gray-900">QRコード表示</p>
              <p className="text-xs text-gray-600 mt-1">スタッフに提示</p>
            </div>
            <div className="flex flex-col items-center text-center p-4 bg-white rounded-lg border border-purple-200">
              <div className="w-10 h-10 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold mb-2">
                4
              </div>
              <MessageCircle className="w-6 h-6 text-purple-600 mb-2" />
              <p className="text-sm font-medium text-gray-900">結果受信</p>
              <p className="text-xs text-gray-600 mt-1">LINEで診断結果</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* デモ開始ボタン */}
      <Card>
        <CardHeader>
          <CardTitle>デモを試す</CardTitle>
          <CardDescription>
            LINEアプリがなくても問診票のデモを体験できます
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleStartSession}
            disabled={isStarting}
            className="w-full bg-coral-500 hover:bg-coral-600"
          >
            {isStarting ? '移動中...' : 'デモを開始する'}
          </Button>
        </CardContent>
      </Card>

      {/* LIFF URL案内 */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="py-4">
          <p className="text-sm text-blue-700">
            💡 実際の利用時はLINE公式アカウント「cOralup」を友だち追加してご利用ください
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
