import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const { Client } = pg

const CORRECTION_ID = 'COR-12'
const CORRECTION_MARKER = '2026-08-03T11:25:09.841Z'
const OLD_EVENT_SLUG = 'oizumigakuen-yourtime-2026'
const NEW_EVENT_SLUG = 'yourtime-8th-tokyo-2026'
const EXPECTED_TARGET_COUNT = 29

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BACKUP_PATH = path.join(
  PROJECT_ROOT,
  'docs/reports/2026-08-03-yourtime-event-id-correction-backup.tmp'
)
const REPORT_PATH = path.join(
  PROJECT_ROOT,
  'docs/reports/2026-08-03-yourtime-event-id-correction.json'
)

function asNumber(value) {
  return Number(value ?? 0)
}

async function createClient() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL is not available')

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    application_name: 'coralup-cor-12-event-id-correction',
  })
  await client.connect()
  return client
}

async function getEvents(client) {
  const result = await client.query(
    `SELECT id, event_id, name, start_date, end_date, status
     FROM events
     WHERE event_id = ANY($1::text[])
     ORDER BY event_id`,
    [[OLD_EVENT_SLUG, NEW_EVENT_SLUG]]
  )
  if (result.rowCount !== 2) {
    throw new Error(`Expected 2 events, found ${result.rowCount}`)
  }

  const oldEvent = result.rows.find((row) => row.event_id === OLD_EVENT_SLUG)
  const newEvent = result.rows.find((row) => row.event_id === NEW_EVENT_SLUG)
  if (!oldEvent || !newEvent || !newEvent.start_date || !newEvent.end_date) {
    throw new Error('Required event records or official event time are missing')
  }
  return { oldEvent, newEvent }
}

async function getTargetRows(client, oldEvent, newEvent, lock = false) {
  const result = await client.query(
    `SELECT v.id, v.updated_at
     FROM visits v
     WHERE v.event_id = $1
       AND COALESCE(v.visit_date, v.created_at) >= $2::timestamptz
       AND COALESCE(v.visit_date, v.created_at) <= $3::timestamptz
       AND NOT COALESCE(v.is_test_data, false)
       AND NOT EXISTS (
         SELECT 1 FROM children c
         WHERE c.id = v.child_id AND COALESCE(c.is_test_data, false)
       )
     ORDER BY v.id
     ${lock ? 'FOR UPDATE' : ''}`,
    [oldEvent.id, newEvent.start_date, newEvent.end_date]
  )
  return result.rows
}

async function getMetrics(client, ids) {
  if (ids.length === 0) {
    return {
      visits: 0,
      questionnaireVisits: 0,
      diagnosisVisits: 0,
      photoVisits: 0,
      reportVisits: 0,
      lineSuccessVisits: 0,
    }
  }

  const result = await client.query(
    `SELECT
       count(*)::int AS visits,
       count(*) FILTER (WHERE EXISTS (
         SELECT 1 FROM questionnaire_responses q WHERE q.visit_id = v.id
       ))::int AS questionnaire_visits,
       count(*) FILTER (WHERE
         EXISTS (SELECT 1 FROM diagnoses d WHERE d.visit_id = v.id)
         OR EXISTS (SELECT 1 FROM diagnosis_responses dr WHERE dr.visit_id = v.id)
       )::int AS diagnosis_visits,
       count(*) FILTER (WHERE EXISTS (
         SELECT 1 FROM visit_photos p WHERE p.visit_id = v.id
       ))::int AS photo_visits,
       count(*) FILTER (WHERE EXISTS (
         SELECT 1 FROM reports r WHERE r.visit_id = v.id
       ))::int AS report_visits,
       count(*) FILTER (WHERE EXISTS (
         SELECT 1 FROM line_message_logs l
         WHERE l.visit_id = v.id AND l.status = 'success'
       ))::int AS line_success_visits
     FROM visits v
     WHERE v.id = ANY($1::uuid[])`,
    [ids]
  )
  const row = result.rows[0]
  return {
    visits: asNumber(row.visits),
    questionnaireVisits: asNumber(row.questionnaire_visits),
    diagnosisVisits: asNumber(row.diagnosis_visits),
    photoVisits: asNumber(row.photo_visits),
    reportVisits: asNumber(row.report_visits),
    lineSuccessVisits: asNumber(row.line_success_visits),
  }
}

async function getAttribution(client, newEvent) {
  const result = await client.query(
    `SELECT
       COALESCE(e.event_id, 'NULL') AS event_slug,
       count(*)::int AS visits
     FROM visits v
     LEFT JOIN events e ON e.id = v.event_id
     LEFT JOIN children c ON c.id = v.child_id
     WHERE COALESCE(v.visit_date, v.created_at) >= $1::timestamptz
       AND COALESCE(v.visit_date, v.created_at) <= $2::timestamptz
       AND NOT (COALESCE(v.is_test_data, false) OR COALESCE(c.is_test_data, false))
     GROUP BY COALESCE(e.event_id, 'NULL')
     ORDER BY visits DESC, event_slug`,
    [newEvent.start_date, newEvent.end_date]
  )
  return result.rows.map((row) => ({
    eventSlug: row.event_slug,
    visits: asNumber(row.visits),
  }))
}

