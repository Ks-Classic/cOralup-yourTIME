import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { visits } from '@/db/schema'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { visitId, errorType, errorMessage } = body

    if (!visitId || !errorType || !errorMessage) {
      return NextResponse.json(
        { error: 'visitId, errorType, and errorMessage are required' },
        { status: 400 }
      )
    }

    // 現在のエラー情報を取得
    const currentVisitRows = await db
      .select({ errorInfo: visits.errorInfo })
      .from(visits)
      .where(eq(visits.id, visitId))
      .limit(1)

    if (currentVisitRows.length === 0) {
      return NextResponse.json(
        { error: 'Visit not found' },
        { status: 404 }
      )
    }

    const currentVisit = currentVisitRows[0]

    // エラー情報を更新
    const errorInfo = {
      type: errorType,
      message: errorMessage,
      occurred_at: new Date().toISOString(),
    }

    // 既存のエラー情報がある場合は配列に追加、なければ新規作成
    const existingErrors = currentVisit?.errorInfo
      ? (Array.isArray(currentVisit.errorInfo)
        ? currentVisit.errorInfo
        : [currentVisit.errorInfo])
      : []

    const updatedErrors = [...existingErrors, errorInfo]

    // 更新実行
    await db
      .update(visits)
      .set({
        errorInfo: updatedErrors,
        updatedAt: new Date(),
      } as Partial<typeof visits.$inferInsert>)
      .where(eq(visits.id, visitId))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in record-error API:', error)
    return NextResponse.json(
      { error: 'サーバーエラー' },
      { status: 500 }
    )
  }
}
