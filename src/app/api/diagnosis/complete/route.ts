import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { visits, children, profiles, reports, lineMessageLogs } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { getStaffSession } from '@/lib/staff-auth'
import { sendPushMessageSafe } from '@/lib/line-messaging'
import { updateVisitProgress } from '@/lib/visit-status'
import { buildReportMessages } from '@/lib/line-report-message'
import { buildCurrentReportSnapshot } from '@/lib/report-snapshot'
import type { ReportSnapshotInput } from '@/lib/report-snapshot'

// Vercel Serverless: DB取得 + LINE送信で時間がかかるため60秒に延長
export const maxDuration = 60
export const dynamic = 'force-dynamic'

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN!
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://coralup-yourtime.vercel.app'

interface CompleteDiagnosisRequest extends ReportSnapshotInput {
  visitId: string
  // 送信オプション
  sendLineNotification?: boolean
}

export async function POST(request: NextRequest) {
  try {
    // スタッフ認証確認
    const session = await getStaffSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'unauthorized' },
        { status: 401 }
      )
    }

    const body: CompleteDiagnosisRequest = await request.json()
    const { visitId, sendLineNotification = true } = body

    if (!visitId) {
      return NextResponse.json(
        { success: false, error: 'visitId is required' },
        { status: 400 }
      )
    }

    // 送信時点の診断結果を必須にする。既存行の内容をそのまま
    // 送ると、再診断時に前回のレポートが誤送信されるため fail-closed とする。
    const currentSnapshot = buildCurrentReportSnapshot(body)
    if (!currentSnapshot) {
      return NextResponse.json(
        { success: false, error: 'current_report_summary_required' },
        { status: 400 }
      )
    }

    // 1. Visit情報を取得
    const visitRows = await db
      .select({
        id: visits.id,
        sessionId: visits.sessionId,
        childId: visits.childId,
        eventId: visits.eventId,
      })
      .from(visits)
      .where(eq(visits.id, visitId))
      .limit(1)

    const visit = visitRows[0]

    if (!visit) {
      return NextResponse.json(
        { success: false, error: 'visit_not_found' },
        { status: 404 }
      )
    }

    // 2. 子供情報を取得して親のLINE IDを特定
    let parentLineUserId: string | null = null
    let childName = 'お子様'

    if (visit.childId) {
      const childRows = await db
        .select({
          id: children.id,
          firstName: children.firstName,
          lastName: children.lastName,
          parentProfileId: children.parentProfileId,
        })
        .from(children)
        .where(eq(children.id, visit.childId))
        .limit(1)

      const child = childRows[0]
      if (child) {
        childName = `${child.lastName || ''} ${child.firstName || ''}`.trim() || 'お子様'

        if (child.parentProfileId) {
          const parentRows = await db
            .select({ lineUserId: profiles.lineUserId })
            .from(profiles)
            .where(eq(profiles.id, child.parentProfileId))
            .limit(1)
          parentLineUserId = parentRows[0]?.lineUserId || null
        }
      }
    }

    // 3. レポートを取得または作成
    const existingReportRows = await db
      .select()
      .from(reports)
      .where(eq(reports.visitId, visitId))
      .limit(1)

    let report = existingReportRows[0]

    if (!report) {
      const insertedReports = await db
        .insert(reports)
        .values({
          visitId,
          ...currentSnapshot,
          reportType: 'diagnosis',
        } as typeof reports.$inferInsert)
        .returning()
      report = insertedReports[0]
    } else {
      const updatedReports = await db
        .update(reports)
        .set(currentSnapshot as Partial<typeof reports.$inferInsert>)
        .where(eq(reports.id, report.id))
        .returning()
      report = updatedReports[0]
    }

    await updateVisitProgress(visitId, 'analysis_completed')

    // 5. LINE通知送信（オプション）
    let lineNotificationResult = null
    if (sendLineNotification && parentLineUserId) {
      // イベント名を個別に取得
      let eventName = undefined
      // 実装簡略化のため一旦省略、必要なら events テーブルから取得

      lineNotificationResult = await sendReportNotification({
        lineUserId: parentLineUserId,
        visitId,
        childName,
        eventName,
        sessionId: visit.sessionId,
      })
    }

    const reportUrl = `${APP_URL}/report/${visitId}`

    return NextResponse.json({
      success: true,
      report: {
        id: report.id,
        visitId,
        url: reportUrl,
      },
      lineNotification: lineNotificationResult,
      // LINE上限到達時のフォールバック情報
      ...(lineNotificationResult?.quotaExceeded && {
        quotaExceeded: true,
        fallbackMessage: 'LINE通知の月間上限に達しました。こちらのURLをお客様に直接お伝えください。',
        fallbackReportUrl: reportUrl,
      }),
    })
  } catch (error) {
    console.error('[Complete Diagnosis] Error:', error)
    return NextResponse.json(
      { success: false, error: 'server_error' },
      { status: 500 }
    )
  }
}

async function sendReportNotification(params: {
  lineUserId: string
  visitId: string
  childName: string
  eventName?: string
  sessionId: string
}): Promise<{ success: boolean; quotaExceeded?: boolean; reportUrl?: string }> {
  const { lineUserId, visitId, childName, eventName, sessionId } = params
  const reportUrl = `${APP_URL}/report/${visitId}`

  const messages = buildReportMessages({
    childName,
    reportUrl,
    eventName,
  })

  try {
    const result = await sendPushMessageSafe({
      to: lineUserId,
      messages,
    })

    const sentAt = new Date()

    // ログを記録
    await db.insert(lineMessageLogs).values({
      visitId: visitId,
      sessionId: sessionId,
      lineUserId: lineUserId,
      messageType: 'report',
      messageContent: JSON.stringify(messages),
      status: result.success ? 'success' : (result.quotaExceeded ? 'quota_exceeded' : 'failed'),
      response: result.responseData || { quotaExceeded: result.quotaExceeded },
      errorMessage: result.error || (result.quotaExceeded ? 'LINE月間送信上限に達しました' : null),
      sentAt: sentAt,
    } as typeof lineMessageLogs.$inferInsert)

    if (result.success) {
      await updateVisitProgress(visitId, 'line_sent', {
        reportSentAt: sentAt,
      })
    }

    return {
      success: result.success,
      quotaExceeded: result.quotaExceeded,
      reportUrl: reportUrl,
    }
  } catch (error) {
    console.error('[LINE Notification] Error:', error)
    return { success: false, reportUrl: reportUrl }
  }
}
