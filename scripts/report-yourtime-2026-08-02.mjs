import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const { Client } = pg

const EVENT_SLUG = 'yourtime-8th-tokyo-2026'
const DAY_START = '2026-08-01T15:00:00.000Z'
const DAY_END = '2026-08-02T15:00:00.000Z'
const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUTPUT_PATH = path.resolve(
  PROJECT_ROOT,
  'docs/reports/2026-08-02-yourtime-8th-aggregate.json'
)

const abnormalValues = {
  上唇小帯異常: ['yes'],
  上唇翻転: ['yes'],
  '口呼吸・鼻呼吸': ['mouth'],
  口腔周囲筋収縮: ['yes'],
  低位舌: ['yes'],
  口唇閉鎖: ['impossible'],
  ハート舌: ['yes', 'opt_0'],
  舌小帯短縮症: ['yes'],
  舌の動き: ['opt_2'],
  '歯列・咬合': ['opt_1', 'opt_2', 'opt_3', 'opt_4', 'opt_5'],
  足: ['opt_1', 'opt_2', 'opt_3', 'opt_4', 'opt_5'],
  骨盤: ['posterior', 'anterior'],
  軸: ['swayback', 'kyphosis'],
  '軸（左右差）': ['opt_0'],
  頭位: ['forward'],
  下肢: ['bow', 'knock'],
  外反足: ['yes'],
  浮指: ['yes'],
  扁平足: ['yes'],
  外反母趾: ['yes'],
  舌突出癖: ['yes'],
  オトガイ筋収縮: ['yes'],
  目の下のクマ: ['yes'],
  左右差: ['yes'],
  広頚筋緊張: ['yes'],
  扁桃腺肥大: ['degree1', 'degree2', 'degree3'],
  サイズアウト: ['yes'],
  ソールの減り: ['yes'],
}

function asNumber(value) {
  return Number(value ?? 0)
}

function rate(numerator, denominator) {
  return denominator > 0
    ? Number(((numerator / denominator) * 100).toFixed(1))
    : 0
}

