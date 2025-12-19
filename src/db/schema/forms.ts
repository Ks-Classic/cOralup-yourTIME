import { pgTable, uuid, varchar, text, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

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

// ========================================
// Form Schema Versions (バージョン履歴)
// ========================================
export const formSchemaVersions = pgTable('form_schema_versions', {
    id: uuid('id').primaryKey().defaultRandom(),
    schemaId: uuid('schema_id').references(() => formSchemas.id).notNull(),
    version: varchar('version', { length: 20 }).notNull(),
    config: jsonb('config').notNull(),
    changeLog: text('change_log'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// ========================================
// Relations
// ========================================
export const formSchemasRelations = relations(formSchemas, ({ many }) => ({
    versions: many(formSchemaVersions),
}))

export const formSchemaVersionsRelations = relations(formSchemaVersions, ({ one }) => ({
    schema: one(formSchemas, {
        fields: [formSchemaVersions.schemaId],
        references: [formSchemas.id],
    }),
}))
