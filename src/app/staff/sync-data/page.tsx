'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Upload, Check, AlertCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface StoredDiagnosisData {
    visitId: string
    diagnosisValues: Record<string, any>
    staffNotes?: string
    photos?: any[]
    timestamp?: string
}

export default function SyncDataPage() {
    const [localData, setLocalData] = useState<StoredDiagnosisData[]>([])
    const [syncing, setSyncing] = useState(false)
    const [syncResults, setSyncResults] = useState<Record<string, 'success' | 'error' | 'pending'>>({})
    const [message, setMessage] = useState('')

    useEffect(() => {
        // ローカルストレージからデータを取得
        const foundData: StoredDiagnosisData[] = []

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key && key.startsWith('coralup_diagnosis_')) {
                try {
                    const data = JSON.parse(localStorage.getItem(key) || '{}')
                    if (data.diagnosisValues && Object.keys(data.diagnosisValues).length > 0) {
                        foundData.push({
                            visitId: key.replace('coralup_diagnosis_', ''),
                            diagnosisValues: data.diagnosisValues,
                            staffNotes: data.staffNotes,
                            photos: data.photos,
                            timestamp: data.timestamp || new Date().toISOString(),
                        })
                    }
                } catch (e) {
                    console.error('Failed to parse:', key, e)
                }
            }
        }

        setLocalData(foundData)
    }, [])

    const syncToDatabase = async () => {
        setSyncing(true)
        setMessage('')

        for (const data of localData) {
            setSyncResults(prev => ({ ...prev, [data.visitId]: 'pending' }))

            try {
                // visitIdからsessionIdを取得
                const visitRes = await fetch(`/api/staff/session?visitId=${data.visitId}`)
                const visitJson = await visitRes.json()
                const sessionId = visitJson.data?.session_id || data.visitId

                // 診断データをDBに保存
                const response = await fetch('/api/diagnoses', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sessionId,
                        diagnosisItems: data.diagnosisValues,
                        staffNotes: data.staffNotes || '',
                        photos: data.photos || [],
                    }),
                })

                if (response.ok) {
                    setSyncResults(prev => ({ ...prev, [data.visitId]: 'success' }))
                } else {
                    setSyncResults(prev => ({ ...prev, [data.visitId]: 'error' }))
                }
            } catch (error) {
                console.error('Sync error:', error)
                setSyncResults(prev => ({ ...prev, [data.visitId]: 'error' }))
            }
        }

        setSyncing(false)

        const successCount = Object.values(syncResults).filter(r => r === 'success').length
        setMessage(`${successCount}/${localData.length} 件の同期が完了しました`)
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="max-w-md mx-auto space-y-4">
                <div className="flex items-center gap-2">
                    <Link href="/staff">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="w-4 h-4 mr-1" />
                            戻る
                        </Button>
                    </Link>
                    <h1 className="text-lg font-bold">ローカルデータ同期</h1>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">
                            ローカルに保存された診断データ
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {localData.length === 0 ? (
                            <p className="text-gray-500 text-sm">
                                同期可能なデータがありません。
                                <br />
                                診断を行ったブラウザでこのページを開いてください。
                            </p>
                        ) : (
                            <>
                                <p className="text-sm text-gray-600">
                                    {localData.length} 件のデータが見つかりました
                                </p>

                                <div className="space-y-2">
                                    {localData.map((data) => (
                                        <div
                                            key={data.visitId}
                                            className="p-3 bg-white border rounded-lg flex items-center justify-between"
                                        >
                                            <div>
                                                <p className="text-sm font-medium">
                                                    Visit: {data.visitId.substring(0, 8)}...
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {Object.keys(data.diagnosisValues).length} 項目
                                                </p>
                                            </div>
                                            {syncResults[data.visitId] === 'success' && (
                                                <Check className="w-5 h-5 text-green-500" />
                                            )}
                                            {syncResults[data.visitId] === 'error' && (
                                                <AlertCircle className="w-5 h-5 text-red-500" />
                                            )}
                                            {syncResults[data.visitId] === 'pending' && (
                                                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <Button
                                    onClick={syncToDatabase}
                                    disabled={syncing || localData.length === 0}
                                    className="w-full"
                                >
                                    {syncing ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            同期中...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-4 h-4 mr-2" />
                                            データベースに同期
                                        </>
                                    )}
                                </Button>

                                {message && (
                                    <p className="text-sm text-center text-green-600">{message}</p>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                        <p className="text-sm text-blue-800">
                            💡 このページは、スマホのブラウザに一時保存された診断データをデータベースに同期します。
                            診断を行ったスマホでアクセスしてください。
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
