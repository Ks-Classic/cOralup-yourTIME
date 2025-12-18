import { useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { RealtimeStatusResponse, ActiveSession, CompletedSession, Alert } from '@/types/admin';

const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ローカル開発用サンプルデータ生成
function generateSampleData(): RealtimeStatusResponse {
    const now = new Date();

    const sampleActiveSessions: ActiveSession[] = [
        {
            id: 'sample-1',
            sessionId: 'ABC123',
            status: 'in_progress',
            currentStep: 'diagnosis_started',
            childName: '田中 太郎',
            childAge: 6,
            staffName: '山田',
            createdAt: new Date(now.getTime() - 25 * 60 * 1000).toISOString(),
            updatedAt: new Date(now.getTime() - 12 * 60 * 1000).toISOString(),
            currentStatusSince: new Date(now.getTime() - 12 * 60 * 1000).toISOString(),
            elapsedMinutes: 12,
            hasReport: false,
            progress: { photos: { current: 2, total: 3 }, diagnosisItems: { current: 15, total: 25 } },
            visitDate: new Date(now.getTime() - 25 * 60 * 1000).toISOString()
        },
        {
            id: 'sample-2',
            sessionId: 'DEF456',
            status: 'in_progress',
            currentStep: 'questionnaire_completed',
            childName: '佐藤 花子',
            childAge: 4,
            staffName: null,
            createdAt: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
            updatedAt: new Date(now.getTime() - 18 * 60 * 1000).toISOString(),
            currentStatusSince: new Date(now.getTime() - 18 * 60 * 1000).toISOString(),
            elapsedMinutes: 18,
            hasReport: false,
            progress: { photos: { current: 0, total: 3 }, diagnosisItems: { current: 0, total: 0 } },
            visitDate: new Date(now.getTime() - 30 * 60 * 1000).toISOString()
        },
        {
            id: 'sample-3',
            sessionId: 'GHI789',
            status: 'in_progress',
            currentStep: 'questionnaire_started',
            childName: '高橋 一郎',
            childAge: 3,
            staffName: null,
            createdAt: new Date(now.getTime() - 8 * 60 * 1000).toISOString(),
            updatedAt: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
            currentStatusSince: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
            elapsedMinutes: 5,
            hasReport: false,
            progress: { photos: { current: 0, total: 3 }, diagnosisItems: { current: 0, total: 0 } },
            visitDate: new Date(now.getTime() - 8 * 60 * 1000).toISOString()
        },
        {
            id: 'sample-4',
            sessionId: 'JKL012',
            status: 'completed',
            currentStep: 'analysis_completed',
            childName: '伊藤 美咲',
            childAge: 7,
            staffName: '佐藤',
            createdAt: new Date(now.getTime() - 45 * 60 * 1000).toISOString(),
            updatedAt: new Date(now.getTime() - 3 * 60 * 1000).toISOString(),
            currentStatusSince: new Date(now.getTime() - 3 * 60 * 1000).toISOString(),
            elapsedMinutes: 3,
            hasReport: true,
            progress: { photos: { current: 3, total: 3 }, diagnosisItems: { current: 25, total: 25 } },
            visitDate: new Date(now.getTime() - 45 * 60 * 1000).toISOString()
        },
        {
            id: 'sample-5',
            sessionId: 'MNO345',
            status: 'in_progress',
            currentStep: 'questionnaire_completed',
            childName: '渡辺 健太',
            childAge: 5,
            staffName: null,
            createdAt: new Date(now.getTime() - 50 * 60 * 1000).toISOString(),
            updatedAt: new Date(now.getTime() - 28 * 60 * 1000).toISOString(),
            currentStatusSince: new Date(now.getTime() - 28 * 60 * 1000).toISOString(),
            elapsedMinutes: 28,
            hasReport: false,
            progress: { photos: { current: 0, total: 3 }, diagnosisItems: { current: 0, total: 0 } },
            visitDate: new Date(now.getTime() - 50 * 60 * 1000).toISOString()
        },
    ];

    const sampleRecentCompleted: CompletedSession[] = [
        {
            id: 'completed-1',
            sessionId: 'PQR678',
            childName: '山本 次郎',
            childAge: 8,
            staffName: '鈴木',
            completedAt: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
            reportSentAt: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
            status: 'published'
        },
        {
            id: 'completed-2',
            sessionId: 'STU901',
            childName: '小林 さくら',
            childAge: 6,
            staffName: '高橋',
            completedAt: new Date(now.getTime() - 35 * 60 * 1000).toISOString(),
            reportSentAt: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
            status: 'published'
        },
        {
            id: 'completed-3',
            sessionId: 'VWX234',
            childName: '中村 大輝',
            childAge: 4,
            staffName: '田中',
            completedAt: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
            reportSentAt: new Date(now.getTime() - 55 * 60 * 1000).toISOString(),
            status: 'published'
        },
    ];

    const sampleAlerts: Alert[] = [
        {
            id: 'alert-sample-5',
            sessionId: 'MNO345',
            childName: '渡辺 健太',
            childAge: 5,
            type: 'critical',
            condition: 'qr_waiting_long',
            elapsedMinutes: 28,
            message: 'QR待ち時間が限界を超えています - スタッフの対応をお願いします'
        },
        {
            id: 'alert-sample-2',
            sessionId: 'DEF456',
            childName: '佐藤 花子',
            childAge: 4,
            type: 'warning',
            condition: 'qr_waiting_long',
            elapsedMinutes: 18,
            message: 'QR待ち時間が長くなっています'
        },
    ];

    return {
        timestamp: now.toISOString(),
        summary: {
            lineRegistered: 25,
            questionnaireCompleted: 2,
            inProgress: 1,
            diagnosisCompleted: 1,
            reportSent: 18
        },
        activeSessions: sampleActiveSessions,
        recentCompleted: sampleRecentCompleted,
        alerts: sampleAlerts
    };
}

export function useRealtimeStatus(useSampleData = false) {
    const [data, setData] = useState<RealtimeStatusResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

    const fetchData = useCallback(async () => {
        // サンプルデータモードの場合
        if (useSampleData) {
            setData(generateSampleData());
            setLastUpdated(new Date());
            setLoading(false);
            return;
        }

        try {
            const now = new Date();

            // 1. Fetch Visits (Active & Recent Completed)
            // Need photos and reports count/existence
            // Note: Supabase JS select can get relation counts/data.
            // Assuming relations: visits -> photos (via visit_id), visits -> reports (via visit_id)

            const todayStart = new Date(now);
            todayStart.setHours(0, 0, 0, 0);

            const { data: visits, error: visitsError } = await supabase
                .from('visits')
                .select(`
                  id,
                  session_id,
                  status,
                  current_step,
                  created_at,
                  updated_at,
                  staff_profile_id,
                  children (
                    first_name,
                    last_name,
                    birthday
                  ),
                  profiles!visits_staff_profile_id_fkey (
                    last_name,
                    first_name,
                    display_name
                  ),
                  reports!reports_visit_id_fkey (id)
                `)
                .gte('created_at', todayStart.toISOString())
                .order('created_at', { ascending: false });

            if (visitsError) throw visitsError;

            // 2. Fetch Profiles for summary count
            const { count: lineRegisteredCount, error: profileError } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', todayStart.toISOString());

            if (profileError) throw profileError;

            // Process Data
            const activeSessions: ActiveSession[] = [];
            const recentCompleted: CompletedSession[] = [];
            const alerts: Alert[] = [];

            const summary = {
                lineRegistered: lineRegisteredCount || 0,
                questionnaireCompleted: 0,
                inProgress: 0,
                diagnosisCompleted: 0,
                reportSent: 0
            };

            visits?.forEach((visit: any) => {
                const status = visit.status;
                const currentStep = visit.current_step;
                const childName = visit.children ? `${visit.children.last_name || ''} ${visit.children.first_name || ''}`.trim() : 'Unknown';
                const age = visit.children?.birthday ? Math.floor((now.getTime() - new Date(visit.children.birthday).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 0;
                const staffName = visit.profiles ? (visit.profiles.display_name || `${visit.profiles.last_name || ''} ${visit.profiles.first_name || ''}`) : null;

                const photosCount = 0;
                const hasReport = visit.reports && visit.reports.length > 0;

                // Summary Counts
                // Note: Keep lineRegisteredCount from profiles or visits? 
                // Using mapping:
                if (status === 'in_progress' && (currentStep === 'questionnaire_completed' || !currentStep)) summary.questionnaireCompleted++;
                if (status === 'in_progress' && (currentStep === 'diagnosis_started' || currentStep === 'photos_uploaded')) summary.inProgress++;
                if (status === 'completed') summary.diagnosisCompleted++;
                if (status === 'published') summary.reportSent++;

                const isCompleted = status === 'published' || status === 'cancelled';

                const effectiveDate = new Date(visit.updated_at || visit.created_at);
                const elapsedMs = now.getTime() - effectiveDate.getTime();
                const elapsedMinutes = Math.floor(elapsedMs / 60000);

                if (!isCompleted) {
                    activeSessions.push({
                        id: visit.id,
                        sessionId: visit.session_id,
                        status,
                        currentStep,
                        childName,
                        childAge: age,
                        staffName,
                        createdAt: visit.created_at,
                        updatedAt: visit.updated_at,
                        currentStatusSince: visit.updated_at, // Use updated_at for status duration
                        elapsedMinutes,
                        hasReport,
                        progress: {
                            photos: { current: photosCount, total: 3 },
                            diagnosisItems: { current: 0, total: 0 }
                        },
                        visitDate: visit.created_at
                    });

                    // Alerts
                    if (currentStep === 'questionnaire_completed' && elapsedMinutes >= 15) {
                        alerts.push({
                            id: `alert-${visit.id}`,
                            sessionId: visit.session_id,
                            childName,
                            childAge: age,
                            type: elapsedMinutes >= 25 ? 'critical' : 'warning',
                            condition: 'qr_waiting_long',
                            elapsedMinutes,
                            message: elapsedMinutes >= 25 ? '診断待ち時間が限界を超えています' : '診断待ち時間が長くなっています'
                        });
                    }
                    if (currentStep === 'diagnosis_started' && elapsedMinutes >= 25) {
                        alerts.push({
                            id: `alert-${visit.id}`,
                            sessionId: visit.session_id,
                            childName,
                            childAge: age,
                            type: elapsedMinutes >= 35 ? 'critical' : 'warning',
                            condition: 'diagnosis_long',
                            elapsedMinutes,
                            message: elapsedMinutes >= 35 ? '診断時間が限界を超えています' : '診断時間が長くなっています'
                        });
                    }
                } else {
                    recentCompleted.push({
                        id: visit.id,
                        sessionId: visit.session_id,
                        childName,
                        childAge: age,
                        staffName: staffName || '',
                        completedAt: visit.updated_at,
                        reportSentAt: status === 'published' ? visit.updated_at : null,
                        status
                    });
                }
            });

            setData({
                timestamp: now.toISOString(),
                summary,
                activeSessions,
                recentCompleted: recentCompleted.slice(0, 10),
                alerts
            });
            setLastUpdated(now);
            setLoading(false);

        } catch (err: any) {
            console.error('Error fetching realtime status:', err);
            setError(err);
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000); // 5 sec Polling
        return () => clearInterval(interval);
    }, [fetchData]);

    return { data, loading, error, lastUpdated };
}
