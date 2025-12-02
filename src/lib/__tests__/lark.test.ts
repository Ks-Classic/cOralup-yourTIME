/**
 * Lark API Client Tests
 */

import {
  convertVisitToLarkFields,
  isLarkEnabled,
  LarkApiError,
  type VisitData,
} from '../lark'

describe('Lark Client', () => {
  describe('convertVisitToLarkFields', () => {
    it('should convert visit data to Lark fields format', () => {
      const visit: VisitData = {
        id: 'visit-123',
        child_name: '山田 太郎',
        parent_name: '山田 花子',
        status: 'waiting',
        staff_name: 'スタッフA',
        visit_date: '2024-12-02T10:00:00Z',
        reception_number: 'A001',
        event_name: '展示会2024',
        child_age_months: 36,
        diagnosis_summary: 'A判定',
      }

      const fields = convertVisitToLarkFields(visit)

      expect(fields.visit_id).toBe('visit-123')
      expect(fields.child_name).toBe('山田 太郎')
      expect(fields.parent_name).toBe('山田 花子')
      expect(fields.status).toBe('waiting')
      expect(fields.staff_name).toBe('スタッフA')
      expect(fields.reception_number).toBe('A001')
      expect(fields.event_name).toBe('展示会2024')
      expect(fields.child_age_months).toBe(36)
      expect(fields.diagnosis_summary).toBe('A判定')
      expect(fields.visit_time).toBe(new Date('2024-12-02T10:00:00Z').getTime())
      expect(fields.updated_at).toBeDefined()
    })

    it('should handle missing optional fields', () => {
      const visit: VisitData = {
        id: 'visit-456',
        status: 'in_progress',
      }

      const fields = convertVisitToLarkFields(visit)

      expect(fields.visit_id).toBe('visit-456')
      expect(fields.child_name).toBe('')
      expect(fields.parent_name).toBe('')
      expect(fields.status).toBe('in_progress')
      expect(fields.staff_name).toBe('')
      expect(fields.visit_time).toBeNull()
      expect(fields.reception_number).toBe('')
    })
  })

  describe('isLarkEnabled', () => {
    it('should return false when environment variables are not set', () => {
      // デフォルトでは環境変数が未設定なのでfalse
      expect(isLarkEnabled()).toBe(false)
    })
  })

  describe('LarkApiError', () => {
    it('should create error with message and code', () => {
      const error = new LarkApiError('Test error', 500)

      expect(error.message).toBe('Test error')
      expect(error.code).toBe(500)
      expect(error.name).toBe('LarkApiError')
    })
  })
})

