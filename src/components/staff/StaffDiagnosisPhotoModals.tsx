'use client'

import Image from 'next/image'
import { Camera, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface StaffDiagnosisPhotoPreviewModalProps {
  imageUrl: string
  label: string
  isSaving?: boolean
  onCancel: () => void
  onRetake: () => void
  onSave: () => void
}

interface StaffDiagnosisPhotoViewerModalProps {
  imageUrl: string
  label: string
  onClose: () => void
  onRetake: () => void
}

export function StaffDiagnosisPhotoPreviewModal({
  imageUrl,
  label,
  isSaving = false,
  onCancel,
  onRetake,
  onSave,
}: StaffDiagnosisPhotoPreviewModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black z-[9999] flex flex-col"
      style={{
        touchAction: 'none',
        overscrollBehavior: 'none',
      }}
    >
      <div
        className="flex-1 flex items-center justify-center p-2 overflow-hidden"
        style={{ maxHeight: '60vh' }}
      >
        <Image
          src={imageUrl}
          alt="プレビュー"
          className="max-w-full max-h-full object-contain rounded-lg"
          width={900}
          height={1200}
          unoptimized
        />
      </div>

      <div className="bg-black p-4 flex flex-col justify-center" style={{ height: '40vh' }}>
        <div className="text-center text-white mb-4">
          <p className="text-lg font-semibold">{label}</p>
          <p className="text-sm text-gray-300 mt-1">この写真でよろしいですか？</p>
        </div>

        <div className="flex gap-3 max-w-md mx-auto w-full">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1 h-14 bg-white/10 border-white/30 text-white hover:bg-white/20 text-base"
          >
            <X className="w-5 h-5 mr-2" />
            キャンセル
          </Button>
          <Button
            variant="outline"
            onClick={onRetake}
            className="flex-1 h-14 bg-yellow-500/30 border-yellow-500/50 text-yellow-200 hover:bg-yellow-500/40 text-base"
          >
            <Camera className="w-5 h-5 mr-2" />
            撮り直す
          </Button>
          <Button
            onClick={onSave}
            disabled={isSaving}
            className="flex-1 h-14 bg-green-600 hover:bg-green-700 text-white text-base font-bold disabled:bg-green-400"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                保存中...
              </>
            ) : (
              <>
                <Check className="w-5 h-5 mr-2" />
                保存
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function StaffDiagnosisPhotoViewerModal({
  imageUrl,
  label,
  onClose,
  onRetake,
}: StaffDiagnosisPhotoViewerModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black z-[9999] flex flex-col"
      style={{
        touchAction: 'none',
        overscrollBehavior: 'none',
      }}
    >
      <div
        className="flex-1 flex items-center justify-center p-2 overflow-hidden"
        style={{ maxHeight: '65vh' }}
      >
        <Image
          src={imageUrl}
          alt={label}
          className="max-w-full max-h-full object-contain rounded-lg"
          width={900}
          height={1200}
          unoptimized
        />
      </div>

      <div className="bg-black p-4 flex flex-col justify-center" style={{ height: '35vh' }}>
        <div className="text-center text-white mb-4">
          <p className="text-lg font-semibold">{label}</p>
          <p className="text-sm text-gray-300 mt-1">撮影済みの写真</p>
        </div>

        <div className="flex gap-3 max-w-md mx-auto w-full">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 h-14 bg-white/10 border-white/30 text-white hover:bg-white/20 text-base"
          >
            <X className="w-5 h-5 mr-2" />
            戻る
          </Button>
          <Button
            onClick={onRetake}
            className="flex-1 h-14 bg-yellow-500 hover:bg-yellow-600 text-white text-base font-bold"
          >
            <Camera className="w-5 h-5 mr-2" />
            再撮影
          </Button>
        </div>
      </div>
    </div>
  )
}
