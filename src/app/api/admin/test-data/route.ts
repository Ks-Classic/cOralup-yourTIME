import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { children, visits, questionnaireItems, questionnaireResponses } from '@/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { getStaffSession } from '@/lib/staff-auth'

export async function POST(request: NextRequest) {
    try {
        const session = await getStaffSession()
        if (!session) return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 })

        const body = await request.json()
        const { parentProfileId, childName = 'テスト太郎', childGender = 'male', childBirthday = '2020-01-01', withQuestionnaire = false } = body

        // 1. 子供作成
        const childRows = await db.insert(children).values({
            parentProfileId: parentProfileId || null,
            firstName: childName,
            lastName: '[TEST]',
            birthday: childBirthday,
            gender: childGender,
            isTestData: true,
        } as typeof children.$inferInsert).returning()
        const child = childRows[0]

        // 2. Visit作成
        const sessionId = `T${Date.now().toString(36).toUpperCase()}`
        const visitRows = await db.insert(visits).values({
            sessionId,
            childId: child.id,
            status: 'waiting',
            currentStep: 'line_registered',
            visitDate: new Date(),
            isTestData: true,
        } as typeof visits.$inferInsert).returning()
        const visit = visitRows[0]

        // 3. 問診回答
        if (withQuestionnaire) {
            const items = await db.select({ id: questionnaireItems.id }).from(questionnaireItems).where(eq(questionnaireItems.isActive, true)).limit(10)
            if (items.length > 0) {
                const responses = items.map(item => ({
                    visitId: visit.id,
                    sessionId: visit.sessionId,
                    itemId: item.id,
                    value: 'テスト回答',
                }))
                await db.insert(questionnaireResponses).values(responses as typeof questionnaireResponses.$inferInsert[])
                await db.update(visits).set({ status: 'in_progress', currentStep: 'questionnaire_completed' } as any).where(eq(visits.id, visit.id))
            }
        }

        return NextResponse.json({ success: true, child, visit })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const session = await getStaffSession()
        if (!session) return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 })

        const testVisits = await db.select({ id: visits.id }).from(visits).where(eq(visits.isTestData, true))
        const visitIds = testVisits.map(v => v.id)

        if (visitIds.length > 0) {
            // 紐づくデータ削除用テーブル（reports, visitPhotosなども必要なら追加）
            // 省略するが本来はカスケード的に削除
            await db.delete(visits).where(inArray(visits.id, visitIds))
        }
        await db.delete(children).where(eq(children.isTestData, true))

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
    }
}
