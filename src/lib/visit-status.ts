import { db } from '@/db'
import { visits } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { VisitStep } from '@/types/visit-status'
import { statusForStep, withStepTimestamp } from '@/lib/visit-status-core'

export async function updateVisitProgress(
  visitId: string,
  step: VisitStep,
  additionalFields: Record<string, unknown> = {}
) {
  const rows = await db
    .select({ stepTimestamps: visits.stepTimestamps })
    .from(visits)
    .where(eq(visits.id, visitId))
    .limit(1)

  if (rows.length === 0) {
    throw new Error('visit_not_found')
  }

  const now = new Date()

  return db
    .update(visits)
    .set({
      ...additionalFields,
      status: statusForStep(step),
      currentStep: step,
      stepTimestamps: withStepTimestamp(rows[0].stepTimestamps, step, now),
      updatedAt: now,
    } as Partial<typeof visits.$inferInsert>)
    .where(eq(visits.id, visitId))
    .returning()
}

export { statusForStep, withStepTimestamp }
