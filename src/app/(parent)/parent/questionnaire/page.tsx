'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// /parent/questionnaire にアクセスした場合は /parent にリダイレクト
export default function QuestionnaireIndexPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/parent')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-gray-600">リダイレクト中...</p>
      </div>
    </div>
  )
}
