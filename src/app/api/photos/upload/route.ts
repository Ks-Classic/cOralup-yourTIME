import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase クライアント (Service Role)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type PhotoType = 'posture_front' | 'posture_side' | 'oral_front' | 'oral_upper' | 'oral_lower' | 'oral_side' | 'oral_closeup'

interface UploadRequest {
  visitId?: string
  sessionId?: string
  eventId?: string
  photoType: PhotoType
}

/**
 * POST: 写真をアップロードしてvisit_photosに記録
 * multipart/form-data: file + metadata
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const visitId = formData.get('visitId') as string | null
    const sessionId = formData.get('sessionId') as string | null
    const eventId = formData.get('eventId') as string | null
    const photoType = formData.get('photoType') as PhotoType | null

    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/23c1c3cb-5ba8-45ac-bbdb-86d5654b9b94', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'photos/upload/route.ts:POST', message: 'Upload request received', data: { hasFile: !!file, fileSize: file?.size, visitId, sessionId, photoType }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'J' }) }).catch(() => { });
    // #endregion

    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが必要です' },
        { status: 400 }
      )
    }

    if (!photoType) {
      return NextResponse.json(
        { error: 'photoTypeが必要です' },
        { status: 400 }
      )
    }

    if (!visitId && !sessionId) {
      return NextResponse.json(
        { error: 'visitIdまたはsessionIdが必要です' },
        { status: 400 }
      )
    }

    // バリデーション
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'ファイルサイズが10MBを超えています' },
        { status: 400 }
      )
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      return NextResponse.json(
        { error: '対応していない画像形式です（JPEG, PNG, WebPのみ）' },
        { status: 400 }
      )
    }

    // ファイル名生成
    const timestamp = Date.now()
    const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const folder = eventId || 'general'
    const identifier = visitId || sessionId
    const fileName = `${folder}/${identifier}/${photoType}_${timestamp}.${extension}`

    // Storageにアップロード
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('diagnosis-photos')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('[Photo Upload] Storage error:', uploadError)
      throw uploadError
    }

    // 公開URLを取得
    const { data: urlData } = supabase.storage
      .from('diagnosis-photos')
      .getPublicUrl(uploadData.path)

    // visit_photosテーブルに記録
    const { data: photoRecord, error: dbError } = await supabase
      .from('visit_photos')
      .insert({
        visit_id: visitId || null,
        session_id: sessionId || null,
        photo_type: photoType,
        storage_path: uploadData.path,
        public_url: urlData.publicUrl,
        file_size: file.size,
        mime_type: file.type,
        metadata: {
          original_name: file.name,
          event_id: eventId,
        },
        uploaded_at: new Date().toISOString(),
      })
      .select()
      .single()

    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/23c1c3cb-5ba8-45ac-bbdb-86d5654b9b94', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'photos/upload/route.ts:POST', message: 'DB insert result', data: { dbError: dbError?.message, photoRecordId: photoRecord?.id, visitId, photoType, storagePath: uploadData.path }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'K' }) }).catch(() => { });
    // #endregion

    if (dbError) {
      console.error('[Photo Upload] DB error:', dbError)
      // DBエラーでもアップロード自体は成功しているので警告のみ
    }

    // 全ての写真がアップロードされたか確認（3枚必要: posture_front, posture_side, oral_front）
    if (visitId) {
      const { data: allPhotos } = await supabase
        .from('visit_photos')
        .select('photo_type')
        .eq('visit_id', visitId)
        .in('photo_type', ['posture_front', 'posture_side', 'oral_front'])

      const requiredTypes = ['posture_front', 'posture_side', 'oral_front']
      const uploadedTypes = new Set(allPhotos?.map(p => p.photo_type) || [])
      const allUploaded = requiredTypes.every(type => uploadedTypes.has(type))

      if (allUploaded) {
        // ステップ更新
        const { data: currentVisit } = await supabase
          .from('visits')
          .select('step_timestamps')
          .eq('id', visitId)
          .single()

        const timestamps = (currentVisit?.step_timestamps as Record<string, string>) || {}
        timestamps.photos_uploaded = new Date().toISOString()

        await supabase
          .from('visits')
          .update({
            current_step: 'photos_uploaded',
            step_timestamps: timestamps,
          })
          .eq('id', visitId)
      }
    }

    // console.log('[Photo Upload] Success:', { path: uploadData.path, photoType, visitId, sessionId })

    return NextResponse.json({
      success: true,
      path: uploadData.path,
      url: urlData.publicUrl,
      photoId: photoRecord?.id,
    })
  } catch (error) {
    console.error('[Photo Upload] Error:', error)
    return NextResponse.json(
      { error: 'アップロードに失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * DELETE: 写真を削除
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const photoId = searchParams.get('photoId')
    const path = searchParams.get('path')

    if (!photoId && !path) {
      return NextResponse.json(
        { error: 'photoIdまたはpathが必要です' },
        { status: 400 }
      )
    }

    let storagePath = path

    // photoIdから削除する場合
    if (photoId) {
      const { data: photo } = await supabase
        .from('visit_photos')
        .select('storage_path')
        .eq('id', photoId)
        .single()

      if (photo) {
        storagePath = photo.storage_path
      }

      // DBレコード削除
      await supabase.from('visit_photos').delete().eq('id', photoId)
    }

    // Storageから削除
    if (storagePath) {
      const { error } = await supabase.storage
        .from('diagnosis-photos')
        .remove([storagePath])

      if (error) {
        console.error('[Photo Delete] Storage error:', error)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Photo Delete] Error:', error)
    return NextResponse.json(
      { error: '削除に失敗しました' },
      { status: 500 }
    )
  }
}









