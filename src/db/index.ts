import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// ========================================
// Database URL
// ========================================
const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
    console.warn('[Drizzle] DATABASE_URL is not set. Using fallback Supabase connection.')
}

// ========================================
// PostgreSQL Connection
// ========================================
// Supabase uses connection pooling, so we configure accordingly
const connectionString = databaseUrl || ''

// For query purposes (using connection pool)
const queryClient = postgres(connectionString, {
    max: 1, // Set to 1 for serverless environments
    idle_timeout: 20,
    connect_timeout: 10,
})

// ========================================
// Drizzle ORM Instance
// ========================================
export const db = drizzle(queryClient, { schema })

// ========================================
// Type exports for convenience
// ========================================
export type Database = typeof db
export { schema }

// Re-export commonly used tables for convenience
export {
    organizations,
    profiles,
    children,
    events,
    visits,
    visitPhotos,
    reports,
    lineMessageLogs,
    questionnaireCategories,
    questionnaireItems,
    questionnaireResponses,
    diagnosisCategories,
    diagnosisItems,
    diagnosisResponses,
    aiPrompts,
    aiAnalysisLogs,
} from './schema'
