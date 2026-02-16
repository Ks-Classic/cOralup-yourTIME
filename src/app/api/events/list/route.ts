import { NextResponse } from 'next/server'
import { db } from '@/db'
import { events } from '@/db/schema/events'
import { or, eq, asc } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

/**
 * GET: active / upcoming イベント一覧を取得（ログイン画面のタブ用）
 */
export async function GET() {
    try {
        const activeEvents = await db
            .select({
                id: events.id,
                eventId: events.eventId,
                name: events.name,
                startDate: events.startDate,
                venue: events.venue,
                status: events.status,
            })
            .from(events)
            .where(
                or(eq(events.status, 'active'), eq(events.status, 'upcoming'))
            )
            .orderBy(asc(events.startDate))

        return NextResponse.json({ events: activeEvents })
    } catch (error) {
        console.error('[Events List] Error:', error)
        return NextResponse.json(
            { error: 'Internal error' },
            { status: 500 }
        )
    }
}
