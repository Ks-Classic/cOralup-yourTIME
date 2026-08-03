import { NextRequest, NextResponse } from 'next/server'
import { and, asc, eq, inArray, or, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { events, eventStaffs } from '@/db/schema'
import { getStaffSession } from '@/lib/staff-auth'

export const dynamic = 'force-dynamic'

const registerEventSchema = z.object({
  eventId: z.string().uuid(),
})

export async function GET() {
  const session = await getStaffSession()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const availableEvents = await db
    .select({
      id: events.id,
      eventId: events.eventId,
      name: events.name,
      startDate: events.startDate,
      endDate: events.endDate,
      venue: events.venue,
      status: events.status,
    })
    .from(events)
    .where(or(eq(events.status, 'active'), eq(events.status, 'upcoming')))
    .orderBy(asc(events.startDate))

  if (availableEvents.length === 0) {
    return NextResponse.json({ events: [] })
  }

  const registrations = await db
    .select({
      eventId: eventStaffs.eventId,
      status: eventStaffs.status,
    })
    .from(eventStaffs)
    .where(
      and(
        eq(eventStaffs.profileId, session.staffId),
        inArray(
          eventStaffs.eventId,
          availableEvents.map((event) => event.id)
        )
      )
    )

  const registrationByEventId = new Map(
    registrations.map((registration) => [
      registration.eventId,
      registration.status,
    ])
  )

  return NextResponse.json({
    staffName: session.staffName,
    events: availableEvents.map((event) => ({
      ...event,
      registrationStatus: registrationByEventId.get(event.id) ?? null,
      isRegistered:
        registrationByEventId.get(event.id) === 'confirmed' ||
        registrationByEventId.get(event.id) === 'pending',
    })),
  })
}

export async function POST(request: NextRequest) {
  const session = await getStaffSession()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const parsed = registerEventSchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  const eventRows = await db
    .select({ id: events.id, name: events.name })
    .from(events)
    .where(
      and(
        eq(events.id, parsed.data.eventId),
        or(eq(events.status, 'active'), eq(events.status, 'upcoming'))
      )
    )
    .limit(1)

  const event = eventRows[0]
  if (!event) {
    return NextResponse.json({ error: 'event_not_found' }, { status: 404 })
  }

  // Drizzle 0.36ではdefault付き列のinsert/update型が欠落するため、
  // タグ付きSQLで値をパラメータ化し、取消済み登録もconfirmedへ戻す。
  await db.execute(sql`
    INSERT INTO event_staffs (event_id, profile_id, status, updated_at)
    VALUES (${event.id}, ${session.staffId}, 'confirmed', NOW())
    ON CONFLICT (event_id, profile_id)
    DO UPDATE SET status = 'confirmed', updated_at = NOW()
  `)

  return NextResponse.json({
    success: true,
    event: { id: event.id, name: event.name },
  })
}
