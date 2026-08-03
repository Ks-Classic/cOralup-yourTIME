import { NextResponse } from 'next/server'
import { z } from 'zod'
import { loadEventInsights } from '@/lib/admin-event-insights'

export const dynamic = 'force-dynamic'

const querySchema = z.object({
  event: z.string().trim().min(1).max(100).optional(),
})

export async function GET(request: Request) {
  const parsed = querySchema.safeParse({
    event: new URL(request.url).searchParams.get('event') ?? undefined,
  })
  if (!parsed.success) {
    return NextResponse.json({ error: 'イベント指定が正しくありません' }, { status: 400 })
  }

  try {
    const insights = await loadEventInsights(parsed.data.event)
    if (!insights) {
      return NextResponse.json({ error: '表示できるイベントがありません' }, { status: 404 })
    }
    return NextResponse.json(insights)
  } catch (error) {
    console.error('[Admin Event Insights API] Failed to load insights', error)
    return NextResponse.json({ error: 'イベントデータを取得できませんでした' }, { status: 500 })
  }
}
