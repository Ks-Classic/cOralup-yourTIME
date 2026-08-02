import { buildCurrentReportSnapshot } from '../report-snapshot'

describe('buildCurrentReportSnapshot', () => {
  test('uses the diagnosis result supplied for the current send', () => {
    const snapshot = buildCurrentReportSnapshot({
      diagnosisId: 'diagnosis-current',
      aiSummary: ' 今回の診断結果 ',
      postureAnalysis: { overallScore: 82, issues: ['今回の所見'] },
    })

    expect(snapshot).toMatchObject({
      diagnosisId: 'diagnosis-current',
      aiSummary: '今回の診断結果',
      postureAnalysis: { overallScore: 82, issues: ['今回の所見'] },
      status: 'completed',
    })
  })

  test('rejects a send without a current report summary', () => {
    expect(buildCurrentReportSnapshot({ aiSummary: '   ' })).toBeNull()
    expect(buildCurrentReportSnapshot({})).toBeNull()
  })
})
