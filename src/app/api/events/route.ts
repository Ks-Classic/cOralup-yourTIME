import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    let query = supabase
      .from('events')
      .select(`
        *,
        form_schemas (
          id,
          name,
          form_type,
          is_active
        )
      `)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    if (dateFrom) {
      query = query.gte('start_date', dateFrom)
    }

    if (dateTo) {
      query = query.lte('end_date', dateTo)
    }

    const { data: events, error } = await query

    if (error) {
      console.error('Error fetching events:', error)
      return NextResponse.json(
        { error: 'イベントの取得に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({ events })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      event_id,
      name,
      description,
      start_date,
      end_date,
      venue,
      status = 'draft'
    } = body

    // バリデーション
    if (!event_id || !name) {
      return NextResponse.json(
        { error: '必須項目が入力されていません' },
        { status: 400 }
      )
    }

    // イベントの保存
    const { data: event, error } = await supabase
      .from('events')
      .insert([{
        event_id,
        name,
        description,
        start_date,
        end_date,
        venue,
        status,
      }])
      .select()
      .single()

    if (error) {
      console.error('Error saving event:', error)
      return NextResponse.json(
        { error: 'イベントの保存に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

