import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { FormSchema } from '@/types/forms'

interface UseFormSchemaOptions {
  eventId?: string
  formType?: string
  schemaId?: string
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

        const parsedSchemas = (data || []).map((schema: any) => ({
          ...schema,
          config: typeof schema.config === 'string' ? JSON.parse(schema.config) : schema.config,
        })) as FormSchema[]

        setSchemas(parsedSchemas)
      } catch (err: any) {
        console.error('Error fetching form schemas:', err)
        setError(err.message || 'フォームスキーマの取得に失敗しました')
      } finally {
        setIsLoading(false)
      }
    }

    fetchFormSchemas()
  }, [eventId, formType, schemaId])

  return { schemas, isLoading, error }
}

