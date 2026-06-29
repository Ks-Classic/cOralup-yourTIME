import { STEP_TO_STATUS, VisitStep } from '@/types/visit-status'

export type StepTimestamps = Record<string, string>

export function statusForStep(step: VisitStep) {
  return STEP_TO_STATUS[step]
}

export function withStepTimestamp(
  current: unknown,
  step: VisitStep,
  at: Date = new Date()
): StepTimestamps {
  const timestamps =
    current && typeof current === 'object' && !Array.isArray(current)
      ? { ...(current as StepTimestamps) }
      : {}

  timestamps[step] = at.toISOString()
  return timestamps
}
