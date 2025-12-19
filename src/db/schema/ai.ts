import { pgTable, uuid, varchar, text, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core'

// ========================================
// AI Prompts (AI分析用プロンプト)
// ========================================
export const aiPrompts = pgTable('ai_prompts', {
    id: uuid('id').primaryKey().defaultRandom(),
    label: varchar('label', { length: 100 }).notNull(),
    promptTemplate: text('prompt_template').notNull(),
    description: text('description'),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// ========================================
// AI Analysis Logs (AI分析ログ)
// ========================================
export const aiAnalysisLogs = pgTable('ai_analysis_logs', {
    id: uuid('id').primaryKey().defaultRandom(),
    visitId: uuid('visit_id'),
    sessionId: varchar('session_id', { length: 50 }),
    promptId: uuid('prompt_id'),
    inputData: jsonb('input_data'),
    outputData: jsonb('output_data'),
    model: varchar('model', { length: 100 }),
    tokensUsed: jsonb('tokens_used'),
    latencyMs: jsonb('latency_ms'),
    status: varchar('status', { length: 50 }),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})
