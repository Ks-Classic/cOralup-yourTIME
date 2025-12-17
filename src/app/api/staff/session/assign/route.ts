import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getStaffSession } from '@/lib/staff-auth'
import { logger } from '@/lib/logger'

// Supabase クライアント (Service Role)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST: QRスキャン時にスタッフを診断セッションに紐付け
 * Body: { visitId: string } または { sessionId: string }
 * 
 * 認証方法: Cookie認証（事前にログイン済みであること）
 */
export async function POST(request: NextRequest) {
  try {
    // Cookie認証でスタッフ識別
    const session = await getStaffSession()

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized: Staff session required' },
        { status: 401 }
      )
    }

    const staffId = session.staffId
    const staffName = session.staffName
    const logContext = { staffId, staffName, path: '/api/staff/session/assign' }

    const body = await request.json()
    const { visitId, sessionId } = body

    if (!visitId && !sessionId) {
      logger.warn('Missing visitId or sessionId', logContext)
      return NextResponse.json(
        { error: 'visitId or sessionId is required' },
        { status: 400 }
      )
    }

    let targetVisitId = visitId

    // sessionIdが渡された場合、visitIdを取得
    if (!targetVisitId && sessionId) {
      const { data: visit } = await supabase
        .from('visits')
        .select('id')
        .eq('session_id', sessionId)
        .single()

      if (visit) {
        targetVisitId = visit.id
      } else {
        // visitsレコードがない場合は作成
        const { data: newVisit, error: createError } = await supabase
          .from('visits')
          .insert({
            session_id: sessionId,
            staff_profile_id: staffId,
            visit_date: new Date().toISOString(),
            status: 'in_progress',
          })
          .select()
          .single()

        if (createError) {
          logger.error('Error creating visit', logContext, createError)
          throw createError
        }

        logger.info('Created new visit through assignment', {
          ...logContext,
          visitId: newVisit.id,
          action: 'created'
        })

        return NextResponse.json({
          success: true,
          visitId: newVisit.id,
          staffId,
          staffName,
          action: 'created',
        })
      }
    }

    // 既存のvisitにスタッフを紐付け
    // ステップタイムスタンプを更新
    const { data: currentVisit } = await supabase
      .from('visits')
      .select('step_timestamps')
      .eq('id', targetVisitId)
      .single()

    const timestamps = (currentVisit?.step_timestamps as Record<string, string>) || {}
    timestamps.diagnosis_started = new Date().toISOString()

    const { data: updatedVisit, error: updateError } = await supabase
      .from('visits')
      .update({
        staff_profile_id: staffId,
        status: 'in_progress',
        current_step: 'diagnosis_started',
        step_timestamps: timestamps,
      })
      .eq('id', targetVisitId)
      .select()
      .single()

    if (updateError) {
      logger.error('Error updating visit', logContext, updateError)
      throw updateError
    }

    logger.info('Staff assigned to visit', {
      ...logContext,
      visitId: targetVisitId,
      action: 'updated'
    })

    return NextResponse.json({
      success: true,
      visitId: targetVisitId,
      staffId,
      staffName,
      action: 'updated',
    })
  } catch (error) {
    logger.error('Error assigning staff', { path: '/api/staff/session/assign' }, error)
    return NextResponse.json(
      { error: 'Failed to assign staff' },
      { status: 500 }
    )
  }
}

