import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { visits, children, profiles, questionnaireResponses, diagnosisResponses, reports, visitPhotos } from '@/db/schema'
import { eq, desc, inArray } from 'drizzle-orm'
import { getStaffSession } from '@/lib/staff-auth'

/**
 * GET: データ一覧を取得
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getStaffSession()
        if (!session) {
            return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type') || 'visits'
        const limit = parseInt(searchParams.get('limit') || '50')

        let data: any[] = []

        if (type === 'visits') {
            const visitRows = await db
                .select({
                    id: visits.id,
                    sessionId: visits.sessionId,
                    status: visits.status,
                    currentStep: visits.currentStep,
                    visitDate: visits.visitDate,
                    isTestData: visits.isTestData,
                    createdAt: visits.createdAt,
                    updatedAt: visits.updatedAt,
                    childId: visits.childId,
                    staffProfileId: visits.staffProfileId,
                })
                .from(visits)
                .orderBy(desc(visits.createdAt))
                .limit(limit)

            data = await Promise.all(visitRows.map(async (v) => {
                const child = v.childId ? (await db.select({ id: children.id, firstName: children.firstName, lastName: children.lastName }).from(children).where(eq(children.id, v.childId)).limit(1))[0] : null
                const staff = v.staffProfileId ? (await db.select({ id: profiles.id, displayName: profiles.displayName, firstName: profiles.firstName, lastName: profiles.lastName }).from(profiles).where(eq(profiles.id, v.staffProfileId)).limit(1))[0] : null
                return { ...v, children: child, staff }
            }))
        }

        if (type === 'children') {
            const childRows = await db
                .select()
                .from(children)
                .orderBy(desc(children.createdAt))
                .limit(limit)

            data = await Promise.all(childRows.map(async (c) => {
                const parent = c.parentProfileId ? (await db.select({ id: profiles.id, displayName: profiles.displayName }).from(profiles).where(eq(profiles.id, c.parentProfileId)).limit(1))[0] : null
                return { ...c, profiles: parent }
            }))
        }

        if (type === 'profiles') {
            data = await db
                .select()
                .from(profiles)
                .where(eq(profiles.role, 'parent'))
                .orderBy(desc(profiles.createdAt))
                .limit(limit)
        }

        return NextResponse.json({ success: true, data, count: data.length })
    } catch (error) {
        console.error('[Data List] Error:', error)
        return NextResponse.json({ success: false, error: 'server_error' }, { status: 500 })
    }
}

/**
 * DELETE: 個別レコードを削除
 */
export async function DELETE(request: NextRequest) {
    try {
        const session = await getStaffSession()
        if (!session) {
            return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { type, id } = body

        if (!type || !id) {
            return NextResponse.json({ success: false, error: 'type and id required' }, { status: 400 })
        }

        let deletedCount = 0

        if (type === 'visit') {
            await db.delete(questionnaireResponses).where(eq(questionnaireResponses.visitId, id))
            await db.delete(diagnosisResponses).where(eq(diagnosisResponses.visitId, id))
            await db.delete(reports).where(eq(reports.visitId, id))
            await db.delete(visitPhotos).where(eq(visitPhotos.visitId, id))

            const result = await db.delete(visits).where(eq(visits.id, id)).returning()
            deletedCount = result.length
        }

        if (type === 'child') {
            const childVisitRows = await db.select({ id: visits.id }).from(visits).where(eq(visits.childId, id))
            const visitIds = childVisitRows.map(v => v.id)

            if (visitIds.length > 0) {
                await db.delete(questionnaireResponses).where(inArray(questionnaireResponses.visitId, visitIds))
                await db.delete(diagnosisResponses).where(inArray(diagnosisResponses.visitId, visitIds))
                await db.delete(reports).where(inArray(reports.visitId, visitIds))
                await db.delete(visitPhotos).where(inArray(visitPhotos.visitId, visitIds))
                await db.delete(visits).where(inArray(visits.id, visitIds))
            }

            const result = await db.delete(children).where(eq(children.id, id)).returning()
            deletedCount = result.length
        }

        if (type === 'profile') {
            const childRows = await db.select({ id: children.id }).from(children).where(eq(children.parentProfileId, id))
            const childIds = childRows.map(c => c.id)

            if (childIds.length > 0) {
                const visitRows = await db.select({ id: visits.id }).from(visits).where(inArray(visits.childId, childIds))
                const visitIds = visitRows.map(v => v.id)

                if (visitIds.length > 0) {
                    await db.delete(questionnaireResponses).where(inArray(questionnaireResponses.visitId, visitIds))
                    await db.delete(diagnosisResponses).where(inArray(diagnosisResponses.visitId, visitIds))
                    await db.delete(reports).where(inArray(reports.visitId, visitIds))
                    await db.delete(visitPhotos).where(inArray(visitPhotos.visitId, visitIds))
                    await db.delete(visits).where(inArray(visits.id, visitIds))
                }
                await db.delete(children).where(inArray(children.id, childIds))
            }

            const result = await db.delete(profiles).where(eq(profiles.id, id)).returning()
            deletedCount = result.length
        }

        return NextResponse.json({ success: true, deletedCount })
    } catch (error) {
        console.error('[Data List DELETE] Error:', error)
        return NextResponse.json({ success: false, error: 'server_error' }, { status: 500 })
    }
}
