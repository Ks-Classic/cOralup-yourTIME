import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getStaffSession } from '@/lib/staff-auth'

// Supabase クライアント (Service Role)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET: スタッフの対応履歴を取得
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getStaffSession()

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const { data, error, count } = await supabase
      .from('visits')
      .select(
        `
        id,
        visit_date,
        status,
        session_id,
        reception_number,
        children (
          id,
          first_name,
          last_name,
          birthday
        )
      `,
        { count: 'exact' }
      )
      .eq('staff_profile_id', session.staffId)
      .order('visit_date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('[Staff History API] Error:', error)
      throw error
    }

    return NextResponse.json({
      data,
      total: count,
      limit,
      offset,
    })
  } catch (error) {
    console.error('[Staff History API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch history' },
      { status: 500 }
    )
  }
}









