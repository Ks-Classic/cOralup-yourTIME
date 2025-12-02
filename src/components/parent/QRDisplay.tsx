'use client'

import { QRCodeSVG } from 'qrcode.react'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2 } from 'lucide-react'

interface QRData {
  type: 'coralup_visit'
  visitId: string
  version: number
}

interface QRDisplayProps {
  visitId: string
  childName: string
  className?: string
}

/**
 * 親御さんのスマホに表示するQRコード
 * スタッフがスキャンして診断セッションを引き継ぐ
 */
export function QRDisplay({ visitId, childName, className }: QRDisplayProps) {
  const qrData: QRData = {
    type: 'coralup_visit',
    visitId,
    version: 1,
  }

  // 受付番号（visit_idの先頭8文字）
  const receptionNumber = visitId.slice(0, 8).toUpperCase()

  return (
    <div className={`flex flex-col items-center ${className || ''}`}>
      {/* 完了メッセージ */}
      <div className="mb-6 text-center">
        <div className="flex items-center justify-center mb-2">
          <CheckCircle2 className="w-8 h-8 text-green-500 mr-2" />
          <span className="text-xl font-bold text-green-700">問診票の送信が完了しました</span>
        </div>
        <p className="text-gray-600">
          このQRコードをスタッフにお見せください
        </p>
      </div>

      {/* 子供の名前 */}
      <h1 className="text-2xl font-bold text-gray-900 mb-4">
        {childName}さんの受付QR
      </h1>

      {/* QRコード */}
      <Card className="bg-white shadow-xl border-2 border-coral-200">
        <CardContent className="p-6">
          <div className="bg-white p-4 rounded-lg">
            <QRCodeSVG
              value={JSON.stringify(qrData)}
              size={280}
              level="M"
              includeMargin={true}
              bgColor="#FFFFFF"
              fgColor="#000000"
            />
          </div>
        </CardContent>
      </Card>

      {/* 説明テキスト */}
      <p className="mt-6 text-gray-600 text-center text-lg">
        📱 スタッフがこのQRコードをスキャンします
      </p>

      {/* 受付番号（バックアップ） */}
      <div className="mt-4 p-4 bg-gray-100 rounded-lg">
        <p className="text-sm text-gray-500 text-center mb-1">
          QRが読み取れない場合の受付番号
        </p>
        <p className="text-2xl font-mono font-bold text-center text-gray-800 tracking-wider">
          {receptionNumber}
        </p>
      </div>

      {/* 注意事項 */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg max-w-sm">
        <p className="text-sm text-yellow-800 text-center">
          ⚠️ この画面を閉じないでください。<br />
          診断完了後、LINEでレポートをお送りします。
        </p>
      </div>
    </div>
  )
}

