import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
    try {
        const { data, error } = await supabase
            .from('ai_prompts')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) throw error

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

        const { data, error } = await supabase
            .from('ai_prompts')
            .insert({
                prompt_template,
                label,
                description,
                is_active: is_active ?? true,
                variable_config: variable_config || [],
                model_name: model_name || 'gemini-2.5-flash-lite'
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, data })
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

        const { data, error } = await supabase
            .from('ai_prompts')
            .update({ is_active })
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error) {
        console.error('Error updating prompt:', error)
        return NextResponse.json({ success: false, error: 'Failed to update prompt' }, { status: 500 })
    }
}
