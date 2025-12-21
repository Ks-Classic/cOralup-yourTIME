'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { FormSchemaConfig, FormSectionConfig, FormFieldConfig } from '@/types/forms'
import { cn } from '@/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import Link from 'next/link'
import { Plus, Trash2, GripVertical, ChevronDown, ChevronRight, Edit2, Save, X, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react'

type SchemaType = 'preschooler' | 'elementary' | 'diagnosis'
type QuestionnaireSubTab = 'basic_info' | 'questionnaire'
type ViewMode = 'mobile' | 'tablet' | 'desktop'

// 診断項目の型定義（APIレスポンスに合わせて調整）
interface DiagnosisItem {
  id: string
  category: string
  question: string
  answerType: 'checkbox' | 'radio' | 'text' | 'number' | 'textarea'
  options?: { value: string; label: string }[]
  required: boolean
  inputType: 'parent' | 'staff'
  analysisUse?: boolean
  note?: string
  placeholder?: string
  unit?: string
  min?: number
  max?: number
}

// 拡張した診断項目型（表示/非表示を追加）
interface ExtendedDiagnosisItem extends DiagnosisItem {
  isVisible: boolean
}

// 管理画面APIは内部ネットワーク/認証済みユーザーのみアクセス想定
// 将来的にはログイン機能を実装してセッションベースで認証
const adminAuthHeader = {}

// デフォルトの空スキーマ
const defaultSchema: FormSchemaConfig = {
  sections: [],
  settings: {
    showProgress: true,
    allowBackNavigation: true
  }
}

export default function SchemaEditorPage() {
  const [activeTab, setActiveTab] = useState<'questionnaire' | 'diagnosis'>('questionnaire')
  const [questionnaireSubTab, setQuestionnaireSubTab] = useState<QuestionnaireSubTab>('basic_info')
  const [schemaType, setSchemaType] = useState<SchemaType>('preschooler')
  const [viewMode, setViewMode] = useState<ViewMode>('mobile')
  const [editingField, setEditingField] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  // 診断項目編集用の状態
  const [editingDiagnosisItem, setEditingDiagnosisItem] = useState<string | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<string | null>(null)
  const [editingCategoryNameState, setEditingCategoryNameState] = useState<string | null>(null)
  const [tempCategoryNameState, setTempCategoryNameState] = useState('')



  // 保存状態
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // プレビュー用ref
  const previewRef = useRef<HTMLDivElement>(null)
  const categoryRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  // スキーマデータ
  const [questionnaireSchema, setQuestionnaireSchema] = useState<FormSchemaConfig>(defaultSchema)
  const [hardDeleteCategoryIds, setHardDeleteCategoryIds] = useState<string[]>([])
  const [hardDeleteItemIds, setHardDeleteItemIds] = useState<string[]>([])
  const toggleFieldVisibility = useCallback((sectionId: string, fieldId: string) => {
    const setSchema = questionnaireSubTab === 'basic_info' ? setBasicInfoSchema : setQuestionnaireSchema
    setSchema(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? {
            ...section,
            fields: section.fields.map(field =>
              field.id === fieldId ? { ...field, isActive: field.isActive === false ? true : false } : field
            )
          }
          : section
      )
    }))
  }, [questionnaireSubTab])
  const [schemaCache, setSchemaCache] = useState<{ preschooler?: FormSchemaConfig; elementary?: FormSchemaConfig }>({})
  const [basicInfoSchemaCache, setBasicInfoSchemaCache] = useState<FormSchemaConfig | null>(null)
  const [basicInfoSchema, setBasicInfoSchema] = useState<FormSchemaConfig>(defaultSchema)
  const [diagnosisData, setDiagnosisData] = useState<{ categorized: Record<string, ExtendedDiagnosisItem[]>; categoryOrder: string[] }>({
    categorized: {},
    categoryOrder: []
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (activeTab === 'questionnaire') {
          // 基本情報タブの場合（全年齢共通）
          if (questionnaireSubTab === 'basic_info') {
            if (basicInfoSchemaCache) {
              setBasicInfoSchema(basicInfoSchemaCache)
              setIsLoading(false)
              return
            }

            setIsLoading(true)
            // 基本情報は共通なので1つのスキーマID
            const res = await fetch(`/api/admin/schemas?schema_id=basic_info_common_v1`, {
              headers: { ...adminAuthHeader },
            })

            if (!res.ok) {
              throw new Error(`API Error: ${res.status} ${res.statusText}`)
            }

            const json = await res.json()
            const nextSchema = (json.data && json.data.length > 0) ? json.data[0].config : defaultSchema
            setBasicInfoSchema(nextSchema)
            setBasicInfoSchemaCache(nextSchema)
          } else {
            // 問診タブの場合
            const cached = schemaCache[schemaType]
            if (cached) {
              setQuestionnaireSchema(cached)
              setIsLoading(false)
              return
            }

            setIsLoading(true)
            const schemaId = schemaType === 'preschooler' ? 'preschooler_v1' : 'elementary_v1'
            const res = await fetch(`/api/admin/schemas?schema_id=${schemaId}`, {
              headers: { ...adminAuthHeader },
            })

            if (!res.ok) {
              throw new Error(`API Error: ${res.status} ${res.statusText}`)
            }

            const json = await res.json()
            const nextSchema = (json.data && json.data.length > 0) ? json.data[0].config : defaultSchema
            setQuestionnaireSchema(nextSchema)
            setSchemaCache(prev => ({ ...prev, [schemaType]: nextSchema }))
          }
        } else {
          setIsLoading(true)
          // 診断項目取得
          const diagnosisRes = await fetch('/api/admin/diagnosis-schema', {
            headers: {
              ...adminAuthHeader,
            },
          })

          if (!diagnosisRes.ok) {
            throw new Error(`API Error: ${diagnosisRes.status} ${diagnosisRes.statusText}`)
          }

          const diagnosisJson = await diagnosisRes.json()

          if (!diagnosisJson.success) {
            throw new Error(diagnosisJson.error || '診断データの取得に失敗しました')
          }

          console.log('[SchemaEditor] 診断データ取得結果:', {
            success: diagnosisJson.success,
            categoryOrderLength: diagnosisJson.data?.categoryOrder?.length,
            categorizedKeys: Object.keys(diagnosisJson.data?.categorized || {}),
          })
          if (diagnosisJson.data) {
            setDiagnosisData(diagnosisJson.data)
          }
        }
      } catch (error) {
        console.error('データ取得エラー:', error)
        setSaveMessage({
          type: 'error',
          text: `データ取得エラー: ${error instanceof Error ? error.message : '不明なエラー'}`
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schemaType, activeTab, questionnaireSubTab])

  // フォーム編集内容をタブ跨ぎでも保持するためキャッシュへ同期
  useEffect(() => {
    if (activeTab === 'questionnaire') {
      if (questionnaireSubTab === 'basic_info') {
        setBasicInfoSchemaCache(basicInfoSchema)
      } else {
        setSchemaCache(prev => ({ ...prev, [schemaType]: questionnaireSchema }))
      }
    }
  }, [questionnaireSchema, basicInfoSchema, schemaType, activeTab, questionnaireSubTab])

  // カテゴリ選択時にプレビューをスクロール
  useEffect(() => {
    if (selectedCategory && categoryRefs.current.has(selectedCategory)) {
      const element = categoryRefs.current.get(selectedCategory)
      element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [selectedCategory])

  // 項目選択時にプレビューをスクロール
  useEffect(() => {
    if (selectedItem && itemRefs.current.has(selectedItem)) {
      const element = itemRefs.current.get(selectedItem)
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [selectedItem])

  // セクション展開切り替え
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }

  // セクション名更新
  const updateSectionTitle = useCallback((sectionId: string, title: string) => {
    const setSchema = questionnaireSubTab === 'basic_info' ? setBasicInfoSchema : setQuestionnaireSchema
    setSchema(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId ? { ...section, title } : section
      )
    }))
  }, [questionnaireSubTab])

  // セクション説明更新
  const updateSectionDescription = useCallback((sectionId: string, description: string) => {
    const setSchema = questionnaireSubTab === 'basic_info' ? setBasicInfoSchema : setQuestionnaireSchema
    setSchema(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId ? { ...section, description } : section
      )
    }))
  }, [questionnaireSubTab])

  // カテゴリ展開切り替え + プレビュースクロール
  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(categoryName)) {
        next.delete(categoryName)
      } else {
        next.add(categoryName)
      }
      return next
    })
    setSelectedCategory(categoryName)
    setSelectedItem(null)
  }

  // 項目クリック時にプレビュースクロール
  const handleItemClick = (itemId: string) => {
    setEditingDiagnosisItem(editingDiagnosisItem === itemId ? null : itemId)
    setSelectedItem(itemId)
  }

  // フィールド更新
  const updateField = useCallback((sectionId: string, fieldId: string, updates: Partial<FormFieldConfig>) => {
    const setSchema = questionnaireSubTab === 'basic_info' ? setBasicInfoSchema : setQuestionnaireSchema
    setSchema(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? {
            ...section,
            fields: section.fields.map(field =>
              field.id === fieldId ? { ...field, ...updates } : field
            )
          }
          : section
      )
    }))
  }, [questionnaireSubTab])

  const ensureOptions = (type: FormFieldConfig['type'], current?: FormFieldConfig['options']) => {
    if (type === 'radio' || type === 'checkbox' || type === 'select') {
      return current && current.length > 0 ? current : [
        { value: 'option_1', label: '選択肢1' },
        { value: 'option_2', label: '選択肢2' },
      ]
    }
    return undefined
  }

  const handleTypeChange = useCallback((sectionId: string, fieldId: string, newType: FormFieldConfig['type']) => {
    const setSchema = questionnaireSubTab === 'basic_info' ? setBasicInfoSchema : setQuestionnaireSchema
    setSchema(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? {
            ...section,
            fields: section.fields.map(field =>
              field.id === fieldId
                ? {
                  ...field,
                  type: newType,
                  options: ensureOptions(newType, field.options)
                }
                : field
            )
          }
          : section
      )
    }))
  }, [questionnaireSubTab])

  const updateFieldOption = useCallback((sectionId: string, fieldId: string, index: number, label: string) => {
    const value = label.trim() ? label.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') || `option_${index + 1}` : `option_${index + 1}`
    const setSchema = questionnaireSubTab === 'basic_info' ? setBasicInfoSchema : setQuestionnaireSchema
    setSchema(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? {
            ...section,
            fields: section.fields.map(field => {
              if (field.id !== fieldId) return field
              const options = ensureOptions(field.type, field.options) || []
              const nextOptions = options.map((opt, i) => i === index ? { value, label: label || opt.label } : opt)
              return { ...field, options: nextOptions }
            })
          }
          : section
      )
    }))
  }, [questionnaireSubTab])

  const addFieldOption = useCallback((sectionId: string, fieldId: string) => {
    const setSchema = questionnaireSubTab === 'basic_info' ? setBasicInfoSchema : setQuestionnaireSchema
    setSchema(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? {
            ...section,
            fields: section.fields.map(field => {
              if (field.id !== fieldId) return field
              const options = ensureOptions(field.type, field.options) || []
              const nextIndex = options.length + 1
              return {
                ...field,
                options: [...options, { value: `option_${nextIndex}`, label: `選択肢${nextIndex}` }]
              }
            })
          }
          : section
      )
    }))
  }, [questionnaireSubTab])

  const removeFieldOption = useCallback((sectionId: string, fieldId: string, index: number) => {
    const setSchema = questionnaireSubTab === 'basic_info' ? setBasicInfoSchema : setQuestionnaireSchema
    setSchema(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? {
            ...section,
            fields: section.fields.map(field => {
              if (field.id !== fieldId) return field
              const options = ensureOptions(field.type, field.options) || []
              const nextOptions = options.filter((_, i) => i !== index)
              return { ...field, options: nextOptions }
            })
          }
          : section
      )
    }))
  }, [questionnaireSubTab])

  // 診断項目更新
  const updateDiagnosisItem = useCallback((itemId: string, updates: Partial<ExtendedDiagnosisItem>) => {
    setDiagnosisData(prev => {
      const newCategorized = { ...prev.categorized }
      for (const category of Object.keys(newCategorized)) {
        newCategorized[category] = newCategorized[category].map(item =>
          item.id === itemId ? { ...item, ...updates } : item
        )
      }
      return { ...prev, categorized: newCategorized }
    })
  }, [])

  // 表示/非表示切り替え
  const toggleItemVisibility = useCallback((itemId: string) => {
    setDiagnosisData(prev => {
      const newCategorized = { ...prev.categorized }
      for (const category of Object.keys(newCategorized)) {
        newCategorized[category] = newCategorized[category].map(item =>
          item.id === itemId ? { ...item, isVisible: !item.isVisible } : item
        )
      }
      return { ...prev, categorized: newCategorized }
    })
  }, [])

  // 選択肢更新（ラベルのみ、valueは自動生成）
  const updateDiagnosisOption = useCallback((itemId: string, optionIndex: number, label: string) => {
    setDiagnosisData(prev => {
      const newCategorized = { ...prev.categorized }
      for (const category of Object.keys(newCategorized)) {
        newCategorized[category] = newCategorized[category].map(item => {
          if (item.id === itemId && item.options) {
            const newOptions = [...item.options]
            const value = label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
            newOptions[optionIndex] = { value: value || `opt_${optionIndex}`, label }
            return { ...item, options: newOptions }
          }
          return item
        })
      }
      return { ...prev, categorized: newCategorized }
    })
  }, [])

  // 選択肢追加
  const addDiagnosisOption = useCallback((itemId: string) => {
    setDiagnosisData(prev => {
      const newCategorized = { ...prev.categorized }
      for (const category of Object.keys(newCategorized)) {
        newCategorized[category] = newCategorized[category].map(item => {
          if (item.id === itemId) {
            const newOptions = [...(item.options || []), { value: `option_${Date.now()}`, label: '新しい選択肢' }]
            return { ...item, options: newOptions }
          }
          return item
        })
      }
      return { ...prev, categorized: newCategorized }
    })
  }, [])

  // 選択肢削除
  const removeDiagnosisOption = useCallback((itemId: string, optionIndex: number) => {
    setDiagnosisData(prev => {
      const newCategorized = { ...prev.categorized }
      for (const category of Object.keys(newCategorized)) {
        newCategorized[category] = newCategorized[category].map(item => {
          if (item.id === itemId && item.options) {
            const newOptions = item.options.filter((_, i) => i !== optionIndex)
            return { ...item, options: newOptions }
          }
          return item
        })
      }
      return { ...prev, categorized: newCategorized }
    })
  }, [])

  // カテゴリ追加
  const addDiagnosisCategory = useCallback(() => {
    const newCategoryName = `新しいカテゴリ_${Date.now()}`
    setDiagnosisData(prev => ({
      ...prev,
      categoryOrder: [...prev.categoryOrder, newCategoryName],
      categorized: {
        ...prev.categorized,
        [newCategoryName]: []
      }
    }))
    setExpandedCategories(prev => new Set([...prev, newCategoryName]))
  }, [])

  // カテゴリ名変更
  const renameDiagnosisCategory = useCallback((oldName: string, newName: string) => {
    if (oldName === newName || !newName.trim()) return
    setDiagnosisData(prev => {
      const newCategorized = { ...prev.categorized }
      const items = newCategorized[oldName] || []
      delete newCategorized[oldName]
      // 項目のcategoryも更新
      newCategorized[newName] = items.map(item => ({ ...item, category: newName }))
      const newOrder = prev.categoryOrder.map(c => c === oldName ? newName : c)
      return { categoryOrder: newOrder, categorized: newCategorized }
    })
    // expandedCategoriesも更新
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(oldName)) {
        next.delete(oldName)
        next.add(newName)
      }
      return next
    })
    if (selectedCategory === oldName) setSelectedCategory(newName)
  }, [selectedCategory])

  // カテゴリ削除
  const deleteDiagnosisCategory = useCallback((categoryName: string) => {
    if (!confirm(`カテゴリ「${categoryName}」とその項目をすべて削除しますか？`)) return
    setDiagnosisData(prev => {
      const newCategorized = { ...prev.categorized }
      delete newCategorized[categoryName]
      return {
        categoryOrder: prev.categoryOrder.filter(c => c !== categoryName),
        categorized: newCategorized
      }
    })
    setExpandedCategories(prev => {
      const next = new Set(prev)
      next.delete(categoryName)
      return next
    })
    if (selectedCategory === categoryName) setSelectedCategory(null)
  }, [selectedCategory])

  // 診断項目追加
  const addDiagnosisItem = useCallback((categoryName: string) => {
    const newItem: ExtendedDiagnosisItem = {
      id: `new_${Date.now()}`,
      category: categoryName,
      question: '新しい質問',
      answerType: 'radio',
      options: [
        { value: 'yes', label: 'はい' },
        { value: 'no', label: 'いいえ' }
      ],
      required: false,
      inputType: 'staff',
      isVisible: true
    }
    setDiagnosisData(prev => ({
      ...prev,
      categorized: {
        ...prev.categorized,
        [categoryName]: [...(prev.categorized[categoryName] || []), newItem]
      }
    }))
    setEditingDiagnosisItem(newItem.id)
    setSelectedItem(newItem.id)
  }, [])

  // 診断項目削除
  const deleteDiagnosisItem = useCallback((itemId: string, categoryName: string) => {
    if (!confirm('この項目を削除しますか？')) return
    setDiagnosisData(prev => ({
      ...prev,
      categorized: {
        ...prev.categorized,
        [categoryName]: prev.categorized[categoryName].filter(item => item.id !== itemId)
      }
    }))
    if (editingDiagnosisItem === itemId) setEditingDiagnosisItem(null)
    if (selectedItem === itemId) setSelectedItem(null)
  }, [editingDiagnosisItem, selectedItem])

  // ドラッグ＆ドロップの状態管理（カテゴリ）
  const [draggedCategory, setDraggedCategory] = useState<string | null>(null)
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null)

  // ドラッグ＆ドロップの状態管理（項目）
  const [draggedItem, setDraggedItem] = useState<{ id: string, category: string } | null>(null)
  const [dragOverItem, setDragOverItem] = useState<string | null>(null)

  // 問診票用ドラッグ＆ドロップの状態管理
  const [draggedSection, setDraggedSection] = useState<string | null>(null)
  const [dragOverSection, setDragOverSection] = useState<string | null>(null)
  const [draggedField, setDraggedField] = useState<{ id: string, sectionId: string } | null>(null)
  const [dragOverField, setDragOverField] = useState<string | null>(null)

  // カテゴリのD&D
  const handleDragStart = (category: string) => {
    setDraggedCategory(category)
  }

  const handleDragOver = (e: React.DragEvent, category: string) => {
    e.preventDefault()
    if (!draggedCategory || draggedCategory === category) return

    setDragOverCategory(category)

    // 順番の入れ替え
    const newOrder = [...diagnosisData.categoryOrder]
    const draggedIdx = newOrder.indexOf(draggedCategory)
    const targetIdx = newOrder.indexOf(category)

    if (draggedIdx !== -1 && targetIdx !== -1) {
      newOrder.splice(draggedIdx, 1)
      newOrder.splice(targetIdx, 0, draggedCategory)
      setDiagnosisData(prev => ({
        ...prev,
        categoryOrder: newOrder
      }))
    }
  }

  const handleDragEnd = () => {
    setDraggedCategory(null)
    setDragOverCategory(null)
  }

  // 項目のD&D
  const handleItemDragStart = (item: { id: string, category: string }) => {
    setDraggedItem(item)
  }

  const handleItemDragOver = (e: React.DragEvent, item: { id: string, category: string }) => {
    e.preventDefault()
    e.stopPropagation() // 親（カテゴリ）のイベント発火を防ぐ

    if (!draggedItem || draggedItem.id === item.id) return
    if (draggedItem.category !== item.category) return // 異なるカテゴリ間の移動は禁止（必要なら許可するが、今回はカテゴリ内並び替え）

    setDragOverItem(item.id)

    const categoryName = item.category
    const items = diagnosisData.categorized[categoryName] || []
    const newItems = [...items]

    const draggedIdx = newItems.findIndex(i => i.id === draggedItem.id)
    const targetIdx = newItems.findIndex(i => i.id === item.id)

    if (draggedIdx !== -1 && targetIdx !== -1) {
      // 配列内で移動
      const [movedItem] = newItems.splice(draggedIdx, 1)
      newItems.splice(targetIdx, 0, movedItem)

      setDiagnosisData(prev => ({
        ...prev,
        categorized: {
          ...prev.categorized,
          [categoryName]: newItems
        }
      }))
    }
  }

  const handleItemDragEnd = () => {
    setDraggedItem(null)
    setDragOverItem(null)
  }

  // 問診票セクションのD&D
  const handleSectionDragStart = (sectionId: string) => {
    setDraggedSection(sectionId)
  }

  const handleSectionDragOver = useCallback((e: React.DragEvent, sectionId: string) => {
    e.preventDefault()
    if (!draggedSection || draggedSection === sectionId) return

    setDragOverSection(sectionId)

    const setSchema = questionnaireSubTab === 'basic_info' ? setBasicInfoSchema : setQuestionnaireSchema
    setSchema(prev => {
      const sections = [...prev.sections]
      const draggedIdx = sections.findIndex(s => s.id === draggedSection)
      const targetIdx = sections.findIndex(s => s.id === sectionId)

      if (draggedIdx !== -1 && targetIdx !== -1 && draggedIdx !== targetIdx) {
        const [movedSection] = sections.splice(draggedIdx, 1)
        sections.splice(targetIdx, 0, movedSection)
        return { ...prev, sections }
      }
      return prev
    })
  }, [draggedSection, questionnaireSubTab])

  const handleSectionDragEnd = () => {
    setDraggedSection(null)
    setDragOverSection(null)
  }

  // 問診票フィールドのD&D
  const handleFieldDragStart = (field: { id: string, sectionId: string }) => {
    setDraggedField(field)
  }

  const handleFieldDragOver = useCallback((e: React.DragEvent, field: { id: string, sectionId: string }) => {
    e.preventDefault()
    e.stopPropagation()

    if (!draggedField || draggedField.id === field.id) return
    if (draggedField.sectionId !== field.sectionId) return // 同一セクション内のみ

    setDragOverField(field.id)

    const setSchema = questionnaireSubTab === 'basic_info' ? setBasicInfoSchema : setQuestionnaireSchema
    setSchema(prev => {
      const sections = prev.sections.map(section => {
        if (section.id !== field.sectionId) return section

        const fields = [...section.fields]
        const draggedIdx = fields.findIndex(f => f.id === draggedField.id)
        const targetIdx = fields.findIndex(f => f.id === field.id)

        if (draggedIdx !== -1 && targetIdx !== -1 && draggedIdx !== targetIdx) {
          const [movedField] = fields.splice(draggedIdx, 1)
          fields.splice(targetIdx, 0, movedField)
          return { ...section, fields }
        }
        return section
      })
      return { ...prev, sections }
    })
  }, [draggedField, questionnaireSubTab])

  const handleFieldDragEnd = () => {
    setDraggedField(null)
    setDragOverField(null)
  }

  // セクション追加
  const addSection = useCallback(() => {
    const currentSchema = questionnaireSubTab === 'basic_info' ? basicInfoSchema : questionnaireSchema
    const setSchema = questionnaireSubTab === 'basic_info' ? setBasicInfoSchema : setQuestionnaireSchema
    const newSection: FormSectionConfig = {
      id: `section_${Date.now()}`,
      title: '新しいセクション',
      description: '',
      order: currentSchema.sections.length + 1,
      fields: []
    }
    setSchema(prev => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }))
    setExpandedSections(prev => new Set([...prev, newSection.id]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionnaireSubTab, basicInfoSchema.sections.length, questionnaireSchema.sections.length])

  // フィールド追加
  const addField = useCallback((sectionId: string) => {
    const setSchema = questionnaireSubTab === 'basic_info' ? setBasicInfoSchema : setQuestionnaireSchema
    const newField: FormFieldConfig = {
      id: `field_${Date.now()}`,
      name: '新しい項目',
      type: 'text',
      required: false,
      placeholder: ''
    }
    setSchema(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? { ...section, fields: [...section.fields, newField] }
          : section
      )
    }))
    setEditingField(newField.id)
  }, [questionnaireSubTab])

  // セクション削除
  const deleteSection = useCallback((sectionId: string) => {
    if (!confirm('このセクションを削除しますか？')) return
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sectionId)
    if (isUuid) {
      setHardDeleteCategoryIds(prev => Array.from(new Set([...prev, sectionId])))
    }
    const setSchema = questionnaireSubTab === 'basic_info' ? setBasicInfoSchema : setQuestionnaireSchema
    setSchema(prev => ({
      ...prev,
      sections: prev.sections.filter(s => s.id !== sectionId)
    }))
  }, [questionnaireSubTab])

  // フィールド削除
  const deleteField = useCallback((sectionId: string, fieldId: string) => {
    if (!confirm('この項目を削除しますか？')) return
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(fieldId)
    if (isUuid) {
      setHardDeleteItemIds(prev => Array.from(new Set([...prev, fieldId])))
    }
    const setSchema = questionnaireSubTab === 'basic_info' ? setBasicInfoSchema : setQuestionnaireSchema
    setSchema(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? { ...section, fields: section.fields.filter(f => f.id !== fieldId) }
          : section
      )
    }))
  }, [questionnaireSubTab])

  // 保存（DB連携）
  const handleSave = async () => {
    setIsSaving(true)
    setSaveMessage(null)

    try {
      if (activeTab === 'diagnosis') {
        // 診断項目をAPI経由で保存
        const response = await fetch('/api/admin/diagnosis-schema', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...adminAuthHeader,
          },
          body: JSON.stringify({
            categoryOrder: diagnosisData.categoryOrder,
            items: Object.values(diagnosisData.categorized).flat().map(item => ({
              id: item.id,
              category: item.category,
              question: item.question,
              answerType: item.answerType,
              options: item.options,
              required: item.required,
              inputType: item.inputType,
              note: item.note,
              isVisible: item.isVisible
            }))
          })
        })

        if (!response.ok) {
          throw new Error('保存に失敗しました')
        }

        setSaveMessage({ type: 'success', text: '診断項目を保存しました' })
      } else {
        // 問診票スキーマをAPI経由で保存
        // console.log('[UI handleSave] hardDeleteCategoryIds:', hardDeleteCategoryIds)
        // console.log('[UI handleSave] hardDeleteItemIds:', hardDeleteItemIds)

        if (questionnaireSubTab === 'basic_info') {
          // 基本情報スキーマの保存（全年齢共通）
          const response = await fetch('/api/admin/schemas', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...adminAuthHeader,
            },
            body: JSON.stringify({
              schema_id: 'basic_info_common_v1',
              form_type: 'basic_info',
              name: '基本情報（共通）',
              config: basicInfoSchema,
              hardDeleteCategoryIds,
              hardDeleteItemIds,
            })
          })

          if (!response.ok) {
            throw new Error('保存に失敗しました')
          }

          setSaveMessage({ type: 'success', text: '基本情報スキーマを保存しました' })
          setBasicInfoSchemaCache(null)
        } else {
          // 問診スキーマの保存
          const response = await fetch('/api/admin/schemas', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...adminAuthHeader,
            },
            body: JSON.stringify({
              schema_id: schemaType === 'preschooler' ? 'preschooler_v1' : 'elementary_v1',
              form_type: 'questionnaire',
              name: schemaType === 'preschooler' ? '未就学児用問診票' : '小学生以上用問診票',
              config: questionnaireSchema,
              hardDeleteCategoryIds,
              hardDeleteItemIds,
            })
          })

          if (!response.ok) {
            throw new Error('保存に失敗しました')
          }

          setSaveMessage({ type: 'success', text: '問診票スキーマを保存しました' })
          setSchemaCache(prev => ({ ...prev, [schemaType]: undefined }))
        }

        setHardDeleteCategoryIds([])
        setHardDeleteItemIds([])
      }
    } catch (error) {
      console.error('保存エラー:', error)
      setSaveMessage({ type: 'error', text: error instanceof Error ? error.message : '保存に失敗しました' })
    } finally {
      setIsSaving(false)
      setTimeout(() => setSaveMessage(null), 3000)
    }
  }

  // 診断項目のプレビュー用レンダリング
  const renderDiagnosisPreview = (item: ExtendedDiagnosisItem) => {
    const isSelected = selectedItem === item.id

    return (
      <div
        ref={(el) => { if (el) itemRefs.current.set(item.id, el) }}
        className={cn(
          "transition-all",
          isSelected && "ring-2 ring-blue-500 ring-offset-2 rounded-lg"
        )}
      >
        {item.answerType === 'radio' || item.answerType === 'checkbox' ? (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              {item.question}
              {item.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {item.note && (
              <p className="text-xs text-gray-500 mb-2">{item.note}</p>
            )}
            <div className="grid grid-cols-2 gap-2">
              {item.options?.map(option => (
                item.answerType === 'checkbox' ? (
                  // チェックボックス: シンプルなリスト形式（枠なし）
                  <label
                    key={option.value}
                    className="flex items-center p-2 cursor-pointer transition-colors hover:bg-slate-50 rounded gap-2"
                  >
                    <input type="checkbox" className="sr-only" disabled />
                    <div className="w-5 h-5 border-2 border-slate-300 rounded flex items-center justify-center bg-white flex-shrink-0">
                      {/* 未選択状態の□ */}
                    </div>
                    <span className="text-sm font-medium text-slate-700">{option.label}</span>
                  </label>
                ) : (
                  // ラジオボタン: ボタンスタイル（アイコンなし）
                  <label
                    key={option.value}
                    className={cn(
                      "flex items-center justify-center p-3 border rounded-lg cursor-pointer transition-all touch-manipulation font-medium shadow-sm",
                      "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50 text-slate-700"
                    )}
                  >
                    <input type="radio" className="sr-only" disabled />
                    <span className="text-sm">{option.label}</span>
                  </label>
                )
              ))}
            </div>
          </div>
        ) : item.answerType === 'text' ? (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              {item.question}
              {item.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {item.note && <p className="text-xs text-gray-500 mb-2">{item.note}</p>}
            <Input placeholder={item.placeholder} className="h-11" disabled />
          </div>
        ) : item.answerType === 'number' ? (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              {item.question}
              {item.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {item.note && <p className="text-xs text-gray-500 mb-2">{item.note}</p>}
            <div className="flex items-center gap-2">
              <Input type="number" placeholder={item.placeholder} className="h-11 flex-1" disabled />
              {item.unit && <span className="text-sm text-gray-600 whitespace-nowrap">{item.unit}</span>}
            </div>
          </div>
        ) : item.answerType === 'textarea' ? (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              {item.question}
              {item.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {item.note && <p className="text-xs text-gray-500 mb-2">{item.note}</p>}
            <Textarea placeholder={item.placeholder} rows={4} className="resize-none" disabled />
          </div>
        ) : null}
      </div>
    )
  }


  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [inputPin, setInputPin] = useState('')
  const [authError, setAuthError] = useState('')

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputPin === '7777') {
      setIsAuthenticated(true)
      setAuthError('')
    } else {
      setAuthError('PINコードが違います')
      setInputPin('')
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] flex-col gap-4">
        <Link href="/" className="text-slate-500 hover:text-slate-800 text-sm flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          ホームへ戻る
        </Link>
        <div className="w-full max-w-sm p-6 bg-white rounded-xl shadow-lg border border-slate-200">
          <h2 className="text-xl font-bold text-center mb-6 text-slate-800">管理者認証</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">
                PINコードを入力
              </label>
              <Input
                type="password"
                value={inputPin}
                onChange={(e) => setInputPin(e.target.value)}
                placeholder="4桁のPIN"
                className="text-center text-lg tracking-widest"
                maxLength={4}
                autoFocus
              />
            </div>
            {authError && (
              <p className="text-sm text-red-500 text-center font-medium bg-red-50 py-2 rounded">
                {authError}
              </p>
            )}
            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
            >
              ログイン
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <Link href="/" className="text-slate-500 hover:text-slate-800 text-sm flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" />
            ホームへ戻る
          </Link>
        </div>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">スキーマエディタ</h1>
            <p className="text-slate-600 mt-1">問診票・診断項目の編集</p>
          </div>
          <div className="flex items-center gap-3">
            {saveMessage && (
              <span className={cn(
                "text-sm px-3 py-1 rounded-full",
                saveMessage.type === 'success' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              )}>
                {saveMessage.text}
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              保存
            </button>
          </div>
        </div>
      </div>

      {/* タブ切替 */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('questionnaire')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'questionnaire'
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
        >
          問診票
        </button>
        <button
          onClick={() => setActiveTab('diagnosis')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'diagnosis'
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
        >
          診断項目
        </button>
      </div>

      {/* サブタブ（問診票の場合） */}
      {activeTab === 'questionnaire' && (
        <div className="space-y-3">
          {/* ページ種別（基本情報/問診） */}
          <div className="flex gap-2 border-b border-slate-200 pb-2">
            <button
              onClick={() => setQuestionnaireSubTab('basic_info')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${questionnaireSubTab === 'basic_info'
                ? 'bg-coral-100 text-coral-700 border-b-2 border-coral-500'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
            >
              📝 基本情報ページ
            </button>
            <button
              onClick={() => setQuestionnaireSubTab('questionnaire')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${questionnaireSubTab === 'questionnaire'
                ? 'bg-coral-100 text-coral-700 border-b-2 border-coral-500'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
            >
              📋 問診ページ
            </button>
          </div>

          {/* 年齢区分 - 問診ページのみ表示 */}
          {questionnaireSubTab === 'questionnaire' && (
            <div className="flex gap-2">
              <button
                onClick={() => setSchemaType('preschooler')}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${schemaType === 'preschooler'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                未就学児
              </button>
              <button
                onClick={() => setSchemaType('elementary')}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${schemaType === 'elementary'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                小学生以上
              </button>
            </div>
          )}

          <p className="text-xs text-slate-500">
            {questionnaireSubTab === 'basic_info'
              ? '※ 基本情報は全年齢共通です。入力後「次へ」でDB保存 → 問診ページへ遷移'
              : '※ 問診入力後「次へ：QR表示」でDB保存 → QRコード表示'}
          </p>
        </div>
      )}

      {/* メインコンテンツ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左: 編集エリア */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h2 className="font-semibold text-slate-800">編集</h2>
            {activeTab === 'diagnosis' && (
              <p className="text-xs text-slate-500 mt-1">ドラッグ&ドロップでカテゴリの順番を変更・項目クリックでプレビュー連動</p>
            )}
            {activeTab === 'questionnaire' && (
              <p className="text-xs text-slate-500 mt-1">ドラッグ&ドロップでセクション・項目の順番を変更</p>
            )}
          </div>
          <div className="p-4 max-h-[700px] overflow-y-auto space-y-3">
            {activeTab === 'questionnaire' ? (
              <>
                {(questionnaireSubTab === 'basic_info' ? basicInfoSchema : questionnaireSchema).sections.map((section) => (
                  <div
                    key={section.id}
                    className={cn(
                      "border rounded-lg overflow-hidden transition-all",
                      draggedSection === section.id ? "opacity-50 border-blue-300 border-dashed" : "border-slate-200",
                      dragOverSection === section.id ? "border-blue-500 border-2" : ""
                    )}
                    draggable
                    onDragStart={() => handleSectionDragStart(section.id)}
                    onDragOver={(e) => handleSectionDragOver(e, section.id)}
                    onDragEnd={handleSectionDragEnd}
                  >
                    <div
                      className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center cursor-pointer hover:bg-slate-100"
                      onClick={() => toggleSection(section.id)}
                    >
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-4 h-4 text-slate-400 cursor-grab" />
                        {expandedSections.has(section.id) ? (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        )}
                        <input
                          value={section.title}
                          onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                          className="font-medium text-slate-800 bg-transparent border-b border-transparent focus:border-blue-400 outline-none text-sm"
                          onClick={(e) => e.stopPropagation()}
                          aria-label="セクション名"
                        />
                        <span className="text-xs text-slate-500">({section.fields.length}項目)</span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteSection(section.id) }}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {expandedSections.has(section.id) && (
                      <div className="p-3 space-y-3">
                        {/* セクション説明欄 */}
                        <div className="space-y-1.5 pb-3 border-b border-slate-200">
                          <label className="text-xs text-slate-600 font-medium">セクション説明（空欄の場合は非表示）</label>
                          <textarea
                            value={section.description || ''}
                            onChange={(e) => updateSectionDescription(section.id, e.target.value)}
                            placeholder="入力例: 睡眠中の状態について教えてください"
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none"
                            rows={2}
                          />
                        </div>
                        {/* 項目一覧 */}
                        {section.fields.map((field) => (
                          <div
                            key={field.id}
                            className={cn(
                              "p-3 border rounded-lg transition-all cursor-pointer",
                              editingField === field.id
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-slate-200 hover:border-slate-300',
                              draggedField?.id === field.id && 'opacity-50 border-dashed border-blue-400',
                              dragOverField === field.id && 'border-t-4 border-t-blue-500'
                            )}
                            draggable
                            onDragStart={(e) => { e.stopPropagation(); handleFieldDragStart({ id: field.id, sectionId: section.id }) }}
                            onDragOver={(e) => handleFieldDragOver(e, { id: field.id, sectionId: section.id })}
                            onDragEnd={handleFieldDragEnd}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex items-start gap-2 flex-1 min-w-0">
                                <div className="mt-1 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500">
                                  <GripVertical className="w-4 h-4" />
                                </div>
                                <div
                                  className="flex-1 min-w-0 cursor-pointer"
                                  onClick={() => setEditingField(editingField === field.id ? null : field.id)}
                                >
                                  <div className="font-medium text-slate-800 truncate">{field.name}</div>
                                  <div className="text-xs text-slate-500 mt-1">
                                    タイプ: {field.type} | {field.required ? '必須' : '任意'} | {field.isActive === false ? '非表示' : '表示'}
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => deleteField(section.id, field.id)}
                                className="text-red-400 hover:text-red-600 p-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            {editingField === field.id && (
                              <div className="mt-3 pt-3 border-t border-slate-200 space-y-3">
                                <div>
                                  <label className="text-xs text-slate-600 font-medium">項目名</label>
                                  <Input
                                    value={field.name}
                                    onChange={(e) => updateField(section.id, field.id, { name: e.target.value })}
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-slate-600 font-medium">タイプ</label>
                                  <select
                                    value={field.type}
                                    onChange={(e) => handleTypeChange(section.id, field.id, e.target.value as FormFieldConfig['type'])}
                                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white"
                                  >
                                    <option value="text">テキスト</option>
                                    <option value="textarea">テキストエリア</option>
                                    <option value="number">数値</option>
                                    <option value="radio">単一選択（ボタン形式）</option>
                                    <option value="checkbox">複数選択（リスト形式）</option>
                                    <option value="select">セレクト（プルダウン）</option>
                                  </select>
                                </div>
                                {(field.type === 'radio' || field.type === 'checkbox' || field.type === 'select') && (
                                  <div>
                                    <label className="text-xs text-slate-600 font-medium">選択肢</label>
                                    {(() => {
                                      const options = Array.isArray(field.options) ? field.options : (ensureOptions(field.type) ?? [])
                                      return (
                                        <div className="mt-2 space-y-2">
                                          {options.map((opt, idx) => (
                                            <div key={idx} className="flex gap-2 items-center">
                                              <Input
                                                value={opt.label}
                                                onChange={(e) => updateFieldOption(section.id, field.id, idx, e.target.value)}
                                                placeholder={`選択肢${idx + 1}`}
                                                className="flex-1"
                                              />
                                              <button
                                                onClick={() => removeFieldOption(section.id, field.id, idx)}
                                                className="text-red-400 hover:text-red-600 p-2"
                                                disabled={options.length <= 1}
                                              >
                                                <X className="w-4 h-4" />
                                              </button>
                                            </div>
                                          ))}
                                          <button
                                            onClick={() => addFieldOption(section.id, field.id)}
                                            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                          >
                                            <Plus className="w-3 h-3" />
                                            選択肢を追加
                                          </button>
                                        </div>
                                      )
                                    })()}
                                  </div>
                                )}
                                <div className="flex items-center gap-4 flex-wrap">
                                  <label className="flex items-center gap-2 text-sm text-slate-600">
                                    <input
                                      type="checkbox"
                                      checked={field.required || false}
                                      onChange={(e) => updateField(section.id, field.id, { required: e.target.checked })}
                                      className="w-4 h-4"
                                    />
                                    必須項目
                                  </label>
                                  <label className="flex items-center gap-2 text-sm text-slate-600">
                                    <input
                                      type="checkbox"
                                      checked={field.isActive !== false}
                                      onChange={() => toggleFieldVisibility(section.id, field.id)}
                                      className="w-4 h-4"
                                    />
                                    表示する
                                  </label>
                                </div>
                                <div>
                                  <label className="text-xs text-slate-600 font-medium">プレースホルダー</label>
                                  <Input
                                    value={field.placeholder || ''}
                                    onChange={(e) => updateField(section.id, field.id, { placeholder: e.target.value })}
                                    placeholder="入力例を表示したい場合に設定"
                                    className="mt-1"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                        <button
                          onClick={() => addField(section.id)}
                          className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-blue-400 hover:text-blue-500 transition-colors text-sm flex items-center justify-center gap-1"
                        >
                          <Plus className="w-4 h-4" />
                          項目を追加
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                <button
                  onClick={addSection}
                  className="w-full py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-blue-400 hover:text-blue-500 transition-colors flex items-center justify-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  セクションを追加
                </button>
              </>
            ) : (
              /* 診断項目編集 */
              <>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    <span className="ml-2 text-slate-500">読み込み中...</span>
                  </div>
                ) : diagnosisData.categoryOrder.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    診断項目がありません。カテゴリを追加してください。
                  </div>
                ) : null}
                {Array.from(new Set(diagnosisData.categoryOrder)).map((categoryName) => {
                  const items = diagnosisData.categorized[categoryName] || []
                  // staff/parent両方表示（管理画面なので全項目表示）
                  const displayItems = items

                  const isExpanded = expandedCategories.has(categoryName)
                  const visibleCount = displayItems.filter(i => i.isVisible).length
                  const isDragging = draggedCategory === categoryName
                  const isDragOver = dragOverCategory === categoryName
                  const isSelected = selectedCategory === categoryName
                  const isEditingThisCategory = editingCategoryNameState === categoryName

                  return (
                    <div
                      key={categoryName}
                      className={cn(
                        "border rounded-lg overflow-hidden transition-all",
                        isDragging ? "opacity-50 border-blue-300" : "border-slate-200",
                        isDragOver ? "border-blue-500 border-2" : "",
                        isSelected && !isExpanded ? "ring-2 ring-blue-300" : ""
                      )}
                      draggable
                      onDragStart={() => handleDragStart(categoryName)}
                      onDragOver={(e) => handleDragOver(e, categoryName)}
                      onDragEnd={handleDragEnd}
                    >
                      <div
                        className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center cursor-pointer hover:bg-slate-100"
                        onClick={() => toggleCategory(categoryName)}
                      >
                        <div className="flex items-center gap-2">
                          <GripVertical className="w-4 h-4 text-slate-400 cursor-grab" />
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          )}
                          {isEditingThisCategory ? (
                            <input
                              value={tempCategoryNameState}
                              onChange={(e) => setTempCategoryNameState(e.target.value)}
                              onBlur={() => {
                                renameDiagnosisCategory(categoryName, tempCategoryNameState)
                                setEditingCategoryNameState(null)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  renameDiagnosisCategory(categoryName, tempCategoryNameState)
                                  setEditingCategoryNameState(null)
                                }
                                if (e.key === 'Escape') {
                                  setTempCategoryNameState(categoryName)
                                  setEditingCategoryNameState(null)
                                }
                              }}
                              className="font-medium text-slate-800 bg-white border border-blue-400 rounded px-2 py-0.5 outline-none text-sm"
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                            />
                          ) : (
                            <span
                              className="font-medium text-slate-800 hover:underline"
                              onDoubleClick={(e) => {
                                e.stopPropagation()
                                setEditingCategoryNameState(categoryName)
                                setTempCategoryNameState(categoryName)
                              }}
                            >
                              {categoryName}
                            </span>
                          )}
                          <span className="text-xs text-slate-500">({visibleCount}/{displayItems.length}項目表示)</span>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteDiagnosisCategory(categoryName) }}
                          className="text-red-400 hover:text-red-600 p-1"
                          title="カテゴリを削除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="p-3 space-y-2">
                          {displayItems.map((item) => {
                            const isItemDragging = draggedItem?.id === item.id
                            const isItemDragOver = dragOverItem === item.id

                            return (
                              <div
                                key={item.id}
                                className={cn(
                                  "p-3 border rounded-lg transition-colors cursor-pointer",
                                  editingDiagnosisItem === item.id
                                    ? 'border-blue-500 bg-blue-50'
                                    : selectedItem === item.id
                                      ? 'border-blue-300 bg-blue-50/50'
                                      : 'border-slate-200 hover:border-slate-300',
                                  !item.isVisible && 'opacity-50 bg-slate-50',
                                  isItemDragging && 'opacity-50 border-dashed border-blue-400',
                                  isItemDragOver && 'border-t-4 border-t-blue-500'
                                )}
                                draggable
                                onDragStart={(e) => { e.stopPropagation(); handleItemDragStart({ id: item.id, category: categoryName }) }}
                                onDragOver={(e) => handleItemDragOver(e, { id: item.id, category: categoryName })}
                                onDragEnd={handleItemDragEnd}
                                onClick={() => handleItemClick(item.id)}
                              >
                                <div className="flex justify-between items-start gap-2">
                                  <div className="flex-1 min-w-0 flex gap-2">
                                    <div className="mt-1 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500">
                                      <GripVertical className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium text-slate-800 truncate">{item.question}</div>
                                      <div className="text-xs text-slate-500 mt-1 flex gap-1.5 flex-wrap">
                                        <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{item.answerType}</span>
                                        {item.required && <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded">必須</span>}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); toggleItemVisibility(item.id) }}
                                      className={cn(
                                        "p-1.5 rounded transition-colors",
                                        item.isVisible
                                          ? "text-green-600 hover:bg-green-100"
                                          : "text-slate-400 hover:bg-slate-100"
                                      )}
                                      title={item.isVisible ? '表示中' : '非表示'}
                                    >
                                      {item.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleItemClick(item.id) }}
                                      className="text-slate-400 hover:text-slate-600 p-1.5 rounded hover:bg-slate-100"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>

                                {editingDiagnosisItem === item.id && (
                                  <div className="mt-3 pt-3 border-t border-slate-200 space-y-3" onClick={(e) => e.stopPropagation()}>
                                    <div>
                                      <label className="text-xs text-slate-600 font-medium">質問文</label>
                                      <Input
                                        value={item.question}
                                        onChange={(e) => updateDiagnosisItem(item.id, { question: e.target.value })}
                                        className="mt-1"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs text-slate-600 font-medium">回答タイプ</label>
                                      <select
                                        value={item.answerType}
                                        onChange={(e) => updateDiagnosisItem(item.id, { answerType: e.target.value as DiagnosisItem['answerType'] })}
                                        className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white"
                                      >
                                        <option value="radio">単一選択（ボタン形式）</option>
                                        <option value="checkbox">複数選択（リスト形式）</option>
                                        <option value="text">テキスト</option>
                                        <option value="number">数値</option>
                                        <option value="textarea">テキストエリア</option>
                                      </select>
                                    </div>

                                    {(item.answerType === 'radio' || item.answerType === 'checkbox') && item.options && (
                                      <div>
                                        <label className="text-xs text-slate-600 font-medium">選択肢</label>
                                        <div className="mt-1 space-y-2">
                                          {item.options.map((option, optIndex) => (
                                            <div key={optIndex} className="flex gap-2 items-center">
                                              <Input
                                                value={option.label}
                                                onChange={(e) => updateDiagnosisOption(item.id, optIndex, e.target.value)}
                                                placeholder="選択肢のラベル"
                                                className="flex-1"
                                              />
                                              <button
                                                onClick={() => removeDiagnosisOption(item.id, optIndex)}
                                                className="text-red-400 hover:text-red-600 p-2"
                                              >
                                                <X className="w-4 h-4" />
                                              </button>
                                            </div>
                                          ))}
                                          <button
                                            onClick={() => addDiagnosisOption(item.id)}
                                            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                          >
                                            <Plus className="w-3 h-3" />
                                            選択肢を追加
                                          </button>
                                        </div>
                                      </div>
                                    )}

                                    <div className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        checked={item.required}
                                        onChange={(e) => updateDiagnosisItem(item.id, { required: e.target.checked })}
                                        className="w-4 h-4"
                                      />
                                      <label className="text-sm text-slate-600">必須</label>
                                    </div>

                                    <div>
                                      <label className="text-xs text-slate-600 font-medium">備考</label>
                                      <Input
                                        value={item.note || ''}
                                        onChange={(e) => updateDiagnosisItem(item.id, { note: e.target.value })}
                                        placeholder="例: 4歳以下は参考程度に"
                                        className="mt-1"
                                      />
                                    </div>
                                    <div className="pt-2 border-t border-slate-200">
                                      <button
                                        onClick={() => deleteDiagnosisItem(item.id, categoryName)}
                                        className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                        この項目を削除
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                          <button
                            onClick={() => addDiagnosisItem(categoryName)}
                            className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-blue-400 hover:text-blue-500 transition-colors text-sm flex items-center justify-center gap-1"
                          >
                            <Plus className="w-4 h-4" />
                            項目を追加
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
                <button
                  onClick={addDiagnosisCategory}
                  className="w-full py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-blue-400 hover:text-blue-500 transition-colors flex items-center justify-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  カテゴリを追加
                </button>
              </>
            )}
          </div>
        </div>

        {/* 右: プレビュー */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h2 className="font-semibold text-slate-800">プレビュー（実際の表示）</h2>
            <div className="flex gap-1">
              {(['mobile', 'tablet', 'desktop'] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1 text-xs rounded transition-colors ${viewMode === mode
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                >
                  {mode === 'mobile' ? '📱' : mode === 'tablet' ? '📱' : '💻'}
                </button>
              ))}
            </div>
          </div>
          <div ref={previewRef} className="p-4 bg-slate-100 min-h-[700px] flex justify-center overflow-y-auto">
            <div
              className={`bg-gray-50 rounded-lg shadow-lg overflow-hidden transition-all ${viewMode === 'mobile'
                ? 'w-[375px]'
                : viewMode === 'tablet'
                  ? 'w-[768px]'
                  : 'w-full'
                }`}
            >
              <div className="p-4 max-h-[650px] overflow-y-auto">
                {activeTab === 'questionnaire' ? (
                  (questionnaireSubTab === 'basic_info' ? basicInfoSchema : questionnaireSchema).sections.map((section) => (
                    <div key={section.id} className="mb-6">
                      <h3 className="text-lg font-bold text-slate-800 mb-2">{section.title}</h3>
                      {section.description && (
                        <p className="text-sm text-slate-500 mb-4">{section.description}</p>
                      )}
                      <div className="space-y-4">
                        {section.fields.filter(f => f.isActive !== false).map((field) => (
                          <div key={field.id}>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              {field.name}
                              {field.required && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            {field.type === 'text' && <Input placeholder={field.placeholder} disabled />}
                            {field.type === 'textarea' && <Textarea placeholder={field.placeholder} rows={field.rows || 3} disabled />}
                            {field.type === 'number' && <Input type="number" placeholder={field.placeholder} disabled />}
                            {field.type === 'radio' && Array.isArray(field.options) && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {field.options.map((opt) => (
                                  <label
                                    key={opt.value}
                                    className="flex items-center justify-center p-3 border rounded-lg cursor-default transition-all touch-manipulation font-medium shadow-sm border-slate-200 bg-white"
                                  >
                                    <input type="radio" className="sr-only" disabled />
                                    <span className="text-sm text-slate-800">{opt.label}</span>
                                  </label>
                                ))}
                              </div>
                            )}
                            {field.type === 'checkbox' && field.options && (
                              <div className="space-y-2">
                                {field.options.map((opt) => (
                                  <label key={opt.value} className="flex items-center gap-2">
                                    <input type="checkbox" disabled />
                                    <span className="text-sm">{opt.label}</span>
                                  </label>
                                ))}
                              </div>
                            )}
                            {field.type === 'select' && (
                              <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-700 bg-white" disabled>
                                <option>{field.placeholder || '選択してください'}</option>
                                {Array.isArray(field.options) &&
                                  field.options.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                  ))}
                              </select>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="space-y-6">
                    {Array.from(new Set(diagnosisData.categoryOrder)).map((categoryName) => {
                      const items = diagnosisData.categorized[categoryName] || []
                      const visibleStaffItems = items.filter(item => item.inputType === 'staff' && item.isVisible)
                      if (visibleStaffItems.length === 0) return null

                      const isSelected = selectedCategory === categoryName

                      return (
                        <Card
                          key={categoryName}
                          ref={(el) => { if (el) categoryRefs.current.set(categoryName, el) }}
                          className={cn(
                            "shadow-sm transition-all",
                            isSelected && "ring-2 ring-blue-500"
                          )}
                        >
                          <CardHeader className="pb-4">
                            <CardTitle className="text-lg">{categoryName}</CardTitle>
                            <CardDescription className="text-sm">
                              {visibleStaffItems.length}項目
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-6">
                            {visibleStaffItems.map(item => (
                              <div key={item.id} className="pb-6 border-b border-gray-100 last:border-0 last:pb-0">
                                {renderDiagnosisPreview(item)}
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
