'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { FormPreview } from '@/components/admin/form-preview'
import { DiagnosisPreview } from '@/components/admin/diagnosis-preview'
import { preschoolerFormSchema } from '@/data/preschooler-form-schema'
import { elementaryFormSchema } from '@/data/elementary-form-schema'
import { diagnosisItems } from '@/data/staff-diagnosis-items'
import type { FormSchemaConfig } from '@/types/forms'
import type { DiagnosisItem } from '@/data/staff-diagnosis-items'

type SchemaType = 'preschooler' | 'elementary' | 'diagnosis'

interface BaseSchemaEditorProps {
  schemaType: SchemaType
}

export function BaseSchemaEditor({ schemaType }: BaseSchemaEditorProps) {
  const [schemaJson, setSchemaJson] = useState<string>('')
  const [parsedSchema, setParsedSchema] = useState<FormSchemaConfig | null>(null)
  const [parsedDiagnosisItems, setParsedDiagnosisItems] = useState<DiagnosisItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'tablet' | 'desktop'>('desktop')

  // 診断評価項目のバリデーション
  const validateDiagnosisItems = useCallback((items: any[]): string[] => {
    const errors: string[] = []
    
    if (!Array.isArray(items)) {
      return ['診断評価項目は配列形式である必要があります']
    }

    items.forEach((item, index) => {
      if (!item.id || typeof item.id !== 'string') {
        errors.push(`項目 ${index + 1}: idが必須です`)
      }
      if (!item.category || typeof item.category !== 'string') {
        errors.push(`項目 ${index + 1}: categoryが必須です`)
      }
      if (!item.subCategory || typeof item.subCategory !== 'string') {
        errors.push(`項目 ${index + 1}: subCategoryが必須です`)
      }
      if (!item.question || typeof item.question !== 'string') {
        errors.push(`項目 ${index + 1}: questionが必須です`)
      }
      if (!item.answerType || !['checkbox', 'radio', 'text', 'number', 'textarea'].includes(item.answerType)) {
        errors.push(`項目 ${index + 1}: answerTypeが無効です（checkbox, radio, text, number, textareaのいずれか）`)
      }
      if (typeof item.required !== 'boolean') {
        errors.push(`項目 ${index + 1}: requiredが必須です（boolean）`)
      }
      if (!item.inputType || !['parent', 'staff'].includes(item.inputType)) {
        errors.push(`項目 ${index + 1}: inputTypeが無効です（parentまたはstaff）`)
      }
      if ((item.answerType === 'checkbox' || item.answerType === 'radio') && (!item.options || !Array.isArray(item.options))) {
        errors.push(`項目 ${index + 1}: ${item.answerType}タイプの場合、optionsが必須です`)
      }
      if (item.options && Array.isArray(item.options)) {
        item.options.forEach((opt: any, optIndex: number) => {
          if (!opt.value || typeof opt.value !== 'string') {
            errors.push(`項目 ${index + 1}の選択肢 ${optIndex + 1}: valueが必須です`)
          }
          if (!opt.label || typeof opt.label !== 'string') {
            errors.push(`項目 ${index + 1}の選択肢 ${optIndex + 1}: labelが必須です`)
          }
        })
      }
    })

    return errors
  }, [])

  // 初期スキーマの読み込み
  useEffect(() => {
    if (schemaType === 'diagnosis') {
      const json = JSON.stringify(diagnosisItems, null, 2)
      setSchemaJson(json)
      setParsedDiagnosisItems(diagnosisItems)
      setError(null)
      setValidationErrors([])
    } else {
      let initialSchema: FormSchemaConfig | null = null
      
      switch (schemaType) {
        case 'preschooler':
          initialSchema = preschoolerFormSchema
          break
        case 'elementary':
          initialSchema = elementaryFormSchema
          break
      }

      if (initialSchema) {
        const json = JSON.stringify(initialSchema, null, 2)
        setSchemaJson(json)
        setParsedSchema(initialSchema)
        setError(null)
        setValidationErrors([])
      }
    }
  }, [schemaType])

  // JSONの変更を監視してリアルタイムでパース
  useEffect(() => {
    if (!schemaJson.trim()) {
      setParsedSchema(null)
      setParsedDiagnosisItems(null)
      setError(null)
      setValidationErrors([])
      return
    }

    try {
      const parsed = JSON.parse(schemaJson)
      
      if (schemaType === 'diagnosis') {
        // 診断評価項目のバリデーション
        const errors = validateDiagnosisItems(parsed)
        if (errors.length > 0) {
          setValidationErrors(errors)
          setParsedDiagnosisItems(null)
          setError(null)
        } else {
          setParsedDiagnosisItems(parsed as DiagnosisItem[])
          setValidationErrors([])
          setError(null)
        }
      } else {
        // フォームスキーマのパース
        setParsedSchema(parsed as FormSchemaConfig)
        setError(null)
        setValidationErrors([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'JSONの解析に失敗しました')
      setParsedSchema(null)
      setParsedDiagnosisItems(null)
      setValidationErrors([])
    }
  }, [schemaJson, schemaType, validateDiagnosisItems])

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(schemaJson)
      const formatted = JSON.stringify(parsed, null, 2)
      setSchemaJson(formatted)
      setError(null)
    } catch (err) {
      setError('JSONのフォーマットに失敗しました')
    }
  }

  const handleReset = () => {
    if (schemaType === 'diagnosis') {
      const json = JSON.stringify(diagnosisItems, null, 2)
      setSchemaJson(json)
      setParsedDiagnosisItems(diagnosisItems)
      setError(null)
      setValidationErrors([])
    } else {
      let defaultSchema: FormSchemaConfig | null = null
      
      switch (schemaType) {
        case 'preschooler':
          defaultSchema = preschoolerFormSchema
          break
        case 'elementary':
          defaultSchema = elementaryFormSchema
          break
      }

      if (defaultSchema) {
        setSchemaJson(JSON.stringify(defaultSchema, null, 2))
        setParsedSchema(defaultSchema)
        setError(null)
        setValidationErrors([])
      }
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">基本スキーマ編集（開発モード）</CardTitle>
              <CardDescription className="text-xs mt-1">
                {schemaType === 'preschooler' && '未就学児用問診票の基本スキーマ'}
                {schemaType === 'elementary' && '小学生以上用問診票の基本スキーマ'}
                {schemaType === 'diagnosis' && 'スタッフ診断評価項目の基本スキーマ'}
              </CardDescription>
            </div>
            <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-200">
              開発モード
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="edit" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="edit">📝 JSON編集</TabsTrigger>
              <TabsTrigger value="preview">👁️ プレビュー</TabsTrigger>
            </TabsList>
            
            <TabsContent value="edit" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  {error && (
                    <Badge variant="destructive" className="text-xs">
                      ⚠️ JSONエラー: {error}
                    </Badge>
                  )}
                  {validationErrors.length > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      ⚠️ バリデーションエラー: {validationErrors.length}件
                    </Badge>
                  )}
                  {!error && validationErrors.length === 0 && (
                    schemaType === 'diagnosis' ? (
                      parsedDiagnosisItems && (
                        <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
                          ✅ 有効な診断評価項目 ({parsedDiagnosisItems.length}項目)
                        </Badge>
                      )
                    ) : (
                      parsedSchema && (
                        <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
                          ✅ 有効なJSON
                        </Badge>
                      )
                    )
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleFormat}>
                    フォーマット
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleReset}>
                    リセット
                  </Button>
                </div>
              </div>

              {/* バリデーションエラーの詳細表示 */}
              {validationErrors.length > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-medium text-red-800 mb-2">バリデーションエラー詳細:</p>
                  <ul className="text-xs text-red-700 space-y-1 list-disc list-inside max-h-40 overflow-y-auto">
                    {validationErrors.map((err, index) => (
                      <li key={index}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <Textarea
                value={schemaJson}
                onChange={(e) => setSchemaJson(e.target.value)}
                className="font-mono text-sm min-h-[500px]"
                placeholder={
                  schemaType === 'diagnosis'
                    ? 'JSON形式で診断評価項目を編集してください（DiagnosisItem[]形式）...'
                    : 'JSON形式でスキーマを編集してください...'
                }
              />
              
              <div className="text-xs text-gray-500 space-y-1">
                <p>💡 ヒント:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>編集内容はリアルタイムでプレビューに反映されます</li>
                  <li>JSONの構文エラーがある場合は赤いバッジで表示されます</li>
                  {schemaType === 'diagnosis' && (
                    <li>診断評価項目の型チェックが自動的に行われます</li>
                  )}
                  <li>「フォーマット」ボタンでJSONを整形できます</li>
                  <li>「リセット」ボタンで元のスキーマに戻せます</li>
                </ul>
              </div>
            </TabsContent>
            
            <TabsContent value="preview" className="space-y-4">
              {schemaType === 'diagnosis' ? (
                parsedDiagnosisItems && parsedDiagnosisItems.length > 0 ? (
                  <DiagnosisPreview
                    items={parsedDiagnosisItems}
                    deviceType={previewDevice}
                    onDeviceChange={setPreviewDevice}
                  />
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <p>有効な診断評価項目を入力するとプレビューが表示されます</p>
                    {validationErrors.length > 0 && (
                      <p className="text-xs text-red-500 mt-2">
                        バリデーションエラーを修正してください
                      </p>
                    )}
                  </div>
                )
              ) : parsedSchema ? (
                <FormPreview
                  schema={parsedSchema}
                  deviceType={previewDevice}
                  onDeviceChange={setPreviewDevice}
                />
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <p>有効なJSONを入力するとプレビューが表示されます</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

