import { NextRequest, NextResponse } from 'next/server'
import { isVisitStep } from '@/types/visit-status'
import { updateVisitProgress } from '@/lib/visit-status'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { visitId, step, boothNumber } = body

    if (!visitId || !step) {
      return NextResponse.json(
        { error: 'visitId and step are required' },
        { status: 400 }
      )
    }

    if (!isVisitStep(step)) {
      return NextResponse.json(
        { error: 'Invalid step' },
        { status: 400 }
      )
    }

    const additionalFields: Record<string, unknown> = {}
    if (boothNumber !== undefined) {
      additionalFields.boothNumber = boothNumber
    }

    try {
      await updateVisitProgress(visitId, step, additionalFields)
    } catch (error) {
      if ((error as Error).message === 'visit_not_found') {
        return NextResponse.json(
          { error: 'Visit not found' },
          { status: 404 }
        )
      }
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in update-step API:', error)
    return NextResponse.json(
      { error: 'サーバーエラー' },
      { status: 500 }
    )
  }
}
