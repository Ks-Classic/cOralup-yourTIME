import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { questionnaireResponses, visits } from '@/db/schema'
import { eq } from 'drizzle-orm'

interface QuestionnaireRequest {
  sessionId?: string  // 後方互換用
  visitId?: string    // 推奨
  answers: Record<string, unknown>
}

/**
 * POST: 問診回答を一括保存
 * ※ visit_id を優先使用、session_id は後方互換
 */
export async function POST(request: NextRequest) {
  try {
    const body: QuestionnaireRequest = await request.json()
    const { sessionId, visitId, answers } = body

    if (!visitId && !sessionId) {
      return NextResponse.json(
        { success: false, error: 'visitId or sessionId is required' },
        { status: 400 }
      )
    }

    // visit_idを取得（session_idからフォールバック）
    let resolvedVisitId = visitId
    if (!resolvedVisitId && sessionId) {
      const visitRows = await db
        .select({ id: visits.id })
        .from(visits)
        .where(eq(visits.sessionId, sessionId))
        .limit(1)
      resolvedVisitId = visitRows[0]?.id
    }

    // 回答をquestionnaire_responsesに保存（visit_id優先）
    const responsesToInsert = Object.entries(answers).map(([itemId, value]) => ({
      visitId: resolvedVisitId || null,
      sessionId: sessionId || null,  // 後方互換
      itemId: itemId,
      value: typeof value === 'object' ? JSON.stringify(value) : String(value),
      answeredAt: new Date(),
    }))

    if (responsesToInsert.length > 0) {
      // 既存の回答を削除してから挿入（upsert代わり）
      if (resolvedVisitId) {
        await db
          .delete(questionnaireResponses)
          .where(eq(questionnaireResponses.visitId, resolvedVisitId))
      } else if (sessionId) {
        await db
          .delete(questionnaireResponses)
          .where(eq(questionnaireResponses.sessionId, sessionId))
      }

      await db
        .insert(questionnaireResponses)
        .values(responsesToInsert as (typeof questionnaireResponses.$inferInsert)[])
    }

    // visitsステータスを更新（Two-Layer Status System）
    if (resolvedVisitId) {
      await db
        .update(visits)
        .set({
          status: 'in_progress',
          currentStep: 'questionnaire_completed',
          updatedAt: new Date(),
        } as Partial<typeof visits.$inferInsert>)
        .where(eq(visits.id, resolvedVisitId))
    }

    return NextResponse.json({
      success: true,
      savedCount: responsesToInsert.length,
      visitId: resolvedVisitId,
    })
  } catch (error) {
    console.error('[Questionnaire] Error:', error)
    return NextResponse.json(
      { success: false, error: 'server_error' },
      { status: 500 }
    )
  }
}
