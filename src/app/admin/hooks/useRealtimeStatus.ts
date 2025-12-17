import { useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { RealtimeStatusResponse, ActiveSession, CompletedSession, Alert } from '@/types/admin';

const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function useRealtimeStatus() {
    const [data, setData] = useState<RealtimeStatusResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

    const fetchData = useCallback(async () => {
        try {
            const now = new Date();

            // 1. Fetch Visits (Active & Recent Completed)
            // active: status != 'report_sent' OR (status == 'report_sent' AND updated_at within 1 hour?)
            // distinct active vs history logic.
            // Doc says:
            // Active: 'questionnaire_in_progress' to 'report_sent'(recent)
            // Actually strictly 'Active' is non-final. 'report_sent' is final.

            // Let's fetch "today's" visits.
            const todayStart = new Date(now);
            todayStart.setHours(0, 0, 0, 0);

            const { data: visits, error: visitsError } = await supabase
                .from('visits')
                .select(`
          id,
          session_id,
          status,
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
          )
        `)
                .gte('created_at', todayStart.toISOString())
                .order('created_at', { ascending: false });

            if (visitsError) throw visitsError;

            // 2. Fetch Profiles (for LINE registered count) - this might be expensive if many users.
            // Alternative: Count profiles created today.
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
                const childName = visit.children ? `${visit.children.last_name || ''} ${visit.children.first_name || ''}`.trim() : 'Unknown';
                const age = visit.children?.birthday ? Math.floor((now.getTime() - new Date(visit.children.birthday).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 0;
                const staffName = visit.profiles ? (visit.profiles.display_name || `${visit.profiles.last_name} ${visit.profiles.first_name}`) : null;

                // Summary Counts
                if (status === 'questionnaire_completed') summary.questionnaireCompleted++;
                if (status === 'in_progress') summary.inProgress++;
                if (status === 'diagnosis_completed') summary.diagnosisCompleted++;
                if (status === 'report_sent') summary.reportSent++;

                // Determine if Active or Completed
                const isCompleted = status === 'report_sent'; // Defined as final step

                // Calculate Times
                // We need 'currentStatusSince'. Ideally we track status changes in a log table, but for now we might use 'updated_at' if that reflects status change.
                // Assuming updated_at is roughly when status changed.
                const effectiveDate = new Date(visit.updated_at || visit.created_at);
                const elapsedMs = now.getTime() - effectiveDate.getTime();
                const elapsedMinutes = Math.floor(elapsedMs / 60000);

                if (!isCompleted) {
                    activeSessions.push({
                        id: visit.id,
                        sessionId: visit.session_id,
                        status,
                        childName,
                        childAge: age,
                        staffName,
                        createdAt: visit.created_at,
                        updatedAt: visit.updated_at,
                        currentStatusSince: visit.updated_at, // Approximate
                        elapsedMinutes,
                        // progress: ... // TODO: fetch progress
                    });

                    // Alert Logic
                    if (status === 'questionnaire_completed' && elapsedMinutes >= 15) {
                        alerts.push({
                            id: `alert-${visit.id}`,
                            sessionId: visit.session_id,
                            childName,
                            childAge: age,
                            type: elapsedMinutes >= 25 ? 'critical' : 'warning',
                            condition: 'qr_waiting_long',
                            elapsedMinutes,
                            message: elapsedMinutes >= 25 ? 'QR待ち時間が限界を超えています' : 'QR待ち時間が長くなっています'
                        });
                    }
                    if (status === 'in_progress' && elapsedMinutes >= 25) {
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
                    // Completed
                    recentCompleted.push({
                        id: visit.id,
                        sessionId: visit.session_id,
                        childName,
                        childAge: age,
                        staffName: staffName || '',
                        completedAt: visit.updated_at, // Approximate
                        reportSentAt: visit.updated_at // Approximate
                    });
                }
            });

            setData({
                timestamp: now.toISOString(),
                summary,
                activeSessions,
                recentCompleted: recentCompleted.slice(0, 10), // Top 10
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
