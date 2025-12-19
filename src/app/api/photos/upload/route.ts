import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { visits, visitPhotos } from '@/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { createClient } from '@supabase/supabase-js'

// Supabase クライアント (Service Role) - Storage操作用
const supabaseStorage = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type PhotoType = 'posture_front' | 'posture_side' | 'oral_front' | 'oral_upper' | 'oral_lower' | 'oral_side' | 'oral_closeup'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const visitId = formData.get('visitId') as string | null
    const sessionId = formData.get('sessionId') as string | null
    const eventId = formData.get('eventId') as string | null
    const photoType = formData.get('photoType') as PhotoType | null

    if (!file) {
      return NextResponse.json({ error: 'ファイルが必要です' }, { status: 400 })
    }

    if (!photoType) {
      return NextResponse.json({ error: 'photoTypeが必要です' }, { status: 400 })
    }

    if (!visitId && !sessionId) {
      return NextResponse.json({ error: 'visitIdまたはsessionIdが必要です' }, { status: 400 })
    }

    // バリデーション
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'ファイルサイズが10MBを超えています' }, { status: 400 })
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      return NextResponse.json({ error: '対応していない画像形式です（JPEG, PNG, WebPのみ）' }, { status: 400 })
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

    const { data: uploadData, error: uploadError } = await supabaseStorage.storage
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
    const { data: urlData } = supabaseStorage.storage
      .from('diagnosis-photos')
      .getPublicUrl(uploadData.path)

    // visit_photosテーブルに記録
    const insertedPhotos = await db
      .insert(visitPhotos)
      .values({
        visitId: visitId || null,
        sessionId: sessionId || null,
        photoType: photoType,
        storagePath: uploadData.path,
        publicUrl: urlData.publicUrl,
        metadata: {
          original_name: file.name,
          event_id: eventId,
        },
      } as typeof visitPhotos.$inferInsert)
      .returning()

    const photoRecord = insertedPhotos[0]

    // 全ての写真がアップロードされたか確認（3枚必要: posture_front, posture_side, oral_front）
    if (visitId) {
      const allPhotos = await db
        .select({ photoType: visitPhotos.photoType })
        .from(visitPhotos)
        .where(
          and(
            eq(visitPhotos.visitId, visitId),
            inArray(visitPhotos.photoType, ['posture_front', 'posture_side', 'oral_front'])
          )
        )

      const requiredTypes = ['posture_front', 'posture_side', 'oral_front']
      const uploadedTypes = new Set(allPhotos?.map(p => p.photoType) || [])
      const allUploaded = requiredTypes.every(type => uploadedTypes.has(type))

      if (allUploaded) {
        // ステップ更新
        const visitRows = await db
          .select({ stepTimestamps: visits.stepTimestamps })
          .from(visits)
          .where(eq(visits.id, visitId))
          .limit(1)

        const timestamps = (visitRows[0]?.stepTimestamps as Record<string, string>) || {}
        timestamps.photos_uploaded = new Date().toISOString()

        await db
          .update(visits)
          .set({
            currentStep: 'photos_uploaded',
            stepTimestamps: timestamps,
          } as Partial<typeof visits.$inferInsert>)
          .where(eq(visits.id, visitId))
      }
    }

    return NextResponse.json({
      success: true,
      path: uploadData.path,
      url: urlData.publicUrl,
      photoId: photoRecord?.id,
    })
  } catch (error) {
    console.error('[Photo Upload] Error:', error)
    return NextResponse.json({ error: 'アップロードに失敗しました' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const photoId = searchParams.get('photoId')
    const path = searchParams.get('path')

    if (!photoId && !path) {
      return NextResponse.json({ error: 'photoIdまたはpathが必要です' }, { status: 400 })
    }

    let storagePath = path

    // photoIdから削除する場合
    if (photoId) {
      const photoRows = await db
        .select({ storagePath: visitPhotos.storagePath })
        .from(visitPhotos)
        .where(eq(visitPhotos.id, photoId))
        .limit(1)

      const photo = photoRows[0]
      if (photo) {
        storagePath = photo.storagePath
      }

      // DBレコード削除
      await db.delete(visitPhotos).where(eq(visitPhotos.id, photoId))
    }

    // Storageから削除
    if (storagePath) {
      const { error } = await supabaseStorage.storage
        .from('diagnosis-photos')
        .remove([storagePath])

      if (error) {
        console.error('[Photo Delete] Storage error:', error)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Photo Delete] Error:', error)
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 })
  }
}
