import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return null
  }
  return createClient(url, key)
}

// #region agent log
function getAppUrl() {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
  const fallback = 'https://woozily-convective-libbie.ngrok-free.dev'
  // 末尾スラッシュを削除して正規化
  const url = (envUrl || baseUrl || fallback).replace(/\/+$/, '')
  fetch('http://127.0.0.1:7245/ingest/23c1c3cb-5ba8-45ac-bbdb-86d5654b9b94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'report/create/route.ts:getAppUrl',message:'ENV values (fixed)',data:{envUrl,baseUrl,normalizedUrl:url},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A',runId:'post-fix'})}).catch(()=>{});
  return url
}
// #endregion

interface CreateReportRequest {
  visitId: string
  diagnosisId?: string
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
    
    // 既存レポートがあれば更新、なければ作成（upsert）
    const { data, error } = await supabase
      .from('reports')
      .upsert({
        visit_id: body.visitId,
        diagnosis_id: body.diagnosisId || null,
        ai_summary: body.aiSummary,
        age_consideration: body.ageConsideration,
        posture_analysis: body.postureAnalysis,
        oral_analysis: body.oralAnalysis,
        status: 'draft'
      }, {
        onConflict: 'visit_id'
      })
      .select()
      .single()
    
    if (error) {
      console.error('[Report Create] Upsert error:', error)
      throw error
    }

    // URLはvisit_idベース（関数内で環境変数を取得）
    const appUrl = getAppUrl()
    const reportUrl = `${appUrl}/report/${body.visitId}`
    
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/23c1c3cb-5ba8-45ac-bbdb-86d5654b9b94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'report/create/route.ts:POST',message:'Generated report URL',data:{appUrl,reportUrl,visitId:body.visitId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    return NextResponse.json({
      success: true,
      reportId: data.id,
      visitId: body.visitId,
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


