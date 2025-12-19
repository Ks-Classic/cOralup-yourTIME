import { pgTable, uuid, varchar, text, timestamp, boolean, integer, jsonb } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ========================================
// Events (イベント)
// ========================================
export const events = pgTable('events', {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: varchar('event_id', { length: 50 }).notNull(),
    name: varchar('name', { length: 200 }).notNull(),
    description: text('description'),
    startDate: timestamp('start_date', { withTimezone: true }),
    endDate: timestamp('end_date', { withTimezone: true }),
    venue: varchar('venue', { length: 200 }),
    status: varchar('status', { length: 20 }).default('draft'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})
