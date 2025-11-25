'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BaseSchemaEditor } from '@/components/admin/base-schema-editor'

export default function BaseSchemaManagementPage() {
  const [activeTab, setActiveTab] = useState<'preschooler' | 'elementary' | 'diagnosis'>('preschooler')

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">基本スキーマ管理</h1>
          <p className="text-gray-600 mt-2">
            問診票・診断評価項目の基本スキーマを編集・確認できます。編集内容はリアルタイムでプレビューに反映されます。
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>スキーマタイプ選択</CardTitle>
            <CardDescription>
              編集するスキーマタイプを選択してください
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="preschooler">未就学児用問診票</TabsTrigger>
                <TabsTrigger value="elementary">小学生以上用問診票</TabsTrigger>
                <TabsTrigger value="diagnosis">スタッフ診断評価</TabsTrigger>
              </TabsList>
              
              <TabsContent value="preschooler" className="mt-6">
                <BaseSchemaEditor schemaType="preschooler" />
              </TabsContent>
              
              <TabsContent value="elementary" className="mt-6">
                <BaseSchemaEditor schemaType="elementary" />
              </TabsContent>
              
              <TabsContent value="diagnosis" className="mt-6">
                <div className="text-center py-12 text-gray-400">
                  <p>診断評価項目の編集機能は準備中です</p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

