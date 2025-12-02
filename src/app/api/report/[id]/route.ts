import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    // reportsテーブルからデータ取得
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select(`
        *,
        visit:visits(
          *,
          child:children(*),
          event:events(*)
        ),
        diagnosis:oral_diagnoses(*),
        questionnaire:questionnaires(*)
      `)
      .eq('uuid', id)
      .single()
    
    if (reportError || !report) {
      return NextResponse.json(
        { error: 'レポートが見つかりません' },
        { status: 404 }
      )
    }

    // 写真URLを署名付きURLに変換
    const photoUrls: Record<string, string> = {}
    if (report.diagnosis?.photo_urls) {
      for (const [key, path] of Object.entries(report.diagnosis.photo_urls)) {
        if (path) {
          const { data } = await supabase.storage
            .from('diagnosis-photos')
            .createSignedUrl(path as string, 86400)
          if (data?.signedUrl) {
            photoUrls[key] = data.signedUrl
          }
        }
      }
    }

    // レスポンス整形
    const responseData = {
      id: report.uuid,
      childName: report.visit?.child?.name || '',
      childAge: report.visit?.child?.age_years || 0,
      childAgeMonths: report.visit?.child?.age_months,
      parentName: report.visit?.child?.parent_name || '',
      eventName: report.visit?.event?.name || '',
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


