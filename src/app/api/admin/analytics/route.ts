import { NextResponse } from 'next/server'
import { db } from '@/db'
import { visits, children, profiles, reports, lineMessageLogs, diagnosisResponses } from '@/db/schema'
import { eq, gte, lte, sql, desc, and } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/analytics?from=YYYY-MM-DD&to=YYYY-MM-DD
 * 
 * 基礎分析レポートAPI
 * 1. 時間帯別来場者数・年齢分布・診断結果傾向
 * 2. フロー完了率（問診→診断→レポート→LINE送信）
 * 3. LINE配信状況（成功/失敗）
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const fromStr = searchParams.get('from')
        const toStr = searchParams.get('to')

        // デフォルトは全期間
        const fromDate = fromStr ? new Date(fromStr + 'T00:00:00+09:00') : new Date('2025-01-01T00:00:00+09:00')
        const toDate = toStr ? new Date(toStr + 'T23:59:59+09:00') : new Date()

        // ============================================================
        // 1. 来場概況 (Overview)
        // ============================================================
        const allVisits = await db
            .select({
                id: visits.id,
                sessionId: visits.sessionId,
                status: visits.status,
                currentStep: visits.currentStep,
                visitDate: visits.visitDate,
                createdAt: visits.createdAt,
                childAgeMonths: visits.childAgeMonths,
                childId: visits.childId,
                lineUserId: visits.lineUserId,
                reportSentAt: visits.reportSentAt,
                stepTimestamps: visits.stepTimestamps,
                isTestData: visits.isTestData,
            })
            .from(visits)
            .where(
                and(
                    gte(visits.createdAt, fromDate),
                    lte(visits.createdAt, toDate)
                )
            )
            .orderBy(desc(visits.createdAt))

        // テストデータを除外
        const realVisits = allVisits.filter(v => !v.isTestData)
        const totalVisits = realVisits.length

        // ============================================================
        // 1a. 時間帯別来場者数
        // ============================================================
        const hourlyDistribution: Record<number, number> = {}
        for (let h = 8; h <= 20; h++) hourlyDistribution[h] = 0

        realVisits.forEach(v => {
            const d = v.visitDate || v.createdAt
            if (d) {
                // UTC -> JST (+9h)
                const jstHour = (new Date(d).getUTCHours() + 9) % 24
                hourlyDistribution[jstHour] = (hourlyDistribution[jstHour] || 0) + 1
            }
        })

        // ============================================================
        // 1b. 年齢分布
        // ============================================================
        const ageGroups = {
            '0-1歳': 0,
            '2-3歳': 0,
            '4-5歳': 0,
            '6-7歳': 0,
            '8-9歳': 0,
            '10歳以上': 0,
            '不明': 0,
        }

        realVisits.forEach(v => {
            const months = v.childAgeMonths
            if (!months || months <= 0) {
                ageGroups['不明']++
            } else if (months < 24) {
                ageGroups['0-1歳']++
            } else if (months < 48) {
                ageGroups['2-3歳']++
            } else if (months < 72) {
                ageGroups['4-5歳']++
            } else if (months < 96) {
                ageGroups['6-7歳']++
            } else if (months < 120) {
                ageGroups['8-9歳']++
            } else {
                ageGroups['10歳以上']++
            }
        })

        // ============================================================
        // 1c. 日別来場者数（トレンド）
        // ============================================================
        const dailyVisits: Record<string, number> = {}
        realVisits.forEach(v => {
            const d = v.visitDate || v.createdAt
            if (d) {
                // UTC -> JST日付
                const jstDate = new Date(new Date(d).getTime() + 9 * 60 * 60 * 1000)
                const dayKey = jstDate.toISOString().split('T')[0]
                dailyVisits[dayKey] = (dailyVisits[dayKey] || 0) + 1
            }
        })

        // ============================================================
        // 2. フロー完了率（Funnel）
        // ============================================================
        // ステップ別のカウント
        const stepCounts = {
            lineRegistered: 0,      // LINE登録（visit作成 = LINE登録済み）
            questionnaireStarted: 0, // 問診開始
            questionnaireCompleted: 0, // 問診完了
            diagnosisStarted: 0,     // 診断開始
            photosUploaded: 0,       // 写真アップロード
            analysisCompleted: 0,    // 分析完了
            reportGenerated: 0,      // レポート生成
            lineSent: 0,             // LINE送信
            lineConfirmed: 0,        // LINE確認済
        }

        // ステップの進行順序（後のステップにいるなら前のステップは完了済み）
        const stepOrder = [
            'questionnaire_started',
            'questionnaire_completed',
            'diagnosis_started',
            'photos_uploaded',
            'analysis_completed',
            'report_generated',
            'line_sent',
            'line_confirmed',
        ]

        realVisits.forEach(v => {
            stepCounts.lineRegistered++ // visitがあれば登録済み

            const step = v.currentStep
            if (!step) return

            const stepIndex = stepOrder.indexOf(step)
            if (stepIndex < 0) return

            // 現在のステップ以前のステップはすべて完了とみなす
            if (stepIndex >= 0) stepCounts.questionnaireStarted++
            if (stepIndex >= 1) stepCounts.questionnaireCompleted++
            if (stepIndex >= 2) stepCounts.diagnosisStarted++
            if (stepIndex >= 3) stepCounts.photosUploaded++
            if (stepIndex >= 4) stepCounts.analysisCompleted++
            if (stepIndex >= 5) stepCounts.reportGenerated++
            if (stepIndex >= 6) stepCounts.lineSent++
            if (stepIndex >= 7) stepCounts.lineConfirmed++
        })

        // ============================================================
        // 2b. ステータス分布
        // ============================================================
        const statusDistribution: Record<string, number> = {}
        realVisits.forEach(v => {
            const key = v.status || 'unknown'
            statusDistribution[key] = (statusDistribution[key] || 0) + 1
        })

        // ============================================================
        // 3. LINE配信状況
        // ============================================================
        const lineLogsResult = await db
            .select({
                status: lineMessageLogs.status,
                messageType: lineMessageLogs.messageType,
                cnt: sql<number>`count(*)`,
            })
            .from(lineMessageLogs)
            .where(
                and(
                    gte(lineMessageLogs.createdAt, fromDate),
                    lte(lineMessageLogs.createdAt, toDate)
                )
            )
            .groupBy(lineMessageLogs.status, lineMessageLogs.messageType)

        const lineDelivery = {
            total: 0,
            success: 0,
            failed: 0,
            byType: {} as Record<string, { success: number; failed: number }>,
        }

        lineLogsResult.forEach(row => {
            const cnt = Number(row.cnt)
            lineDelivery.total += cnt
            if (row.status === 'success') {
                lineDelivery.success += cnt
            } else {
                lineDelivery.failed += cnt
            }

            const type = row.messageType || 'unknown'
            if (!lineDelivery.byType[type]) {
                lineDelivery.byType[type] = { success: 0, failed: 0 }
            }
            if (row.status === 'success') {
                lineDelivery.byType[type].success += cnt
            } else {
                lineDelivery.byType[type].failed += cnt
            }
        })

        // LINE送信失敗の詳細
        const failedLineLogs = await db
            .select({
                id: lineMessageLogs.id,
                visitId: lineMessageLogs.visitId,
                lineUserId: lineMessageLogs.lineUserId,
                messageType: lineMessageLogs.messageType,
                errorMessage: lineMessageLogs.errorMessage,
                sentAt: lineMessageLogs.sentAt,
                createdAt: lineMessageLogs.createdAt,
            })
            .from(lineMessageLogs)
            .where(
                and(
                    eq(lineMessageLogs.status, 'failed'),
                    gte(lineMessageLogs.createdAt, fromDate),
                    lte(lineMessageLogs.createdAt, toDate)
                )
            )
            .orderBy(desc(lineMessageLogs.createdAt))
            .limit(20)

        // ============================================================
        // 3b. レポート生成・送信状況
        // ============================================================
        const reportStats = await db
            .select({
                status: reports.status,
                sentToLine: reports.sentToLine,
                cnt: sql<number>`count(*)`,
            })
            .from(reports)
            .where(
                and(
                    gte(reports.createdAt, fromDate),
                    lte(reports.createdAt, toDate)
                )
            )
            .groupBy(reports.status, reports.sentToLine)

        const reportSummary = {
            total: 0,
            draft: 0,
            completed: 0,
            sent: 0,
            sentToLine: 0,
        }

        reportStats.forEach(row => {
            const cnt = Number(row.cnt)
            reportSummary.total += cnt
            if (row.status === 'draft') reportSummary.draft += cnt
            if (row.status === 'completed') reportSummary.completed += cnt
            if (row.status === 'sent') reportSummary.sent += cnt
            if (row.sentToLine) reportSummary.sentToLine += cnt
        })

        // ============================================================
        // 4. 診断結果の傾向（診断項目の回答分布）
        // ============================================================
        // 診断カテゴリ別の回答数
        const diagnosisStats = await db
            .select({
                cnt: sql<number>`count(distinct ${diagnosisResponses.visitId})`,
            })
            .from(diagnosisResponses)
            .where(
                and(
                    gte(diagnosisResponses.createdAt, fromDate),
                    lte(diagnosisResponses.createdAt, toDate)
                )
            )

        const visitsWithDiagnosis = Number(diagnosisStats[0]?.cnt || 0)

        // ============================================================
        // Response
        // ============================================================
        return NextResponse.json({
            period: {
                from: fromDate.toISOString(),
                to: toDate.toISOString(),
            },
            overview: {
                totalVisits,
                totalVisitsIncludingTest: allVisits.length,
                testDataCount: allVisits.length - realVisits.length,
            },
            hourlyDistribution,
            ageDistribution: ageGroups,
            dailyVisits,
            funnel: stepCounts,
            statusDistribution,
            lineDelivery,
            failedLineLogs: failedLineLogs.map(l => ({
                id: l.id,
                visitId: l.visitId,
                lineUserId: l.lineUserId ? `${l.lineUserId.substring(0, 8)}...` : null,
                messageType: l.messageType,
                errorMessage: l.errorMessage,
                createdAt: l.createdAt?.toISOString(),
            })),
            reportSummary,
            diagnosisSummary: {
                visitsWithDiagnosis,
                diagnosisCompletionRate: totalVisits > 0
                    ? Math.round((visitsWithDiagnosis / totalVisits) * 100)
                    : 0,
            },
            generatedAt: new Date().toISOString(),
        })
    } catch (error) {
        console.error('[Admin Analytics API] Error:', error)
        return NextResponse.json(
            { error: 'Failed to generate analytics', details: String(error) },
            { status: 500 }
        )
    }
}
