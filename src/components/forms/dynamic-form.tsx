import { useEffect, useMemo, useImperativeHandle, forwardRef, useRef } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { cn } from '@/utils'
import type { FormSchemaConfig, FormFieldConfig } from '@/types/forms'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { SectionCard } from '@/components/ui/section-card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { FormSection } from '@/components/forms/form-section'
import { FormFieldRenderer } from '@/components/forms/form-field-renderer'

interface DynamicFormProps {
  schema: FormSchemaConfig
  defaultValues?: Record<string, any>
  onSubmit: (values: Record<string, any>) => Promise<void> | void
  onBack?: () => void
  isSubmitting?: boolean
  submitLabel?: string
  onFillSample?: () => void
}

type FieldMap = Record<string, FormFieldConfig>

function buildValidationSchema(schema: FormSchemaConfig) {
  const fields: FieldMap = {}
  schema.sections.forEach(section => {
    section.fields.forEach(field => {
      fields[field.id] = field
    })
  })

  const shape: Record<string, any> = {}

  Object.entries(fields).forEach(([fieldId, field]) => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'tel':
      case 'textarea':
        let stringSchema: z.ZodTypeAny = z.string()
        // まず全てのバリデーションを適用
        if (field.validation?.minLength) {
          stringSchema = (stringSchema as z.ZodString).min(field.validation.minLength, `${field.name}は${field.validation.minLength}文字以上で入力してください`)
        }
        if (field.validation?.maxLength) {
          stringSchema = (stringSchema as z.ZodString).max(field.validation.maxLength, `${field.name}は${field.validation.maxLength}文字以内で入力してください`)
        }
        if (field.validation?.pattern) {
          stringSchema = (stringSchema as z.ZodString).regex(new RegExp(field.validation.pattern), field.validation.patternMessage || `${field.name}の形式が正しくありません`)
        }
        // 必須チェックとoptional()は最後に適用
        if (field.required) {
          stringSchema = (stringSchema as z.ZodString).min(1, `${field.name}を入力してください`)
        } else {
          stringSchema = stringSchema.optional()
        }
        shape[fieldId] = stringSchema
        break
      case 'number':
        // まず z.number() でスキーマを作成し、バリデーションを適用
        let baseNumberSchema: z.ZodTypeAny = z.number({ invalid_type_error: `${field.name}は数値で入力してください` })
        
        // バリデーションを先に適用
        if (field.validation?.min !== undefined) {
          baseNumberSchema = (baseNumberSchema as z.ZodNumber).min(field.validation.min, `${field.name}は${field.validation.min}以上で入力してください`)
        }
        if (field.validation?.max !== undefined) {
          baseNumberSchema = (baseNumberSchema as z.ZodNumber).max(field.validation.max, `${field.name}は${field.validation.max}以下で入力してください`)
        }
        
        // 必須チェックとoptional()はbaseNumberSchemaに適用
        if (!field.required) {
          baseNumberSchema = baseNumberSchema.optional()
        }
        
        // z.preprocessで文字列を数値に変換してから検証
        let numberSchema = z.preprocess(
          (val) => {
            // undefined, null, 空文字の場合はそのまま返す（optional()で処理）
            if (val === undefined || val === null || val === '') {
              return undefined
            }
            // 既に数値の場合はそのまま返す
            if (typeof val === 'number') {
              return val
            }
            // 文字列の場合は数値に変換
            if (typeof val === 'string') {
              const num = parseFloat(val)
              return isNaN(num) ? undefined : num
            }
            return undefined
          },
          baseNumberSchema
        )
        
        shape[fieldId] = numberSchema
        break
      case 'checkbox':
      case 'multi-select':
        let arraySchema: z.ZodTypeAny = z.array(z.string())
        if (!field.required) {
          arraySchema = arraySchema.optional()
        }
        shape[fieldId] = arraySchema
        break
      case 'select':
      case 'radio':
        let selectSchema: z.ZodTypeAny = z.string()
        if (!field.required) {
          selectSchema = selectSchema.optional()
        }
        shape[fieldId] = selectSchema
        break
      case 'date':
        let dateSchema: z.ZodTypeAny = z.string()
        if (!field.required) {
          dateSchema = dateSchema.optional()
        }
        shape[fieldId] = dateSchema
        break
      default:
        shape[fieldId] = z.any()
    }
  })

  return z.object(shape)
}

export interface DynamicFormRef {
  fillSampleData: (sampleData: Record<string, any>) => void
}

