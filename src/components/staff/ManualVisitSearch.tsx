'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface ManualVisitSearchProps {
  onFound: (visitId: string) => void
  className?: string
}

export function ManualVisitSearch({ onFound, className }: ManualVisitSearchProps) {
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSearch = async () => {
    if (code.length < 4) {
      setError('4文字以上入力してください')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/staff/session?code=${encodeURIComponent(code)}`)
      const data = await response.json()

      if (!response.ok) {
        setError(data.message || '検索に失敗しました')
        return
      }

      if (data.visits?.length === 1) {
        onFound(data.visits[0].id)
      } else if (data.visits?.length > 1) {
        setError('複数の候補があります。もう少し入力してください')
      } else {
        setError('該当する受付が見つかりません')
      }
    } catch {
      setError('検索中にエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && code.length >= 4) {
      handleSearch()
    }
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <span>🔍</span>
          <span>受付番号で検索</span>
        </CardTitle>
        <CardDescription className="text-sm">
          QRが読み取れない場合は受付番号を入力してください
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase())
              setError('')
            }}
            onKeyDown={handleKeyDown}
            placeholder="例: 550E8400"
            className="flex-1 font-mono uppercase"
            maxLength={8}
            disabled={isLoading}
          />
          <Button
            onClick={handleSearch}
            disabled={isLoading || code.length < 4}
            className="bg-coral-500 hover:bg-coral-600"
          >
            {isLoading ? '検索中...' : '検索'}
          </Button>
        </div>
        {error && (
          <p className="text-red-500 text-sm mt-2">{error}</p>
        )}
        <p className="text-xs text-gray-500 mt-2">
          受付番号は親御さんのQR画面下部に表示されています
        </p>
      </CardContent>
    </Card>
  )
}

