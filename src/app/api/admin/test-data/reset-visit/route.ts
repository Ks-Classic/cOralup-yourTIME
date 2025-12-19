import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { visits, questionnaireResponses, diagnosisResponses, reports, visitPhotos } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getStaffSession } from '@/lib/staff-auth'

export async function POST(request: NextRequest) {
    try {
        const session = await getStaffSession()
        if (!session) return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 })

        const body = await request.json()
        const { visitId, targetStatus = 'waiting', targetStep = 'line_registered', deleteResponses = false, deletePhotos = false, deleteReports = false } = body

        if (!visitId) return NextResponse.json({ success: false, error: 'visitId is required' }, { status: 400 })

        await db.update(visits).set({
            status: targetStatus,
            currentStep: targetStep,
            reportSentAt: null,
            updatedAt: new Date()
        } as Partial<typeof visits.$inferInsert>).where(eq(visits.id, visitId))

        if (deleteResponses) {
            await db.delete(questionnaireResponses).where(eq(questionnaireResponses.visitId, visitId))
            await db.delete(diagnosisResponses).where(eq(diagnosisResponses.visitId, visitId))
        }
        if (deletePhotos) await db.delete(visitPhotos).where(eq(visitPhotos.visitId, visitId))
        if (deleteReports) await db.delete(reports).where(eq(reports.visitId, visitId))

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
    }
}
