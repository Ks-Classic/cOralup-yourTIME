import { useFormContext } from 'react-hook-form'
import { cn } from '@/utils'
import type { FormFieldConfig } from '@/types/forms'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

interface FormFieldRendererProps {
  field: FormFieldConfig
  isSubmitting?: boolean
}

export function FormFieldRenderer({ field, isSubmitting }: FormFieldRendererProps) {
  const {
    register,
    formState: { errors },
    watch,
    setValue,
  } = useFormContext()

  const fieldError = errors[field.id]?.message as string | undefined

  const commonProps = {
    id: field.id,
    placeholder: field.placeholder,
    disabled: isSubmitting,
    className: cn(
      fieldError ? 'border-red-500 focus-visible:ring-red-500 focus-visible:ring-offset-0' : '',
      'transition-colors'
    ),
    ...register(field.id as any),
  }

  const label = (
    <label htmlFor={field.id} className="block text-sm font-medium text-gray-700">
      {field.name}
      {field.required && <span className="text-red-500 ml-1">*</span>}
    </label>
  )

  const helper = field.helperText && <p className="text-xs text-gray-500">{field.helperText}</p>
  const error = fieldError && <p className="text-sm text-red-600">{fieldError}</p>

  switch (field.type) {
    case 'text':
    case 'email':
    case 'tel':
      return (
        <div className="space-y-2">
          {label}
          <Input type={field.type === 'text' ? 'text' : field.type} {...commonProps} />
          {helper}
          {error}
        </div>
      )
    case 'number':
      const numberValue = watch(field.id)
      return (
        <div className="space-y-2">
          {label}
          <Input
            type="number"
            id={field.id}
            placeholder={field.placeholder}
            disabled={isSubmitting}
            className={cn(
              fieldError ? 'border-red-500 focus-visible:ring-red-500 focus-visible:ring-offset-0' : '',
              'transition-colors'
            )}
            value={numberValue === undefined || numberValue === null ? '' : numberValue}
            onChange={(e) => {
              const value = e.target.value
              // 空文字の場合はundefined
              if (value === '') {
                setValue(field.id, undefined, { shouldValidate: true })
                return
              }
              // 数値に変換（parseFloatで小数点も扱える）
              const numValue = parseFloat(value)
              // 有効な数値の場合のみ設定
              if (!isNaN(numValue)) {
                setValue(field.id, numValue, { shouldValidate: true })
              }
            }}
            onBlur={() => {
              // フォーカスが外れたときにバリデーションを実行
              const currentValue = watch(field.id)
              if (currentValue !== undefined && currentValue !== null) {
                setValue(field.id, currentValue, { shouldValidate: true })
              }
            }}
            min={field.validation?.min}
            max={field.validation?.max}
            step={field.validation?.step || 'any'}
          />
          {field.validation?.min !== undefined && (
            <p className="text-xs text-gray-500">最小値: {field.validation.min}</p>
          )}
          {field.validation?.max !== undefined && (
            <p className="text-xs text-gray-500">最大値: {field.validation.max}</p>
          )}
          {error}
        </div>
      )
    case 'textarea':
      return (
        <div className="space-y-2">
          {label}
          <Textarea rows={field.rows || 4} {...commonProps} />
          {helper}
          {error}
        </div>
      )
    case 'select':
      return (
        <div className="space-y-2">
          {label}
          <Select
            defaultValue={watch(field.id)}
            onValueChange={value => setValue(field.id, value, { shouldValidate: true })}
          >
            <SelectTrigger className={cn(fieldError ? 'border-red-500 focus-visible:ring-red-500' : '', 'w-full')}>
              <SelectValue placeholder={field.placeholder || '選択してください'} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex flex-col">
                    <span>{option.label}</span>
                    {option.description && (
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {helper}
          {error}
        </div>
      )
    case 'radio':
      return (
        <div className="space-y-2">
          {label}
          <div className="space-y-2">
            {field.options?.map(option => (
              <label
                key={option.value}
                className={cn(
                  'flex items-center space-x-3 p-3 border rounded-lg transition-colors cursor-pointer',
                  watch(field.id) === option.value
                    ? 'border-coral-500 bg-coral-50'
                    : 'hover:bg-gray-50'
                )}
              >
                <input
                  type="radio"
                  value={option.value}
                  {...register(field.id as any)}
                  className="text-coral-500 focus:ring-coral-500"
                />
                <div>
                  <p className="text-sm font-medium text-gray-700">{option.label}</p>
                  {option.description && (
                    <p className="text-xs text-gray-500">{option.description}</p>
                  )}
                </div>
              </label>
            ))}
          </div>
          {helper}
          {error}
        </div>
      )
    case 'checkbox':
    case 'multi-select':
      return (
        <div className="space-y-2">
          {label}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {field.options?.map(option => {
              const isChecked = watch(field.id, [])?.includes(option.value)
              return (
                <label
                  key={option.value}
                  className={cn(
                    'flex items-center space-x-2 p-3 border rounded-lg shadow-sm transition-all duration-150',
                    isChecked ? 'border-coral-500 bg-coral-50 shadow-md' : 'hover:bg-gray-50'
                  )}
                >
                  <input
                    type="checkbox"
                    value={option.value}
                    checked={isChecked}
                    onChange={e => {
                      const current = watch(field.id, []) || []
                      const updated = e.target.checked
                        ? [...current, option.value]
                        : current.filter((value: string) => value !== option.value)
                      setValue(field.id, updated, { shouldValidate: true })
                    }}
                    className="rounded text-coral-500 focus:ring-coral-500"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-700">{option.label}</span>
                    {option.description && (
                      <span className="text-xs text-gray-500">{option.description}</span>
                    )}
                  </div>
                </label>
              )}
            )}
          </div>
          {helper}
          {error}
        </div>
      )
    default:
      return null
  }
}

