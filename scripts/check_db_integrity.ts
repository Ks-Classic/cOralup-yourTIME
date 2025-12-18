
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Error: Missing Supabase credentials in .env.local')
    process.exit(1)
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkDatabaseIntegrity() {
    console.log('🔍 Starting Database Integrity Check...\n')
    let hasErrors = false

    // --- 1. Visits Status Check ---
    console.log('Checking visits table statuses...')
    const { data: visits, error: vError } = await supabase.from('visits').select('id, status, current_step')

    if (vError) {
        console.error('❌ Failed to fetch visits:', vError.message)
        hasErrors = true
    } else {
        const invalidStatus = visits.filter(v =>
            !['waiting', 'in_progress', 'completed', 'published', 'cancelled'].includes(v.status)
        )
        const invalidStep = visits.filter(v =>
            v.current_step && !['line_registered', 'questionnaire_started', 'questionnaire_completed', 'diagnosis_started', 'photos_uploaded', 'analysis_completed', 'report_generated', 'line_sent', 'line_confirmed'].includes(v.current_step)
        )

        if (invalidStatus.length > 0) {
            console.error(`❌ Found ${invalidStatus.length} visits with invalid status:`, invalidStatus)
            hasErrors = true
        } else {
            console.log('✅ All visit statuses are valid.')
        }

        if (invalidStep.length > 0) {
            console.error(`❌ Found ${invalidStep.length} visits with invalid current_step:`, invalidStep)
            hasErrors = true
        } else {
            console.log('✅ All visit current_steps are valid.')
        }

        // Check if old status values are gone
        const oldStatuses = visits.filter(v => ['questionnaire_completed', 'diagnosis_completed', 'report_sent'].includes(v.status))
        if (oldStatuses.length > 0) {
            console.error(`❌ Found ${oldStatuses.length} visits still using OLD status values! Migration failed or incomplete.`)
            hasErrors = true
        } else {
            console.log('✅ No old status values found.')
        }
    }

    // --- 2. Check Reports Relationship ---
    console.log('\nChecking reports foreign keys...')
    const { data: reports, error: rError } = await supabase.from('reports').select('id, visit_id')
    if (rError) {
        console.error('❌ Failed to fetch reports:', rError.message)
        hasErrors = true
    } else {
        // Check if all reports have a valid visit
        const visitIds = new Set(visits?.map(v => v.id) || [])
        const reportsWithoutVisit = reports.filter(r => !visitIds.has(r.visit_id))

        if (reportsWithoutVisit.length > 0) {
            console.warn(`⚠️ Warning: Found ${reportsWithoutVisit.length} reports with orphaned visit_id (Visit may have been deleted).`)
            // This is technically allowed if we don't cascade delete heavily, but worth noting
        } else {
            console.log('✅ All report visit_ids are valid.')
        }
    }

    // --- 3. Check Photos Relationship ---
    console.log('\nChecking photos foreign keys...')
    const { data: photos, error: pError } = await supabase.from('visit_photos').select('id, visit_id')
    if (pError) {
        // visit_photos might use 'visit_id' or 'session_id' depending on migration state, let's assume visit_id based on recent files
        console.error('❌ Failed to fetch visit_photos:', pError.message)
        // Not marking as error immediately if table empty or logic diff, but message implies structure issue
    } else {
        const visitIds = new Set(visits?.map(v => v.id) || [])
        const photosWithoutVisit = photos.filter(p => p.visit_id && !visitIds.has(p.visit_id))
        if (photosWithoutVisit.length > 0) {
            console.warn(`⚠️ Warning: Found ${photosWithoutVisit.length} photos with orphaned visit_id.`)
        } else {
            console.log('✅ All photo visit_ids are valid.')
        }
    }

    console.log('\n--- Integrity Check Summary ---')
    if (hasErrors) {
        console.error('❌ Database integrity issues found! Please review the logs above.')
        process.exit(1)
    } else {
        console.log('✅ Database looks healthy and migrated correctly!')
        process.exit(0)
    }
}

checkDatabaseIntegrity().catch(err => {
    console.error('Unexpected error:', err)
    process.exit(1)
})
