import { pgTable, uuid, varchar, text, timestamp, boolean, integer, jsonb, unique } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { profiles } from './users'

// ========================================
// Events (イベント)
// ========================================
export const events = pgTable('events', {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: varchar('event_id', { length: 50 }).notNull().unique(),
    name: varchar('name', { length: 200 }).notNull(),
    description: text('description'),
    startDate: timestamp('start_date', { withTimezone: true }),
    endDate: timestamp('end_date', { withTimezone: true }),
    venue: varchar('venue', { length: 200 }),
    status: varchar('status', { length: 20 }).default('draft'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// ========================================
// Event Staffs (イベント×スタッフ 紐付け)
// ========================================
export const eventStaffs = pgTable('event_staffs', {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id').references(() => events.id, { onDelete: 'cascade' }).notNull(),
    profileId: uuid('profile_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull(),
    role: varchar('role', { length: 50 }).default('staff'),       // staff, lead, admin 等
    boothNumber: integer('booth_number'),                          // そのイベントでのブース番号
    status: varchar('status', { length: 20 }).default('confirmed'), // confirmed, pending, cancelled
    notes: text('notes'),                                          // メモ（自由記述）
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => [
    unique('event_staffs_event_profile_unique').on(t.eventId, t.profileId),
])

// ========================================
// Relations
// ========================================
export const eventsRelations = relations(events, ({ many }) => ({
    eventStaffs: many(eventStaffs),
}))

export const eventStaffsRelations = relations(eventStaffs, ({ one }) => ({
    event: one(events, {
        fields: [eventStaffs.eventId],
        references: [events.id],
    }),
    profile: one(profiles, {
        fields: [eventStaffs.profileId],
        references: [profiles.id],
    }),
}))
