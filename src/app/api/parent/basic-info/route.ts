import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { profiles, children, visits } from '@/db/schema'
import { eq, or, and, inArray } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

interface BasicInfoRequest {
  lineUserId: string
  sessionId?: string
  childId?: string  // 既存の子供を更新する場合に指定
  parentName?: string
  parentLastName?: string
  parentFirstName?: string
  parentLastNameKana?: string
  parentFirstNameKana?: string
  parentPhone: string
  childName?: string
  childLastName?: string
  childFirstName?: string
  childFurigana?: string
  childLastNameKana?: string
  childFirstNameKana?: string
  childBirthday: string
  childGender: 'male' | 'female' | 'other'
  childNickname?: string
  prefecture?: string
}

/**
 * POST: 親御さん基本情報を保存
 * - profilesテーブル更新
 * - childrenテーブル作成/更新
 * - visitsテーブル作成/更新
 */
export async function POST(request: NextRequest) {
  try {
    const body: BasicInfoRequest = await request.json()

    const {
      lineUserId,
      sessionId,
      childId,
      parentLastName,
      parentFirstName,
      parentLastNameKana,
      parentFirstNameKana,
      parentPhone,
      childLastName,
      childFirstName,
      childFurigana,
      childLastNameKana,
      childFirstNameKana,
      childBirthday,
      childGender,
      childNickname,
      prefecture,
    } = body

    if (!lineUserId) {
      return NextResponse.json(
        { success: false, error: 'lineUserId is required' },
        { status: 400 }
      )
    }

    // 1. 親プロフィールを取得または作成（role='parent' または secondary_role='parent'）
    const profileRows = await db
      .select()
      .from(profiles)
      .where(
        and(
          eq(profiles.lineUserId, lineUserId),
          or(eq(profiles.role, 'parent'), eq(profiles.secondaryRole, 'parent'))
        )
      )
      .limit(1)

    let profile = profileRows[0]

    if (!profile) {
      // 新規作成
      const insertedProfiles = await db
        .insert(profiles)
        .values({
          lineUserId,
          role: 'parent',
          firstName: parentFirstName,
          lastName: parentLastName,
          firstNameKana: parentFirstNameKana,
          lastNameKana: parentLastNameKana,
          phoneNumber: parentPhone,
          prefecture,
          isActive: true,
        } as typeof profiles.$inferInsert)
        .returning()
      profile = insertedProfiles[0]
    } else {
      // 更新
      const updatedProfiles = await db
        .update(profiles)
        .set({
          firstName: parentFirstName,
          lastName: parentLastName,
          firstNameKana: parentFirstNameKana,
          lastNameKana: parentLastNameKana,
          phoneNumber: parentPhone,
          prefecture,
          updatedAt: new Date(),
        } as Partial<typeof profiles.$inferInsert>)
        .where(eq(profiles.id, profile.id))
        .returning()
      profile = updatedProfiles[0]
    }

    // 2. 子供情報を処理
    const birthday = new Date(childBirthday)
    const now = new Date()
    const ageMonths = (now.getFullYear() - birthday.getFullYear()) * 12 + (now.getMonth() - birthday.getMonth())

    let childIdToUse = childId
    let child

    const childData = {
      parentProfileId: profile.id,
      firstName: childFirstName,
      lastName: childLastName,
      firstNameKana: childFirstNameKana || childFurigana?.split(/\s+/)[1] || childFurigana,
      lastNameKana: childLastNameKana || childFurigana?.split(/\s+/)[0] || '',
      birthday: childBirthday,
      gender: childGender,
      nickname: childNickname,
      updatedAt: new Date(),
    }

    if (childIdToUse) {
      const updatedChildren = await db
        .update(children)
        .set(childData as Partial<typeof children.$inferInsert>)
        .where(and(eq(children.id, childIdToUse), eq(children.parentProfileId, profile.id)))
        .returning()
      child = updatedChildren[0]
    }

    if (!child) {
      const insertedChildren = await db
        .insert(children)
        .values(childData as typeof children.$inferInsert)
        .returning()
      child = insertedChildren[0]
      childIdToUse = child.id
    }

    // 3. セッションとvisitを処理
    let finalSessionId = sessionId
    let visitId: string | null = null

    if (sessionId) {
      const existingVisitRows = await db
        .select({ id: visits.id })
        .from(visits)
        .where(
          and(
            eq(visits.sessionId, sessionId),
            inArray(visits.status, ['waiting', 'questionnaire_in_progress', 'in_progress'])
          )
        )
        .limit(1)

      const existingVisit = existingVisitRows[0]

      if (existingVisit) {
        visitId = existingVisit.id
        await db
          .update(visits)
          .set({
            childId: child.id,
            childAgeMonths: ageMonths,
            status: 'in_progress',
            currentStep: 'questionnaire_started',
            updatedAt: new Date(),
          } as Partial<typeof visits.$inferInsert>)
          .where(eq(visits.id, visitId))
      }
    }

    // visitがなければ新規作成
    if (!visitId) {
      finalSessionId = `S${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`

      const insertedVisits = await db
        .insert(visits)
        .values({
          sessionId: finalSessionId,
          childId: child.id,
          childAgeMonths: ageMonths,
          eventId: (process.env.DEFAULT_EVENT_ID as any) || null,
          organizationId: (process.env.CORALUP_ORG_ID as any) || null,
          status: 'in_progress',
          currentStep: 'questionnaire_started',
          visitDate: new Date(),
        } as typeof visits.$inferInsert)
        .returning()
      visitId = insertedVisits[0].id
    }

    return NextResponse.json({
      success: true,
      profileId: profile.id,
      childId: child.id,
      visitId,
      sessionId: finalSessionId,
    })
  } catch (error) {
    console.error('[Basic Info] Error:', error)
    return NextResponse.json(
      { success: false, error: 'server_error' },
      { status: 500 }
    )
  }
}
