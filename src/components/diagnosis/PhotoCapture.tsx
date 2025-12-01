'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Camera, X } from 'lucide-react'
import { cn } from '@/utils'
import type { PhotoType, PhotoData } from '@/types/diagnosis'

interface PhotoCaptureProps {
    photoType: PhotoType
    label: string
    description?: string
    existingPhoto?: PhotoData
    onCapture: (photoData: PhotoData) => void
    onDelete?: (photoId: string) => void
}

export function PhotoCapture({
    photoType,
    label,
    description,
    existingPhoto,
    onCapture,
    onDelete
}: PhotoCaptureProps) {
    const [isCapturing, setIsCapturing] = useState(false)
    const [stream, setStream] = useState<MediaStream | null>(null)
    const videoRef = useRef<HTMLVideoElement>(null)

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            })
            setStream(mediaStream)
            setIsCapturing(true)
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream
            }
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('カメラの起動に失敗しました:', error)
            alert('カメラの起動に失敗しました')
        }
    }

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop())
            setStream(null)
        }
        setIsCapturing(false)
    }

    const capturePhoto = () => {
        if (!videoRef.current) return

        const canvas = document.createElement('canvas')
        canvas.width = videoRef.current.videoWidth
        canvas.height = videoRef.current.videoHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.drawImage(videoRef.current, 0, 0)
        const photoUrl = canvas.toDataURL('image/jpeg', 0.8)

        const newPhoto: PhotoData = {
            id: `photo-${Date.now()}`,
            url: photoUrl,
            type: photoType,
            uploaded_at: new Date().toISOString()
        }

        onCapture(newPhoto)
        stopCamera()
    }

    const handleDelete = () => {
        if (existingPhoto && onDelete) {
            onDelete(existingPhoto.id)
        }
    }

    return (
        <Card className="overflow-hidden">
            <CardContent className="p-4">
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-medium text-gray-900">{label}</h3>
                            {description && (
                                <p className="text-xs text-gray-500 mt-1">{description}</p>
                            )}
                        </div>
                        {existingPhoto && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleDelete}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        )}
                    </div>

                    {isCapturing ? (
                        <div className="space-y-3">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                className="w-full rounded-lg bg-black"
                            />
                            <div className="flex gap-2">
                                <Button
                                    onClick={capturePhoto}
                                    className="flex-1 bg-coral-500 hover:bg-coral-600"
                                >
                                    <Camera className="w-4 h-4 mr-2" />
                                    撮影
                                </Button>
                                <Button
                                    onClick={stopCamera}
                                    variant="outline"
                                    className="flex-1"
                                >
                                    キャンセル
                                </Button>
                            </div>
                        </div>
                    ) : existingPhoto ? (
                        <div className="space-y-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={existingPhoto.url}
                                alt={label}
                                className="w-full rounded-lg object-cover"
                            />
                            <Button
                                onClick={startCamera}
                                variant="outline"
                                className="w-full"
                            >
                                <Camera className="w-4 h-4 mr-2" />
                                撮り直す
                            </Button>
                        </div>
                    ) : (
                        <Button
                            onClick={startCamera}
                            variant="outline"
                            className="w-full"
                        >
                            <Camera className="w-4 h-4 mr-2" />
                            撮影する
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
