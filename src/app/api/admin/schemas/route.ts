import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { formSchemas, formSchemaVersions, questionnaireCategories, questionnaireItems } from '@/db/schema'
import { eq, and, or, sql, asc, inArray, desc } from 'drizzle-orm'
import { preschoolerFormSchema } from '@/data/preschooler-form-schema'
import { elementaryFormSchema } from '@/data/elementary-form-schema'
import { basicInfoFormSchema, basicInfoElementaryFormSchema } from '@/data/basic-info-schema'
import { diagnosisItems, categoryOrder } from '@/data/staff-diagnosis-items'

const adminApiKey = process.env.ADMIN_API_KEY

const assertAdminAuthorized = (request: NextRequest) => {
  if (!adminApiKey) return
  const authHeader = request.headers.get('authorization') || ''
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  const headerKey = request.headers.get('x-admin-key')
  if (!bearer && !headerKey) return // 暫定
  if (bearer === adminApiKey || headerKey === adminApiKey) return
  throw new Error('unauthorized')
}

async function convertQuestionnaireToSchema(targetAge: 'preschool' | 'elementary') {
  const categories = await db
    .select()
    .from(questionnaireCategories)
    .where(or(eq(questionnaireCategories.targetAge, targetAge), eq(questionnaireCategories.targetAge, 'all')))
    .orderBy(asc(questionnaireCategories.displayOrder))

  const items = await db.select().from(questionnaireItems).orderBy(asc(questionnaireItems.displayOrder))

  const sections = categories.map((cat) => {
    const catItems = items.filter((item) => item.categoryId === cat.id)
    return {
      id: cat.id,
      title: cat.name,
      description: cat.description,
      order: cat.displayOrder,
      isActive: cat.isActive,
      fields: catItems.map((item) => ({
        id: item.id,
        name: item.question,
        type: item.answerType,
        required: item.isRequired,
        placeholder: item.placeholder,
        helperText: item.helperText,
        options: item.options,
        validation: item.validation,
        isActive: item.isActive,
      })),
    }
  }).filter(s => s.fields.length > 0)

  return { sections, settings: { showProgress: true, allowBackNavigation: true } }
}

export async function GET(request: NextRequest) {
  try {
    assertAdminAuthorized(request)
    const { searchParams } = new URL(request.url)
    const formType = searchParams.get('form_type')
    const schemaId = searchParams.get('schema_id')

    // 基本情報スキーマ: まずDBを確認し、なければハードコードをフォールバック
    if (schemaId && schemaId.startsWith('basic_info')) {
      // DBから取得を試みる
      const dbSchema = await db.select().from(formSchemas).where(eq(formSchemas.schemaId, schemaId)).limit(1)

      if (dbSchema[0]) {
        // DBにデータがある場合はそれを使用
        return NextResponse.json({
          data: [{
            id: dbSchema[0].id,
            schema_id: dbSchema[0].schemaId,
            form_type: dbSchema[0].formType,
            name: dbSchema[0].name,
            is_active: dbSchema[0].isActive,
            config: dbSchema[0].config,
            created_at: dbSchema[0].createdAt?.toISOString()
          }],
          error: null
        })
      }

      // DBにない場合はハードコードをフォールバック（初期状態・共通スキーマ）
      const config = basicInfoFormSchema // 共通スキーマを使用
      return NextResponse.json({ data: [{ id: schemaId, schema_id: schemaId, form_type: 'basic_info', name: '基本情報（共通）', is_active: true, config, created_at: new Date().toISOString() }], error: null })
    }

    if (schemaId && (schemaId.startsWith('preschooler') || schemaId.startsWith('elementary'))) {
      const targetAge = schemaId.startsWith('preschooler') ? 'preschool' : 'elementary'
      const config = await convertQuestionnaireToSchema(targetAge)
      return NextResponse.json({ data: [{ id: schemaId, schema_id: schemaId, form_type: 'questionnaire', name: targetAge === 'preschool' ? '未就学児用問診票' : '小学生以上用問診票', is_active: true, config, created_at: new Date().toISOString() }], error: null })
    }

    let query = db.select().from(formSchemas).where(eq(formSchemas.isActive, true)).orderBy(desc(formSchemas.createdAt))
    // NOTE: drizzle-orm doesn't have fluent additional filters like supabase, built it manually if needed.
    // Simplifying for now since we usually use basic params.
    const schemas = await query
    return NextResponse.json({ data: schemas, error: null })
  } catch (error) {
    if ((error as Error).message === 'unauthorized') return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    assertAdminAuthorized(request)
    const body = await request.json()
    const { schema_id, form_type, name, description, config, hardDeleteCategoryIds = [], hardDeleteItemIds = [] } = body

    if (form_type === 'questionnaire') {
      const targetAge = schema_id.startsWith('preschooler') ? 'preschool' : 'elementary'
      const usedCategoryIds: string[] = []
      const usedItemIds: string[] = []

      for (const section of config.sections) {
        let categoryId = section.id
        const isTempId = !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(categoryId)

        if (isTempId) {
          const existing = await db.select().from(questionnaireCategories).where(eq(questionnaireCategories.name, section.title)).limit(1)
          if (existing[0]) categoryId = existing[0].id
          else {
            const inserted = await db.insert(questionnaireCategories).values({
              name: section.title,
              description: section.description,
              targetAge,
              displayOrder: section.order,
              isActive: true
            } as typeof questionnaireCategories.$inferInsert).returning()
            categoryId = inserted[0].id
          }
        } else {
          await db.update(questionnaireCategories).set({
            name: section.title,
            description: section.description,
            displayOrder: section.order
          } as Partial<typeof questionnaireCategories.$inferInsert>).where(eq(questionnaireCategories.id, categoryId))
        }
        usedCategoryIds.push(categoryId)

        for (const field of section.fields) {
          let itemId = field.id
          const isTempItemId = !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(itemId)
          const itemData: any = { categoryId, question: field.name, answerType: field.type, isRequired: !!field.required, placeholder: field.placeholder, options: field.options, displayOrder: section.fields.indexOf(field) + 1, isActive: field.isActive !== false }
          if (isTempItemId) {
            const inserted = await db.insert(questionnaireItems).values(itemData).returning()
            itemId = inserted[0].id
          } else {
            await db.update(questionnaireItems).set(itemData).where(eq(questionnaireItems.id, itemId))
          }
          usedItemIds.push(itemId)
        }
      }

      // Soft delete logic simplified
      if (hardDeleteItemIds.length > 0) await db.delete(questionnaireItems).where(inArray(questionnaireItems.id, hardDeleteItemIds))
      if (hardDeleteCategoryIds.length > 0) {
        await db.delete(questionnaireItems).where(inArray(questionnaireItems.categoryId, hardDeleteCategoryIds))
        await db.delete(questionnaireCategories).where(inArray(questionnaireCategories.id, hardDeleteCategoryIds))
      }
      return NextResponse.json({ success: true })
    }

    // Default form_schemas upsert
    const existing = await db.select().from(formSchemas).where(eq(formSchemas.schemaId, schema_id)).limit(1)
    if (existing[0]) {
      await db.update(formSchemas).set({
        name,
        description,
        config,
        updatedAt: new Date()
      } as Partial<typeof formSchemas.$inferInsert>).where(eq(formSchemas.id, existing[0].id))
    } else {
      await db.insert(formSchemas).values({
        schemaId: schema_id,
        formType: form_type,
        name,
        description,
        config
      } as typeof formSchemas.$inferInsert)
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
  }
}
