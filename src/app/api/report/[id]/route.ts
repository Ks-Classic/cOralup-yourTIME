import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// キャッシュを無効化
export const dynamic = 'force-dynamic'
export const revalidate = 0

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return null
  }
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const supabase = getSupabaseClient()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      )
    }

    // reportsテーブルからvisit_idで取得（複数FKがあるため明示的に指定）
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select(`
        *,
        visit:visits!reports_visit_id_fkey(
          *,
          child:children(*),
          event:events(*)
        )
      `)
      .eq('visit_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // diagnosis_idがあればdiagnosesテーブルから取得
    let diagnosis = null
    if (report?.diagnosis_id) {
      const { data: diagnosisData } = await supabase
        .from('diagnoses')
        .select('*')
        .eq('id', report.diagnosis_id)
        .single()
      diagnosis = diagnosisData
    }

    if (reportError || !report) {
      return NextResponse.json(
        { error: 'レポートが見つかりません' },
        { status: 404 }
      )
    }

    // visit_photosテーブルから写真を取得
    const photoUrls: Record<string, string> = {}
    const { data: visitPhotos, error: photosError } = await supabase
      .from('visit_photos')
      .select('photo_type, storage_path, public_url')
      .eq('visit_id', id)

    // デバッグログ
    // console.log('[Report API] visit_photos query:', { visitId: id, photosCount: visitPhotos?.length })

    // 直接SQLで確認
    const { data: rawCheck, error: rawError } = await supabase
      .from('visit_photos')
      .select('id, visit_id')
      .limit(5)
    // console.log('[Report API] Raw visit_photos check (any 5 rows):', { rawCheck, rawError })

    if (visitPhotos && visitPhotos.length > 0) {
      for (const photo of visitPhotos) {
        if (photo.photo_type) {
          // public_urlがあればそれを使用（高速）、なければ署名付きURLを生成
          if (photo.public_url) {
            photoUrls[photo.photo_type] = photo.public_url
          } else if (photo.storage_path) {
            const { data } = await supabase.storage
              .from('diagnosis-photos')
              .createSignedUrl(photo.storage_path, 86400)
            if (data?.signedUrl) {
              photoUrls[photo.photo_type] = data.signedUrl
            }
          }
        }
      }
    }

    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/23c1c3cb-5ba8-45ac-bbdb-86d5654b9b94', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'report/[id]/route.ts:GET', message: 'Final photo URLs', data: { photoUrlKeys: Object.keys(photoUrls), hasPhotos: Object.keys(photoUrls).length > 0 }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'G' }) }).catch(() => { });
    // #endregion

    // フォールバック: diagnosesテーブルのphotosカラム（旧形式）
    if (Object.keys(photoUrls).length === 0 && diagnosis?.photos && Array.isArray(diagnosis.photos)) {
      for (const photo of diagnosis.photos) {
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

    // 子供情報の取得（visitsからchildrenへのJOIN）
    const child = report.visit?.child as {
      first_name?: string;
      last_name?: string;
      name?: string;
      birthday?: string;
      parent_name?: string;
      gender?: string;
    } | null

    // visitから月齢取得
    const visitData = report.visit as {
      child_age_months?: number;
    } | null

    // 名前の組み立て（last_name + first_name または name）
    const childFirstName = child?.first_name || ''
    const childFullName = child?.name ||
      [child?.last_name, child?.first_name].filter(Boolean).join(' ') ||
      ''

    // 性別による敬称
    const honorific = child?.gender === 'male' ? 'くん' : child?.gender === 'female' ? 'ちゃん' : ''

    // 表示用名前（下の名前 + くん/ちゃん）
    const childDisplayName = childFirstName ? `${childFirstName}${honorific}` : childFullName

    // 年齢計算（birthdayから計算、またはvisitのchild_age_monthsから）
    let childAge = 0
    let childAgeMonths = visitData?.child_age_months

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

    // レスポンス整形（idはvisit_idを使用）
    const responseData = {
      id: report.visit_id,
      childName: childDisplayName,
      childFullName,
      childAge,
      childAgeMonths,
      childGender: child?.gender || '',
      parentName: child?.parent_name || '',
      eventName: (report.visit?.event as { name?: string } | null)?.name || '',
      diagnosisDate: report.created_at,
      photos: {
        postureSide: photoUrls.posture_side,
        postureFront: photoUrls.posture_front,
        oralFront: photoUrls.oral_front
      },
      aiAnalysis: {
        summary: report.ai_summary || '',
        ageConsideration: report.age_consideration || ''
      },
      postureAnalysis: report.posture_analysis,
      oralAnalysis: report.oral_analysis
    }

    return NextResponse.json(responseData)

  } catch (error) {
    console.error('Report fetch error:', error)
    return NextResponse.json(
      { error: 'サーバーエラー' },
      { status: 500 }
    )
  }
}


