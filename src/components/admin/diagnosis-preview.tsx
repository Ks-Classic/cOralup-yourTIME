'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import type { DiagnosisItem } from '@/data/staff-diagnosis-items'
import { cn } from '@/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type DeviceType = 'mobile' | 'tablet' | 'desktop'
type InputType = 'parent' | 'staff' | 'all'

interface DiagnosisPreviewProps {
  items: DiagnosisItem[]
  deviceType?: DeviceType
  onDeviceChange?: (device: DeviceType) => void
}

export function DiagnosisPreview({ items, deviceType = 'desktop', onDeviceChange }: DiagnosisPreviewProps) {
  const [inputTypeFilter, setInputTypeFilter] = useState<InputType>('all')
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0)
  const [diagnosisValues, setDiagnosisValues] = useState<Record<string, any>>({})

  // フィルタリングされた項目
  const filteredItems = useMemo(() => {
    if (inputTypeFilter === 'all') return items
    return items.filter(item => item.inputType === inputTypeFilter)
  }, [items, inputTypeFilter])

  // カテゴリ別にグループ化
  const itemsByCategory = useMemo(() => {
    const grouped: Record<string, DiagnosisItem[]> = {}
    filteredItems.forEach(item => {
      if (!grouped[item.category]) {
        grouped[item.category] = []
      }
      grouped[item.category].push(item)
    })
    return grouped
  }, [filteredItems])

  // カテゴリの順序
  const categoryOrder = useMemo(() => {
    const categories = Array.from(new Set(filteredItems.map(item => item.category)))
    return categories
  }, [filteredItems])

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

  // 診断値の更新
  const updateDiagnosisValue = (itemId: string, value: any) => {
    setDiagnosisValues(prev => ({
      ...prev,
      [itemId]: value,
    }))
  }

  // 現在のカテゴリ
  const currentCategory = categoryOrder[currentCategoryIndex] || ''
  const currentCategoryItems = itemsByCategory[currentCategory] || []

  // フィールドレンダリング
  const renderField = (item: DiagnosisItem) => {
    const value = diagnosisValues[item.id]

    switch (item.answerType) {
      case 'radio':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              {item.question}
              {item.required && <span className="text-red-500 ml-1">*</span>}
              {item.analysisUse && (
                <Badge variant="outline" className="ml-2 text-xs bg-blue-50 text-blue-700 border-blue-200">
                  分析利用
                </Badge>
              )}
            </label>
            {item.note && (
              <p className="text-xs text-gray-500 mb-2">{item.note}</p>
            )}
            <div className="grid grid-cols-2 gap-2">
              {item.options?.map(option => (
                <label
                  key={option.value}
                  className={cn(
                    'flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-all',
                    value === option.value
                      ? 'border-coral-500 bg-coral-50 text-coral-700 font-medium'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  )}
                >
                  <input
                    type="radio"
                    name={item.id}
                    value={option.value}
                    checked={value === option.value}
                    onChange={() => updateDiagnosisValue(item.id, option.value)}
                    className="sr-only"
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        )

      case 'checkbox':
        const checkboxValue = Array.isArray(value) ? value : []
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              {item.question}
              {item.required && <span className="text-red-500 ml-1">*</span>}
              {item.analysisUse && (
                <Badge variant="outline" className="ml-2 text-xs bg-blue-50 text-blue-700 border-blue-200">
                  分析利用
                </Badge>
              )}
            </label>
            {item.note && (
              <p className="text-xs text-gray-500 mb-2">{item.note}</p>
            )}
            <div className="grid grid-cols-2 gap-2">
              {item.options?.map(option => {
                const isChecked = checkboxValue.includes(option.value)
                return (
                  <label
                    key={option.value}
                    className={cn(
                      'flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-all',
                      isChecked
                        ? 'border-coral-500 bg-coral-50 text-coral-700 font-medium'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        const newValue = e.target.checked
                          ? [...checkboxValue, option.value]
                          : checkboxValue.filter(v => v !== option.value)
                        updateDiagnosisValue(item.id, newValue)
                      }}
                      className="sr-only"
                    />
                    <span className="text-sm">{option.label}</span>
                  </label>
                )
              })}
            </div>
          </div>
        )

      case 'text':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              {item.question}
              {item.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {item.note && (
              <p className="text-xs text-gray-500 mb-2">{item.note}</p>
            )}
            <Input
              value={value || ''}
              onChange={(e) => updateDiagnosisValue(item.id, e.target.value)}
              placeholder={item.placeholder}
              className="h-11"
            />
          </div>
        )

      case 'number':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              {item.question}
              {item.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {item.note && (
              <p className="text-xs text-gray-500 mb-2">{item.note}</p>
            )}
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={value || ''}
                onChange={(e) => updateDiagnosisValue(item.id, e.target.value ? parseFloat(e.target.value) : '')}
                placeholder={item.placeholder}
                min={item.min}
                max={item.max}
                className="h-11 flex-1"
              />
              {item.unit && (
                <span className="text-sm text-gray-600 whitespace-nowrap">{item.unit}</span>
              )}
            </div>
          </div>
        )

      case 'textarea':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              {item.question}
              {item.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {item.note && (
              <p className="text-xs text-gray-500 mb-2">{item.note}</p>
            )}
            <Textarea
              value={value || ''}
              onChange={(e) => updateDiagnosisValue(item.id, e.target.value)}
              placeholder={item.placeholder}
              rows={4}
              className="resize-none"
            />
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      {/* デバイス切替と入力タイプフィルター */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
            プレビュー
          </Badge>
          <span className="text-xs text-gray-500">診断評価項目のプレビュー</span>
        </div>
        <div className="flex items-center gap-2">
          {/* 入力タイプフィルター */}
          <Select value={inputTypeFilter} onValueChange={(value) => setInputTypeFilter(value as InputType)}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              <SelectItem value="parent">保護者</SelectItem>
              <SelectItem value="staff">スタッフ</SelectItem>
            </SelectContent>
          </Select>
          {/* デバイス切替 */}
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
          {categoryOrder.length > 0 ? (
            <div className="space-y-6">
              {/* カテゴリナビゲーション */}
              {categoryOrder.length > 1 && (
                <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentCategoryIndex(Math.max(0, currentCategoryIndex - 1))}
                    disabled={currentCategoryIndex === 0}
                    className="flex items-center space-x-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="text-xs">前</span>
                  </Button>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-900">{currentCategory}</p>
                    <p className="text-xs text-gray-500">
                      {currentCategoryIndex + 1} / {categoryOrder.length}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentCategoryIndex(Math.min(categoryOrder.length - 1, currentCategoryIndex + 1))}
                    disabled={currentCategoryIndex === categoryOrder.length - 1}
                    className="flex items-center space-x-1"
                  >
                    <span className="text-xs">次</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* カテゴリ項目 */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">{currentCategory}</CardTitle>
                  <CardDescription className="text-sm">
                    {currentCategoryItems.length}項目
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {currentCategoryItems.map(item => (
                    <div key={item.id} className="pb-6 border-b border-gray-100 last:border-0 last:pb-0">
                      <div className="flex items-start gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">
                          {item.inputType === 'parent' ? '保護者' : 'スタッフ'}
                        </Badge>
                        {item.required && (
                          <Badge variant="outline" className="text-xs text-red-600">
                            必須
                          </Badge>
                        )}
                      </div>
                      {renderField(item)}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <p>診断評価項目がありません</p>
            </div>
          )}
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

