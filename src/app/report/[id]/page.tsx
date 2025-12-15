'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Heart, AlertCircle, X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react'
import { cn } from '@/utils'

interface ReportData {
  id: string
  childName: string
  childFullName?: string
  childAge: number
  childAgeMonths?: number
  childGender?: string
  parentName: string
  eventName: string
  diagnosisDate: string
  photos: { postureSide?: string; postureFront?: string; oralFront?: string }
  aiAnalysis: { summary: string }
}

const MOCK_DATA: ReportData = {
  id: 'test-uuid',
  childName: 'ひびの あさちゃん',
  childAge: 2,
  childAgeMonths: 22,
  parentName: '日比野様',
  eventName: 'Your TIME. 5th cOral upブース',
  diagnosisDate: '2025-08-03',
  photos: { postureSide: '', postureFront: '', oralFront: '' },
  aiAnalysis: {
    summary: 'お子さんの姿勢は背中が丸くなりお腹が前に出る「凹円背」で、歯は噛み合わせが深い過蓋咬合の状態です。どちらも体の使い方やバランスの乱れから起こることがあります。姿勢がゆるやかに変わるとあごの動きにも影響しやすく、歯並びにも関わることがあります。また、歯並びが整うと口まわりの筋肉の使い方が安定して、姿勢も自然と整いやすくなります。そのため、姿勢と歯並びはつながっていると考え、両方を一緒に見ることが大切です。'
  }
}

export default function ReportPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const [reportId, setReportId] = useState<string>('')
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null)

  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = 'then' in params ? await params : params
      setReportId(resolvedParams.id)
    }
    resolveParams()
  }, [params])

  useEffect(() => {
    if (!reportId) return

    const fetchReport = async () => {
      setIsLoading(true)
      setError(null)

      // テスト用UUIDの場合はモックデータ
      if (reportId === 'test-uuid' || reportId === 'demo') {
        setReportData({ ...MOCK_DATA, id: reportId })
        setIsLoading(false)
        return
      }

      try {
        const res = await fetch(`/api/report/${reportId}`)
        if (!res.ok) throw new Error('レポートが見つかりません')
        const data = await res.json()
        setReportData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'エラーが発生しました')
      } finally {
        setIsLoading(false)
      }
    }

    fetchReport()
  }, [reportId])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (error || !reportData) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 gap-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-gray-700">{error || 'レポートが見つかりません'}</p>
      </div>
    )
  }

  // 月齢を「〇年〇ヶ月」形式で表示
  const getAgeDisplay = () => {
    if (reportData.childAgeMonths) {
      const years = Math.floor(reportData.childAgeMonths / 12)
      const months = reportData.childAgeMonths % 12
      if (years > 0 && months > 0) {
        return `${years}歳${months}ヶ月`
      } else if (years > 0) {
        return `${years}歳`
      } else {
        return `${months}ヶ月`
      }
    }
    return `${reportData.childAge}歳`
  }

  const photoLabels = [
    { key: 'postureSide', label: '横向き姿勢' },
    { key: 'postureFront', label: '正面姿勢' },
    { key: 'oralFront', label: '口腔内' }
  ] as const

  // 有効な写真のみをフィルタリング
  const validPhotos = photoLabels
    .map((item, index) => ({ ...item, url: reportData.photos[item.key], index }))
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
    <div className="min-h-screen bg-white">
      <div className="max-w-[210mm] mx-auto bg-white p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* ヘッダー */}
          <header className="text-center mb-6 border-b-2 border-blue-600 pb-4">
            <p className="text-sm text-blue-600 mb-2">
              {new Date(reportData.diagnosisDate).toLocaleDateString('ja-JP')} {reportData.eventName}
            </p>
            <h1 className="text-3xl font-bold text-blue-800 tracking-wider">分析シート</h1>
            <p className="text-lg mt-3 text-gray-800">
              {getAgeDisplay()} {reportData.childName}
            </p>
          </header>

          {/* 写真セクション */}
          <section className="mb-6">
            <div className="grid grid-cols-3 gap-4">
              {photoLabels.map(({ key, label }, index) => {
                const photoUrl = reportData.photos[key]
                return (
                  <div
                    key={key}
                    className={cn(
                      "aspect-[3/4] bg-gray-100 rounded-lg border-2 border-gray-200 overflow-hidden flex items-center justify-center relative",
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
                          <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                        </div>
                        <p className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs text-center py-1">
                          {label}
                        </p>
                      </>
                    ) : (
                      <div className="text-center text-gray-500">
                        <p className="text-sm font-medium">{label}</p>
                        <p className="text-xs">写真</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            {validPhotos.length > 0 && (
              <p className="text-xs text-gray-400 text-center mt-2">
                タップで拡大表示
              </p>
            )}
          </section>

          {/* 分析できること */}
          <section className="mb-6">
            <div className="border-2 border-gray-300 rounded-lg p-5">
              <h2 className="text-center text-lg font-bold text-gray-800 mb-4">
                分析できること
              </h2>
              <p className="text-sm leading-relaxed text-gray-800 text-justify">
                {reportData.aiAnalysis.summary}
              </p>
            </div>
          </section>

          {/* フッター */}
          <footer className="text-center pt-4 border-t border-gray-200">
            <div className="flex items-center justify-center gap-2 text-gray-500 text-xs">
              <Heart className="w-4 h-4" />
              <span>cOral up - 口腔育成診断</span>
            </div>
          </footer>
        </motion.div>
      </div>

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
                    "w-3 h-3 rounded-full transition-colors",
                    index === selectedPhotoIndex ? "bg-white" : "bg-white/40"
                  )}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
