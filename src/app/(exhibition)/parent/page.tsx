'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Smartphone, QrCode, FileText, MessageCircle } from 'lucide-react'

export default function ParentPage() {
  const router = useRouter()
  const [isStarting, setIsStarting] = useState(false)

  const handleStartSession = useCallback(() => {
    setIsStarting(true)
    // デモページへ遷移
    router.push('/parent/questionnaire/demo')
  }, [router])
  
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
              <p className="text-xs text-gray-600 mt-1">LINEでレポート受信</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* LINE連携モックセクション */}
      <Card className="border-blue-200 bg-blue-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-blue-600" />
            <span>LINE連携（モック）</span>
          </CardTitle>
          <CardDescription>
            実際のフローでは、LINEでQRコードを読み込んで友だち登録を行います
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">C</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 mb-1">Coralup Bot</p>
                  <div className="bg-gray-100 rounded-lg p-3 mb-2">
                    <p className="text-sm text-gray-800 mb-2">
                      こんにちは！Coralupです。
                    </p>
                    <p className="text-sm text-gray-800 mb-3">
                      お子様の口腔育成診断を始めましょう。
                    </p>
                    <Button
                      onClick={handleStartSession}
                      disabled={isStarting}
                      className="w-full bg-coral-500 hover:bg-coral-600 text-white"
                    >
                      {isStarting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          開始中...
                        </>
                      ) : (
                        '診断を開始する'
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    ※ 実際のフローでは、LINEアプリ内でこのボタンをタップします
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-xs text-yellow-800">
                💡 <strong>モックモード:</strong> 実際のLINE連携は実装されていません。上記の「診断を開始する」ボタンから問診票入力に進めます。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* デモリンク */}
      <Card className="border-gray-200">
        <CardContent className="pt-6">
          <div className="text-center space-y-3">
            <p className="text-sm text-gray-600">
              デモ用の固定セッションIDで試す場合はこちら
            </p>
            <Button
              variant="outline"
              onClick={() => router.push('/parent/questionnaire/demo')}
            >
              デモモードで開始
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


