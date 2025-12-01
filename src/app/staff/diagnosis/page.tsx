'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { QrCode, Camera, X, CheckCircle2 } from 'lucide-react'
import { cn } from '@/utils'

export default function DiagnosisStartPage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [sessionId, setSessionId] = useState('')
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // カメラ開始
  const startCamera = async () => {
    try {
      setError(null)
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      })

      setStream(mediaStream)
      setIsCameraOpen(true)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error accessing camera:', error)
      setError('カメラへのアクセスに失敗しました。設定を確認してください。')
      setIsCameraOpen(false)
    }
  }

  // カメラ停止
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setIsCameraOpen(false)
    setError(null)
  }

  // QRコード読み取り処理（簡易実装）
  // 実際の実装では、QRコード読み取りライブラリ（例: html5-qrcode）を使用
  const handleQRCodeScan = () => {
    // TODO: QRコード読み取りライブラリを統合
    // 現在は手動入力のみサポート
    alert('QRコード読み取り機能は今後実装予定です。セッションIDを手動で入力してください。')
  }

  // セッションID確定処理
  const handleStartDiagnosis = () => {
    if (!sessionId.trim()) {
      setError('セッションIDを入力してください')
      return
    }

    setIsProcessing(true)

    // セッションID確定後、統合診断ページに遷移
    router.push(`/staff/diagnosis/${sessionId.trim()}`)
  }

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [stream])

  return (
    <div className="min-h-screen bg-gradient-to-br from-coral-50 to-white px-3 py-4 touch-pan-y">
      <div className="max-w-2xl mx-auto pt-6">
        <Card className="border-coral-200 shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 bg-coral-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <QrCode className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl text-gray-900">診断開始</CardTitle>
            <CardDescription className="text-base mt-2">
              QRコードを読み取るか、セッションIDを入力して診断を開始してください
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* QRコード読み取りセクション */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">QRコード読み取り</h3>
                {!isCameraOpen && (
                  <Button
                    onClick={startCamera}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    カメラを起動
                  </Button>
                )}
              </div>

              {isCameraOpen && (
                <div className="relative space-y-3">
                  <div className="relative bg-black rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-auto"
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="border-2 border-coral-500 rounded-lg w-64 h-64">
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-coral-500"></div>
                        <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-coral-500"></div>
                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-coral-500"></div>
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-coral-500"></div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button
                      onClick={handleQRCodeScan}
                      className="flex-1"
                      disabled={isProcessing}
                    >
                      QRコードを読み取る
                    </Button>
                    <Button
                      onClick={stopCamera}
                      variant="outline"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {!isCameraOpen && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center bg-gray-50">
                  <QrCode className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 text-sm">
                    カメラを起動してQRコードを読み取ります
                  </p>
                </div>
              )}
            </div>

            {/* 区切り線 */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">または</span>
              </div>
            </div>

            {/* セッションID手動入力セクション */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">セッションIDを入力</h3>
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="セッションIDを入力してください"
                  value={sessionId}
                  onChange={(e) => {
                    setSessionId(e.target.value)
                    setError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleStartDiagnosis()
                    }
                  }}
                  className={cn(
                    'text-lg',
                    error && 'border-red-500'
                  )}
                  disabled={isProcessing}
                />
                {error && (
                  <p className="text-sm text-red-600">{error}</p>
                )}
                <p className="text-xs text-gray-500">
                  親御さんが表示したQRコードに記載されているセッションIDを入力してください
                </p>
              </div>
            </div>

            {/* 診断開始ボタン */}
            <Button
              onClick={handleStartDiagnosis}
              className="w-full py-6 text-lg"
              disabled={!sessionId.trim() || isProcessing}
            >
              {isProcessing ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  処理中...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  診断を開始
                </>
              )}
            </Button>

            {/* デモ用リンク */}
            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center mb-2">
                デモ用: テストセッションで試す
              </p>
              <Button
                onClick={() => router.push('/staff/diagnosis/demo')}
                variant="outline"
                className="w-full"
              >
                デモページを開く
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
