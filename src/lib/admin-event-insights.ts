import 'server-only'

import { db } from '@/db'
import {
  children,
  diagnosisCategories,
  diagnosisItems,
  diagnosisResponses,
  diagnoses,
  events as eventTable,
  profiles,
  questionnaireCategories,
  questionnaireItems,
  questionnaireResponses,
  questionnaires,
  reports,
  visits,
} from '@/db/schema'
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNull,
  notInArray,
  or,
  sql,
} from 'drizzle-orm'
import {
  EVENT_INSIGHT_EXCLUDED_VISIT_IDS,
  addLegacyResponse,
  ageBucket,
  buildItemDistributions,
  countDistribution,
  durationBucket,
  elapsedMinutes,
  getStepTimestamp,
  groupResponses,
  hasKnownTestIdentity,
  isOutsideEventHours,
  isWithinEventDate,
  halfHourBucket,
  type ResponseRow,
} from '@/lib/event-insights'
import type {
  EventInsightEvent,
  EventInsightRecord,
  EventInsightsResponse,
  InsightResponse,
} from '@/types/event-insights'

const GENDER_LABELS = ['男の子', '女の子', 'その他・未回答']
const SIBLING_LABELS = ['単独来場', '兄弟姉妹で来場']
const DURATION_LABELS = ['10分未満', '10〜19分', '20〜29分', '30〜44分', '45分以上']

function realDataPredicate() {
  return and(
    or(eq(visits.isTestData, false), isNull(visits.isTestData)),
    or(eq(children.isTestData, false), isNull(children.isTestData)),
    notInArray(visits.id, [...EVENT_INSIGHT_EXCLUDED_VISIT_IDS])
  )
}

function isTestRecord(visit: {
  id: string
  isTestData: boolean | null
  childIsTestData: boolean | null
  childFirstName: string | null
  childLastName: string | null
  childNickname: string | null
  parentFirstName: string | null
  parentLastName: string | null
  parentDisplayName: string | null
  parentRole: string | null
  lineUserId: string | null
  parentLineUserId: string | null
  diagnosisStartedAt: Date | null
}, knownTestLineIds: Set<string>, event: EventInsightEvent): boolean {
  const lineUserId = visit.lineUserId ?? visit.parentLineUserId
  return Boolean(visit.isTestData || visit.childIsTestData)
    || EVENT_INSIGHT_EXCLUDED_VISIT_IDS.includes(visit.id as typeof EVENT_INSIGHT_EXCLUDED_VISIT_IDS[number])
    || hasKnownTestIdentity(
      visit.childFirstName,
      visit.childLastName,
      visit.childNickname,
      visit.parentFirstName,
      visit.parentLastName,
      visit.parentDisplayName,
      lineUserId
    )
    || Boolean(visit.parentRole && ['staff', 'admin'].includes(visit.parentRole)
      && isOutsideEventHours(visit.diagnosisStartedAt, event.startDate, event.endDate))
    || Boolean(lineUserId && knownTestLineIds.has(lineUserId))
    || isOutsideEventHours(visit.diagnosisStartedAt, event.startDate, event.endDate)
}

function eventToJson(row: {
  id: string
  eventKey: string
  name: string
  startDate: Date | null
  endDate: Date | null
  venue: string | null
  visitCount: number | string
}): EventInsightEvent {
  return {
    id: row.id,
    eventKey: row.eventKey,
    name: row.name,
    startDate: row.startDate?.toISOString() ?? null,
    endDate: row.endDate?.toISOString() ?? null,
    venue: row.venue,
    visitCount: Number(row.visitCount),
  }
}

function normalizedGender(value: string | null): EventInsightRecord['gender'] {
  if (value === 'male' || value === 'female') return value
  if (value) return 'other'
  return 'unknown'
}

function genderLabel(value: EventInsightRecord['gender']): string {
  if (value === 'male') return '男の子'
  if (value === 'female') return '女の子'
  return 'その他・未回答'
}

function recordReference(receptionNumber: string | null, index: number): string {
  return receptionNumber ? `受付 ${receptionNumber}` : `来場 ${String(index + 1).padStart(2, '0')}`
}

