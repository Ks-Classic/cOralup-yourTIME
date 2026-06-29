import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { visits, children, profiles, questionnaireResponses, questionnaireItems } from '@/db/schema'
import { eq, or, desc } from 'drizzle-orm'
import { selectQuestionnaireChild } from '@/lib/parent-questionnaire-flow'

export const dynamic = 'force-dynamic'

/**
 * GET: LINE User IDから既存visitを検索・復元
 * Query: line_user_id (必須)
 * 
 * 用途: LIFF問診画面で途中離脱からの復元、兄弟対応
 * 
 * 返り値:
 * - profile: 親御さん情報
 * - children: 全ての子供とそのvisit情報（兄弟対応）
 * - child: 最新の子供（後方互換）
 * - visit: 最新のvisit（後方互換）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lineUserId = searchParams.get('line_user_id')
    const requestedChildId = searchParams.get('child_id')

    if (!lineUserId) {
      return NextResponse.json(
        { success: false, error: 'line_user_id is required' },
        { status: 400 }
      )
    }

    // 1. profilesからparent情報取得（lineUserIdのみで検索、roleは問わない）
    const profileRows = await db
      .select({
        id: profiles.id,
        displayName: profiles.displayName,
        firstName: profiles.firstName,
        lastName: profiles.lastName,
        firstNameKana: profiles.firstNameKana,
        lastNameKana: profiles.lastNameKana,
        phoneNumber: profiles.phoneNumber,
        role: profiles.role,
        secondaryRole: profiles.secondaryRole,
      })
      .from(profiles)
      .where(eq(profiles.lineUserId, lineUserId))
      .limit(1)

    const profile = profileRows[0]

    if (!profile) {
      return NextResponse.json({
        success: true,
        profile: null,
        children: [],
        visit: null,
        child: null,
        questionnaireResponses: [],
      })
    }

    // 2. 全ての子供を取得
    const childRows = await db
      .select({
        id: children.id,
        firstName: children.firstName,
        lastName: children.lastName,
        firstNameKana: children.firstNameKana,
        lastNameKana: children.lastNameKana,
        birthday: children.birthday,
        gender: children.gender,
        createdAt: children.createdAt,
      })
      .from(children)
      .where(eq(children.parentProfileId, profile.id))
      .orderBy(desc(children.createdAt))

    // 3. 各子供のvisitを取得
    const childrenWithVisits = await Promise.all(
      childRows.map(async (child) => {
        const visitRows = await db
          .select({
            id: visits.id,
            status: visits.status,
            sessionId: visits.sessionId,
            visitDate: visits.visitDate,
            childAgeMonths: visits.childAgeMonths,
            eventId: visits.eventId,
          })
          .from(visits)
          .where(eq(visits.childId, child.id))
          .orderBy(desc(visits.visitDate))

        const latestVisit = visitRows[0] || null

        return {
          id: child.id,
          firstName: child.firstName,
          lastName: child.lastName,
          firstNameKana: child.firstNameKana,
          lastNameKana: child.lastNameKana,
          birthday: child.birthday,
          gender: child.gender,
          questionnaireStatus: latestVisit?.status || 'not_started',
          latestVisit: latestVisit ? {
            id: latestVisit.id,
            status: latestVisit.status,
            sessionId: latestVisit.sessionId,
            visitDate: latestVisit.visitDate,
            childAgeMonths: latestVisit.childAgeMonths,
            eventId: latestVisit.eventId,
          } : null,
          visits: visitRows.map(v => ({
            id: v.id,
            status: v.status,
            sessionId: v.sessionId,
            visitDate: v.visitDate,
            childAgeMonths: v.childAgeMonths,
            eventId: v.eventId,
          })),
        }
      })
    )

    const selectedChild = selectQuestionnaireChild(childrenWithVisits, requestedChildId)
    const selectedVisit = selectedChild?.latestVisit || null

    // 4. 問診回答を取得（選択中visitがある場合のみ、後方互換用）
    let questionnaireResponsesList: any[] = []
    if (selectedVisit?.id) {
      const responseRows = await db
        .select({
          id: questionnaireResponses.id,
          itemId: questionnaireResponses.itemId,
          value: questionnaireResponses.value,
          answeredAt: questionnaireResponses.answeredAt,
          itemCode: questionnaireItems.code,
          itemQuestion: questionnaireItems.question,
          itemAnswerType: questionnaireItems.answerType,
          itemOptions: questionnaireItems.options,
        })
        .from(questionnaireResponses)
        .leftJoin(questionnaireItems, eq(questionnaireResponses.itemId, questionnaireItems.id))
        .where(
          selectedVisit.sessionId
            ? or(eq(questionnaireResponses.visitId, selectedVisit.id), eq(questionnaireResponses.sessionId, selectedVisit.sessionId))
            : eq(questionnaireResponses.visitId, selectedVisit.id)
        )
        .orderBy(questionnaireResponses.answeredAt)

      questionnaireResponsesList = responseRows.map(r => ({
        id: r.id,
        item_id: r.itemId,
        value: r.value,
        answered_at: r.answeredAt,
        questionnaire_items: {
          id: r.itemId,
          code: r.itemCode,
          question: r.itemQuestion,
          answer_type: r.itemAnswerType,
          options: r.itemOptions,
        },
      }))
    }

    return NextResponse.json({
      success: true,
      profile: {
        id: profile.id,
        displayName: profile.displayName,
        firstName: profile.firstName,
        lastName: profile.lastName,
        firstNameKana: profile.firstNameKana,
        lastNameKana: profile.lastNameKana,
        phoneNumber: profile.phoneNumber,
      },
      children: childrenWithVisits,
      child: selectedChild ? {
        id: selectedChild.id,
        firstName: selectedChild.firstName,
        lastName: selectedChild.lastName,
        firstNameKana: selectedChild.firstNameKana,
        lastNameKana: selectedChild.lastNameKana,
        birthday: selectedChild.birthday,
        gender: selectedChild.gender,
      } : null,
      visit: selectedVisit,
      questionnaireResponses: questionnaireResponsesList,
    })
  } catch (error) {
    console.error('[Parent Visit] Error:', error)
    return NextResponse.json(
      { success: false, error: 'server_error' },
      { status: 500 }
    )
  }
}

/**
 * POST: 新規visit作成（LIFF問診開始時）
 * Body: { lineUserId, childId?, eventId? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { lineUserId, childId, eventId } = body

    if (!lineUserId) {
      return NextResponse.json(
        { success: false, error: 'lineUserId is required' },
        { status: 400 }
      )
    }

    // 1. profilesから親情報取得（lineUserIdのみで検索）
    const profileRows = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.lineUserId, lineUserId))
      .limit(1)

    const profile = profileRows[0]

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'profile_not_found' },
        { status: 404 }
      )
    }

    // 2. セッションID生成（後方互換用）
    const sessionId = `S${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`

    // 3. visitsテーブルに作成
    const insertedRows = await db
      .insert(visits)
      .values({
        sessionId: sessionId,
        childId: childId || null,
        parentProfileId: profile.id,
        eventId: eventId || process.env.DEFAULT_EVENT_ID || null,
        organizationId: process.env.CORALUP_ORG_ID || null,
        status: 'waiting',
        currentStep: 'line_registered',
        visitDate: new Date(),
      } as typeof visits.$inferInsert)
      .returning()

    const visit = insertedRows[0]

    if (!visit) {
      return NextResponse.json(
        { success: false, error: 'visit_creation_failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      visit: {
        id: visit.id,
        sessionId: visit.sessionId,
        status: visit.status,
      },
    })
  } catch (error) {
    console.error('[Parent Visit] POST Error:', error)
    return NextResponse.json(
      { success: false, error: 'server_error' },
      { status: 500 }
    )
  }
}
