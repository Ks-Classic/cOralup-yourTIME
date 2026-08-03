export interface EventInsightEvent {
  id: string
  eventKey: string
  name: string
  startDate: string | null
  endDate: string | null
  venue: string | null
  visitCount: number
}

export interface InsightDistribution {
  label: string
  count: number
}

export interface InsightResponse {
  id: string
  category: string
  label: string
  value: string
}

export interface InsightItemDistribution {
  id: string
  category: string
  label: string
  total: number
  values: Array<{
    label: string
    count: number
  }>
}

export interface EventInsightRecord {
  id: string
  reference: string
  arrivedAt: string | null
  diagnosisStartedAt: string | null
  diagnosisMinutes: number | null
  ageMonths: number | null
  gender: 'male' | 'female' | 'other' | 'unknown'
  siblingCount: number
  status: string
  currentStep: string | null
  questionnaireCompleted: boolean
  diagnosisCompleted: boolean
  reportCompleted: boolean
  questionnaire: InsightResponse[]
  diagnosis: InsightResponse[]
}

export interface EventInsightsResponse {
  generatedAt: string
  events: EventInsightEvent[]
  selectedEvent: EventInsightEvent
  overview: {
    visits: number
    questionnaires: number
    diagnoses: number
    reports: number
    averageAgeYears: number | null
    averageDiagnosisMinutes: number | null
    siblingVisits: number
  }
  distributions: {
    age: InsightDistribution[]
    gender: InsightDistribution[]
    siblings: InsightDistribution[]
    arrivalTime: InsightDistribution[]
    diagnosisTime: InsightDistribution[]
    diagnosisDuration: InsightDistribution[]
  }
  questionnaireDistributions: InsightItemDistribution[]
  diagnosisDistributions: InsightItemDistribution[]
  records: EventInsightRecord[]
}