export async function loadEventInsights(eventKey?: string | null): Promise<EventInsightsResponse | null> {
  const eventRows = await db
    .select({
      id: eventTable.id,
      eventKey: eventTable.eventId,
      name: eventTable.name,
      startDate: eventTable.startDate,
      endDate: eventTable.endDate,
      venue: eventTable.venue,
      visitCount: sql<number>`count(${visits.id})`,
    })
    .from(eventTable)
    .leftJoin(visits, eq(visits.eventId, eventTable.id))
    .leftJoin(children, eq(children.id, visits.childId))
    .where(realDataPredicate())
    .groupBy(eventTable.id)
    .orderBy(desc(eventTable.startDate), desc(eventTable.createdAt))

  const eventList = eventRows.map(eventToJson)
  const selectedEvent = eventKey
    ? eventList.find((event) => event.eventKey === eventKey)
    : eventList.find((event) => event.visitCount > 0)
  if (!selectedEvent) return null

  const visitRows = await db
    .select({
      id: visits.id,
      eventId: visits.eventId,
      sessionId: visits.sessionId,
      receptionNumber: visits.receptionNumber,
      visitDate: visits.visitDate,
      createdAt: visits.createdAt,
      ageMonths: visits.childAgeMonths,
      status: visits.status,
      currentStep: visits.currentStep,
      stepTimestamps: visits.stepTimestamps,
      diagnosisStartedAt: sql<Date | null>`(${visits.stepTimestamps} ->> 'diagnosis_started')::timestamptz`,
      isTestData: visits.isTestData,
      lineUserId: visits.lineUserId,
      visitParentId: visits.parentProfileId,
      childGender: children.gender,
      childParentId: children.parentProfileId,
      childIsTestData: children.isTestData,
      childFirstName: children.firstName,
      childLastName: children.lastName,
      childNickname: children.nickname,
      parentFirstName: profiles.firstName,
      parentLastName: profiles.lastName,
      parentDisplayName: profiles.displayName,
      parentLineUserId: profiles.lineUserId,
      parentRole: profiles.role,
    })
    .from(visits)
    .leftJoin(children, eq(children.id, visits.childId))
    .leftJoin(profiles, eq(profiles.id, visits.parentProfileId))
    .where(realDataPredicate())
    .orderBy(asc(sql`coalesce(${visits.visitDate}, ${visits.createdAt})`))

  const dateMatchedVisits = visitRows.filter((visit) => isWithinEventDate(
    visit.diagnosisStartedAt,
    selectedEvent.startDate,
    selectedEvent.endDate
  ))
  const eventCandidates = dateMatchedVisits.length > 0
    ? dateMatchedVisits
    : visitRows.filter((visit) => visit.eventId === selectedEvent.id)
  const knownTestLineIds = new Set(eventCandidates.flatMap((visit) => {
    const lineUserId = visit.lineUserId ?? visit.parentLineUserId
    const marked = hasKnownTestIdentity(
      visit.childFirstName,
      visit.childLastName,
      visit.childNickname,
      visit.parentFirstName,
      visit.parentLastName,
      visit.parentDisplayName,
      lineUserId
    )
    return marked && lineUserId ? [lineUserId] : []
  }))
  const realVisitRows = eventCandidates.filter((visit) => !isTestRecord(visit, knownTestLineIds, selectedEvent))

  const visitIds = realVisitRows.map((visit) => visit.id)
  const sessionIds = realVisitRows.map((visit) => visit.sessionId)
  const sessionToVisit = new Map(realVisitRows.map((visit) => [visit.sessionId, visit.id]))

  const legacyTableRows = await db.execute<{ tableName: string }>(sql`
    select table_name as "tableName"
    from information_schema.tables
    where table_schema = 'public'
      and table_name in ('questionnaires', 'diagnoses')
  `)
  const legacyTables = new Set(legacyTableRows.map((row) => row.tableName))

  const [questionnaireRows, diagnosisRows, legacyQuestionnaires, legacyDiagnoses, reportRows] = visitIds.length === 0
    ? [[], [], [], [], []] as const
    : await Promise.all([
      db.select({
        id: questionnaireResponses.id,
        visitId: questionnaireResponses.visitId,
        sessionId: questionnaireResponses.sessionId,
        category: questionnaireCategories.name,
        itemId: questionnaireItems.id,
        label: questionnaireItems.question,
        value: questionnaireResponses.value,
        options: questionnaireItems.options,
      })
        .from(questionnaireResponses)
        .innerJoin(questionnaireItems, eq(questionnaireItems.id, questionnaireResponses.itemId))
        .leftJoin(questionnaireCategories, eq(questionnaireCategories.id, questionnaireItems.categoryId))
        .where(or(inArray(questionnaireResponses.visitId, visitIds), inArray(questionnaireResponses.sessionId, sessionIds)))
        .orderBy(asc(questionnaireCategories.displayOrder), asc(questionnaireItems.displayOrder)),
      db.select({
        id: diagnosisResponses.id,
        visitId: diagnosisResponses.visitId,
        sessionId: diagnosisResponses.sessionId,
        category: diagnosisCategories.name,
        itemId: diagnosisItems.id,
        label: diagnosisItems.question,
        value: diagnosisResponses.value,
        options: diagnosisItems.options,
        answeredAt: diagnosisResponses.answeredAt,
      })
        .from(diagnosisResponses)
        .innerJoin(diagnosisItems, eq(diagnosisItems.id, diagnosisResponses.itemId))
        .leftJoin(diagnosisCategories, eq(diagnosisCategories.id, diagnosisItems.categoryId))
        .where(or(inArray(diagnosisResponses.visitId, visitIds), inArray(diagnosisResponses.sessionId, sessionIds)))
        .orderBy(asc(diagnosisCategories.displayOrder), asc(diagnosisItems.displayOrder)),
      legacyTables.has('questionnaires')
        ? db.select().from(questionnaires).where(inArray(questionnaires.sessionId, sessionIds))
        : Promise.resolve([] as LegacyQuestionnaire[]),
      legacyTables.has('diagnoses')
        ? db.select().from(diagnoses).where(or(inArray(diagnoses.visitId, visitIds), inArray(diagnoses.sessionId, sessionIds)))
        : Promise.resolve([] as LegacyDiagnosis[]),
      db.select({ visitId: reports.visitId, sessionId: reports.sessionId }).from(reports)
        .where(or(inArray(reports.visitId, visitIds), inArray(reports.sessionId, sessionIds))),
    ])

  const siblingCounts = new Map<string, number>()
  for (const visit of realVisitRows) {
    const parentId = visit.childParentId ?? visit.visitParentId
    if (parentId) siblingCounts.set(parentId, (siblingCounts.get(parentId) ?? 0) + 1)
  }

  const questionnaireResponseRows: ResponseRow[] = questionnaireRows.map((row) => ({
    ...row,
    visitId: row.visitId ?? (row.sessionId ? sessionToVisit.get(row.sessionId) ?? null : null),
  }))
  const diagnosisResponseRows: ResponseRow[] = diagnosisRows.map((row) => ({
    ...row,
    visitId: row.visitId ?? (row.sessionId ? sessionToVisit.get(row.sessionId) ?? null : null),
  }))
  const questionnairesByVisit = groupResponses(questionnaireResponseRows)
  const diagnosesByVisit = groupResponses(diagnosisResponseRows)

  const legacyQuestionnaireByVisit = new Map(legacyQuestionnaires.flatMap((row) => {
    const visitId = row.sessionId ? sessionToVisit.get(row.sessionId) : null
    return visitId ? [[visitId, row] as const] : []
  }))
  const legacyDiagnosisByVisit = new Map(legacyDiagnoses.flatMap((row) => {
    const visitId = row.visitId ?? (row.sessionId ? sessionToVisit.get(row.sessionId) : null)
    return visitId ? [[visitId, row] as const] : []
  }))
  const reportVisitIds = new Set(reportRows.flatMap((row) => {
    const visitId = row.visitId ?? (row.sessionId ? sessionToVisit.get(row.sessionId) : null)
    return visitId ? [visitId] : []
  }))

  const diagnosisTimes = new Map<string, { first: Date | null; last: Date | null }>()
  for (const row of diagnosisRows) {
    const visitId = row.visitId ?? (row.sessionId ? sessionToVisit.get(row.sessionId) : null)
    if (!visitId || !row.answeredAt) continue
    const current = diagnosisTimes.get(visitId) ?? { first: null, last: null }
    if (!current.first || row.answeredAt < current.first) current.first = row.answeredAt
    if (!current.last || row.answeredAt > current.last) current.last = row.answeredAt
    diagnosisTimes.set(visitId, current)
  }

  const records = realVisitRows.map((visit, index): EventInsightRecord => {
    const questionnaire = [...(questionnairesByVisit.get(visit.id) ?? [])]
    const diagnosis = [...(diagnosesByVisit.get(visit.id) ?? [])]
    const legacyQuestionnaire = legacyQuestionnaireByVisit.get(visit.id)
    const legacyDiagnosis = legacyDiagnosisByVisit.get(visit.id)
    appendLegacyQuestionnaire(questionnaire, visit.id, legacyQuestionnaire)
    appendLegacyDiagnosis(diagnosis, visit.id, legacyDiagnosis)

    const timing = diagnosisTimes.get(visit.id)
    const diagnosisStart = getStepTimestamp(visit.stepTimestamps, 'diagnosis_started')
      ?? timing?.first
      ?? legacyDiagnosis?.createdAt
      ?? null
    const diagnosisEnd = getStepTimestamp(visit.stepTimestamps, 'analysis_completed')
      ?? getStepTimestamp(visit.stepTimestamps, 'report_generated')
      ?? timing?.last
      ?? legacyDiagnosis?.updatedAt
      ?? null
    const parentId = visit.childParentId ?? visit.visitParentId
    const ageMonths = visit.ageMonths ?? (legacyQuestionnaire?.childAge ? legacyQuestionnaire.childAge * 12 : null)
    const gender = normalizedGender(visit.childGender ?? legacyQuestionnaire?.childGender ?? null)

    return {
      id: visit.id,
      reference: recordReference(visit.receptionNumber, index),
      arrivedAt: (visit.visitDate ?? visit.createdAt)?.toISOString() ?? null,
      diagnosisStartedAt: diagnosisStart?.toISOString() ?? null,
      diagnosisMinutes: elapsedMinutes(diagnosisStart, diagnosisEnd),
      ageMonths,
      gender,
      siblingCount: parentId ? siblingCounts.get(parentId) ?? 1 : 1,
      status: visit.status ?? 'unknown',
      currentStep: visit.currentStep,
      questionnaireCompleted: questionnaire.length > 0 || Boolean(legacyQuestionnaire),
      diagnosisCompleted: diagnosis.length > 0 || Boolean(legacyDiagnosis),
      reportCompleted: reportVisitIds.has(visit.id),
      questionnaire,
      diagnosis,
    }
  })

  const knownAges = records.flatMap((record) => record.ageMonths === null ? [] : [record.ageMonths])
  const diagnosisDurations = records.flatMap((record) => record.diagnosisMinutes === null ? [] : [record.diagnosisMinutes])

  return {
    generatedAt: new Date().toISOString(),
    events: eventList.filter((event) => event.visitCount > 0),
    selectedEvent: { ...selectedEvent, visitCount: records.length },
    overview: {
      visits: records.length,
      questionnaires: records.filter((record) => record.questionnaireCompleted).length,
      diagnoses: records.filter((record) => record.diagnosisCompleted).length,
      reports: records.filter((record) => record.reportCompleted).length,
      averageAgeYears: knownAges.length > 0
        ? Number((knownAges.reduce((sum, age) => sum + age, 0) / knownAges.length / 12).toFixed(1))
        : null,
      averageDiagnosisMinutes: diagnosisDurations.length > 0
        ? Number((diagnosisDurations.reduce((sum, duration) => sum + duration, 0) / diagnosisDurations.length).toFixed(1))
        : null,
      siblingVisits: records.filter((record) => record.siblingCount > 1).length,
    },
    distributions: {
      age: countDistribution(records.map((record) => ageBucket(record.ageMonths))),
      gender: countDistribution(records.map((record) => genderLabel(record.gender)), GENDER_LABELS),
      siblings: countDistribution(records.map((record) => record.siblingCount > 1 ? '兄弟姉妹で来場' : '単独来場'), SIBLING_LABELS),
      arrivalTime: countDistribution(records.flatMap((record) => {
        const bucket = halfHourBucket(record.arrivedAt)
        return bucket ? [bucket] : []
      })),
      diagnosisTime: countDistribution(records.flatMap((record) => {
        const bucket = halfHourBucket(record.diagnosisStartedAt)
        return bucket ? [bucket] : []
      })),
      diagnosisDuration: countDistribution(records.flatMap((record) => {
        const bucket = durationBucket(record.diagnosisMinutes)
        return bucket ? [bucket] : []
      }), DURATION_LABELS),
    },
    questionnaireDistributions: buildItemDistributions(questionnaireResponseRows),
    diagnosisDistributions: buildItemDistributions(diagnosisResponseRows),
    records,
  }
}

