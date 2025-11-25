'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DynamicForm } from '@/components/forms/dynamic-form'
import type { FormSchemaConfig } from '@/types/forms'
import { cn } from '@/utils'

type DeviceType = 'mobile' | 'tablet' | 'desktop'

interface FormPreviewProps {
  schema: FormSchemaConfig
  deviceType?: DeviceType
  onDeviceChange?: (device: DeviceType) => void
}

export function FormPreview({ schema, deviceType = 'desktop', onDeviceChange }: FormPreviewProps) {
  const deviceClasses = useMemo(() => {
    switch (deviceType) {
      case 'mobile':
        return 'max-w-sm mx-auto'
      case 'tablet':
        return 'max-w-2xl mx-auto'
      case 'desktop':
        return 'max-w-4xl mx-auto'
      default:
        return 'max-w-4xl mx-auto'
    }
  }, [deviceType])

  const deviceWidths = {
    mobile: '375px',
    tablet: '768px',
    desktop: '100%',
  }

  return (
    <div className="space-y-4">
      {/* デバイス切替ボタン */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
            プレビュー
          </Badge>
          <span className="text-xs text-gray-500">実際の入力画面を確認</span>
        </div>
        <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-1">
          <Button
            variant={deviceType === 'mobile' ? 'default' : 'ghost'}
            size="sm"
            className={cn(
              'h-8 px-3 text-xs',
              deviceType === 'mobile' && 'bg-coral-500 text-white hover:bg-coral-600'
            )}
            onClick={() => onDeviceChange?.('mobile')}
          >
            📱 モバイル
          </Button>
          <Button
            variant={deviceType === 'tablet' ? 'default' : 'ghost'}
            size="sm"
            className={cn(
              'h-8 px-3 text-xs',
              deviceType === 'tablet' && 'bg-coral-500 text-white hover:bg-coral-600'
            )}
            onClick={() => onDeviceChange?.('tablet')}
          >
            📱 タブレット
          </Button>
          <Button
            variant={deviceType === 'desktop' ? 'default' : 'ghost'}
            size="sm"
            className={cn(
              'h-8 px-3 text-xs',
              deviceType === 'desktop' && 'bg-coral-500 text-white hover:bg-coral-600'
            )}
            onClick={() => onDeviceChange?.('desktop')}
          >
            💻 デスクトップ
          </Button>
        </div>
      </div>

      {/* プレビューエリア */}
      <div
        className={cn(
          'rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-4 transition-all',
          deviceClasses
        )}
        style={{
          width: deviceType !== 'desktop' ? deviceWidths[deviceType] : undefined,
          minHeight: '400px',
        }}
      >
        <div className="bg-white rounded-lg shadow-sm p-6">
          <DynamicForm
            schema={schema}
            onSubmit={async () => {
              // プレビュー用のダミー送信
              alert('プレビュー送信: 実際の保存処理は行われません')
            }}
            submitLabel={schema.settings?.submitButtonText || '送信する'}
          />
        </div>
      </div>

      {/* デバイス情報 */}
      <div className="text-xs text-gray-400 text-center">
        {deviceType === 'mobile' && '幅: 375px (iPhone SE相当)'}
        {deviceType === 'tablet' && '幅: 768px (iPad相当)'}
        {deviceType === 'desktop' && '幅: 100% (デスクトップ表示)'}
      </div>
    </div>
  )
}

