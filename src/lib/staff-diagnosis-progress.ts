import { STAFF_DIAGNOSIS_STEPS, type StaffDiagnosisStep } from '@/types/staff-diagnosis'

const STEP_WEIGHTS: Record<StaffDiagnosisStep, number> = {
  start: 0,
  session: 10,
  photos: 20,
  diagnosis: 40,
  review: 10,
  analysis: 10,
  report: 10,
}

export function isCompletedDiagnosisValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== ''
}

export function calculateDiagnosisProgressPercentage(values: Record<string, unknown>, totalItems: number): number {
  if (totalItems <= 0) return 0

  const completedItems = Object.values(values).filter(isCompletedDiagnosisValue).length
  return Math.round((completedItems / totalItems) * 100)
}

export function calculateOverallProgressPercentage(completedSteps: ReadonlySet<StaffDiagnosisStep>): number {
  let totalWeight = 0
  let completedWeight = 0

  STAFF_DIAGNOSIS_STEPS.forEach(step => {
    totalWeight += STEP_WEIGHTS[step]
    if (completedSteps.has(step)) {
      completedWeight += STEP_WEIGHTS[step]
    }
  })

  return totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0
}
