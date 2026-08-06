import { NextResponse } from 'next/server'
import { db } from '@/db'
import { events, visits } from '@/db/schema'
import { desc, eq, sql } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/analytics/events
 *
 * レポート画面のイベントフィルタ用に、開催状況を問わず全イベントと
 * 来場者数（テストデータ込み）を一覧で返す。
 */
export async function GET() {
  try {
    const rows = await db
      .select({
        id: events.id,
        eventId: events.eventId,
        name: events.name,
        startDate: events.startDate,
        venue: events.venue,
        status: events.status,
        visitCount: sql<number>`count(${visits.id})`,
      })
      .from(events)
      .leftJoin(visits, eq(visits.eventId, events.id))
      .groupBy(events.id)
      .orderBy(desc(events.startDate))

    return NextResponse.json({
      events: rows.map((r) => ({ ...r, visitCount: Number(r.visitCount) })),
    })
  } catch (error) {
    console.error('[Admin Analytics Events] Error:', error)
    return NextResponse.json(
      { error: 'イベント一覧の取得に失敗しました' },
      { status: 500 }
    )
  }
}
