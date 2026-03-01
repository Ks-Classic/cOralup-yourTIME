import { useState, useEffect, useCallback } from 'react';
import { RealtimeStatusResponse } from '@/types/admin';

// ローカル開発用サンプルデータ生成
function generateSampleData(): RealtimeStatusResponse {
    const now = new Date();
    return {
        timestamp: now.toISOString(),
        summary: {
            lineRegistered: 25,
            questionnaireCompleted: 2,
            inProgress: 1,
            diagnosisCompleted: 1,
            reportSent: 18
        },
        activeSessions: [],
        recentCompleted: [],
        alerts: []
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
            const res = await fetch('/api/admin/realtime-status');
            if (!res.ok) {
                throw new Error(`API error: ${res.status}`);
            }
            const json: RealtimeStatusResponse = await res.json();
            setData(json);
            setLastUpdated(new Date());
            setLoading(false);
        } catch (err: any) {
            console.error('Error fetching realtime status:', err);
            setError(err);
            setLoading(false);
        }
    }, [useSampleData]);

    useEffect(() => {
        fetchData();
        // サンプルデータモードの場合はポーリング不要
        if (!useSampleData) {
            const interval = setInterval(fetchData, 5000); // 5 sec Polling
            return () => clearInterval(interval);
        }
    }, [fetchData, useSampleData]);

    return { data, loading, error, lastUpdated };
}
