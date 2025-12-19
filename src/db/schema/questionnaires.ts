import { pgTable, uuid, varchar, text, timestamp, boolean, integer, jsonb } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { visits } from './visits'

// ========================================
// Questionnaire Categories (問診カテゴリ)
// ========================================
export const questionnaireCategories = pgTable('questionnaire_categories', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    targetAge: varchar('target_age', { length: 20 }),
    displayOrder: integer('display_order').default(0),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// ========================================
// Questionnaire Items (問診項目)
// ========================================
export const questionnaireItems = pgTable('questionnaire_items', {
    id: uuid('id').primaryKey().defaultRandom(),
    categoryId: uuid('category_id').references(() => questionnaireCategories.id),
    question: varchar('question', { length: 500 }).notNull(),
    answerType: varchar('answer_type', { length: 20 }).notNull(),
    options: jsonb('options'),
    isRequired: boolean('is_required').default(false),
    placeholder: varchar('placeholder', { length: 255 }),
    helperText: text('helper_text'),
    validation: jsonb('validation'),
    displayOrder: integer('display_order').default(0),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// ========================================
// Questionnaire Responses (問診回答)
// ========================================
export const questionnaireResponses = pgTable('questionnaire_responses', {
    id: uuid('id').primaryKey().defaultRandom(),
    visitId: uuid('visit_id').references(() => visits.id),
    sessionId: varchar('session_id', { length: 50 }),
    itemId: uuid('item_id').references(() => questionnaireItems.id).notNull(),
    value: text('value').notNull(),
    metadata: jsonb('metadata'),
    answeredAt: timestamp('answered_at', { withTimezone: true }).defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// ========================================
// Relations
// ========================================
export const questionnaireCategoriesRelations = relations(questionnaireCategories, ({ many }) => ({
    items: many(questionnaireItems),
}))

export const questionnaireItemsRelations = relations(questionnaireItems, ({ one, many }) => ({
    category: one(questionnaireCategories, {
        fields: [questionnaireItems.categoryId],
        references: [questionnaireCategories.id],
    }),
    responses: many(questionnaireResponses),
}))

export const questionnaireResponsesRelations = relations(questionnaireResponses, ({ one }) => ({
    visit: one(visits, {
        fields: [questionnaireResponses.visitId],
        references: [visits.id],
    }),
    item: one(questionnaireItems, {
        fields: [questionnaireResponses.itemId],
        references: [questionnaireItems.id],
    }),
}))
