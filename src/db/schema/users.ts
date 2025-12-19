import { pgTable, uuid, varchar, text, timestamp, boolean, jsonb, date, integer } from 'drizzle-orm/pg-core'
import { organizations } from './organizations'
import { relations } from 'drizzle-orm'

// ========================================
// Profiles (保護者・スタッフ)
// ========================================
export const profiles = pgTable('profiles', {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').references(() => organizations.id),
    lineUserId: varchar('line_user_id', { length: 255 }),
    email: varchar('email', { length: 255 }),
    lastName: varchar('last_name', { length: 50 }),
    firstName: varchar('first_name', { length: 50 }),
    lastNameKana: varchar('last_name_kana', { length: 50 }),
    firstNameKana: varchar('first_name_kana', { length: 50 }),
    displayName: varchar('display_name', { length: 100 }),
    avatarUrl: text('avatar_url'),
    phoneNumber: varchar('phone_number', { length: 20 }),
    prefecture: varchar('prefecture', { length: 50 }),
    role: varchar('role', { length: 20 }).notNull().default('parent'),
    secondaryRole: varchar('secondary_role', { length: 20 }),
    isActive: boolean('is_active').default(true),
    lastActivityAt: timestamp('last_activity_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// ========================================
// Children (お子様)
// ========================================
export const children = pgTable('children', {
    id: uuid('id').primaryKey().defaultRandom(),
    parentProfileId: uuid('parent_profile_id').references(() => profiles.id),
    firstName: varchar('first_name', { length: 50 }),
    lastName: varchar('last_name', { length: 50 }),
    firstNameKana: varchar('first_name_kana', { length: 50 }),
    lastNameKana: varchar('last_name_kana', { length: 50 }),
    birthday: date('birthday'),
    gender: varchar('gender', { length: 10 }),
    nickname: varchar('nickname', { length: 50 }),
    notes: text('notes'),
    isTestData: boolean('is_test_data').default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// ========================================
// Relations
// ========================================
export const profilesRelations = relations(profiles, ({ one, many }) => ({
    organization: one(organizations, {
        fields: [profiles.organizationId],
        references: [organizations.id],
    }),
    children: many(children),
}))

export const childrenRelations = relations(children, ({ one }) => ({
    parent: one(profiles, {
        fields: [children.parentProfileId],
        references: [profiles.id],
    }),
}))
