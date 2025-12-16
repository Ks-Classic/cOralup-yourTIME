'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

// QRコードデータ型
interface QRData {
  type: 'coralup_visit'
  visitId: string
  version: number
}

interface QRScannerProps {
  onScan: (visitId: string) => void
  onError?: (error: string) => void
  className?: string
}

export function QRScanner({ onScan, onError, className }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // スキャン処理
  const handleScan = useCallback((decodedText: string) => {
    try {
      const data = JSON.parse(decodedText) as QRData

      // 形式チェック
      if (data.type !== 'coralup_visit') {
        const msg = 'このQRコードはcOralupのものではありません'
        setErrorMessage(msg)
        onError?.(msg)
        return
      }

      if (!data.visitId) {
        const msg = 'QRコードのデータが不正です'
        setErrorMessage(msg)
        onError?.(msg)
        return
      }

      // スキャン成功 - スキャナーを停止
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => { })
        scannerRef.current = null
      }
      setIsScanning(false)
      setErrorMessage(null)
      onScan(data.visitId)
    } catch {
      // JSONパースエラーは無視（他のQRコードの可能性）
      // 連続でエラーを出さないように
    }
  }, [onScan, onError])

  // スキャナー開始
  const startScanner = useCallback(async () => {
    if (!containerRef.current) return

    setErrorMessage(null)

    try {
      const scanner = new Html5Qrcode('qr-reader')
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' }, // 背面カメラ
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        handleScan,
        () => { } // スキャン中のエラーは無視
      )

      setIsScanning(true)
      setHasPermission(true)
    } catch (err) {
      console.error('カメラ起動エラー:', err)
      setHasPermission(false)
      const msg = 'カメラを起動できません。カメラの権限を確認してください。'
      setErrorMessage(msg)
      onError?.(msg)
    }
  }, [handleScan, onError])

  // スキャナー停止
  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState()
        if (state === Html5QrcodeScannerState.SCANNING) {
          await scannerRef.current.stop()
        }
      } catch (err) {
        console.error('スキャナー停止エラー:', err)
      }
      scannerRef.current = null
    }
    setIsScanning(false)
  }, [])

  // クリーンアップ
  useEffect(() => {
    return () => {
      stopScanner()
    }
  }, [stopScanner])

  // 自動開始
  useEffect(() => {
    // 少し遅延させてDOMが確実にマウントされてから開始
    const timer = setTimeout(() => {
      startScanner()
    }, 100)

    return () => clearTimeout(timer)
  }, [startScanner])

  return (
    <div className={className}>
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {/* QRリーダーコンテナ */}
          <div
            ref={containerRef}
            id="qr-reader"
            className="w-full aspect-square max-w-sm mx-auto bg-black"
          />

          {/* ステータス表示 */}
          <div className="p-4 space-y-3">
            {isScanning && (
              <div className="flex items-center justify-center gap-2 text-green-600">
                <span className="animate-pulse">●</span>
                <span className="text-sm font-medium">スキャン中...</span>
              </div>
            )}

            {hasPermission === false && (
              <div className="text-center space-y-3">
                <p className="text-red-600 text-sm">
                  カメラへのアクセスが許可されていません
                </p>
                <Button
                  onClick={startScanner}
                  variant="outline"
                  size="sm"
                >
                  再試行
                </Button>
              </div>
            )}

            {errorMessage && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg text-center">
                {errorMessage}
              </div>
            )}

            <p className="text-center text-gray-600 text-sm">
              親御さんのQRコードをカメラに向けてください
            </p>
          </div>
        </CardContent>
      </Card>

      {/* コントロールボタン */}
      <div className="mt-4 flex justify-center gap-3">
        {isScanning ? (
          <Button
            onClick={stopScanner}
            variant="outline"
            size="sm"
          >
            スキャン停止
          </Button>
        ) : (
          <Button
            onClick={startScanner}
            size="sm"
            className="bg-coral-500 hover:bg-coral-600"
          >
            スキャン開始
          </Button>
        )}
      </div>
    </div>
  )
}

