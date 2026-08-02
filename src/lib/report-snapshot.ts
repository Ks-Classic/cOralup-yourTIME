export interface ReportSnapshotInput {
  diagnosisId?: string
  aiSummary?: string
  ageConsideration?: string
  postureAnalysis?: {
    overallScore: number
    issues: string[]
  }
  oralAnalysis?: {
    overallScore: number
    issues: string[]
  }
}

export function buildCurrentReportSnapshot(input: ReportSnapshotInput) {
  const aiSummary = input.aiSummary?.trim()

  if (!aiSummary) {
    return null
  }

  return {
    diagnosisId: input.diagnosisId || null,
    aiSummary,
    ageConsideration: input.ageConsideration,
    postureAnalysis: input.postureAnalysis,
    oralAnalysis: input.oralAnalysis,
    status: 'completed',
    generatedAt: new Date(),
    updatedAt: new Date(),
  }
}
