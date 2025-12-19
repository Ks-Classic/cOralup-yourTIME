import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { aiPrompts } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'

export async function GET(request: NextRequest) {
    try {
        const rows = await db
            .select()
            .from(aiPrompts)
            .orderBy(desc(aiPrompts.createdAt))

        // Supabase形式に変換
        const data = rows.map(r => ({
            id: r.id,
            label: r.label,
            prompt_template: r.promptTemplate,
            description: r.description,
            variable_config: r.variableConfig,
            model_name: r.modelName,
            is_active: r.isActive,
            created_at: r.createdAt,
            updated_at: r.updatedAt,
        }))

        return NextResponse.json({ success: true, data })
    } catch (error) {
        console.error('Error fetching prompts:', error)
        return NextResponse.json({ success: false, error: 'Failed to fetch prompts' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { prompt_template, label, description, is_active, variable_config, model_name } = body

        if (!prompt_template || !label) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
        }

        const insertedRows = await db
            .insert(aiPrompts)
            .values({
                promptTemplate: prompt_template,
                label,
                description,
                isActive: is_active ?? true,
                variableConfig: variable_config || [],
                modelName: model_name || 'gemini-2.5-flash-lite',
            } as typeof aiPrompts.$inferInsert)
            .returning()

        const result = insertedRows[0]

        return NextResponse.json({
            success: true,
            data: {
                id: result.id,
                label: result.label,
                prompt_template: result.promptTemplate,
                description: result.description,
                variable_config: result.variableConfig,
                model_name: result.modelName,
                is_active: result.isActive,
                created_at: result.createdAt,
            },
        })
    } catch (error) {
        console.error('Error saving prompt:', error)
        return NextResponse.json({ success: false, error: 'Failed to save prompt' }, { status: 500 })
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json()
        const { id, is_active } = body

        if (!id) {
            return NextResponse.json({ success: false, error: 'Missing prompt ID' }, { status: 400 })
        }

        const updatedRows = await db
            .update(aiPrompts)
            .set({ isActive: is_active } as Partial<typeof aiPrompts.$inferInsert>)
            .where(eq(aiPrompts.id, id))
            .returning()

        if (updatedRows.length === 0) {
            return NextResponse.json({ success: false, error: 'Prompt not found' }, { status: 404 })
        }

        const result = updatedRows[0]

        return NextResponse.json({
            success: true,
            data: {
                id: result.id,
                label: result.label,
                is_active: result.isActive,
            },
        })
    } catch (error) {
        console.error('Error updating prompt:', error)
        return NextResponse.json({ success: false, error: 'Failed to update prompt' }, { status: 500 })
    }
}
