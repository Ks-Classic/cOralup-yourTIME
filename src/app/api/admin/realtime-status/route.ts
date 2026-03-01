import { NextResponse } from 'next/server'
import { db } from '@/db'
import { visits, children, profiles, reports, visitPhotos } from '@/db/schema'
import { eq, gte, sql, desc, inArray } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const now = new Date()
        const todayStart = new Date(now)
        todayStart.setHours(0, 0, 0, 0)

        // 1. 今日のvisitsを取得（子供・スタッフ・レポート情報含む）
        const todayVisits = await db
            .select({
                id: visits.id,
                sessionId: visits.sessionId,
                status: visits.status,
                currentStep: visits.currentStep,
                createdAt: visits.createdAt,
                updatedAt: visits.updatedAt,
                staffProfileId: visits.staffProfileId,
                childFirstName: children.firstName,
                childLastName: children.lastName,
                childBirthday: children.birthday,
                staffLastName: profiles.lastName,
                staffFirstName: profiles.firstName,
                staffDisplayName: profiles.displayName,
            })
            .from(visits)
            .leftJoin(children, eq(visits.childId, children.id))
            .leftJoin(profiles, eq(visits.staffProfileId, profiles.id))
            .where(gte(visits.createdAt, todayStart))
            .orderBy(desc(visits.createdAt))

        // 2. レポートが存在するvisit IDのセットを取得
        const visitIds = todayVisits.map(v => v.id)
        let reportVisitIds = new Set<string>()
        let photoCountMap = new Map<string, number>()
        if (visitIds.length > 0) {
            const reportRows = await db
                .select({ visitId: reports.visitId })
                .from(reports)
                .where(inArray(reports.visitId, visitIds))
            reportVisitIds = new Set(reportRows.map(r => r.visitId).filter(Boolean) as string[])

            // 2b. 写真枚数をvisit単位で一括取得
            const photoCounts = await db
                .select({
                    visitId: visitPhotos.visitId,
                    count: sql<number>`count(*)`,
                })
                .from(visitPhotos)
                .where(inArray(visitPhotos.visitId, visitIds))
                .groupBy(visitPhotos.visitId)
            for (const row of photoCounts) {
                if (row.visitId) photoCountMap.set(row.visitId, Number(row.count))
            }
        }

        // 3. 今日のLINE登録数
        const lineCountResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(profiles)
            .where(gte(profiles.createdAt, todayStart))
        const lineRegisteredCount = Number(lineCountResult[0]?.count || 0)

        // 4. データを加工
        const activeSessions: any[] = []
        const recentCompleted: any[] = []
        const alerts: any[] = []
        const summary = {
            lineRegistered: lineRegisteredCount,
            questionnaireCompleted: 0,
            inProgress: 0,
            diagnosisCompleted: 0,
            reportSent: 0,
        }

        for (const visit of todayVisits) {
            const status = visit.status
            const currentStep = visit.currentStep
            const childName = `${visit.childLastName || ''} ${visit.childFirstName || ''}`.trim() || 'Unknown'
            const age = visit.childBirthday
                ? Math.floor((now.getTime() - new Date(visit.childBirthday).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
                : 0
            const staffName = visit.staffDisplayName || `${visit.staffLastName || ''} ${visit.staffFirstName || ''}`.trim() || null
            const hasReport = reportVisitIds.has(visit.id)

            // Summary counts
            if (currentStep === 'questionnaire_completed') summary.questionnaireCompleted++
            if (currentStep === 'diagnosis_started' || currentStep === 'photos_uploaded') summary.inProgress++
            if (currentStep === 'analysis_completed' || status === 'completed') summary.diagnosisCompleted++
            if (currentStep === 'line_sent' || status === 'published') summary.reportSent++

            const isCompleted = status === 'published' || status === 'cancelled'
            const effectiveDate = new Date(visit.updatedAt || visit.createdAt || now)
            const elapsedMinutes = Math.floor((now.getTime() - effectiveDate.getTime()) / 60000)

            if (!isCompleted) {
                activeSessions.push({
                    id: visit.id,
                    sessionId: visit.sessionId,
                    status,
                    currentStep,
                    childName,
                    childAge: age,
                    staffName: staffName || null,
                    createdAt: visit.createdAt,
                    updatedAt: visit.updatedAt,
                    currentStatusSince: visit.updatedAt,
                    elapsedMinutes,
                    hasReport,
                    progress: { photos: { current: photoCountMap.get(visit.id) || 0, total: 3 }, diagnosisItems: { current: 0, total: 0 } },
                    visitDate: visit.createdAt,
                })

                // Alerts
                if (currentStep === 'questionnaire_completed' && elapsedMinutes >= 15) {
                    alerts.push({
                        id: `alert-${visit.id}`,
                        sessionId: visit.sessionId,
                        childName,
                        childAge: age,
                        type: elapsedMinutes >= 25 ? 'critical' : 'warning',
                        condition: 'qr_waiting_long',
                        elapsedMinutes,
                        message: elapsedMinutes >= 25 ? '診断待ち時間が限界を超えています' : '診断待ち時間が長くなっています',
                    })
                }
                if (currentStep === 'diagnosis_started' && elapsedMinutes >= 25) {
                    alerts.push({
                        id: `alert-${visit.id}`,
                        sessionId: visit.sessionId,
                        childName,
                        childAge: age,
                        type: elapsedMinutes >= 35 ? 'critical' : 'warning',
                        condition: 'diagnosis_long',
                        elapsedMinutes,
                        message: elapsedMinutes >= 35 ? '診断時間が限界を超えています' : '診断時間が長くなっています',
                    })
                }
            } else {
                recentCompleted.push({
                    id: visit.id,
                    sessionId: visit.sessionId,
                    childName,
                    childAge: age,
                    staffName: staffName || '',
                    completedAt: visit.updatedAt,
                    reportSentAt: status === 'published' ? visit.updatedAt : null,
                    status,
                })
            }
        }

        return NextResponse.json({
            timestamp: now.toISOString(),
            summary,
            activeSessions,
            recentCompleted: recentCompleted.slice(0, 10),
            alerts,
        })
    } catch (error) {
        console.error('[Admin Realtime Status API] Error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch realtime status' },
            { status: 500 }
        )
    }
}
