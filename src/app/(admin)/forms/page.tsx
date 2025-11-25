'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DynamicForm } from '@/components/forms/dynamic-form'
import { FormPreview } from '@/components/admin/form-preview'
import type { FormFieldConfig, FormFieldOption, FormSchema, FormSchemaConfig } from '@/types/forms'

type FormType = 'parent' | 'staff'

interface EventOption {
  id: string
  event_id: string
  name: string
}

const DEFAULT_SECTION_TITLE = '新しいセクション'

const FIELD_TYPE_OPTIONS: { value: FormFieldConfig['type']; label: string }[] = [
  { value: 'text', label: '単一行テキスト' },
  { value: 'textarea', label: '複数行テキスト' },
  { value: 'number', label: '数値入力' },
  { value: 'email', label: 'メールアドレス' },
  { value: 'tel', label: '電話番号' },
  { value: 'select', label: '単一選択 (プルダウン)' },
  { value: 'radio', label: '単一選択 (ラジオ)' },
  { value: 'checkbox', label: '複数選択 (チェックボックス)' },
  { value: 'multi-select', label: '複数選択 (トグル)' },
  { value: 'date', label: '日付' },
]

function generateId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

function createEmptySchema(formType: FormType): FormSchemaConfig {
  return {
    sections: [
      {
        id: generateId('section'),
        title: formType === 'parent' ? '基本情報' : '診断メモ',
        description:
          formType === 'parent'
            ? '親御さんに最初に回答してもらう項目です'
            : 'スタッフが診断時に入力する項目です',
        fields: [],
      },
    ],
    settings: {
      showProgress: true,
      submitButtonText: formType === 'parent' ? '問診票を送信する' : '診断内容を保存する',
    },
  }
}

interface EditingSchemaState {
  schemaId?: string
  name: string
  description?: string
  formType: FormType
  eventId?: string
  config: FormSchemaConfig
}

const parseOptionsTextarea = (text: string): FormFieldOption[] => {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => !!line)
    .map(line => {
      const [value, label] = line.split(':').map(part => part.trim())
      return {
        value,
        label: label || value,
      }
    })
}

const stringifyOptionsTextarea = (options?: FormFieldOption[]) => {
  if (!options || options.length === 0) return ''
  return options.map(option => `${option.value}:${option.label}`).join('\n')
}