function backupHash(content) {
  return crypto.createHash('sha256').update(content).digest('hex')
}

async function plan() {
  const client = await createClient()
  try {
    await client.query('BEGIN TRANSACTION READ ONLY')
    await client.query("SET LOCAL statement_timeout = '20s'")
    const { oldEvent, newEvent } = await getEvents(client)
    const rows = await getTargetRows(client, oldEvent, newEvent)
    const ids = rows.map((row) => row.id)
    const metrics = await getMetrics(client, ids)
    const attribution = await getAttribution(client, newEvent)
    await client.query('ROLLBACK')

    console.log(JSON.stringify({
      mode: 'plan',
      targetCount: rows.length,
      expectedTargetCount: EXPECTED_TARGET_COUNT,
      metrics,
      attribution,
      canApply: rows.length === EXPECTED_TARGET_COUNT,
    }))
  } finally {
    await client.end()
  }
}

async function applyCorrection() {
  const client = await createClient()
  let committed = false
  let backupContent = ''
  let report

  try {
    await client.query('BEGIN')
    await client.query("SET LOCAL lock_timeout = '5s'")
    await client.query("SET LOCAL statement_timeout = '20s'")

    const { oldEvent, newEvent } = await getEvents(client)
    const rows = await getTargetRows(client, oldEvent, newEvent, true)
    if (rows.length !== EXPECTED_TARGET_COUNT) {
      throw new Error(
        `Target count changed: expected ${EXPECTED_TARGET_COUNT}, found ${rows.length}`
      )
    }

    const ids = rows.map((row) => row.id)
    const beforeMetrics = await getMetrics(client, ids)
    const beforeAttribution = await getAttribution(client, newEvent)
    if (beforeMetrics.visits !== EXPECTED_TARGET_COUNT) {
      throw new Error('Target metrics do not match locked visit count')
    }

    const backup = {
      schemaVersion: 1,
      correctionId: CORRECTION_ID,
      correctionMarker: CORRECTION_MARKER,
      oldEventId: oldEvent.id,
      oldEventSlug: oldEvent.event_id,
      newEventId: newEvent.id,
      newEventSlug: newEvent.event_id,
      rows: rows.map((row) => ({
        visit_id: row.id,
        previous_updated_at: row.updated_at,
      })),
    }
    backupContent = `${JSON.stringify(backup, null, 2)}\n`
    fs.writeFileSync(BACKUP_PATH, backupContent, {
      encoding: 'utf8',
      mode: 0o600,
    })

    const updateResult = await client.query(
      `UPDATE visits
       SET event_id = $1
       WHERE id = ANY($2::uuid[])
         AND event_id = $3
       RETURNING id`,
      [newEvent.id, ids, oldEvent.id]
    )
    if (updateResult.rowCount !== EXPECTED_TARGET_COUNT) {
      throw new Error(
        `Updated row count mismatch: expected ${EXPECTED_TARGET_COUNT}, found ${updateResult.rowCount}`
      )
    }

    const afterMetrics = await getMetrics(client, ids)
    if (JSON.stringify(afterMetrics) !== JSON.stringify(beforeMetrics)) {
      throw new Error('Related questionnaire/diagnosis/photo/report/LINE metrics changed')
    }

    const oldRowsRemaining = await getTargetRows(client, oldEvent, newEvent)
    if (oldRowsRemaining.length !== 0) {
      throw new Error(`Old event rows remain in event window: ${oldRowsRemaining.length}`)
    }

    const correctedRowsResult = await client.query(
      `SELECT id, updated_at
       FROM visits
       WHERE id = ANY($1::uuid[]) AND event_id = $2
       ORDER BY id`,
      [ids, newEvent.id]
    )
    if (correctedRowsResult.rowCount !== EXPECTED_TARGET_COUNT) {
      throw new Error('Corrected row verification count mismatch')
    }

    const correctedUpdatedAt = new Map(
      correctedRowsResult.rows.map((row) => [row.id, row.updated_at])
    )
    backup.rows = backup.rows.map((row) => ({
      ...row,
      corrected_updated_at: correctedUpdatedAt.get(row.visit_id),
    }))
    backupContent = `${JSON.stringify(backup, null, 2)}\n`
    fs.writeFileSync(BACKUP_PATH, backupContent, {
      encoding: 'utf8',
      mode: 0o600,
    })

    const afterAttribution = await getAttribution(client, newEvent)
    if (
      afterAttribution.length !== 1
      || afterAttribution[0].eventSlug !== NEW_EVENT_SLUG
      || afterAttribution[0].visits !== 30
    ) {
      throw new Error(`Unexpected post-update attribution: ${JSON.stringify(afterAttribution)}`)
    }

    await client.query('COMMIT')
    committed = true

    report = {
      schemaVersion: 1,
      correctionId: CORRECTION_ID,
      status: 'applied',
      appliedAt: new Date().toISOString(),
      correctionMarker: CORRECTION_MARKER,
      oldEventSlug: OLD_EVENT_SLUG,
      newEventSlug: NEW_EVENT_SLUG,
      updatedVisits: EXPECTED_TARGET_COUNT,
      beforeMetrics,
      afterMetrics,
      beforeAttribution,
      afterAttribution,
      backup: {
        path: path.relative(PROJECT_ROOT, BACKUP_PATH),
        sha256: backupHash(backupContent),
        containsPii: false,
        gitIgnored: true,
      },
      rollback: {
        command: 'node scripts/fix-yourtime-2026-08-02-event-id.mjs rollback',
        expectedRows: EXPECTED_TARGET_COUNT,
      },
    }
    fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, {
      encoding: 'utf8',
      mode: 0o600,
    })

    console.log(JSON.stringify({
      mode: 'apply',
      status: 'applied',
      updatedVisits: EXPECTED_TARGET_COUNT,
      beforeAttribution,
      afterAttribution,
      reportPath: REPORT_PATH,
    }))
  } catch (error) {
    if (!committed) {
      try {
        await client.query('ROLLBACK')
      } catch {
        // Preserve the original error.
      }
    }
    throw error
  } finally {
    await client.end()
  }
}

