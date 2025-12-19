import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { reports } from '@/db/schema'
import { eq } from 'drizzle-orm'

function getAppUrl() {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
  const fallback = 'https://coralup-yourtime.vercel.app'
  return (envUrl || baseUrl || fallback).replace(/\/+$/, '')
}

interface CreateReportRequest {
  visitId: string
  diagnosisId?: string
  aiSummary: string
  ageConsideration?: string
  postureAnalysis?: {
    overallScore: number
    issues: string[]
  }
  oralAnalysis?: {
    overallScore: number
    issues: string[]
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateReportRequest = await request.json()

    // 既存レポートがあるか確認
    const existingRows = await db
      .select({ id: reports.id })
      .from(reports)
      .where(eq(reports.visitId, body.visitId))
      .limit(1)

    let report

    const reportData = {
      visitId: body.visitId,
      diagnosisId: body.diagnosisId as any || null,
      aiSummary: body.aiSummary,
      ageConsideration: body.ageConsideration,
      postureAnalysis: body.postureAnalysis,
      oralAnalysis: body.oralAnalysis,
      status: 'draft',
      updatedAt: new Date(),
    }

    if (existingRows.length > 0) {
      // 更新
      const updatedRows = await db
        .update(reports)
        .set(reportData as Partial<typeof reports.$inferInsert>)
        .where(eq(reports.id, existingRows[0].id))
        .returning()
      report = updatedRows[0]
    } else {
      // 作成
      const insertedRows = await db
        .insert(reports)
        .values(reportData as typeof reports.$inferInsert)
        .returning()
      report = insertedRows[0]
    }

    const appUrl = getAppUrl()
    const reportUrl = `${appUrl}/report/${body.visitId}`

    return NextResponse.json({
      success: true,
      reportId: report.id,
      visitId: body.visitId,
      url: reportUrl
    })

  } catch (error) {
    console.error('Report creation error:', error)
    return NextResponse.json(
      { error: 'レポート作成に失敗しました' },
      { status: 500 }
    )
  }
}
