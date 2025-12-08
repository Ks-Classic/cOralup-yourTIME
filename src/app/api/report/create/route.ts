import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return null
  }
  return createClient(url, key)
}

interface CreateReportRequest {
  visitId: string
  diagnosisId: string
  aiSummary: string
  ageConsideration?: string
  postureAnalysis?: {
    overallScore: number
    issues: string[]
  }
  oralAnalysis?: {
    overallScore: number
    issues: string[]
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      )
    }

    const body: CreateReportRequest = await request.json()
    
    const reportUuid = uuidv4()
    
    const { data, error } = await supabase
      .from('reports')
      .insert({
        uuid: reportUuid,
        visit_id: body.visitId,
        diagnosis_id: body.diagnosisId,
        ai_summary: body.aiSummary,
        age_consideration: body.ageConsideration,
        posture_analysis: body.postureAnalysis,
        oral_analysis: body.oralAnalysis,
        status: 'draft'
      })
      .select()
      .single()
    
    if (error) throw error

    const reportUrl = `${process.env.NEXT_PUBLIC_APP_URL}/report/${reportUuid}`
    
    return NextResponse.json({
      success: true,
      reportId: data.id,
      uuid: reportUuid,
      url: reportUrl
    })
    
  } catch (error) {
    console.error('Report creation error:', error)
    return NextResponse.json(
      { error: 'レポート作成に失敗しました' },
      { status: 500 }
    )
  }
}


