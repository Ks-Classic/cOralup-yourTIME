import { STEP_TO_STATUS, VISIT_STEPS } from '@/types/visit-status'
import { statusForStep, withStepTimestamp } from '@/lib/visit-status-core'

describe('visit status mapping', () => {
  it('maps every visit step to a DB-valid lifecycle status', () => {
    const allowedStatuses = ['waiting', 'in_progress', 'completed', 'published', 'cancelled']

    for (const step of VISIT_STEPS) {
      expect(allowedStatuses).toContain(STEP_TO_STATUS[step])
      expect(statusForStep(step)).toBe(STEP_TO_STATUS[step])
    }
  })

  it('keeps detailed progress out of visits.status', () => {
    expect(STEP_TO_STATUS.questionnaire_completed).toBe('in_progress')
    expect(STEP_TO_STATUS.analysis_completed).toBe('completed')
    expect(STEP_TO_STATUS.report_generated).toBe('completed')
    expect(STEP_TO_STATUS.line_sent).toBe('published')
    expect(STEP_TO_STATUS.line_confirmed).toBe('published')
  })

  it('adds step timestamps without mutating the original object', () => {
    const original = { line_registered: '2026-01-01T00:00:00.000Z' }
    const updated = withStepTimestamp(
      original,
      'questionnaire_completed',
      new Date('2026-01-01T00:05:00.000Z')
    )

    expect(updated).toEqual({
      line_registered: '2026-01-01T00:00:00.000Z',
      questionnaire_completed: '2026-01-01T00:05:00.000Z',
    })
    expect(original).toEqual({ line_registered: '2026-01-01T00:00:00.000Z' })
  })
})
