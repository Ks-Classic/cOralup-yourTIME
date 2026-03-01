
export type VisitStatus = 'waiting' | 'in_progress' | 'completed' | 'published' | 'cancelled';
export type VisitStep = 'line_registered' | 'questionnaire_started' | 'questionnaire_completed' | 'diagnosis_started' | 'photos_uploaded' | 'analysis_completed' | 'report_generated' | 'line_sent' | 'line_confirmed';

export interface ActiveSession {
    id: string; // visit_id (UUID)
    sessionId: string; // session_id (short ID)
    status: VisitStatus;
    currentStep?: VisitStep;
    childName: string;
    childAge: number;
    staffName: string | null;
    parentLineDisplayName: string | null;
    createdAt: string; // ISO string
    updatedAt: string; // ISO string
    currentStatusSince: string;
    elapsedMinutes: number;
    visitDate: string; // Added for sort
    hasReport?: boolean;
    progress?: {
        photos: { current: number; total: number };
        diagnosisItems: { current: number; total: number };
    };
}

export interface CompletedSession {
    id: string;
    sessionId: string;
    childName: string;
    childAge: number;
    staffName: string;
    parentLineDisplayName: string | null;
    completedAt: string;
    reportSentAt: string | null;
    status: VisitStatus;
}

export interface Alert {
    id: string;
    sessionId: string;
    childName: string;
    childAge: number;
    type: 'warning' | 'critical';
    condition: 'qr_waiting_long' | 'diagnosis_long';
    elapsedMinutes: number;
    message: string;
}

export interface WaitingQueueInfo {
    count: number;
    maxWaitMinutes: number;
    avgWaitMinutes: number;
}

export interface RealtimeStatusResponse {
    timestamp: string;
    summary: {
        lineRegistered: number;
        waitingForQuestionnaire: number; // LINE登録済・問診未着手
        questionnaireCompleted: number;
        waitingForScan: WaitingQueueInfo; // 問診完了・受付待ち（待ち時間付き）
        inProgress: number;
        diagnosisCompleted: number;
        reportSent: number;
    };
    activeSessions: ActiveSession[];
    recentCompleted: CompletedSession[];
    alerts: Alert[];
}

export interface SessionEvent {
    type: VisitStep;
    sessionId: string;
    childName: string;
    childAge: number;
    staffName?: string;
    timestamp: string;
}
