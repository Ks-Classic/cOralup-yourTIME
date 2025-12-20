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

        let items: any[] = []
        try {
            const allItems = await db
                .select()
                .from(diagnosisItems)
                .where(eq(diagnosisItems.isActive, true))
                .orderBy(asc(diagnosisItems.displayOrder))
            items = inputType ? allItems.filter(i => i.inputType === inputType) : allItems
            console.log(`[diagnosis-schema] Fetched ${allItems.length} items, filtered to ${items.length}`)
        } catch (itemError) {
            console.error('[diagnosis-schema] Error fetching items:', itemError)
        }

        return NextResponse.json({
            success: true,
            data: { categories, items }
        })
    } catch (error) {
        console.error('診断スキーマ取得エラー:', error)
        return NextResponse.json({ success: false, error: 'データの取得に失敗しました' }, { status: 500 })
    }
}
