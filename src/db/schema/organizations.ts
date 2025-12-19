import { pgTable, uuid, varchar, text, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core'

export const organizations = pgTable('organizations', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 200 }).notNull(),
    type: varchar('type', { length: 20 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('active'),
    address: text('address'),
    phone: varchar('phone', { length: 20 }),
    email: varchar('email', { length: 255 }),
    settings: jsonb('settings'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})
