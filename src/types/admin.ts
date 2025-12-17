export interface ActiveSession {
    id: string; // visit_id (UUID)
    sessionId: string; // session_id (short ID)
    status: string;
    childName: string;
    childAge: number;
    staffName: string | null;
    createdAt: string; // ISO string
    updatedAt: string; // ISO string
    currentStatusSince: string;
    elapsedMinutes: number;
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
    completedAt: string;
    reportSentAt: string | null;
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

export interface RealtimeStatusResponse {
    timestamp: string;
    summary: {
        lineRegistered: number;
        questionnaireCompleted: number;
        inProgress: number;
        diagnosisCompleted: number;
        reportSent: number;
    };
    activeSessions: ActiveSession[];
    recentCompleted: CompletedSession[];
    alerts: Alert[];
}

export interface SessionEvent {
    type: 'line_registered' | 'questionnaire_completed' | 'diagnosis_started'
    | 'report_created' | 'line_sent' | 'diagnosis_completed';
    sessionId: string;
    childName: string;
    childAge: number;
    staffName?: string;
    timestamp: string;
}
