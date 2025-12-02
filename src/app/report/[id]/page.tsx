'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Heart, Calendar, AlertCircle, Printer } from 'lucide-react'

interface ReportData {
  id: string
  childName: string
  childAge: number
  childAgeMonths?: number
  parentName: string
  eventName: string
  diagnosisDate: string
  photos: { postureSide?: string; postureFront?: string; oralFront?: string }
  aiAnalysis: { summary: string; ageConsideration?: string }
  postureAnalysis?: { overallScore: number; issues: string[] }
  oralAnalysis?: { overallScore: number; issues: string[] }
}

export default function ReportPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const [reportId, setReportId] = useState<string>('')
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = 'then' in params ? await params : params
      setReportId(resolvedParams.id)
    }
    resolveParams()
  }, [params])

  useEffect(() => {
    if (!reportId) return
    setIsLoading(true)
    const mockData: ReportData = {
      id: reportId,
      childName: 'ひびの あさちゃん',
      childAge: 2,
      childAgeMonths: 22,
      parentName: '日比野様',
      eventName: 'Your TIME. 5th cOral upブース',
      diagnosisDate: '2025-08-03',
      photos: { postureSide: '', postureFront: '', oralFront: '' },
      aiAnalysis: {
        summary: 'お子さんの姿勢は背中が丸くなりお腹が前に出る「凹円背」で、歯は噛み合わせが深い過蓋咬合の状態です。どちらも体の使い方やバランスの乱れから起こることがあります。姿勢がゆるやかに変わるとあごの動きにも影響しやすく、歯並びにも関わることがあります。また、歯並びが整うと口まわりの筋肉の使い方が安定して、姿勢も自然と整いやすくなります。そのため、姿勢と歯並びはつながっていると考え、両方を一緒に見ることが大切です。',
        ageConsideration: '22ヶ月のお子様としては、まだ成長過程にあるため、今後の発達とともに改善が期待できます。'
      },
      postureAnalysis: { overallScore: 6, issues: ['凹円背', 'お腹の突出'] },
      oralAnalysis: { overallScore: 7, issues: ['過蓋咬合'] }
    }
    setReportData(mockData)
    setIsLoading(false)
  }, [reportId])

  if (isLoading) {
    return <div className="min-h-screen bg-white flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
  }

  if (error || !reportData) {
    return <div className="min-h-screen bg-white flex items-center justify-center p-4"><AlertCircle className="w-12 h-12 text-red-500" /><p>レポートが見つかりません</p></div>
  }

  const getAgeDisplay = () => reportData.childAgeMonths ? 'K' + reportData.childAgeMonths : reportData.childAge + '歳'

  return (
    <div className="min-h-screen bg-white">
      <div className="fixed top-4 right-4 z-50 print:hidden">
        <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700">
          <Printer className="w-4 h-4" />印刷 / PDF保存
        </button>
      </div>

      <div className="max-w-[210mm] mx-auto bg-white p-6 print:p-8">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
          <header className="text-center mb-6 border-b-2 border-blue-600 pb-4">
            <p className="text-sm text-blue-600 mb-2">{new Date(reportData.diagnosisDate).toLocaleDateString('ja-JP')} {reportData.eventName}</p>
            <h1 className="text-3xl font-bold text-blue-800 tracking-wider">分析シート</h1>
            <p className="text-lg mt-3 text-gray-800">{getAgeDisplay()} {reportData.childName}</p>
          </header>

          <section className="mb-6">
            <div className="grid grid-cols-3 gap-4">
              {['横向き姿勢', '正面姿勢', '口腔内'].map((label, i) => (
                <div key={i} className="aspect-[3/4] bg-gray-100 rounded-lg border-2 border-gray-200 flex items-center justify-center">
                  <div className="text-center text-gray-500"><p className="text-sm font-medium">{label}</p><p className="text-xs">写真</p></div>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-6">
            <div className="border-2 border-gray-300 rounded-lg p-5">
              <h2 className="text-center text-lg font-bold text-gray-800 mb-4">分析できること</h2>
              <p className="text-sm leading-relaxed text-gray-800 text-justify">{reportData.aiAnalysis.summary}</p>
            </div>
          </section>

          {(reportData.postureAnalysis || reportData.oralAnalysis) && (
            <section className="mb-6 grid grid-cols-2 gap-4">
              {reportData.postureAnalysis && (
                <div className="border rounded-lg p-4 bg-blue-50">
                  <h3 className="font-bold text-blue-800 mb-2 text-sm">姿勢評価</h3>
                  <span className="text-2xl font-bold text-blue-600">{reportData.postureAnalysis.overallScore}</span><span className="text-gray-500 text-sm">/10</span>
                  <ul className="text-xs text-gray-600 mt-2">{reportData.postureAnalysis.issues.map((issue, i) => <li key={i}>• {issue}</li>)}</ul>
                </div>
              )}
              {reportData.oralAnalysis && (
                <div className="border rounded-lg p-4 bg-green-50">
                  <h3 className="font-bold text-green-800 mb-2 text-sm">口腔評価</h3>
                  <span className="text-2xl font-bold text-green-600">{reportData.oralAnalysis.overallScore}</span><span className="text-gray-500 text-sm">/10</span>
                  <ul className="text-xs text-gray-600 mt-2">{reportData.oralAnalysis.issues.map((issue, i) => <li key={i}>• {issue}</li>)}</ul>
                </div>
              )}
            </section>
          )}

          {reportData.aiAnalysis.ageConsideration && (
            <section className="mb-6">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h3 className="font-bold text-amber-800 mb-2 text-sm flex items-center gap-2"><Calendar className="w-4 h-4" />{getAgeDisplay()}のお子様について</h3>
                <p className="text-sm text-gray-700">{reportData.aiAnalysis.ageConsideration}</p>
              </div>
            </section>
          )}

          <footer className="text-center pt-4 border-t border-gray-200">
            <div className="flex items-center justify-center gap-2 text-gray-500 text-xs"><Heart className="w-4 h-4" /><span>cOral up - 口腔育成診断</span></div>
            <p className="text-xs text-gray-400 mt-2">このレポートは診断日から90日間有効です</p>
          </footer>
        </motion.div>
      </div>
    </div>
  )
}
