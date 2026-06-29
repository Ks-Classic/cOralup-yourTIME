import {
  calculateDiagnosisProgressPercentage,
  calculateOverallProgressPercentage,
  isCompletedDiagnosisValue,
} from '../staff-diagnosis-progress'
import type { StaffDiagnosisStep } from '@/types/staff-diagnosis'

describe('staff diagnosis progress', () => {
  describe('isCompletedDiagnosisValue', () => {
    it('matches the legacy completion semantics', () => {
      expect(isCompletedDiagnosisValue(undefined)).toBe(false)
      expect(isCompletedDiagnosisValue(null)).toBe(false)
      expect(isCompletedDiagnosisValue('')).toBe(false)
      expect(isCompletedDiagnosisValue(false)).toBe(true)
      expect(isCompletedDiagnosisValue(0)).toBe(true)
      expect(isCompletedDiagnosisValue([])).toBe(true)
    })
  })

  describe('calculateDiagnosisProgressPercentage', () => {
    it('returns 0 when there are no diagnosis items', () => {
      expect(calculateDiagnosisProgressPercentage({ a: 'done' }, 0)).toBe(0)
    })

    it('rounds completed values over total items', () => {
      expect(calculateDiagnosisProgressPercentage({ a: 'done', b: '', c: 1 }, 3)).toBe(67)
    })
  })

  describe('calculateOverallProgressPercentage', () => {
    it('returns weighted progress for completed steps', () => {
      const completed = new Set<StaffDiagnosisStep>(['session', 'photos', 'diagnosis'])

      expect(calculateOverallProgressPercentage(completed)).toBe(70)
    })

    it('ignores start because it is not part of the visible step sequence', () => {
      const completed = new Set<StaffDiagnosisStep>(['start'])

      expect(calculateOverallProgressPercentage(completed)).toBe(0)
    })
  })
})
