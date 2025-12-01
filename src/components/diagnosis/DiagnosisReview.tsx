'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Edit2 } from 'lucide-react'
import type { DiagnosisFormData, PhotoData } from '@/types/diagnosis'
import type { DiagnosisItem } from '@/data/staff-diagnosis-items'

interface DiagnosisReviewProps {
    formData: DiagnosisFormData
    photos: PhotoData[]
    items: DiagnosisItem[]
    onEdit?: () => void
}

export function DiagnosisReview({ formData, photos, items, onEdit }: DiagnosisReviewProps) {
    const formatValue = (item: DiagnosisItem, value: string | string[] | number | boolean | undefined) => {
        if (value === undefined || value === null || value === '') {
            return '未入力'
        }

        // boolean型の処理
        if (typeof value === 'boolean') {
            return value ? 'はい' : 'いいえ'
        }

        if (Array.isArray(value)) {
            if (value.length === 0) return '未入力'

            // オプションからラベルを取得
            if (item.options) {
                const labels = value.map(v => {
                    const option = item.options?.find(opt => opt.value === v)
                    return option?.label || v
                })
                return labels.join(', ')
            }

            return value.join(', ')
        }

        // オプションからラベルを取得
        if (item.options) {
            const option = item.options.find(opt => opt.value === String(value))
            return option?.label || String(value)
        }

        return String(value)
    }

    // カテゴリーごとにグループ化
    const itemsByCategory = items.reduce((acc, item) => {
        if (!acc[item.category]) {
            acc[item.category] = []
        }
        acc[item.category].push(item)
        return acc
    }, {} as Record<string, DiagnosisItem[]>)

    return (
        <div className="space-y-4">
            {/* 写真セクション */}
            {photos.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between text-base">
                            <span>撮影写真</span>
                            <Badge variant="outline" className="text-xs">
                                {photos.length}枚
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {photos.map(photo => (
                                <div key={photo.id} className="space-y-1">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={photo.url}
                                        alt={photo.type}
                                        className="w-full aspect-square object-cover rounded-lg border border-gray-200"
                                    />
                                    <p className="text-xs text-gray-500 text-center">
                                        {photo.type}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* 診断項目セクション */}
            {Object.entries(itemsByCategory).map(([category, categoryItems]) => (
                <Card key={category}>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between text-base">
                            <span>{category}</span>
                            {onEdit && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onEdit}
                                    className="text-coral-600 hover:text-coral-700"
                                >
                                    <Edit2 className="w-4 h-4 mr-1" />
                                    編集
                                </Button>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {categoryItems.map(item => {
                                const value = formData[item.id]
                                const hasValue = value !== undefined && value !== null && value !== '' &&
                                    (!Array.isArray(value) || value.length > 0)

                                return (
                                    <div
                                        key={item.id}
                                        className="pb-3 border-b border-gray-100 last:border-0 last:pb-0"
                                    >
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                            <p className="text-sm font-medium text-gray-700">
                                                {item.question}
                                            </p>
                                            {item.analysisUse && (
                                                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 shrink-0">
                                                    分析利用
                                                </Badge>
                                            )}
                                        </div>
                                        <p className={`text-sm ${hasValue ? 'text-gray-900' : 'text-gray-400'}`}>
                                            {formatValue(item, value)}
                                        </p>
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
