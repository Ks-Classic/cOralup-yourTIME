'use client'

import { useState, useCallback, useEffect } from 'react'
import type { DiagnosisFormData, PhotoData } from '@/types/diagnosis'

interface UseDiagnosisDataOptions {
    sessionId: string
    autoSave?: boolean
    saveInterval?: number
}

export function useDiagnosisData({
    sessionId,
    autoSave = true,
    saveInterval = 5000
}: UseDiagnosisDataOptions) {
    const [formData, setFormData] = useState<DiagnosisFormData>({})
    const [photos, setPhotos] = useState<PhotoData[]>([])
    const [isSaving, setIsSaving] = useState(false)
    const [lastSaved, setLastSaved] = useState<Date | null>(null)

    // フォームデータの更新
    const updateFormData = useCallback((key: string, value: string | string[] | number) => {
        setFormData(prev => ({
            ...prev,
            [key]: value
        }))
    }, [])

    // 複数のフォームデータを一括更新
    const updateMultipleFormData = useCallback((data: DiagnosisFormData) => {
        setFormData(prev => ({
            ...prev,
            ...data
        }))
    }, [])

    // 写真の追加
    const addPhoto = useCallback((photo: PhotoData) => {
        setPhotos(prev => {
            // 同じタイプの写真があれば置き換え
            const filtered = prev.filter(p => p.type !== photo.type)
            return [...filtered, photo]
        })
    }, [])

    // 写真の削除
    const deletePhoto = useCallback((photoId: string) => {
        setPhotos(prev => prev.filter(p => p.id !== photoId))
    }, [])

    // データの保存
    const saveData = useCallback(async () => {
        if (!sessionId) return

        setIsSaving(true)
        try {
            // TODO: 実際のAPI呼び出しに置き換え
            await new Promise(resolve => setTimeout(resolve, 500))

            // ローカルストレージに保存（デモ用）
            localStorage.setItem(`diagnosis-${sessionId}`, JSON.stringify({
                formData,
                photos,
                savedAt: new Date().toISOString()
            }))

            setLastSaved(new Date())
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('データの保存に失敗しました:', error)
        } finally {
            setIsSaving(false)
        }
    }, [sessionId, formData, photos])

    // データの読み込み
    const loadData = useCallback(async () => {
        if (!sessionId) return

        try {
            // TODO: 実際のAPI呼び出しに置き換え
            const saved = localStorage.getItem(`diagnosis-${sessionId}`)
            if (saved) {
                const data = JSON.parse(saved)
                setFormData(data.formData || {})
                setPhotos(data.photos || [])
                setLastSaved(new Date(data.savedAt))
            }
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('データの読み込みに失敗しました:', error)
        }
    }, [sessionId])

    // 初回読み込み
    useEffect(() => {
        loadData()
    }, [loadData])

    // 自動保存
    useEffect(() => {
        if (!autoSave) return

        const timer = setInterval(() => {
            saveData()
        }, saveInterval)

        return () => clearInterval(timer)
    }, [autoSave, saveInterval, saveData])

    return {
        formData,
        photos,
        isSaving,
        lastSaved,
        updateFormData,
        updateMultipleFormData,
        addPhoto,
        deletePhoto,
        saveData,
        loadData
    }
}
