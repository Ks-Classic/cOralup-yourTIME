import { useEffect, useState } from 'react'
import { supabase, isMockMode } from '@/lib/supabase'
import type { FormSchema, FormSchemaConfig } from '@/types/forms'
import { preschoolerFormSchema } from '@/data/preschooler-form-schema'
import { elementaryFormSchema } from '@/data/elementary-form-schema'
import { diagnosisItems, categoryOrder, type DiagnosisItem } from '@/data/staff-diagnosis-items'

interface UseFormSchemaOptions {
  eventId?: string
  formType?: string
  schemaId?: string
}

// 診断項目をスキーマ形式に変換
function convertDiagnosisItemsToSchema(items: DiagnosisItem[]): FormSchemaConfig {
  const categorized: Record<string, DiagnosisItem[]> = {}
  items.forEach(item => {
    if (!categorized[item.category]) {
      categorized[item.category] = []
    }
    categorized[item.category].push(item)
  })

  const sections = categoryOrder.map((categoryName, index) => ({
    id: categoryName.toLowerCase().replace(/[・]/g, '_'),
    title: categoryName,
    order: index + 1,
    fields: (categorized[categoryName] || []).map(item => ({
      id: item.id,
      name: item.question,
      type: item.answerType as any,
      options: item.options,
      required: item.required,
      placeholder: item.placeholder,
      helperText: item.note,
    }))
  })).filter(section => section.fields.length > 0)

  return { sections, settings: { showProgress: true, allowBackNavigation: true } }
}

// フォールバック用のモックスキーマ
function getFallbackSchemas(schemaId?: string, formType?: string): FormSchema[] {
  const allSchemas: FormSchema[] = [
    {
      id: 'fallback-1',
      schema_id: 'preschooler_v1',
      form_type: 'questionnaire',
      name: '未就学児用問診票',
      description: '未就学児（0〜6歳）向けの問診票フォーム',
      version: '1.0',
      is_active: true,
      config: preschoolerFormSchema,
    },
    {
      id: 'fallback-2',
      schema_id: 'elementary_v1',
      form_type: 'questionnaire',
      name: '小学生以上用問診票',
      description: '小学生以上向けの問診票フォーム',
      version: '1.0',
      is_active: true,
      config: elementaryFormSchema,
    },
    {
      id: 'fallback-3',
      schema_id: 'diagnosis_v1',
      form_type: 'diagnosis',
      name: 'スタッフ診断評価項目',
      description: 'スタッフが入力する診断評価項目',
      version: '1.0',
      is_active: true,
      config: convertDiagnosisItemsToSchema(diagnosisItems),
    },
  ]

  let result = allSchemas
  if (schemaId) {
    result = result.filter(s => s.schema_id === schemaId)
  }
  if (formType) {
    result = result.filter(s => s.form_type === formType)
  }
  return result
}

export function useFormSchema(options: UseFormSchemaOptions) {
  const { eventId, formType, schemaId } = options
  const [schemas, setSchemas] = useState<FormSchema[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchFormSchemas = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // モックモードまたはSupabase未設定の場合はフォールバック
        if (isMockMode || !supabase) {
          setSchemas(getFallbackSchemas(schemaId, formType))
          return
        }

        let query = supabase
          .from('form_schemas')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })

        if (eventId) {
          query = query.eq('event_id', eventId)
        }

        if (formType) {
          query = query.eq('form_type', formType)
        }

        if (schemaId) {
          query = query.eq('schema_id', schemaId)
        }

        const { data, error } = await query

        if (error) {
          throw error
        }

        // DBにデータがない場合はフォールバック
        if (!data || data.length === 0) {
          setSchemas(getFallbackSchemas(schemaId, formType))
          return
        }

        const parsedSchemas = (data || []).map((schema: any) => ({
          ...schema,
          config: typeof schema.config === 'string' ? JSON.parse(schema.config) : schema.config,
        })) as FormSchema[]

        setSchemas(parsedSchemas)
      } catch (err: any) {
        // eslint-disable-next-line no-console
        console.error('Error fetching form schemas:', err)
        // エラー時もフォールバック
        setSchemas(getFallbackSchemas(schemaId, formType))
        setError(err.message || 'フォームスキーマの取得に失敗しました')
      } finally {
        setIsLoading(false)
      }
    }

    fetchFormSchemas()
  }, [eventId, formType, schemaId])

  return { schemas, isLoading, error }
}

