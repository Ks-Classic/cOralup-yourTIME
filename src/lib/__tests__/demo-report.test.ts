import {
  getDemoReportId,
  parseDemoReportRequest,
  parseDemoReportSnapshot,
} from '../demo-report'

describe('demo report helpers', () => {
  test('parses a valid send request', () => {
    expect(
      parseDemoReportRequest({
        childName: 'デモ 花子',
        childAge: 6,
        reportSummary: '同じ分析文',
      })
    ).toEqual({
      childName: 'デモ 花子',
      childAge: 6,
      reportSummary: '同じ分析文',
    })
  })

  test('rejects missing or invalid report fields', () => {
    expect(parseDemoReportRequest({ childName: 'デモ', childAge: 6 })).toBeNull()
    expect(
      parseDemoReportRequest({
        childName: 'デモ',
        childAge: -1,
        reportSummary: '分析文',
      })
    ).toBeNull()
  })

  test('parses a persisted snapshot', () => {
    const snapshot = {
      childName: 'デモ 花子',
      childAge: 6,
      eventName: '8/2 YourTIME.8th 東京',
      diagnosisDate: '2026-08-02T01:30:00.000Z',
      summary: '同じ分析文',
    }
    expect(parseDemoReportSnapshot(snapshot)).toEqual(snapshot)
  })

  test('extracts only a valid UUID demo slug', () => {
    expect(
      getDemoReportId('demo-123e4567-e89b-42d3-a456-426614174000')
    ).toBe('123e4567-e89b-42d3-a456-426614174000')
    expect(getDemoReportId('demo-invalid')).toBeNull()
    expect(getDemoReportId('regular-id')).toBeNull()
  })
})
