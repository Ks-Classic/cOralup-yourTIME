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
 * Body: { visitId: string, lineUserId?: string } または { sessionId: string, lineUserId?: string }
 * 
 * 認証方法:
 * - lineUserIdが提供された場合: line_user_idから直接staff_profile_idを取得（LIFF経由）
 * - lineUserIdがない場合: Cookie認証（既存の方法）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { visitId, sessionId, lineUserId } = body

    let staffId: string | null = null
    let staffName: string | null = null

    // LIFF経由（lineUserId提供）の場合
    if (lineUserId) {
      const { data: staff } = await supabase
        .from('profiles')
        .select('id, display_name, first_name, last_name, role, is_active')
        .eq('line_user_id', lineUserId)
        .eq('role', 'staff')
        .single()

      if (!staff || !staff.is_active) {
        return NextResponse.json(
          { error: 'Staff not found or inactive' },
          { status: 404 }
        )
      }

      staffId = staff.id
      staffName = staff.display_name || `${staff.last_name || ''}${staff.first_name || ''}`.trim() || 'スタッフ'
    } else {
      // Cookie認証（既存の方法）
      const session = await getStaffSession()

      if (!session) {
        return NextResponse.json(
          { error: 'Unauthorized: Staff session or lineUserId required' },
          { status: 401 }
        )
      }

      staffId = session.staffId
      staffName = session.staffName
    }

    if (!staffId) {
      return NextResponse.json(
        { error: 'Staff identification failed' },
        { status: 401 }
      )
    }

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
      method: lineUserId ? 'LIFF' : 'Cookie',
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

