import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getStaffSession } from '@/lib/staff-auth'

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

    const body = await request.json()
    const { visitId, sessionId } = body

    if (!visitId && !sessionId) {
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
          console.error('[Assign Staff] Error creating visit:', createError)
          throw createError
        }

        console.log('[Assign Staff] Created new visit:', newVisit.id)

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
    const { data: updatedVisit, error: updateError } = await supabase
      .from('visits')
      .update({
        staff_profile_id: staffId,
        status: 'in_progress',
      })
      .eq('id', targetVisitId)
      .select()
      .single()

    if (updateError) {
      console.error('[Assign Staff] Error updating visit:', updateError)
      throw updateError
    }

    console.log('[Assign Staff] Staff assigned:', {
      visitId: targetVisitId,
      staffId,
      staffName,
    })

    return NextResponse.json({
      success: true,
      visitId: targetVisitId,
      staffId,
      staffName,
      action: 'updated',
    })
  } catch (error) {
    console.error('[Assign Staff] Error:', error)
    return NextResponse.json(
      { error: 'Failed to assign staff' },
      { status: 500 }
    )
  }
}