function splitStoredValue(value) {
  if (typeof value !== 'string') return [String(value)]
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) {
      return parsed.length > 0 ? parsed.map(String) : ['none_selected']
    }
  } catch {
    // Scalar values are stored as plain strings.
  }
  return [value]
}

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is not available')
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    application_name: 'coralup-cor-11-readonly-report',
  })

  await client.connect()

  try {
    await client.query('BEGIN TRANSACTION READ ONLY')
    await client.query("SET LOCAL statement_timeout = '20s'")

    const eventResult = await client.query(
      `SELECT id, event_id, name, start_date, end_date, status
       FROM events
       WHERE event_id = $1
       LIMIT 1`,
      [EVENT_SLUG]
    )

    if (eventResult.rowCount !== 1) {
      throw new Error(`Event not found: ${EVENT_SLUG}`)
    }

    const event = eventResult.rows[0]
    const scopeParams = [event.start_date, event.end_date]

    const dateReconciliationResult = await client.query(
      `SELECT
         COALESCE(e.event_id, 'NULL') AS event_slug,
         COALESCE(e.name, 'イベント未設定') AS event_name,
         count(*)::int AS total_including_test,
         count(*) FILTER (WHERE NOT (
           COALESCE(v.is_test_data, false) OR COALESCE(c.is_test_data, false)
         ))::int AS real_visits,
         count(DISTINCT v.child_id) FILTER (WHERE
           v.child_id IS NOT NULL
           AND NOT (COALESCE(v.is_test_data, false) OR COALESCE(c.is_test_data, false))
         )::int AS unique_children,
         count(*) FILTER (WHERE
           NOT (COALESCE(v.is_test_data, false) OR COALESCE(c.is_test_data, false))
           AND (
             EXISTS (SELECT 1 FROM diagnoses d WHERE d.visit_id = v.id)
             OR EXISTS (SELECT 1 FROM diagnosis_responses dr WHERE dr.visit_id = v.id)
           )
         )::int AS diagnosed_visits,
         count(*) FILTER (WHERE
           NOT (COALESCE(v.is_test_data, false) OR COALESCE(c.is_test_data, false))
           AND EXISTS (SELECT 1 FROM reports r WHERE r.visit_id = v.id)
         )::int AS report_visits,
         count(*) FILTER (WHERE
           NOT (COALESCE(v.is_test_data, false) OR COALESCE(c.is_test_data, false))
           AND EXISTS (
             SELECT 1 FROM line_message_logs l
             WHERE l.visit_id = v.id AND l.status = 'success'
           )
         )::int AS line_success_visits,
         to_char(min(timezone('Asia/Tokyo', COALESCE(v.visit_date, v.created_at))), 'YYYY-MM-DD HH24:MI') AS first_jst,
         to_char(max(timezone('Asia/Tokyo', COALESCE(v.visit_date, v.created_at))), 'YYYY-MM-DD HH24:MI') AS last_jst
       FROM visits v
       LEFT JOIN events e ON e.id = v.event_id
       LEFT JOIN children c ON c.id = v.child_id
       WHERE COALESCE(v.visit_date, v.created_at) >= $1::timestamptz
         AND COALESCE(v.visit_date, v.created_at) < $2::timestamptz
       GROUP BY COALESCE(e.event_id, 'NULL'), COALESCE(e.name, 'イベント未設定')
       ORDER BY real_visits DESC, event_slug`,
      [DAY_START, DAY_END]
    )

    const columnsResult = await client.query(
      `SELECT table_name, column_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = ANY($1::text[])`,
      [[
        'questionnaires',
        'questionnaire_responses',
        'diagnoses',
        'diagnosis_responses',
        'reports',
        'line_message_logs',
        'ai_analysis_logs',
      ]]
    )
    const columns = new Set(
      columnsResult.rows.map((row) => `${row.table_name}.${row.column_name}`)
    )
    const tables = new Set(columnsResult.rows.map((row) => row.table_name))
    const questionnaireSavedChecks = []
    if (tables.has('questionnaires')) {
      const questionnaireJoin = columns.has('questionnaires.visit_id')
        ? 'q.visit_id = v.id'
        : 'q.session_id = v.session_id'
      questionnaireSavedChecks.push(
        `EXISTS (SELECT 1 FROM questionnaires q WHERE ${questionnaireJoin})`
      )
    }
    if (tables.has('questionnaire_responses')) {
      questionnaireSavedChecks.push(
        'EXISTS (SELECT 1 FROM questionnaire_responses qr WHERE qr.visit_id = v.id)'
      )
    }
    const questionnaireSavedPredicate = questionnaireSavedChecks.length > 0
      ? questionnaireSavedChecks.join(' OR ')
      : 'FALSE'

    const coreResult = await client.query(
      `WITH scoped AS (
         SELECT
           v.id,
           v.session_id,
           v.status,
           v.current_step,
           v.child_age_months,
           v.child_id,
           v.parent_profile_id,
           v.staff_profile_id,
           COALESCE(v.visit_date, v.created_at) AS occurred_at,
           v.report_sent_at,
           v.error_info,
           COALESCE(v.is_test_data, false) OR COALESCE(c.is_test_data, false) AS is_test,
           c.gender
         FROM visits v
         LEFT JOIN children c ON c.id = v.child_id
         WHERE COALESCE(v.visit_date, v.created_at) >= $1::timestamptz
           AND COALESCE(v.visit_date, v.created_at) <= $2::timestamptz
       ), real_visits AS (
         SELECT * FROM scoped WHERE NOT is_test
       )
       SELECT
         (SELECT count(*) FROM scoped) AS total_including_test,
         (SELECT count(*) FROM scoped WHERE is_test) AS test_count,
         count(*) AS total_visits,
         count(DISTINCT child_id) FILTER (WHERE child_id IS NOT NULL) AS unique_children,
         count(DISTINCT parent_profile_id) FILTER (WHERE parent_profile_id IS NOT NULL) AS unique_parents,
         count(DISTINCT staff_profile_id) FILTER (WHERE staff_profile_id IS NOT NULL) AS active_staff,
         count(*) FILTER (WHERE child_id IS NULL) AS missing_child,
         count(*) FILTER (WHERE child_age_months IS NULL OR child_age_months <= 0) AS missing_age,
         count(*) FILTER (WHERE gender IS NULL OR gender NOT IN ('male', 'female')) AS missing_gender,
         count(*) FILTER (WHERE report_sent_at IS NOT NULL) AS report_sent_marker,
         count(*) FILTER (WHERE error_info IS NOT NULL AND error_info <> 'null'::jsonb) AS visits_with_recorded_error
       FROM real_visits`,
      scopeParams
    )

    const core = coreResult.rows[0]
    const totalVisits = asNumber(core.total_visits)

    const eventAttributionResult = await client.query(
      `SELECT
         COALESCE(e.event_id, 'NULL') AS event_slug,
         COALESCE(e.name, 'イベント未設定') AS event_name,
         count(*)::int AS visits
       FROM visits v
       LEFT JOIN events e ON e.id = v.event_id
       LEFT JOIN children c ON c.id = v.child_id
       WHERE COALESCE(v.visit_date, v.created_at) >= $1::timestamptz
         AND COALESCE(v.visit_date, v.created_at) <= $2::timestamptz
         AND NOT (COALESCE(v.is_test_data, false) OR COALESCE(c.is_test_data, false))
       GROUP BY 1, 2
       ORDER BY visits DESC, event_slug`,
      scopeParams
    )

    const distributionResult = await client.query(
      `WITH scoped AS (
         SELECT
           v.id,
           v.status,
           v.current_step,
           v.child_age_months,
           COALESCE(v.visit_date, v.created_at) AS occurred_at,
           c.gender
         FROM visits v
         LEFT JOIN children c ON c.id = v.child_id
         WHERE COALESCE(v.visit_date, v.created_at) >= $1::timestamptz
           AND COALESCE(v.visit_date, v.created_at) <= $2::timestamptz
           AND NOT (COALESCE(v.is_test_data, false) OR COALESCE(c.is_test_data, false))
       )
       SELECT 'status' AS dimension, COALESCE(status, 'unknown') AS bucket, count(*)::int AS count
       FROM scoped GROUP BY COALESCE(status, 'unknown')
       UNION ALL
       SELECT 'step', COALESCE(current_step, 'unknown'), count(*)::int
       FROM scoped GROUP BY COALESCE(current_step, 'unknown')
       UNION ALL
       SELECT 'gender',
         CASE gender WHEN 'male' THEN '男' WHEN 'female' THEN '女' ELSE '不明' END,
         count(*)::int
       FROM scoped GROUP BY CASE gender WHEN 'male' THEN '男' WHEN 'female' THEN '女' ELSE '不明' END
       UNION ALL
       SELECT 'age',
         CASE
           WHEN child_age_months IS NULL OR child_age_months <= 0 THEN '不明'
           WHEN child_age_months < 24 THEN '0-1歳'
           WHEN child_age_months < 48 THEN '2-3歳'
           WHEN child_age_months < 72 THEN '4-5歳'
           WHEN child_age_months < 108 THEN '6-8歳'
           ELSE '9歳以上'
         END,
         count(*)::int
       FROM scoped GROUP BY 2
       UNION ALL
       SELECT 'hour',
         to_char(timezone('Asia/Tokyo', occurred_at), 'HH24') || '時',
         count(*)::int
       FROM scoped GROUP BY 2
       ORDER BY dimension, bucket`,
      scopeParams
    )

    const distributions = {}
    for (const row of distributionResult.rows) {
      distributions[row.dimension] ??= {}
      distributions[row.dimension][row.bucket] = asNumber(row.count)
    }

    const ageStatsResult = await client.query(
      `SELECT
         round(avg(v.child_age_months)::numeric / 12, 1) AS mean_age_years,
         round((percentile_cont(0.5) WITHIN GROUP (ORDER BY v.child_age_months))::numeric / 12, 1) AS median_age_years,
         min(v.child_age_months) AS min_age_months,
         max(v.child_age_months) AS max_age_months
       FROM visits v
       LEFT JOIN children c ON c.id = v.child_id
       WHERE COALESCE(v.visit_date, v.created_at) >= $1::timestamptz
         AND COALESCE(v.visit_date, v.created_at) <= $2::timestamptz
         AND NOT (COALESCE(v.is_test_data, false) OR COALESCE(c.is_test_data, false))
         AND v.child_age_months > 0`,
      scopeParams
    )

    const funnelResult = await client.query(
      `WITH real_visits AS (
         SELECT v.id, v.session_id
         FROM visits v
         LEFT JOIN children c ON c.id = v.child_id
         WHERE COALESCE(v.visit_date, v.created_at) >= $1::timestamptz
           AND COALESCE(v.visit_date, v.created_at) <= $2::timestamptz
           AND NOT (COALESCE(v.is_test_data, false) OR COALESCE(c.is_test_data, false))
       )
       SELECT
         count(*) AS visits,
         count(*) FILTER (WHERE ${questionnaireSavedPredicate}) AS questionnaire_saved,
         count(*) FILTER (WHERE
           EXISTS (SELECT 1 FROM diagnoses d WHERE d.visit_id = v.id)
           OR EXISTS (SELECT 1 FROM diagnosis_responses dr WHERE dr.visit_id = v.id)
         ) AS diagnosis_saved,
         count(*) FILTER (WHERE EXISTS (
           SELECT 1 FROM visit_photos p WHERE p.visit_id = v.id
         )) AS photos_saved,
         count(*) FILTER (WHERE EXISTS (
           SELECT 1 FROM ai_analysis_logs a WHERE a.visit_id = v.id AND a.status = 'success'
         )) AS ai_success,
         count(*) FILTER (WHERE EXISTS (
           SELECT 1 FROM reports r WHERE r.visit_id = v.id
         )) AS report_created,
         count(*) FILTER (WHERE EXISTS (
           SELECT 1 FROM line_message_logs l WHERE l.visit_id = v.id AND l.status = 'success'
         )) AS any_line_success,
         count(*) FILTER (WHERE EXISTS (
           SELECT 1 FROM line_message_logs l WHERE l.visit_id = v.id AND l.status <> 'success'
         )) AS any_line_failure
       FROM real_visits v`,
      scopeParams
    )

    const funnelRow = funnelResult.rows[0]
    const funnel = {}
    for (const [key, raw] of Object.entries(funnelRow)) {
      const count = asNumber(raw)
      funnel[key] = {
        count,
        rate: rate(count, totalVisits),
      }
    }

    const flowStatesResult = await client.query(
      `WITH real_visits AS (
         SELECT
           v.id,
           v.session_id,
           COALESCE(v.status, 'unknown') AS status,
           COALESCE(v.current_step, 'unknown') AS current_step
         FROM visits v
         LEFT JOIN children c ON c.id = v.child_id
         WHERE COALESCE(v.visit_date, v.created_at) >= $1::timestamptz
           AND COALESCE(v.visit_date, v.created_at) <= $2::timestamptz
           AND NOT (COALESCE(v.is_test_data, false) OR COALESCE(c.is_test_data, false))
       ), states AS (
         SELECT
           v.status,
           v.current_step,
           (${questionnaireSavedPredicate}) AS questionnaire_saved,
           (EXISTS (SELECT 1 FROM diagnoses d WHERE d.visit_id = v.id)
             OR EXISTS (SELECT 1 FROM diagnosis_responses dr WHERE dr.visit_id = v.id)) AS diagnosis_saved,
           EXISTS (SELECT 1 FROM visit_photos p WHERE p.visit_id = v.id) AS photos_saved,
           EXISTS (SELECT 1 FROM reports r WHERE r.visit_id = v.id) AS report_created,
           EXISTS (
             SELECT 1 FROM line_message_logs l
             WHERE l.visit_id = v.id AND l.status = 'success'
           ) AS line_success
         FROM real_visits v
       )
       SELECT *, count(*)::int AS visits
       FROM states
       GROUP BY status, current_step, questionnaire_saved, diagnosis_saved,
                photos_saved, report_created, line_success
       ORDER BY visits DESC, status, current_step`,
      scopeParams
    )

    const lineResult = await client.query(
      `SELECT
         COALESCE(l.message_type, 'unknown') AS message_type,
         COALESCE(l.status, 'unknown') AS status,
         count(*)::int AS attempts,
         count(DISTINCT l.visit_id)::int AS visits
       FROM line_message_logs l
       JOIN visits v ON v.id = l.visit_id
       LEFT JOIN children c ON c.id = v.child_id
       WHERE COALESCE(v.visit_date, v.created_at) >= $1::timestamptz
         AND COALESCE(v.visit_date, v.created_at) <= $2::timestamptz
         AND NOT (COALESCE(v.is_test_data, false) OR COALESCE(c.is_test_data, false))
       GROUP BY 1, 2
       ORDER BY 1, 2`,
      scopeParams
    )

    const aiResult = await client.query(
      `SELECT COALESCE(a.status, 'unknown') AS status,
              count(*)::int AS attempts,
              count(DISTINCT a.visit_id)::int AS visits
       FROM ai_analysis_logs a
       JOIN visits v ON v.id = a.visit_id
       LEFT JOIN children c ON c.id = v.child_id
       WHERE COALESCE(v.visit_date, v.created_at) >= $1::timestamptz
         AND COALESCE(v.visit_date, v.created_at) <= $2::timestamptz
         AND NOT (COALESCE(v.is_test_data, false) OR COALESCE(c.is_test_data, false))
       GROUP BY 1 ORDER BY 1`,
      scopeParams
    )

    const integrityResult = await client.query(
      `WITH real_visits AS (
         SELECT v.id, v.child_id, v.parent_profile_id
         FROM visits v
         LEFT JOIN children c ON c.id = v.child_id
         WHERE COALESCE(v.visit_date, v.created_at) >= $1::timestamptz
           AND COALESCE(v.visit_date, v.created_at) <= $2::timestamptz
           AND NOT (COALESCE(v.is_test_data, false) OR COALESCE(c.is_test_data, false))
       ), diagnosis_counts AS (
         SELECT d.visit_id, count(*) AS cnt
         FROM diagnoses d JOIN real_visits v ON v.id = d.visit_id
         GROUP BY d.visit_id
       ), report_counts AS (
         SELECT r.visit_id, count(*) AS cnt
         FROM reports r JOIN real_visits v ON v.id = r.visit_id
         GROUP BY r.visit_id
       )
       SELECT
         (SELECT count(*) FROM diagnosis_counts WHERE cnt > 1) AS visits_with_multiple_diagnoses,
         (SELECT count(*) FROM report_counts WHERE cnt > 1) AS visits_with_multiple_reports,
         (SELECT count(*) FROM real_visits v
           WHERE EXISTS (SELECT 1 FROM diagnoses d WHERE d.visit_id = v.id)
             AND NOT EXISTS (SELECT 1 FROM visit_photos p WHERE p.visit_id = v.id)) AS diagnosed_without_photos,
         (SELECT count(*) FROM real_visits v
           WHERE EXISTS (SELECT 1 FROM reports r WHERE r.visit_id = v.id)
             AND NOT EXISTS (SELECT 1 FROM line_message_logs l WHERE l.visit_id = v.id AND l.status = 'success')) AS report_without_successful_line,
         (SELECT count(*) FROM real_visits v
           WHERE v.child_id IS NOT NULL
             AND EXISTS (
               SELECT 1 FROM visits old
               WHERE old.child_id = v.child_id
                 AND old.id <> v.id
                 AND old.created_at < $1::timestamptz
             )) AS returning_children,
         (SELECT count(*) FROM real_visits v
           WHERE v.parent_profile_id IS NOT NULL
             AND EXISTS (
               SELECT 1 FROM visits old
               WHERE old.parent_profile_id = v.parent_profile_id
                 AND old.id <> v.id
                 AND old.created_at < $1::timestamptz
             )) AS returning_parents
       `,
      scopeParams
    )

    const clinicalResult = await client.query(
      `SELECT
         COALESCE(dc.name, '未分類') AS category,
         di.question,
         di.code,
         di.options,
         dr.value,
         count(DISTINCT dr.visit_id)::int AS visits
       FROM diagnosis_responses dr
       JOIN diagnosis_items di ON di.id = dr.item_id
       LEFT JOIN diagnosis_categories dc ON dc.id = di.category_id
       JOIN visits v ON v.id = dr.visit_id
       LEFT JOIN children c ON c.id = v.child_id
       WHERE COALESCE(v.visit_date, v.created_at) >= $1::timestamptz
         AND COALESCE(v.visit_date, v.created_at) <= $2::timestamptz
         AND NOT (COALESCE(v.is_test_data, false) OR COALESCE(c.is_test_data, false))
       GROUP BY 1, 2, 3, 4, 5
       ORDER BY 1, 2, 5`,
      scopeParams
    )

    const itemMap = new Map()
    for (const row of clinicalResult.rows) {
      const key = `${row.category}\u0000${row.question}`
      if (!itemMap.has(key)) {
        itemMap.set(key, {
          category: row.category,
          question: row.question,
          code: row.code,
          total: 0,
          values: {},
          optionCounts: {},
          options: row.options,
        })
      }
      const item = itemMap.get(key)
      const count = asNumber(row.visits)
      item.total += count
      item.values[row.value] = count
      for (const value of splitStoredValue(row.value)) {
        item.optionCounts[value] = asNumber(item.optionCounts[value]) + count
      }
    }

    const clinicalItems = [...itemMap.values()]
    const topFindings = clinicalItems
      .flatMap((item) => {
        const abnormal = abnormalValues[item.question]
        if (!abnormal) return []
        const count = Object.entries(item.values).reduce(
          (sum, [storedValue, storedCount]) => (
            splitStoredValue(storedValue).some((value) => abnormal.includes(value))
              ? sum + asNumber(storedCount)
              : sum
          ),
          0
        )
        return [{
          category: item.category,
          item: item.question,
          count,
          denominator: item.total,
          rate: rate(count, item.total),
        }]
      })
      .sort((a, b) => b.rate - a.rate || b.count - a.count)

    const questionnaireResult = await client.query(
      `SELECT
         COALESCE(qi.code, qi.question) AS item,
         qi.question,
         qi.options,
         qr.value,
         count(DISTINCT qr.visit_id)::int AS visits
       FROM questionnaire_responses qr
       JOIN questionnaire_items qi ON qi.id = qr.item_id
       JOIN visits v ON v.id = qr.visit_id
       LEFT JOIN children c ON c.id = v.child_id
       WHERE COALESCE(v.visit_date, v.created_at) >= $1::timestamptz
         AND COALESCE(v.visit_date, v.created_at) <= $2::timestamptz
         AND NOT (COALESCE(v.is_test_data, false) OR COALESCE(c.is_test_data, false))
         AND qi.answer_type IN ('radio', 'checkbox', 'select', 'number')
       GROUP BY 1, 2, 3, 4
       ORDER BY 1, 4`,
      scopeParams
    )

    const questionnaireItems = {}
    for (const row of questionnaireResult.rows) {
      questionnaireItems[row.item] ??= {
        question: row.question,
        total: 0,
        values: {},
        optionCounts: {},
        options: row.options,
      }
      const count = asNumber(row.visits)
      questionnaireItems[row.item].total += count
      questionnaireItems[row.item].values[row.value] = count
      for (const value of splitStoredValue(row.value)) {
        questionnaireItems[row.item].optionCounts[value] =
          asNumber(questionnaireItems[row.item].optionCounts[value]) + count
      }
    }

    const incidentResult = await client.query(
      `WITH scoped AS (
         SELECT v.error_info
         FROM visits v
         LEFT JOIN children c ON c.id = v.child_id
         WHERE COALESCE(v.visit_date, v.created_at) >= $1::timestamptz
           AND COALESCE(v.visit_date, v.created_at) <= $2::timestamptz
           AND NOT (COALESCE(v.is_test_data, false) OR COALESCE(c.is_test_data, false))
           AND v.error_info IS NOT NULL
           AND v.error_info <> 'null'::jsonb
       ), expanded AS (
         SELECT CASE
           WHEN jsonb_typeof(scoped.error_info) = 'array' THEN expanded_item.item
           ELSE scoped.error_info
         END AS item
         FROM scoped
         LEFT JOIN LATERAL jsonb_array_elements(
           CASE
             WHEN jsonb_typeof(scoped.error_info) = 'array' THEN scoped.error_info
             ELSE '[]'::jsonb
           END
         ) AS expanded_item(item) ON true
       )
       SELECT COALESCE(item->>'type', 'unknown') AS type, count(*)::int AS count
       FROM expanded
       GROUP BY 1 ORDER BY count DESC, type`,
      scopeParams
    )

    const report = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      source: {
        type: 'production_database_read_only',
        eventSlug: EVENT_SLUG,
        scope: 'official_event_time_window',
        filters: [
          'visit_date or created_at is within the official event start/end time',
          'visits.is_test_data is not true',
          'children.is_test_data is not true',
        ],
        attributionNote: 'Most operational visits were stored under a prior event ID; dateReconciliation preserves that discrepancy.',
        privacy: 'No names, LINE IDs, contact details, free text, image paths, or row IDs are exported.',
      },
      event: {
        eventId: event.event_id,
        name: event.name,
        startDate: event.start_date,
        endDate: event.end_date,
        status: event.status,
      },
      dateReconciliation: {
        jstDate: '2026-08-02',
        groups: dateReconciliationResult.rows.map((row) => ({
          eventSlug: row.event_slug,
          eventName: row.event_name,
          totalIncludingTest: asNumber(row.total_including_test),
          realVisits: asNumber(row.real_visits),
          uniqueChildren: asNumber(row.unique_children),
          diagnosedVisits: asNumber(row.diagnosed_visits),
          reportVisits: asNumber(row.report_visits),
          lineSuccessVisits: asNumber(row.line_success_visits),
          firstJst: row.first_jst,
          lastJst: row.last_jst,
        })),
      },
      overview: {
        totalVisitsIncludingTest: asNumber(core.total_including_test),
        testCount: asNumber(core.test_count),
        totalVisits,
        uniqueChildren: asNumber(core.unique_children),
        uniqueParents: asNumber(core.unique_parents),
        activeStaff: asNumber(core.active_staff),
      },
      eventAttribution: eventAttributionResult.rows.map((row) => ({
        eventSlug: row.event_slug,
        eventName: row.event_name,
        visits: asNumber(row.visits),
      })),
      dataQuality: {
        missingChild: asNumber(core.missing_child),
        missingAge: asNumber(core.missing_age),
        missingGender: asNumber(core.missing_gender),
        reportSentMarker: asNumber(core.report_sent_marker),
        visitsWithRecordedError: asNumber(core.visits_with_recorded_error),
        ...Object.fromEntries(
          Object.entries(integrityResult.rows[0]).map(([key, value]) => [key, asNumber(value)])
        ),
      },
      ageStats: ageStatsResult.rows[0],
      distributions,
      funnel,
      flowStates: flowStatesResult.rows.map((row) => ({
        status: row.status,
        currentStep: row.current_step,
        questionnaireSaved: row.questionnaire_saved,
        diagnosisSaved: row.diagnosis_saved,
        photosSaved: row.photos_saved,
        reportCreated: row.report_created,
        lineSuccess: row.line_success,
        visits: asNumber(row.visits),
      })),
      lineDelivery: lineResult.rows.map((row) => ({
        messageType: row.message_type,
        status: row.status,
        attempts: asNumber(row.attempts),
        visits: asNumber(row.visits),
      })),
      aiAnalysis: aiResult.rows.map((row) => ({
        status: row.status,
        attempts: asNumber(row.attempts),
        visits: asNumber(row.visits),
      })),
      recordedIncidents: incidentResult.rows.map((row) => ({
        type: row.type,
        count: asNumber(row.count),
      })),
      clinical: {
        diagnosisCoverageVisitCount: asNumber(funnelRow.diagnosis_saved),
        topFindings,
        items: clinicalItems,
      },
      questionnaire: {
        normalizedItems: questionnaireItems,
      },
      limitations: [
        'The event report is a screening summary, not a medical diagnosis.',
        'Legacy JSON diagnosis/questionnaire values are counted for funnel coverage but are not expanded into trend distributions.',
        'Runtime 404 incidents and deployment rollback history are not fully represented in visits.error_info.',
        'Rates from small denominators should be treated as descriptive only.',
      ],
    }

    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true })
    fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, {
      encoding: 'utf8',
      mode: 0o600,
    })

    await client.query('ROLLBACK')
    console.log(JSON.stringify({
      ok: true,
      event: EVENT_SLUG,
      output: OUTPUT_PATH,
      totalVisits,
      topFindings: topFindings.slice(0, 5),
    }))
  } catch (error) {
    try {
      await client.query('ROLLBACK')
    } catch {
      // Preserve the original error.
    }
    throw error
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
