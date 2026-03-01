import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { lineChatMessages, profiles } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { sendPushMessageSafe } from '@/lib/line-messaging'

export const dynamic = 'force-dynamic'

/**
 * POST /api/staff/line-chat/send
 * スタッフからLINEユーザーにメッセージを送信
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { lineUserId, content, staffProfileId } = body

        if (!lineUserId || !content) {
            return NextResponse.json(
                { error: 'lineUserId and content are required' },
                { status: 400 }
            )
        }

        if (!content.trim()) {
            return NextResponse.json(
                { error: 'Message content cannot be empty' },
                { status: 400 }
            )
        }

        // LINE Push Messageで送信
        const result = await sendPushMessageSafe({
            to: lineUserId,
            messages: [{ type: 'text', text: content.trim() }],
        })

        if (result.quotaExceeded) {
            return NextResponse.json(
                { error: 'LINE月間送信上限に達しました', quota: result.quota },
                { status: 429 }
            )
        }

        if (!result.success) {
            console.error('[LINE Chat Send] Failed:', result.error)
            return NextResponse.json(
                { error: 'メッセージの送信に失敗しました', detail: result.error },
                { status: 500 }
            )
        }

        // プロフィールID取得
        const profileRows = await db
            .select({ id: profiles.id })
            .from(profiles)
            .where(eq(profiles.lineUserId, lineUserId))
            .limit(1)

        // DBにログ保存
        // @ts-expect-error - Drizzle types not yet regenerated for lineChatMessages schema
        const [inserted] = await db.insert(lineChatMessages).values({
            lineUserId,
            profileId: profileRows[0]?.id || null,
            direction: 'outbound',
            messageType: 'text',
            content: content.trim(),
            sentByStaffId: staffProfileId || null,
            status: 'sent',
        }).returning()

        return NextResponse.json({
            success: true,
            message: inserted,
            quota: result.quota,
        })
    } catch (error) {
        console.error('[LINE Chat Send] Error:', error)
        return NextResponse.json(
            { error: 'Failed to send message' },
            { status: 500 }
        )
    }
}
