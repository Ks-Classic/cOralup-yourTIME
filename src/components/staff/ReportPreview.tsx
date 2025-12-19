'use client'

import { useState } from 'react'
import { Heart, ChevronLeft, ChevronRight, X, ZoomIn, Edit2, Check } from 'lucide-react'
import { cn } from '@/utils'
import { Button } from '@/components/ui/button'

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
  onSummaryChange?: (value: string) => void
  isEditable?: boolean
  reportUrl?: string
}

export function ReportPreview({
  childName,
  childAgeMonths,
  childAge,
  eventName,
  diagnosisDate,
  photos,
  aiSummary,
  onSummaryChange,
  isEditable = false,
  reportUrl
}: ReportPreviewProps) {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null)
  const [isEditingComment, setIsEditingComment] = useState(false)
  const [editingText, setEditingText] = useState(aiSummary)

  const getAgeDisplay = () =>
    childAgeMonths ? `${childAgeMonths}ヶ月` : `${childAge || 0}歳`

  const photoLabels = [
    { key: 'postureSide' as const, label: '横向き姿勢' },
    { key: 'postureFront' as const, label: '正面姿勢' },
    { key: 'oralFront' as const, label: '口腔内' }
  ]

  // 有効な写真のみをフィルタリング
  const validPhotos = photoLabels
    .map((item, index) => ({ ...item, url: photos[item.key], index }))
    .filter(item => item.url)

  const openPhotoViewer = (index: number) => {
    const validIndex = validPhotos.findIndex(p => p.index === index)
    if (validIndex !== -1) {
      setSelectedPhotoIndex(validIndex)
    }
  }

  const closePhotoViewer = () => {
    setSelectedPhotoIndex(null)
  }

  const goToPrevPhoto = () => {
    if (selectedPhotoIndex === null || validPhotos.length === 0) return
    setSelectedPhotoIndex((selectedPhotoIndex - 1 + validPhotos.length) % validPhotos.length)
  }

  const goToNextPhoto = () => {
    if (selectedPhotoIndex === null || validPhotos.length === 0) return
    setSelectedPhotoIndex((selectedPhotoIndex + 1) % validPhotos.length)
  }

  return (
    <>
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
              {photoLabels.map(({ key, label }, index) => {
                const photoUrl = photos[key]
                return (
                  <div
                    key={key}
                    className={cn(
                      "aspect-[3/4] bg-gray-100 rounded border border-gray-200 overflow-hidden flex items-center justify-center relative",
                      photoUrl && "cursor-pointer group"
                    )}
                    onClick={() => photoUrl && openPhotoViewer(index)}
                  >
                    {photoUrl ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photoUrl}
                          alt={label}
                          className="w-full h-full object-cover"
                        />
                        {/* タップで拡大アイコン */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                        </div>
                        <p className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] text-center py-0.5">
                          {label}
                        </p>
                      </>
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
            {validPhotos.length > 0 && (
              <p className="text-[10px] text-gray-400 text-center mt-1">
                タップで拡大表示
              </p>
            )}
          </section>

          {/* 分析レポート */}
          <section>
            <div className="border border-gray-300 rounded-lg p-3">
              <h2 className="text-center text-sm font-bold text-gray-800 mb-2">
                分析レポート
                {isEditable && (
                  <span className="text-[10px] text-blue-500 font-normal ml-2">（タップで編集）</span>
                )}
              </h2>
              {isEditable && onSummaryChange ? (
                <div
                  onClick={() => {
                    setEditingText(aiSummary)
                    setIsEditingComment(true)
                  }}
                  className="cursor-pointer group"
                >
                  <div className="relative">
                    <p className="text-xs leading-relaxed text-gray-800 bg-blue-50 border border-blue-200 rounded p-2 min-h-[80px] whitespace-pre-wrap">
                      {aiSummary || <span className="text-gray-400">タップしてコメントを入力...</span>}
                    </p>
                    <div className="absolute top-2 right-2 opacity-60 group-hover:opacity-100 transition-opacity">
                      <div className="flex items-center gap-1 text-blue-600 bg-white px-2 py-1 rounded-full shadow-sm text-[10px] font-medium">
                        <Edit2 className="w-3 h-3" />
                        編集
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-blue-500 text-center mt-1">
                    👆 タップして大きく編集
                  </p>
                </div>
              ) : (
                <p className="text-xs leading-relaxed text-gray-800 whitespace-pre-wrap">
                  {aiSummary}
                </p>
              )}
            </div>
          </section>

          {/* レポートURLプレビュー */}
          {reportUrl && (
            <section>
              <a
                href={reportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <p className="text-xs text-gray-500 mb-1">レポートページURL</p>
                <p className="text-xs text-blue-600 underline break-all">{reportUrl}</p>
              </a>
            </section>
          )}

          {/* フッター */}
          <footer className="text-center pt-2 border-t border-gray-200">
            <div className="flex items-center justify-center gap-1 text-gray-400 text-[10px]">
              <Heart className="w-3 h-3" />
              <span>cOral up - 口腔育成診断</span>
            </div>
          </footer>
        </div>
      </div>

      {/* コメント編集モーダル（全画面） */}
      {isEditingComment && (
        <div
          className="fixed inset-0 bg-white z-[9999] flex flex-col"
          style={{ touchAction: 'none' }}
        >
          {/* ヘッダー */}
          <div className="flex-shrink-0 flex items-center justify-between p-4 border-b bg-blue-50">
            <button
              onClick={() => {
                setIsEditingComment(false)
              }}
              className="p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <h2 className="text-base font-bold text-gray-800">
              コメント編集
            </h2>
            <Button
              onClick={() => {
                if (onSummaryChange) {
                  onSummaryChange(editingText)
                }
                setIsEditingComment(false)
              }}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Check className="w-4 h-4 mr-1" />
              完了
            </Button>
          </div>

          {/* 編集エリア */}
          <div className="flex-1 p-4 overflow-auto">
            <div className="mb-3">
              <p className="text-sm text-gray-600 mb-1">
                お子様への分析コメントを入力してください
              </p>
              <p className="text-xs text-gray-400">
                保護者の方にお送りするレポートに表示されます
              </p>
            </div>
            <textarea
              value={editingText}
              onChange={(e) => setEditingText(e.target.value)}
              className="w-full h-[calc(100%-80px)] min-h-[300px] text-base leading-relaxed text-gray-800 bg-gray-50 border border-gray-300 rounded-lg p-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
              placeholder="例: お子さんの姿勢は背中が丸くなりお腹が前に出る「凹円背」で、歯は噛み合わせが深い過蓋咬合の状態です..."
              autoFocus
            />
          </div>

          {/* フッター */}
          <div className="flex-shrink-0 p-4 border-t bg-gray-50 safe-area-inset-bottom">
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setIsEditingComment(false)}
                className="flex-1"
              >
                キャンセル
              </Button>
              <Button
                onClick={() => {
                  if (onSummaryChange) {
                    onSummaryChange(editingText)
                  }
                  setIsEditingComment(false)
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <Check className="w-4 h-4 mr-2" />
                保存する
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 写真拡大モーダル */}
      {selectedPhotoIndex !== null && validPhotos.length > 0 && (
        <div
          className="fixed inset-0 bg-black z-[9999] flex flex-col"
          style={{ touchAction: 'none' }}
        >
          {/* ヘッダー */}
          <div className="flex-shrink-0 flex items-center justify-between p-4 bg-black/80">
            <button
              onClick={closePhotoViewer}
              className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <p className="text-white font-medium">
              {validPhotos[selectedPhotoIndex].label}
            </p>
            <div className="text-white text-sm">
              {selectedPhotoIndex + 1} / {validPhotos.length}
            </div>
          </div>

          {/* 画像エリア */}
          <div className="flex-1 flex items-center justify-center relative overflow-hidden">
            {/* 前へボタン */}
            {validPhotos.length > 1 && (
              <button
                onClick={goToPrevPhoto}
                className="absolute left-2 z-10 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
            )}

            {/* 画像 */}
            <div className="w-full h-full flex items-center justify-center p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={validPhotos[selectedPhotoIndex].url!}
                alt={validPhotos[selectedPhotoIndex].label}
                className="max-w-full max-h-full object-contain"
                style={{ maxHeight: 'calc(100vh - 160px)' }}
              />
            </div>

            {/* 次へボタン */}
            {validPhotos.length > 1 && (
              <button
                onClick={goToNextPhoto}
                className="absolute right-2 z-10 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            )}
          </div>

          {/* インジケーター */}
          {validPhotos.length > 1 && (
            <div className="flex-shrink-0 flex justify-center gap-2 p-4 bg-black/80">
              {validPhotos.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedPhotoIndex(index)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors",
                    index === selectedPhotoIndex ? "bg-white" : "bg-white/40"
                  )}
                />
              ))}
            </div>
          )}
        </div>
      )}

    </>
  )
}
