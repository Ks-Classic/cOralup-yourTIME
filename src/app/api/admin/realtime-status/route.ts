import { NextResponse } from 'next/server'
import { db } from '@/db'
import { visits, children, profiles, reports, visitPhotos } from '@/db/schema'
import { eq, gte, sql, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const now = new Date()
        const todayStart = new Date(now)
        todayStart.setHours(0, 0, 0, 0)

        // 保護者プロフィール用のエイリアス（スタッフプロフィールとの衝突回避）
        const parentProfiles = alias(profiles, 'parent_profiles')

        // 1. 今日のvisitsを取得（子供・スタッフ・保護者・レポート情報含む）
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
                parentDisplayName: parentProfiles.displayName,
                parentLineUserId: parentProfiles.lineUserId,
                parentReceptionNumber: parentProfiles.receptionNumber,
                parentProfileId: visits.parentProfileId,
            })
            .from(visits)
            .leftJoin(children, eq(visits.childId, children.id))
            .leftJoin(profiles, eq(visits.staffProfileId, profiles.id))
            .leftJoin(parentProfiles, eq(visits.parentProfileId, parentProfiles.id))
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

        // 3b. 問診未着手: 今日LINE登録したが visitがない or visitはあるが問診開始前
        const profilesWithVisitToday = await db
            .select({
                profileId: profiles.id,
                profileCreatedAt: profiles.createdAt,
                displayName: profiles.displayName,
                lineUserId: profiles.lineUserId,
                receptionNumber: profiles.receptionNumber,
                visitId: visits.id,
                currentStep: visits.currentStep,
                visitCreatedAt: visits.createdAt,
                visitUpdatedAt: visits.updatedAt,
                childFirstName: children.firstName,
                childLastName: children.lastName,
            })
            .from(profiles)
            .leftJoin(visits, eq(visits.parentProfileId, profiles.id))
            .leftJoin(children, eq(children.parentProfileId, profiles.id))
            .where(gte(profiles.createdAt, todayStart))

        // LINE登録しているがvisitがない = 問診未着手
        // visits.parentProfileId経由 + todayVisitsのparentProfileId照合で二重チェック
        const profileIdsWithVisits = new Set(
            todayVisits.map(v => v.parentProfileId).filter(Boolean) as string[]
        )

        const waitingForQuestionnaireRows = profilesWithVisitToday.filter(row => {
            // visitが直接紐付いている場合は除外
            if (row.visitId) return false
            // todayVisitsにparentProfileIdで紐付くvisitがある場合も除外
            if (profileIdsWithVisits.has(row.profileId)) return false
            return true
        })
        // 同一プロフィールの重複排除 + 待ち時間計算
        const uniqueWaitingProfiles = new Map<string, number>()
        for (const row of waitingForQuestionnaireRows) {
            if (!uniqueWaitingProfiles.has(row.profileId)) {
                const createdAt = new Date(row.profileCreatedAt || now)
                const elapsed = Math.floor((now.getTime() - createdAt.getTime()) / 60000)
                uniqueWaitingProfiles.set(row.profileId, elapsed)
            }
        }
        const waitingForQuestionnaireInfo: { count: number; maxWaitMinutes: number; avgWaitMinutes: number } = {
            count: uniqueWaitingProfiles.size,
            maxWaitMinutes: 0,
            avgWaitMinutes: 0,
        }
        if (uniqueWaitingProfiles.size > 0) {
            const times = Array.from(uniqueWaitingProfiles.values())
            waitingForQuestionnaireInfo.maxWaitMinutes = Math.max(...times)
            waitingForQuestionnaireInfo.avgWaitMinutes = Math.round(times.reduce((a, b) => a + b, 0) / times.length)
        }

        // 3c. 問診入力中: visitはあるが currentStep が line_registered or questionnaire_started
        const questionnaireInProgressRows = profilesWithVisitToday.filter(row => {
            if (!row.visitId) return false
            return row.currentStep === 'line_registered' || row.currentStep === 'questionnaire_started'
        })
        const uniqueInProgressProfiles = new Map<string, number>()
        for (const row of questionnaireInProgressRows) {
            if (!uniqueInProgressProfiles.has(row.profileId)) {
                const createdAt = new Date(row.visitCreatedAt || now)
                const elapsed = Math.floor((now.getTime() - createdAt.getTime()) / 60000)
                uniqueInProgressProfiles.set(row.profileId, elapsed)
            }
        }
        const questionnaireInProgressInfo: { count: number; maxWaitMinutes: number; avgWaitMinutes: number } = {
            count: uniqueInProgressProfiles.size,
            maxWaitMinutes: 0,
            avgWaitMinutes: 0,
        }
        if (uniqueInProgressProfiles.size > 0) {
            const times = Array.from(uniqueInProgressProfiles.values())
            questionnaireInProgressInfo.maxWaitMinutes = Math.max(...times)
            questionnaireInProgressInfo.avgWaitMinutes = Math.round(times.reduce((a, b) => a + b, 0) / times.length)
        }

        // 3d. waitingUsersリスト構築（問診未着手 + 入力中）
        const waitingUsersMap = new Map<string, any>()
        for (const row of waitingForQuestionnaireRows) {
            if (!waitingUsersMap.has(row.profileId)) {
                const createdAt = new Date(row.profileCreatedAt || now)
                const childName = row.childLastName || row.childFirstName
                    ? `${row.childLastName || ''} ${row.childFirstName || ''}`.trim()
                    : null
                waitingUsersMap.set(row.profileId, {
                    profileId: row.profileId,
                    lineUserId: row.lineUserId || null,
                    lineDisplayName: row.displayName || null,
                    childName,
                    receptionNumber: row.receptionNumber || null,
                    status: 'not_started',
                    currentStep: null,
                    waitMinutes: Math.floor((now.getTime() - createdAt.getTime()) / 60000),
                    registeredAt: createdAt.toISOString(),
                })
            }
        }
        for (const row of questionnaireInProgressRows) {
            if (!waitingUsersMap.has(row.profileId)) {
                const createdAt = new Date(row.visitCreatedAt || now)
                const childName = row.childLastName || row.childFirstName
                    ? `${row.childLastName || ''} ${row.childFirstName || ''}`.trim()
                    : null
                waitingUsersMap.set(row.profileId, {
                    profileId: row.profileId,
                    lineUserId: row.lineUserId || null,
                    lineDisplayName: row.displayName || null,
                    childName,
                    receptionNumber: row.receptionNumber || null,
                    status: 'in_progress',
                    currentStep: row.currentStep,
                    waitMinutes: Math.floor((now.getTime() - createdAt.getTime()) / 60000),
                    registeredAt: createdAt.toISOString(),
                })
            }
        }
        const waitingUsers = Array.from(waitingUsersMap.values())
            .sort((a, b) => b.waitMinutes - a.waitMinutes) // 待ち時間長い順

        // 4. データを加工
        const activeSessions: any[] = []
        const recentCompleted: any[] = []
        const alerts: any[] = []

        // 受付待ち（questionnaire_completed + スタッフ未割当）の待ち時間計算用
        const waitingForScanVisits: { elapsedMinutes: number }[] = []

        const summary = {
            lineRegistered: lineRegisteredCount,
            waitingForQuestionnaire: waitingForQuestionnaireInfo,
            questionnaireInProgress: questionnaireInProgressInfo,
            questionnaireCompleted: 0,
            waitingForScan: { count: 0, maxWaitMinutes: 0, avgWaitMinutes: 0 },
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
            const parentDisplayName = visit.parentDisplayName || null
            const hasReport = reportVisitIds.has(visit.id)
            const isCompleted = status === 'published' || status === 'cancelled'
            const effectiveDate = new Date(visit.updatedAt || visit.createdAt || now)
            const elapsedMinutes = Math.floor((now.getTime() - effectiveDate.getTime()) / 60000)

            // Summary counts
            if (currentStep === 'questionnaire_completed') {
                summary.questionnaireCompleted++
                // 受付待ち: 問診完了 + スタッフ未割当
                if (!visit.staffProfileId) {
                    waitingForScanVisits.push({ elapsedMinutes })
                }
            }
            if (currentStep === 'diagnosis_started' || currentStep === 'photos_uploaded') summary.inProgress++
            if (currentStep === 'analysis_completed' || status === 'completed') summary.diagnosisCompleted++
            if (currentStep === 'line_sent' || status === 'published') summary.reportSent++

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
                    parentLineDisplayName: parentDisplayName,
                    lineUserId: visit.parentLineUserId || null,
                    receptionNumber: visit.parentReceptionNumber || null,
                    parentProfileId: visit.parentProfileId || null,
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
                    parentLineDisplayName: parentDisplayName,
                    status,
                })
            }
        }

        // 受付待ちの統計計算
        if (waitingForScanVisits.length > 0) {
            const waitTimes = waitingForScanVisits.map(v => v.elapsedMinutes)
            summary.waitingForScan = {
                count: waitingForScanVisits.length,
                maxWaitMinutes: Math.max(...waitTimes),
                avgWaitMinutes: Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length),
            }
        }

        return NextResponse.json({
            timestamp: now.toISOString(),
            summary,
            activeSessions,
            waitingUsers,
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
