import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { visits, children, events, reports, diagnoses, visitPhotos } from '@/db/schema'
import { eq, desc, and, inArray } from 'drizzle-orm'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Supabase クライアント - Storage署名URL用
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    // 1. レポート取得（visitId で）
    const reportRows = await db
      .select()
      .from(reports)
      .where(eq(reports.visitId, id))
      .orderBy(desc(reports.createdAt))
      .limit(1)

    const report = reportRows[0]

    if (!report) {
      return NextResponse.json({ error: 'レポートが見つかりません' }, { status: 404 })
    }

    // 2. Visit情報取得（JOIN代わりの個別クエリまたはリレーション）
    const visitRows = await db
      .select()
      .from(visits)
      .where(eq(visits.id, id))
      .limit(1)

    const visit = visitRows[0]

    let child = null
    if (visit?.childId) {
      const childRows = await db
        .select()
        .from(children)
        .where(eq(children.id, visit.childId))
        .limit(1)
      child = childRows[0]
    }

    let event = null
    if (visit?.eventId) {
      const eventRows = await db
        .select()
        .from(events)
        .where(eq(events.id, visit.eventId))
        .limit(1)
      event = eventRows[0]
    }

    // 3. 診断データ取得
    let diagnosis = null
    if (report.diagnosisId) {
      const diagRows = await db
        .select()
        .from(diagnoses)
        .where(eq(diagnoses.id, report.diagnosisId))
        .limit(1)
      diagnosis = diagRows[0]
    }

    // 4. 写真取得（paper_questionnaireは除外）
    const photoUrls: Record<string, string> = {}
    const photos = await db
      .select({ photoType: visitPhotos.photoType, storagePath: visitPhotos.storagePath, publicUrl: visitPhotos.publicUrl })
      .from(visitPhotos)
      .where(and(
        eq(visitPhotos.visitId, id),
        inArray(visitPhotos.photoType, ['posture_front', 'posture_side', 'oral_front', 'oral_upper', 'oral_lower', 'oral_side', 'oral_closeup'])
      ))

    if (photos && photos.length > 0) {
      for (const photo of photos) {
        if (photo.photoType) {
          if (photo.publicUrl) {
            photoUrls[photo.photoType] = photo.publicUrl
          } else if (photo.storagePath) {
            const { data } = await supabase.storage
              .from('diagnosis-photos')
              .createSignedUrl(photo.storagePath, 86400)
            if (data?.signedUrl) {
              photoUrls[photo.photoType] = data.signedUrl
            }
          }
        }
      }
    }

    // フォールバック: diagnosesテーブルのphotosカラム（旧形式）
    if (Object.keys(photoUrls).length === 0 && diagnosis?.photos && Array.isArray(diagnosis.photos)) {
      for (const photo of (diagnosis.photos as any[])) {
        if (photo.path && photo.type) {
          const { data } = await supabase.storage
            .from('diagnosis-photos')
            .createSignedUrl(photo.path, 86400)
          if (data?.signedUrl) {
            photoUrls[photo.type] = data.signedUrl
          }
        }
      }
    }

    // 名前の組み立て
    const childFirstName = child?.firstName || ''
    const childFullName = [child?.lastName, child?.firstName].filter(Boolean).join(' ') || ''
    const honorific = child?.gender === 'male' ? 'くん' : child?.gender === 'female' ? 'ちゃん' : ''
    const childDisplayName = childFirstName ? `${childFirstName}${honorific}` : childFullName

    // 年齢計算
    let childAge = 0
    let childAgeMonths = visit?.childAgeMonths

    if (child?.birthday) {
      const birthDate = new Date(child.birthday)
      const today = new Date()
      childAge = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        childAge--
      }
    } else if (childAgeMonths) {
      childAge = Math.floor(childAgeMonths / 12)
    }

    const responseData = {
      id: report.visitId,
      childName: childDisplayName,
      childFullName,
      childAge,
      childAgeMonths,
      childGender: child?.gender || '',
      parentName: '', // profilesから取得する必要があるが、現在はnull
      eventName: event?.name || '',
      diagnosisDate: report.createdAt,
      photos: {
        postureSide: photoUrls.posture_side,
        postureFront: photoUrls.posture_front,
        oralFront: photoUrls.oral_front
      },
      aiAnalysis: {
        summary: report.aiSummary || '',
        ageConsideration: report.ageConsideration || ''
      },
      postureAnalysis: report.postureAnalysis,
      oralAnalysis: report.oralAnalysis
    }

    return NextResponse.json(responseData)
  } catch (error) {
    console.error('Report fetch error:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}
