import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { diagnosisCategories, diagnosisItems } from '@/db/schema'
import { eq, asc, and } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const inputType = searchParams.get('input_type')

        const categories = await db
            .select()
            .from(diagnosisCategories)
            .where(eq(diagnosisCategories.isActive, true))
            .orderBy(asc(diagnosisCategories.displayOrder))

        let itemQuery = db
            .select()
            .from(diagnosisItems)
            .where(eq(diagnosisItems.isActive, true))
            .orderBy(asc(diagnosisItems.displayOrder))

        // Drizzle-orm doesn't have fluent query building like Supabase easily in certain contexts,
        // but it's simple enough to filter here if needed.
        const allItems = await itemQuery
        const items = inputType ? allItems.filter(i => i.inputType === inputType) : allItems

        return NextResponse.json({
            success: true,
            data: { categories, items }
        })
    } catch (error) {
        console.error('診断スキーマ取得エラー:', error)
        return NextResponse.json({ success: false, error: 'データの取得に失敗しました' }, { status: 500 })
    }
}