export const DynamicForm = forwardRef<DynamicFormRef, DynamicFormProps>(({
  schema,
  defaultValues = {},
  onSubmit,
  onBack,
  isSubmitting,
  submitLabel = '送信する',
  onFillSample,
}, ref) => {
  const validationSchema = useMemo(() => buildValidationSchema(schema), [schema])

  const schemaDefaults = useMemo(() => {
    const defaults: Record<string, any> = {}
    schema.sections.forEach(section => {
      section.fields.forEach(field => {
        if (field.defaultValue !== undefined && field.defaultValue !== null) {
          defaults[field.id] = field.defaultValue
        }
      })
    })
    return defaults
  }, [schema])

  const mergedDefaults = useMemo(() => ({
    ...schemaDefaults,
    ...defaultValues,
  }), [schemaDefaults, defaultValues])

  // reset多発防止のため差分があるときのみ実行
  const prevDefaultsRef = useRef<string>('')
  const methods = useForm<Record<string, any>>({
    resolver: zodResolver(validationSchema),
    defaultValues: mergedDefaults,
    mode: 'onBlur',
  })

  useEffect(() => {
    const serialized = JSON.stringify(mergedDefaults)
    if (prevDefaultsRef.current !== serialized) {
      prevDefaultsRef.current = serialized
      methods.reset(mergedDefaults)
    }
  }, [mergedDefaults, methods])

  // ref経由でfillSampleDataメソッドを公開
  useImperativeHandle(ref, () => ({
    fillSampleData: (sampleData: Record<string, any>) => {
      methods.reset(sampleData, { keepDefaultValues: false })
    },
  }))

  const handleSubmit = methods.handleSubmit(async values => {
    await onSubmit(values)
  })

  const renderField = (field: FormFieldConfig) => {
    const { register, formState: { errors }, watch, setValue } = methods
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

    switch (field.type) {
      case 'text':
      case 'email':
      case 'tel':
        return (
          <FormFieldRenderer field={field} isSubmitting={isSubmitting} />
        )
      case 'number':
        return (
          <FormFieldRenderer field={field} isSubmitting={isSubmitting} />
        )
      case 'textarea':
        return (
          <FormFieldRenderer field={field} isSubmitting={isSubmitting} />
        )
      case 'select':
        return (
          <FormFieldRenderer field={field} isSubmitting={isSubmitting} />
        )
      case 'radio':
        return (
          <FormFieldRenderer field={field} isSubmitting={isSubmitting} />
        )
      case 'checkbox':
      case 'multi-select':
        return (
          <FormFieldRenderer field={field} isSubmitting={isSubmitting} />
        )
      default:
        return <FormFieldRenderer field={field} isSubmitting={isSubmitting} />
    }
  }

  const requiredFieldIds = useMemo(() =>
    Object.entries(validationSchema.shape)
      .filter(([, fieldSchema]) => typeof fieldSchema.isOptional === 'function' ? !fieldSchema.isOptional() : true)
      .map(([fieldId]) => fieldId),
  [validationSchema])

  const completedRequiredFields = requiredFieldIds.filter(fieldId => {
    const value = methods.watch(fieldId)
    if (Array.isArray(value)) return value.length > 0
    return value !== undefined && value !== null && value !== ''
  }).length

  const totalRequiredFields = requiredFieldIds.length
  const progress = schema.settings?.showProgress && totalRequiredFields > 0
    ? Math.round((completedRequiredFields / totalRequiredFields) * 100)
    : undefined

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {typeof progress === 'number' && (
          <div className="space-y-2 p-4 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="bg-coral-50 text-coral-600 border-coral-200">
                  進捗
                </Badge>
                <span className="text-sm text-gray-600">入力完了率</span>
              </div>
              <span className="text-sm font-medium text-coral-600">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {schema.sections.map(section => (
          <FormSection
            key={section.id}
            title={section.title}
            description={section.description}
          >
            <div className="space-y-4">
              {section.fields.map(field => (
                <div key={field.id}>
                  <FormFieldRenderer field={field} isSubmitting={isSubmitting} />
                </div>
              ))}
            </div>
          </FormSection>
        ))}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-3 pt-4">
          {onBack && (
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="sm:w-auto w-full"
              disabled={isSubmitting}
            >
              戻る
            </Button>
          )}
          <Button type="submit" className="sm:w-auto w-full" size="lg" disabled={isSubmitting}>
            {isSubmitting ? '送信中...' : submitLabel}
          </Button>
        </div>
      </form>
    </FormProvider>
  )
})

DynamicForm.displayName = 'DynamicForm'
