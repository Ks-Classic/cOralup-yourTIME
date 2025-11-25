import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')
    const formType = searchParams.get('formType')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // キャッシュチェック
    const cacheKey = `responses_${eventId || 'all'}_${formType || 'all'}_${dateFrom || ''}_${dateTo || ''}_${limit}_${offset}`
    const { data: cachedData, error: cacheError } = await supabase
      .from('form_cache')
      .select('cache_data')
      .eq('cache_key', cacheKey)
      .single()

    if (cachedData && !cacheError) {
      return NextResponse.json(cachedData.cache_data)
    }

    // クエリ構築
    let query = supabase
      .from('form_responses')
      .select(`
        *,
        form_schemas (
          name,
          form_type,
          config
        ),
        sessions (
          parent_name,
          parent_phone
        ),
        events (
          name,
          event_id
        )
      `)
      .order('submitted_at', { ascending: false })

    if (eventId) {
      query = query.eq('event_id', eventId)
    }

    if (formType) {
      query = query.eq('form_schemas.form_type', formType)
    }

    if (dateFrom) {
      query = query.gte('submitted_at', dateFrom)
    }

    if (dateTo) {
      query = query.lte('submitted_at', dateTo)
    }

    // ページネーション
    query = query.range(offset, offset + limit - 1)

    const { data: responses, error } = await query

    if (error) {
      console.error('Error fetching form responses:', error)
      return NextResponse.json(
        { error: 'フォーム回答の取得に失敗しました' },
        { status: 500 }
      )
    }

    // 集計データの計算
    const totalQuery = supabase
      .from('form_responses')
      .select('id', { count: 'exact' })

    if (eventId) totalQuery.eq('event_id', eventId)
    if (formType) totalQuery.eq('form_schemas.form_type', formType)
    if (dateFrom) totalQuery.gte('submitted_at', dateFrom)
    if (dateTo) totalQuery.lte('submitted_at', dateTo)

    const { count: total } = await totalQuery

    // 統計データの計算
    const statsQuery = supabase
      .from('form_responses')
      .select('submitted_at, created_at')

    if (eventId) statsQuery.eq('event_id', eventId)
    if (formType) statsQuery.eq('form_schemas.form_type', formType)
    if (dateFrom) statsQuery.gte('submitted_at', dateFrom)
    if (dateTo) statsQuery.lte('submitted_at', dateTo)

    const { data: statsData } = await statsQuery

    let avgCompletionTime = 0
    if (statsData && statsData.length > 0) {
      const totalTime = statsData.reduce((sum, record) => {
        const submitted = new Date(record.submitted_at)
        const created = new Date(record.created_at)
        return sum + (submitted.getTime() - created.getTime())
      }, 0)
      avgCompletionTime = totalTime / statsData.length / 1000 / 60 // ミリ秒から分に変換
    }

    const summary = {
      total_responses: total || 0,
      avg_completion_time: Math.round(avgCompletionTime * 100) / 100,
      date_range: { from: dateFrom, to: dateTo }
    }

    const result = {
      responses: responses || [],
      total: total || 0,
      summary,
      pagination: {
        limit,
        offset,
        hasMore: (total || 0) > offset + limit
      }
    }

    // キャッシュに保存（5分間）
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + 5)

    await supabase
      .from('form_cache')
      .insert([{
        cache_key: cacheKey,
        cache_data: result,
        expires_at: expiresAt.toISOString()
      }])

    return NextResponse.json(result)

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
      form_type,
      date_from,
      date_to,
      group_by = 'date',
      metrics = ['count', 'completion_rate', 'avg_time']
    } = body

    // 集計クエリ実行
    let query = supabase
      .from('form_responses')
      .select(`
        submitted_at,
        created_at,
        form_schemas (
          form_type
        )
      `)

    if (event_id) {
      query = query.eq('event_id', event_id)
    }

    if (form_type) {
      query = query.eq('form_schemas.form_type', form_type)
    }

    if (date_from) {
      query = query.gte('submitted_at', date_from)
    }

    if (date_to) {
      query = query.lte('submitted_at', date_to)
    }

    const { data: responses, error } = await query

    if (error) {
      console.error('Error fetching aggregated data:', error)
      return NextResponse.json(
        { error: '集計データの取得に失敗しました' },
        { status: 500 }
      )
    }

    // 集計処理
    const aggregation: Record<string, any> = {}

    responses?.forEach(response => {
      const date = new Date(response.submitted_at).toISOString().split('T')[0]
      const key = group_by === 'date' ? date : response.form_schemas?.form_type || 'unknown'

      if (!aggregation[key]) {
        aggregation[key] = {
          count: 0,
          total_time: 0,
          completed_count: 0
        }
      }

      aggregation[key].count++

      // 完了時間計算
      const submitted = new Date(response.submitted_at)
      const created = new Date(response.created_at)
      const completionTime = (submitted.getTime() - created.getTime()) / 1000 / 60 // 分
      aggregation[key].total_time += completionTime
      aggregation[key].completed_count++
    })

    // 集計結果の整形
    const results = Object.entries(aggregation).map(([key, data]: [string, any]) => ({
      group: key,
      count: data.count,
      avg_completion_time: data.completed_count > 0 ? data.total_time / data.completed_count : 0,
      completion_rate: data.count > 0 ? (data.completed_count / data.count) * 100 : 0
    }))

    return NextResponse.json({
      aggregation: results,
      total_responses: responses?.length || 0,
      date_range: { from: date_from, to: date_to }
    })

  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

