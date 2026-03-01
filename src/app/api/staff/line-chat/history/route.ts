import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { lineChatMessages, profiles } from '@/db/schema'
import { eq, desc, and } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'

export const dynamic = 'force-dynamic'

/**
 * GET /api/staff/line-chat/history?lineUserId=xxx&limit=50
 * 特定ユーザーのチャット履歴を取得
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const lineUserId = searchParams.get('lineUserId')
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

        if (!lineUserId) {
            return NextResponse.json(
                { error: 'lineUserId is required' },
                { status: 400 }
            )
        }

        const staffProfiles = alias(profiles, 'staff_profiles')

        const messages = await db
            .select({
                id: lineChatMessages.id,
                direction: lineChatMessages.direction,
                messageType: lineChatMessages.messageType,
                content: lineChatMessages.content,
                status: lineChatMessages.status,
                createdAt: lineChatMessages.createdAt,
                staffName: staffProfiles.displayName,
            })
            .from(lineChatMessages)
            .leftJoin(staffProfiles, eq(lineChatMessages.sentByStaffId, staffProfiles.id))
            .where(eq(lineChatMessages.lineUserId, lineUserId))
            .orderBy(desc(lineChatMessages.createdAt))
            .limit(limit)

        // 古い順に返す（UIで表示しやすいように）
        messages.reverse()

        return NextResponse.json({ messages })
    } catch (error) {
        console.error('[LINE Chat History] Error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch chat history' },
            { status: 500 }
        )
    }
}
