import { pgTable, uuid, varchar, text, timestamp, boolean, integer, jsonb } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { events } from './events'
import { profiles, children } from './users'
import { organizations } from './organizations'

// ========================================
// Visits (来場セッション)
// ========================================
export const visits = pgTable('visits', {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: varchar('session_id', { length: 50 }).notNull().unique(),
    organizationId: uuid('organization_id').references(() => organizations.id),
    eventId: uuid('event_id').references(() => events.id),
    childId: uuid('child_id').references(() => children.id),
    parentProfileId: uuid('parent_profile_id').references(() => profiles.id),
    staffProfileId: uuid('staff_profile_id').references(() => profiles.id),
    visitDate: timestamp('visit_date', { withTimezone: true }),
    childAgeMonths: integer('child_age_months'),
    status: varchar('status', { length: 50 }).default('active'),
    currentStep: varchar('current_step', { length: 50 }),
    stepTimestamps: jsonb('step_timestamps'),
    receptionNumber: varchar('reception_number', { length: 20 }),
    lineUserId: varchar('line_user_id', { length: 255 }),
    boothNumber: integer('booth_number'),
    errorInfo: jsonb('error_info'),
    reportSentAt: timestamp('report_sent_at', { withTimezone: true }),
    isTestData: boolean('is_test_data').default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// ========================================
// Visit Photos (写真)
// ========================================
export const visitPhotos = pgTable('visit_photos', {
    id: uuid('id').primaryKey().defaultRandom(),
    visitId: uuid('visit_id').references(() => visits.id, { onDelete: 'cascade' }),
    sessionId: varchar('session_id', { length: 50 }),
    photoType: varchar('photo_type', { length: 50 }),
    storagePath: text('storage_path'),
    publicUrl: text('public_url'),
    metadata: jsonb('metadata'),
    uploadedBy: uuid('uploaded_by').references(() => profiles.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// ========================================
// Reports (AI分析レポート)
// ========================================
export const reports = pgTable('reports', {
    id: uuid('id').primaryKey().defaultRandom(),
    visitId: uuid('visit_id').references(() => visits.id, { onDelete: 'cascade' }),
    sessionId: varchar('session_id', { length: 50 }),
    diagnosisId: uuid('diagnosis_id'), // diagnosisへの参照用
    reportType: varchar('report_type', { length: 50 }),
    status: varchar('status', { length: 50 }), // completed, sent 等
    content: text('content'),
    aiSummary: text('ai_summary'),
    ageConsideration: text('age_consideration'),
    postureAnalysis: jsonb('posture_analysis'),
    oralAnalysis: jsonb('oral_analysis'),
    generatedAt: timestamp('generated_at', { withTimezone: true }),
    sentToLine: boolean('sent_to_line').default(false),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// ========================================
// LINE Message Logs (LINE送信ログ)
// ========================================
export const lineMessageLogs = pgTable('line_message_logs', {
    id: uuid('id').primaryKey().defaultRandom(),
    visitId: uuid('visit_id').references(() => visits.id),
    sessionId: varchar('session_id', { length: 50 }),
    lineUserId: varchar('line_user_id', { length: 255 }),
    messageType: varchar('message_type', { length: 50 }),
    messageContent: text('message_content'),
    status: varchar('status', { length: 50 }),
    response: jsonb('response'),
    errorMessage: text('error_message'),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    staffConfirmationStatus: varchar('staff_confirmation_status', { length: 50 }),
    staffConfirmedAt: timestamp('staff_confirmed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// ========================================
// Relations
// ========================================
export const visitsRelations = relations(visits, ({ one, many }) => ({
    organization: one(organizations, {
        fields: [visits.organizationId],
        references: [organizations.id],
    }),
    event: one(events, {
        fields: [visits.eventId],
        references: [events.id],
    }),
    child: one(children, {
        fields: [visits.childId],
        references: [children.id],
    }),
    parentProfile: one(profiles, {
        fields: [visits.parentProfileId],
        references: [profiles.id],
        relationName: 'parentVisits',
    }),
    staffProfile: one(profiles, {
        fields: [visits.staffProfileId],
        references: [profiles.id],
        relationName: 'staffVisits',
    }),
    photos: many(visitPhotos),
    reports: many(reports),
    lineMessageLogs: many(lineMessageLogs),
}))

export const visitPhotosRelations = relations(visitPhotos, ({ one }) => ({
    visit: one(visits, {
        fields: [visitPhotos.visitId],
        references: [visits.id],
    }),
}))

export const reportsRelations = relations(reports, ({ one }) => ({
    visit: one(visits, {
        fields: [reports.visitId],
        references: [visits.id],
    }),
}))

export const lineMessageLogsRelations = relations(lineMessageLogs, ({ one }) => ({
    visit: one(visits, {
        fields: [lineMessageLogs.visitId],
        references: [visits.id],
    }),
}))
