
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
    lineUserId?: string | null;
    receptionNumber?: string | null;
    parentProfileId?: string | null;
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

// 問診未着手・入力中ユーザー（visit未作成 or visit進行中）
export interface WaitingUser {
    profileId: string;
    lineUserId: string | null;
    lineDisplayName: string | null;
    childName: string | null; // 基本情報入力済みの場合のみ
    receptionNumber: string | null;
    status: 'not_started' | 'in_progress'; // 問診未着手 or 入力中
    currentStep: string | null;
    waitMinutes: number;
    registeredAt: string; // ISO string
}

export type StatusFilter = 'all' | 'waitingForQuestionnaire' | 'questionnaireInProgress' | 'waitingForScan' | 'inProgress' | 'diagnosisCompleted' | 'reportSent';

export interface RealtimeStatusResponse {
    timestamp: string;
    summary: {
        lineRegistered: number;
        waitingForQuestionnaire: WaitingQueueInfo; // LINE登録済・問診未着手（待ち時間付き）
        questionnaireInProgress: WaitingQueueInfo;  // 問診入力中（待ち時間付き）
        questionnaireCompleted: number;
        waitingForScan: WaitingQueueInfo; // 問診完了・受付待ち（待ち時間付き）
        inProgress: number;
        diagnosisCompleted: number;
        reportSent: number;
    };
    activeSessions: ActiveSession[];
    waitingUsers: WaitingUser[]; // 問診未着手・入力中ユーザーリスト
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
