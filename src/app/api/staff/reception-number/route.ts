import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { profiles } from '@/db/schema'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/staff/reception-number
 * 受付番号を手動で更新
 */
export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json()
        const { profileId, receptionNumber } = body

        if (!profileId) {
            return NextResponse.json(
                { error: 'profileId is required' },
                { status: 400 }
            )
        }

        // reception_number を更新（空文字ならnullに）
        const value = receptionNumber?.trim() || null

        await db
            .update(profiles)
            .set({ receptionNumber: value })
            .where(eq(profiles.id, profileId))

        return NextResponse.json({ success: true, receptionNumber: value })
    } catch (error) {
        console.error('[Reception Number] Error:', error)
        return NextResponse.json(
            { error: 'Failed to update reception number' },
            { status: 500 }
        )
    }
}