export default function AdminFormsPage() {
  const [formType, setFormType] = useState<FormType>('parent')
  const [schemas, setSchemas] = useState<FormSchema[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [events, setEvents] = useState<EventOption[]>([])
  const [selectedSchemaId, setSelectedSchemaId] = useState<string | null>(null)
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'tablet' | 'desktop'>('desktop')

  const [editing, setEditing] = useState<EditingSchemaState>(() => ({
    name: '新しいフォーム',
    description: '',
    formType: 'parent',
    config: createEmptySchema('parent'),
  }))

  const selectedField = useMemo(() => {
    if (!selectedFieldId) return null
    for (const section of editing.config.sections) {
      const field = section.fields.find(item => item.id === selectedFieldId)
      if (field) return { sectionId: section.id, field }
    }
    return null
  }, [editing.config.sections, selectedFieldId])

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/events')
      if (!res.ok) return
      const data = await res.json()
      const options: EventOption[] = (data.events || []).map((event: any) => ({
        id: event.id,
        event_id: event.event_id,
        name: event.name,
      }))
      setEvents(options)
    } catch (err) {
      console.error('Failed to fetch events', err)
    }
  }, [])

  const fetchSchemas = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const params = new URLSearchParams({ formType, isActive: 'true' })
      const res = await fetch(`/api/forms?${params.toString()}`)
      if (!res.ok) {
        setError('フォーム一覧の取得に失敗しました')
        return
      }
      const data = await res.json()
      const list: FormSchema[] = (data.schemas || []).map((schema: any) => ({
        ...schema,
        config: typeof schema.config === 'string' ? JSON.parse(schema.config) : schema.config,
      }))
      setSchemas(list)

      if (list.length > 0) {
        const first = list[0]
        setSelectedSchemaId(first.id)
        setEditing({
          schemaId: first.schema_id,
          name: first.name,
          description: first.description,
          formType: (first.form_type || 'parent') as FormType,
          eventId: first.event_id,
          config: first.config,
        })
        setSelectedFieldId(first.config.sections[0]?.fields[0]?.id || null)
      } else {
        setSelectedSchemaId(null)
        setEditing({
          name: formType === 'parent' ? '親御さん問診票' : 'スタッフ診断フォーム',
          description: '',
          formType,
          config: createEmptySchema(formType),
        })
        setSelectedFieldId(null)
      }
    } catch (err) {
      console.error(err)
      setError('フォーム一覧の取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }, [formType])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  useEffect(() => {
    fetchSchemas()
  }, [fetchSchemas])

  const handleFormTypeChange = (type: FormType) => {
    setFormType(type)
  }

  const handleSelectSchema = (schema: FormSchema) => {
    setSelectedSchemaId(schema.id)
    setEditing({
      schemaId: schema.schema_id,
      name: schema.name,
      description: schema.description,
      formType: (schema.form_type || 'parent') as FormType,
      eventId: schema.event_id,
      config: schema.config,
    })
    setSelectedFieldId(schema.config.sections[0]?.fields[0]?.id || null)
  }

  const handleCreateNewSchema = () => {
    const newSchema = createEmptySchema(formType)
    const schemaId = generateId('schema')
    setSelectedSchemaId(null)
    setEditing({
      schemaId,
      name: formType === 'parent' ? '新しい問診フォーム' : '新しい診断フォーム',
      description: '',
      formType,
      config: newSchema,
    })
    setSelectedFieldId(null)
  }

  const updateEditing = (updater: (prev: EditingSchemaState) => EditingSchemaState) => {
    setEditing(prev => updater({ ...prev, config: { ...prev.config } }))
  }

  const handleAddSection = () => {
    updateEditing(prev => ({
      ...prev,
      config: {
        ...prev.config,
        sections: [
          ...prev.config.sections,
          {
            id: generateId('section'),
            title: `${DEFAULT_SECTION_TITLE} ${prev.config.sections.length + 1}`,
            description: '',
            fields: [],
          },
        ],
      },
    }))
  }

  const handleUpdateSection = (sectionId: string, updates: Partial<{ title: string; description: string }>) => {
    updateEditing(prev => ({
      ...prev,
      config: {
        ...prev.config,
        sections: prev.config.sections.map(section =>
          section.id === sectionId ? { ...section, ...updates } : section
        ),
      },
    }))
  }

  const handleRemoveSection = (sectionId: string) => {
    updateEditing(prev => ({
      ...prev,
      config: {
        ...prev.config,
        sections: prev.config.sections.filter(section => section.id !== sectionId),
      },
    }))
    if (selectedField?.sectionId === sectionId) {
      setSelectedFieldId(null)
    }
  }

  const handleAddField = (sectionId: string) => {
    const newField: FormFieldConfig = {
      id: generateId('field'),
      name: '新しい項目',
      type: 'text',
      required: false,
      placeholder: '入力してください',
      helperText: '',
    }

    updateEditing(prev => ({
      ...prev,
      config: {
        ...prev.config,
        sections: prev.config.sections.map(section =>
          section.id === sectionId
            ? { ...section, fields: [...section.fields, newField] }
            : section
        ),
      },
    }))

    setSelectedFieldId(newField.id)
  }

  const handleRemoveField = (sectionId: string, fieldId: string) => {
    updateEditing(prev => ({
      ...prev,
      config: {
        ...prev.config,
        sections: prev.config.sections.map(section =>
          section.id === sectionId
            ? { ...section, fields: section.fields.filter(field => field.id !== fieldId) }
            : section
        ),
      },
    }))
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null)
    }
  }

  const handleDuplicateField = (sectionId: string, fieldId: string) => {
    updateEditing(prev => ({
      ...prev,
      config: {
        ...prev.config,
        sections: prev.config.sections.map(section => {
          if (section.id !== sectionId) return section
          const index = section.fields.findIndex(field => field.id === fieldId)
          if (index === -1) return section
          const field = section.fields[index]
          const duplicated: FormFieldConfig = {
            ...field,
            id: generateId('field'),
            name: `${field.name} (コピー)`,
          }
          const newFields = [...section.fields]
          newFields.splice(index + 1, 0, duplicated)
          return { ...section, fields: newFields }
        }),
      },
    }))
  }

  const handleMoveField = (sectionId: string, fieldId: string, direction: 'up' | 'down') => {
    updateEditing(prev => ({
      ...prev,
      config: {
        ...prev.config,
        sections: prev.config.sections.map(section => {
          if (section.id !== sectionId) return section
          const index = section.fields.findIndex(field => field.id === fieldId)
          if (index === -1) return section
          const newFields = [...section.fields]
          const targetIndex = direction === 'up' ? index - 1 : index + 1
          if (targetIndex < 0 || targetIndex >= newFields.length) {
            return section
          }
          const [movedField] = newFields.splice(index, 1)
          newFields.splice(targetIndex, 0, movedField)
          return { ...section, fields: newFields }
        }),
      },
    }))
  }

  const handleFieldChange = (fieldId: string, updates: Partial<FormFieldConfig>) => {
    updateEditing(prev => ({
      ...prev,
      config: {
        ...prev.config,
        sections: prev.config.sections.map(section => ({
          ...section,
          fields: section.fields.map(field =>
            field.id === fieldId ? { ...field, ...updates } : field
          ),
        })),
      },
    }))
  }

  const handleFieldOptionsChange = (fieldId: string, text: string) => {
    const options = parseOptionsTextarea(text)
    handleFieldChange(fieldId, { options })
  }

  const handleSaveSchema = async () => {
    try {
      setIsSaving(true)
      setError(null)

      const payload = {
        schema_id: editing.schemaId || generateId('schema'),
        event_id: editing.eventId,
        form_type: editing.formType,
        name: editing.name,
        description: editing.description,
        config: editing.config,
        is_active: true,
      }

      const res = await fetch('/api/forms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const message = await res.json()
        throw new Error(message.error || 'フォームの保存に失敗しました')
      }

      await fetchSchemas()
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'フォームの保存に失敗しました')
    } finally {
      setIsSaving(false)
    }
  }

  const selectedSchemaCard = schemas.find(schema => schema.id === selectedSchemaId)

  return (
    <div className="space-y-6 pb-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-gray-900">フォーム管理・ビルダー</h1>
          <p className="text-sm text-gray-600">
            イベントや対象に応じた問診票を柔軟に作成・管理し、親御さんおよびスタッフ向け画面へリアルタイムで反映します。
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button variant="outline" onClick={handleCreateNewSchema} className="w-full sm:w-auto">
            ＋ 新しいフォームを作成
          </Button>
          <Button onClick={handleSaveSchema} disabled={isSaving} className="w-full sm:w-auto">
            {isSaving ? '保存中…' : selectedSchemaId ? '更新して反映する' : '保存して反映する'}
          </Button>
        </div>
      </header>

      <Tabs value={formType} onValueChange={value => handleFormTypeChange(value as FormType)}>
        <TabsList className="grid h-10 w-full grid-cols-2 bg-gray-100">
          <TabsTrigger value="parent">親御さん問診フォーム</TabsTrigger>
          <TabsTrigger value="staff">スタッフ診断フォーム</TabsTrigger>
        </TabsList>
        <TabsContent value={formType}></TabsContent>
      </Tabs>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-3 text-sm text-red-700">{error}</CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[360px,1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">フォーム一覧</CardTitle>
              <CardDescription className="text-xs">選択すると編集が可能になります</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading && (
                <div className="text-sm text-gray-500">読み込み中です…</div>
              )}
              {!isLoading && schemas.length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-center text-sm text-gray-500">
                  まだフォームがありません。「新しいフォームを作成」から作成してください。
                </div>
              )}
              {schemas.map(schema => (
                <button
                  key={schema.id}
                  type="button"
                  onClick={() => handleSelectSchema(schema)}
                  className={`w-full rounded-lg border p-4 text-left transition hover:border-coral-300 hover:bg-coral-50 ${
                    selectedSchemaId === schema.id ? 'border-coral-400 bg-coral-50 shadow-sm' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">{schema.name}</p>
                    <Badge variant="outline" className="border-coral-200 text-xs text-coral-600">
                      {schema.form_type === 'staff' ? 'スタッフ' : '親御さん'}
                    </Badge>
                  </div>
                  {schema.description && (
                    <p className="mt-2 text-xs text-gray-500 line-clamp-2">{schema.description}</p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                    <span>セクション: {schema.config.sections.length}</span>
                    <span>フィールド: {schema.config.sections.reduce((sum, s) => sum + s.fields.length, 0)}</span>
                    {schema.event_id && (
                      <span className="rounded bg-gray-100 px-2 py-1">イベント連携</span>
                    )}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">フォーム設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-500">フォーム名</label>
                <Input
                  value={editing.name}
                  onChange={e => setEditing(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-500">説明文</label>
                <Textarea
                  value={editing.description || ''}
                  onChange={e => setEditing(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-500">対象イベント (任意)</label>
                <Select
                  value={editing.eventId || ''}
                  onValueChange={value =>
                    setEditing(prev => ({ ...prev, eventId: value === 'none' ? undefined : value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="すべてのイベントで使用" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">すべてのイベントで使用</SelectItem>
                    {events.map(event => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-500">送信ボタン文言</label>
                <Input
                  value={editing.config.settings?.submitButtonText || ''}
                  onChange={e =>
                    updateEditing(prev => ({
                      ...prev,
                      config: {
                        ...prev.config,
                        settings: {
                          ...prev.config.settings,
                          submitButtonText: e.target.value,
                        },
                      },
                    }))
                  }
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={!!editing.config.settings?.showProgress}
                  onChange={e =>
                    updateEditing(prev => ({
                      ...prev,
                      config: {
                        ...prev.config,
                        settings: {
                          ...prev.config.settings,
                          showProgress: e.target.checked,
                        },
                      },
                    }))
                  }
                />
                入力進捗バーを表示する
              </label>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* 左側: 編集エリア */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-lg">セクションとフィールド</CardTitle>
                  <CardDescription className="text-xs">
                    セクションごとにフィールドを整理し、ドラッグの代わりに上下移動ボタンで順序を調整します。
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleAddSection}>
                  セクションを追加
                </Button>
              </CardHeader>
            <CardContent className="space-y-5">
              {editing.config.sections.map(section => (
                <div key={section.id} className="rounded-xl border border-gray-200 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1 space-y-2">
                      <Input
                        value={section.title}
                        onChange={e => handleUpdateSection(section.id, { title: e.target.value })}
                        placeholder="セクションタイトル"
                      />
                      <Textarea
                        value={section.description || ''}
                        onChange={e => handleUpdateSection(section.id, { description: e.target.value })}
                        rows={2}
                        placeholder="セクションの説明 (任意)"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleAddField(section.id)}>
                        フィールド追加
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveSection(section.id)}
                        className="text-red-500 hover:text-red-600"
                      >
                        削除
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {section.fields.length === 0 && (
                      <div className="rounded border border-dashed border-gray-300 p-3 text-xs text-gray-500">
                        まだフィールドがありません。「フィールド追加」ボタンから追加してください。
                      </div>
                    )}
                    {section.fields.map((field, index) => (
                      <button
                        key={field.id}
                        type="button"
                        onClick={() => setSelectedFieldId(field.id)}
                        className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                          selectedFieldId === field.id
                            ? 'border-coral-400 bg-coral-50'
                            : 'border-gray-200 hover:border-coral-200'
                        }`}
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{field.name}</p>
                            <p className="text-xs text-gray-500">
                              {FIELD_TYPE_OPTIONS.find(option => option.value === field.type)?.label || field.type}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={e => {
                                e.stopPropagation()
                                handleMoveField(section.id, field.id, 'up')
                              }}
                              disabled={index === 0}
                            >
                              ↑
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={e => {
                                e.stopPropagation()
                                handleMoveField(section.id, field.id, 'down')
                              }}
                              disabled={index === section.fields.length - 1}
                            >
                              ↓
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={e => {
                                e.stopPropagation()
                                handleDuplicateField(section.id, field.id)
                              }}
                            >
                              複製
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-600"
                              onClick={e => {
                                e.stopPropagation()
                                handleRemoveField(section.id, field.id)
                              }}
                            >
                              削除
                            </Button>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {selectedField && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">フィールド設定</CardTitle>
                <CardDescription className="text-xs">
                  選択中のフィールドの詳細設定を編集します
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs text-gray-500">フィールド名 (ラベル)</label>
                    <Input
                      value={selectedField.field.name}
                      onChange={e => handleFieldChange(selectedField.field.id, { name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-500">フィールドID</label>
                    <Input value={selectedField.field.id} disabled className="bg-gray-50" />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs text-gray-500">フィールドタイプ</label>
                    <Select
                      value={selectedField.field.type}
                      onValueChange={value => handleFieldChange(selectedField.field.id, { type: value as FormFieldConfig['type'] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FIELD_TYPE_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-500">必須</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedField.field.required ?? false}
                        onChange={e => handleFieldChange(selectedField.field.id, { required: e.target.checked })}
                      />
                      <span className="text-xs text-gray-500">必須入力にする</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-500">プレースホルダー</label>
                  <Input
                    value={selectedField.field.placeholder || ''}
                    onChange={e => handleFieldChange(selectedField.field.id, { placeholder: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-500">補足テキスト</label>
                  <Textarea
                    value={selectedField.field.helperText || ''}
                    onChange={e => handleFieldChange(selectedField.field.id, { helperText: e.target.value })}
                    rows={2}
                  />
                </div>

                {(selectedField.field.type === 'select' || selectedField.field.type === 'radio' || selectedField.field.type === 'checkbox' || selectedField.field.type === 'multi-select') && (
                  <div className="space-y-2">
                    <label className="text-xs text-gray-500">選択肢 (1行につき value:label)</label>
                    <Textarea
                      value={stringifyOptionsTextarea(selectedField.field.options)}
                      onChange={e => handleFieldOptionsChange(selectedField.field.id, e.target.value)}
                      rows={4}
                    />
                  </div>
                )}

                {(selectedField.field.type === 'text' || selectedField.field.type === 'textarea') && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs text-gray-500">最小文字数</label>
                      <Input
                        type="number"
                        value={selectedField.field.validation?.minLength ?? ''}
                        onChange={e =>
                          handleFieldChange(selectedField.field.id, {
                            validation: {
                              ...selectedField.field.validation,
                              minLength: e.target.value ? Number(e.target.value) : undefined,
                            },
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-gray-500">最大文字数</label>
                      <Input
                        type="number"
                        value={selectedField.field.validation?.maxLength ?? ''}
                        onChange={e =>
                          handleFieldChange(selectedField.field.id, {
                            validation: {
                              ...selectedField.field.validation,
                              maxLength: e.target.value ? Number(e.target.value) : undefined,
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                )}

                {selectedField.field.type === 'number' && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs text-gray-500">最小値</label>
                      <Input
                        type="number"
                        value={selectedField.field.validation?.min ?? ''}
                        onChange={e =>
                          handleFieldChange(selectedField.field.id, {
                            validation: {
                              ...selectedField.field.validation,
                              min: e.target.value ? Number(e.target.value) : undefined,
                            },
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-gray-500">最大値</label>
                      <Input
                        type="number"
                        value={selectedField.field.validation?.max ?? ''}
                        onChange={e =>
                          handleFieldChange(selectedField.field.id, {
                            validation: {
                              ...selectedField.field.validation,
                              max: e.target.value ? Number(e.target.value) : undefined,
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          </div>

          {/* 右側: プレビューエリア */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">リアルタイムプレビュー</CardTitle>
                <CardDescription className="text-xs">
                  編集内容が即座に反映されます。モバイル/タブレット/デスクトップ表示を切替できます
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormPreview
                  schema={editing.config}
                  deviceType={previewDevice}
                  onDeviceChange={setPreviewDevice}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}


