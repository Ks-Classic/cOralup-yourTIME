'use client'

import { Heart } from 'lucide-react'
import Image from 'next/image'

interface ReportPreviewProps {
  childName: string
  childAgeMonths?: number
  childAge?: number
  eventName: string
  diagnosisDate: string
  photos: {
    postureSide?: string
    postureFront?: string
    oralFront?: string
  }
  aiSummary: string
}

export function ReportPreview({
  childName,
  childAgeMonths,
  childAge,
  eventName,
  diagnosisDate,
  photos,
  aiSummary
}: ReportPreviewProps) {
  const getAgeDisplay = () => 
    childAgeMonths ? `${childAgeMonths}ヶ月` : `${childAge || 0}歳`

  const photoLabels = [
    { key: 'postureSide' as const, label: '横向き姿勢' },
    { key: 'postureFront' as const, label: '正面姿勢' },
    { key: 'oralFront' as const, label: '口腔内' }
  ]

  return (
    <div className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
      {/* ヘッダー */}
      <header className="text-center p-4 border-b-2 border-blue-600">
        <p className="text-xs text-blue-600 mb-1">
          {new Date(diagnosisDate).toLocaleDateString('ja-JP')} {eventName}
        </p>
        <h1 className="text-xl font-bold text-blue-800 tracking-wider">分析シート</h1>
        <p className="text-sm mt-2 text-gray-800">
          {getAgeDisplay()} {childName}
        </p>
      </header>

      <div className="p-4 space-y-4">
        {/* 写真セクション */}
        <section>
          <div className="grid grid-cols-3 gap-2">
            {photoLabels.map(({ key, label }) => {
              const photoUrl = photos[key]
              return (
                <div
                  key={key}
                  className="aspect-[3/4] bg-gray-100 rounded border border-gray-200 overflow-hidden flex items-center justify-center"
                >
                  {photoUrl ? (
                    <Image
                      src={photoUrl}
                      alt={label}
                      width={100}
                      height={133}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center text-gray-400">
                      <p className="text-xs font-medium">{label}</p>
                      <p className="text-[10px]">写真</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* 分析できること */}
        <section>
          <div className="border border-gray-300 rounded-lg p-3">
            <h2 className="text-center text-sm font-bold text-gray-800 mb-2">
              分析できること
            </h2>
            <p className="text-xs leading-relaxed text-gray-800">
              {aiSummary}
            </p>
          </div>
        </section>

        {/* フッター */}
        <footer className="text-center pt-2 border-t border-gray-200">
          <div className="flex items-center justify-center gap-1 text-gray-400 text-[10px]">
            <Heart className="w-3 h-3" />
            <span>cOral up - 口腔育成診断</span>
          </div>
        </footer>
      </div>
    </div>
  )
}


