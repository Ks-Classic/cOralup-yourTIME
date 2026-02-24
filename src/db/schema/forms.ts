import { pgTable, uuid, varchar, text, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core'

// ========================================
// Form Schemas (フォーム定義 - JSONB形式)
// ========================================
export const formSchemas = pgTable('form_schemas', {
    id: uuid('id').primaryKey().defaultRandom(),
    schemaId: varchar('schema_id', { length: 100 }).unique().notNull(),
    formType: varchar('form_type', { length: 50 }).notNull(), // 'questionnaire', 'diagnosis', 'basic_info'
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    version: varchar('version', { length: 20 }).default('1.0'),
    config: jsonb('config').notNull(),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// NOTE: form_schema_versions, form_fields, form_responses, form_cache は
// 未使用のため削除済み。form_schemas のみ 1件のマスタデータとして残存。