async function rollbackCorrection() {
  if (!fs.existsSync(BACKUP_PATH)) {
    throw new Error(`Rollback backup not found: ${BACKUP_PATH}`)
  }
  const backupContent = fs.readFileSync(BACKUP_PATH, 'utf8')
  const backup = JSON.parse(backupContent)
  if (
    backup.correctionId !== CORRECTION_ID
    || backup.correctionMarker !== CORRECTION_MARKER
    || !Array.isArray(backup.rows)
    || backup.rows.length !== EXPECTED_TARGET_COUNT
  ) {
    throw new Error('Rollback backup validation failed')
  }

  const client = await createClient()
  let committed = false
  try {
    await client.query('BEGIN')
    await client.query("SET LOCAL lock_timeout = '5s'")
    await client.query("SET LOCAL statement_timeout = '20s'")

    const ids = backup.rows.map((row) => row.visit_id)
    const lockResult = await client.query(
      `SELECT v.id
       FROM visits v
       JOIN jsonb_to_recordset($1::jsonb)
         AS restored(visit_id uuid, corrected_updated_at timestamptz)
         ON restored.visit_id = v.id
       WHERE v.event_id = $2
         AND v.updated_at = restored.corrected_updated_at
       ORDER BY v.id
       FOR UPDATE OF v`,
      [JSON.stringify(backup.rows), backup.newEventId]
    )
    if (lockResult.rowCount !== EXPECTED_TARGET_COUNT) {
      throw new Error(
        `Rollback target count mismatch: expected ${EXPECTED_TARGET_COUNT}, found ${lockResult.rowCount}`
      )
    }

    const updateResult = await client.query(
      `UPDATE visits v
       SET event_id = $1,
           updated_at = restored.previous_updated_at
       FROM jsonb_to_recordset($2::jsonb)
         AS restored(
           visit_id uuid,
           previous_updated_at timestamptz,
           corrected_updated_at timestamptz
         )
       WHERE v.id = restored.visit_id
         AND v.event_id = $3
         AND v.updated_at = restored.corrected_updated_at
       RETURNING v.id`,
      [backup.oldEventId, JSON.stringify(backup.rows), backup.newEventId]
    )
    if (updateResult.rowCount !== EXPECTED_TARGET_COUNT) {
      throw new Error('Rollback update row count mismatch')
    }

    await client.query('COMMIT')
    committed = true
    console.log(JSON.stringify({
      mode: 'rollback',
      status: 'rolled_back',
      restoredVisits: EXPECTED_TARGET_COUNT,
    }))
  } catch (error) {
    if (!committed) {
      try {
        await client.query('ROLLBACK')
      } catch {
        // Preserve the original error.
      }
    }
    throw error
  } finally {
    await client.end()
  }
}

const mode = process.argv[2] ?? 'plan'
const actions = {
  plan,
  apply: applyCorrection,
  rollback: rollbackCorrection,
}

if (!actions[mode]) {
  console.error('Usage: node scripts/fix-yourtime-2026-08-02-event-id.mjs [plan|apply|rollback]')
  process.exitCode = 2
} else {
  actions[mode]().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
