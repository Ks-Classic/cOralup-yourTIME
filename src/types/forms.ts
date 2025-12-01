export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'email'
  | 'tel'
  | 'date'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'multi-select'
  | 'file'

export type FormFieldOption = {
  value: string
  label: string
  description?: string
}

export type FormFieldValidation = {
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
  pattern?: string
  patternMessage?: string
  step?: number
}

export type FormFieldConfig = {
  id: string
  name: string
  type: FormFieldType
  required?: boolean
  placeholder?: string
  helperText?: string
  options?: FormFieldOption[]
  defaultValue?: string | number | boolean | (string | number | boolean)[]
  validation?: FormFieldValidation
  rows?: number
  min?: number
  max?: number
  step?: number
}

export type FormSectionConfig = {
  id: string
  title: string
  description?: string
  order?: number
  fields: FormFieldConfig[]
}

export type FormSettings = {
  showProgress?: boolean
  allowBackNavigation?: boolean
  autoSave?: boolean
  submitButtonText?: string
  defaultValues?: Record<string, any>
}

export type FormSchemaConfig = {
  sections: FormSectionConfig[]
  settings?: FormSettings
  metadata?: Record<string, any>
}

export type FormSchema = {
  id: string
  schema_id: string
  event_id?: string
  form_type: string
  name: string
  description?: string
  version?: string
  is_active: boolean
  config: FormSchemaConfig
}

