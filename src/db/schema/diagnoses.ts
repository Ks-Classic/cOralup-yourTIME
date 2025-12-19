import { pgTable, uuid, varchar, text, timestamp, boolean, integer, jsonb } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { visits } from './visits'

// ========================================
// Diagnosis Categories (診断カテゴリ)
// ========================================
export const diagnosisCategories = pgTable('diagnosis_categories', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull(),
    code: varchar('code', { length: 50 }),
    description: text('description'),
    displayOrder: integer('display_order').default(0),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// ========================================
// Diagnosis Items (診断項目)
// ========================================
export const diagnosisItems = pgTable('diagnosis_items', {
    id: uuid('id').primaryKey().defaultRandom(),
    categoryId: uuid('category_id').references(() => diagnosisCategories.id),
    question: varchar('question', { length: 500 }).notNull(),
    code: varchar('code', { length: 50 }),
    answerType: varchar('answer_type', { length: 20 }).notNull(),
    options: jsonb('options'),
    isRequired: boolean('is_required').default(false),
    inputType: varchar('input_type', { length: 20 }),
    note: text('note'),
    placeholder: varchar('placeholder', { length: 255 }),
    unit: varchar('unit', { length: 20 }),
    minValue: integer('min_value'),
    maxValue: integer('max_value'),
    displayOrder: integer('display_order').default(0),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// ========================================
// Diagnoses (診断結果 - レガシー, JSONB形式)
// ========================================
export const diagnoses = pgTable('diagnoses', {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: varchar('session_id', { length: 50 }).unique(),
    visitId: uuid('visit_id').references(() => visits.id),
    postureAnalysis: jsonb('posture_analysis'),
    oralAnalysis: jsonb('oral_analysis'),
    diagnosisItems: jsonb('diagnosis_items'),
    aiAnalysis: text('ai_analysis'),
    staffNotes: text('staff_notes'),
    photos: jsonb('photos'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// ========================================
// Diagnosis Responses (診断回答)
// ========================================
export const diagnosisResponses = pgTable('diagnosis_responses', {
    id: uuid('id').primaryKey().defaultRandom(),
    visitId: uuid('visit_id').references(() => visits.id),
    sessionId: varchar('session_id', { length: 50 }),
    itemId: uuid('item_id').references(() => diagnosisItems.id).notNull(),
    value: text('value').notNull(),
    metadata: jsonb('metadata'),
    answeredBy: uuid('answered_by'),
    answeredAt: timestamp('answered_at', { withTimezone: true }).defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// ========================================
// Relations
// ========================================
export const diagnosisCategoriesRelations = relations(diagnosisCategories, ({ many }) => ({
    items: many(diagnosisItems),
}))

export const diagnosisItemsRelations = relations(diagnosisItems, ({ one, many }) => ({
    category: one(diagnosisCategories, {
        fields: [diagnosisItems.categoryId],
        references: [diagnosisCategories.id],
    }),
    responses: many(diagnosisResponses),
}))

export const diagnosisResponsesRelations = relations(diagnosisResponses, ({ one }) => ({
    visit: one(visits, {
        fields: [diagnosisResponses.visitId],
        references: [visits.id],
    }),
    item: one(diagnosisItems, {
        fields: [diagnosisResponses.itemId],
        references: [diagnosisItems.id],
    }),
}))