type LegacyQuestionnaire = typeof questionnaires.$inferSelect
type LegacyDiagnosis = typeof diagnoses.$inferSelect

function appendLegacyQuestionnaire(
  responses: InsightResponse[],
  visitId: string,
  row: LegacyQuestionnaire | undefined
): void {
  if (!row) return
  const hadNormalizedResponses = responses.length > 0
  addLegacyResponse(responses, `${visitId}-q`, '基本情報', '既往歴', row.medicalHistory)
  addLegacyResponse(responses, `${visitId}-q`, '基本情報', '気になること', row.concerns)
  addLegacyResponse(responses, `${visitId}-q`, '基本情報', '理想の状態', row.idealGoals)
  addLegacyResponse(responses, `${visitId}-q`, '基本情報', '備考', row.notes)
  if (!hadNormalizedResponses && row.answers && typeof row.answers === 'object' && !Array.isArray(row.answers)) {
    for (const [label, value] of Object.entries(row.answers)) {
      addLegacyResponse(responses, `${visitId}-q`, '問診回答', label, value)
    }
  }
}

function appendLegacyDiagnosis(
  responses: InsightResponse[],
  visitId: string,
  row: LegacyDiagnosis | undefined
): void {
  if (!row) return
  if (responses.length === 0 && row.diagnosisItems && typeof row.diagnosisItems === 'object' && !Array.isArray(row.diagnosisItems)) {
    for (const [label, value] of Object.entries(row.diagnosisItems)) {
      addLegacyResponse(responses, `${visitId}-d`, '診断結果', label, value)
    }
  }
  addLegacyResponse(responses, `${visitId}-d`, 'スタッフ所見', 'スタッフメモ', row.staffNotes)
}
