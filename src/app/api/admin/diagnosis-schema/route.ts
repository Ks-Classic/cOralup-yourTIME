import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { diagnosisCategories, diagnosisItems } from '@/db/schema'
import { eq, asc } from 'drizzle-orm'

interface DiagnosisItemPayload {
  id: string
  category: string
  question: string
  answerType: string
  options?: { value: string; label: string }[]
  required: boolean
  inputType: string
  note?: string
  isVisible: boolean
}

interface SavePayload {
  categoryOrder: string[]
  items: DiagnosisItemPayload[]
}

// POST: 診断スキーマを保存
export async function POST(request: NextRequest) {
  try {
    const body: SavePayload = await request.json()
    const { categoryOrder, items } = body

    // 1. カテゴリの順序を更新
    for (let i = 0; i < categoryOrder.length; i++) {
      const categoryName = categoryOrder[i]
      const existingCat = await db.select().from(diagnosisCategories).where(eq(diagnosisCategories.name, categoryName)).limit(1)

      if (existingCat[0]) {
        await db.update(diagnosisCategories).set({
          displayOrder: i
        } as Partial<typeof diagnosisCategories.$inferInsert>).where(eq(diagnosisCategories.id, existingCat[0].id))
      } else {
        await db.insert(diagnosisCategories).values({
          name: categoryName,
          displayOrder: i,
          isActive: true
        } as typeof diagnosisCategories.$inferInsert)
      }
    }

    // 更新後のカテゴリIDマップ作成
    const allCats = await db.select().from(diagnosisCategories)
    const categoryMap = new Map(allCats.map(c => [c.name, c.id]))

    // 2. 項目を更新（displayOrder含む）
    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx]
      const categoryId = categoryMap.get(item.category)
      if (!categoryId) {
        console.warn('[diagnosis-schema POST] カテゴリが見つからない:', item.category)
        continue
      }

      const itemData: any = {
        categoryId: categoryId,
        question: item.question,
        answerType: item.answerType,
        options: item.options || null,
        isRequired: item.required,
        inputType: item.inputType,
        note: item.note || null,
        isActive: item.isVisible,
        displayOrder: idx
      }

      const isExisting = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id)

      if (isExisting) {
        await db.update(diagnosisItems).set(itemData).where(eq(diagnosisItems.id, item.id))
      } else {
        await db.insert(diagnosisItems).values(itemData)
      }
    }

    return NextResponse.json({ success: true, message: '診断スキーマを保存しました' })
  } catch (error) {
    console.error('診断スキーマ保存エラー:', error)
    return NextResponse.json({ success: false, error: '保存に失敗しました' }, { status: 500 })
  }
}

// GET: 診断スキーマを取得
export async function GET() {
  try {
    const categories = await db.select().from(diagnosisCategories).orderBy(asc(diagnosisCategories.displayOrder))
    const items = await db.select().from(diagnosisItems).orderBy(asc(diagnosisItems.displayOrder))

    const categoryOrder = categories.map(c => c.name)
    const categorized: Record<string, any[]> = {}

    for (const item of items) {
      const category = categories.find(c => c.id === item.categoryId)
      if (category) {
        if (!categorized[category.name]) categorized[category.name] = []
        categorized[category.name].push({
          id: item.id,
          category: category.name,
          question: item.question,
          answerType: item.answerType,
          options: item.options,
          required: item.isRequired,
          inputType: item.inputType,
          note: item.note,
          isVisible: item.isActive
        })
      }
    }

    return NextResponse.json({ success: true, data: { categoryOrder, categorized } })
  } catch (error) {
    console.error('診断スキーマ取得エラー:', error)
    return NextResponse.json({ success: false, error: '取得に失敗しました' }, { status: 500 })
  }
}
