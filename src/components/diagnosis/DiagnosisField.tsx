'use client'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/utils'
import type { DiagnosisItem } from '@/data/staff-diagnosis-items'

interface DiagnosisFieldProps {
    item: DiagnosisItem
    value: string | string[] | number | undefined
    onChange: (value: string | string[] | number) => void
}

export function DiagnosisField({ item, value, onChange }: DiagnosisFieldProps) {
    const renderField = () => {
        switch (item.answerType) {
            case 'text':
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
                        <Input
                            type="text"
                            value={(value as string) || ''}
                            onChange={(e) => onChange(e.target.value)}
                            placeholder={item.placeholder}
                            className="w-full"
                        />
                    </div>
                )

            case 'number':
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
                        <Input
                            type="number"
                            value={(value as number) || ''}
                            onChange={(e) => onChange(Number(e.target.value))}
                            placeholder={item.placeholder}
                            className="w-full"
                        />
                    </div>
                )

            case 'textarea':
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
                        <Textarea
                            value={(value as string) || ''}
                            onChange={(e) => onChange(e.target.value)}
                            placeholder={item.placeholder}
                            className="w-full min-h-[100px]"
                        />
                    </div>
                )

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
                                        'flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-all touch-manipulation font-medium',
                                        value === option.value
                                            ? 'border-coral-500 bg-coral-50 text-coral-700'
                                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                    )}
                                >
                                    <input
                                        type="radio"
                                        name={item.id}
                                        value={option.value}
                                        checked={value === option.value}
                                        onChange={() => onChange(option.value)}
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
                                            'flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-all touch-manipulation font-medium',
                                            isChecked
                                                ? 'border-coral-500 bg-coral-50 text-coral-700'
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
                                                onChange(newValue)
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

            default:
                return null
        }
    }

    return <div className="w-full">{renderField()}</div>
}
