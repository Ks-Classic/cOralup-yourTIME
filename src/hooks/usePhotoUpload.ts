'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface UploadResult {
  success: boolean
  url?: string
  path?: string
  error?: string
}

export type PhotoType = 'posture_front' | 'posture_side' | 'oral_front' | 'oral_upper' | 'oral_lower'

export function usePhotoUpload() {
  const [uploading, setUploading] = useState(false)

  const uploadPhoto = async (
    file: File,
    eventId: string,
    visitId: string,
    photoType: PhotoType
  ): Promise<UploadResult> => {
    // バリデーション
    if (file.size > 10 * 1024 * 1024) {
      return { success: false, error: 'ファイルサイズが10MBを超えています' }
    }
    
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      return { success: false, error: '対応していない画像形式です' }
    }
    
    setUploading(true)
    
    try {
      const timestamp = Date.now()
      const extension = file.type === 'image/png' ? 'png' : 'jpg'
      const fileName = `${eventId}/${visitId}/${photoType}_${timestamp}.${extension}`
      
      const { data, error } = await supabase.storage
        .from('diagnosis-photos')
        .upload(fileName, file, {
          contentType: file.type,
          upsert: false
        })
      
      if (error) throw error
      
      // 署名付きURL取得（24時間有効）
      const { data: urlData } = await supabase.storage
        .from('diagnosis-photos')
        .createSignedUrl(data.path, 86400)
      
      return { 
        success: true, 
        url: urlData?.signedUrl,
        path: data.path
      }
      
    } catch (error) {
      console.error('Upload error:', error)
      return { success: false, error: 'アップロードに失敗しました' }
    } finally {
      setUploading(false)
    }
  }

  const getSignedUrl = async (path: string, expiresIn: number = 86400): Promise<string | null> => {
    const { data } = await supabase.storage
      .from('diagnosis-photos')
      .createSignedUrl(path, expiresIn)
    return data?.signedUrl || null
  }
  
  return { uploadPhoto, getSignedUrl, uploading }
}

