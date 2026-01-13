import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// ========================================
// Database URL
// ========================================
// Prefer direct connection for Drizzle ORM (non-pooled, port 5432)
// Fall back to pooler connection (port 6543) if not available
const databaseUrl = process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL

if (!databaseUrl) {
    console.warn('[Drizzle] DATABASE_URL is not set.')
}

// ========================================
// PostgreSQL Connection
// ========================================
// Supabase uses connection pooling, so we configure accordingly
const connectionString = databaseUrl || ''

// For query purposes (using connection pool)
// Note: prepare: false is required for Supabase Transaction mode (port 6543)
const queryClient = postgres(connectionString, {
    max: 1, // Set to 1 for serverless environments
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false, // Required for Supabase pooler
    // Force IPv4 to avoid ENETUNREACH errors in WSL/local environments
    ...(process.env.NODE_ENV === 'development' && { ssl: 'require' }),
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
    questionnaires,
    diagnosisCategories,
    diagnosisItems,
    diagnosisResponses,
    diagnoses,
    aiPrompts,
    aiAnalysisLogs,
} from './schema'

// Re-export drizzle-orm operators for convenience
export { eq, ne, gt, gte, lt, lte, like, ilike, and, or, not, inArray, isNull, isNotNull, sql, asc, desc } from 'drizzle-orm'
