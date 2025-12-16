import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getStaffSession } from '@/lib/staff-auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN!
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://coralup-yourtime.vercel.app'

interface CompleteDiagnosisRequest {
  visitId: string
  diagnosisId?: string
  // AI分析結果（ダミー可）
  aiSummary?: string
  ageConsideration?: string
  postureAnalysis?: {
    overallScore: number
    issues: string[]
  }
  oralAnalysis?: {
    overallScore: number
    issues: string[]
  }
  // 送信オプション
  sendLineNotification?: boolean
}

/**
 * POST: 診断完了→レポート作成→LINE送信の一連フロー
 * 
 * 1. visitのステータスを更新
 * 2. reportsテーブルにレポート作成
 * 3. 親御さんにLINE通知（オプション）
 */
export async function POST(request: NextRequest) {
  try {
    // スタッフ認証確認
    const session = await getStaffSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'unauthorized' },
        { status: 401 }
      )
    }

    const body: CompleteDiagnosisRequest = await request.json()
    const { visitId, diagnosisId, sendLineNotification = true } = body

    if (!visitId) {
      return NextResponse.json(
        { success: false, error: 'visitId is required' },
        { status: 400 }
      )
    }

    // 1. Visit情報を取得
    const { data: visit, error: visitError } = await supabase
      .from('visits')
      .select(`
        id,
        session_id,
        child_id,
        event_id,
        children (
          id,
          first_name,
          last_name,
          parent_profile_id
        ),
        events (
          id,
          name
        )
      `)
      .eq('id', visitId)
      .single()

    if (visitError || !visit) {
      console.error('[Complete Diagnosis] Visit not found:', visitError)
      return NextResponse.json(
        { success: false, error: 'visit_not_found' },
        { status: 404 }
      )
    }

    // 2. 親御さんのLINE User IDを取得
    let parentLineUserId: string | null = null
    // Supabaseのネスト関係は配列で返される（.single()を使っても）
    const childrenArray = visit.children as { id: string; first_name: string; last_name: string; parent_profile_id: string }[] | null
    const child = childrenArray?.[0] || null

    if (child?.parent_profile_id) {
      const { data: parentProfile } = await supabase
        .from('profiles')
        .select('line_user_id')
        .eq('id', child.parent_profile_id)
        .single()

      parentLineUserId = parentProfile?.line_user_id || null
    }

    // 3. レポートを取得または作成（visit_idで一意）
    const { data: existingReport } = await supabase
      .from('reports')
      .select('*')
      .eq('visit_id', visitId)
      .single()

    let report = existingReport

    if (!report) {
      // 新規レポートを作成
      const aiSummary = body.aiSummary || generateDummyAiSummary()
      const ageConsideration = body.ageConsideration || 'お子様の年齢に応じた発達段階を考慮した評価です。'
      const postureAnalysis = body.postureAnalysis || {
        overallScore: 75,
        issues: ['姿勢の改善が推奨されます', '口呼吸の傾向が見られます'],
      }
      const oralAnalysis = body.oralAnalysis || {
        overallScore: 80,
        issues: ['歯並びは概ね良好です', '定期的な歯科検診をお勧めします'],
      }

      const { data: newReport, error: reportError } = await supabase
        .from('reports')
        .insert({
          visit_id: visitId,
          diagnosis_id: diagnosisId || null,
          ai_summary: aiSummary,
          age_consideration: ageConsideration,
          posture_analysis: postureAnalysis,
          oral_analysis: oralAnalysis,
          status: 'completed',
        })
        .select()
        .single()

      if (reportError) {
        console.error('[Complete Diagnosis] Report creation error:', reportError)
        return NextResponse.json(
          { success: false, error: 'report_creation_failed' },
          { status: 500 }
        )
      }

      report = newReport
    } else {
      // 既存レポートのステータスを更新
      await supabase
        .from('reports')
        .update({ status: 'completed' })
        .eq('id', report.id)
    }

    // 4. Visitステータスを更新
    await supabase
      .from('visits')
      .update({
        status: 'diagnosis_completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', visitId)

    // 5. LINE通知を送信（オプション）
    let lineNotificationResult = null
    if (sendLineNotification && parentLineUserId) {
      const childName = child
        ? `${child.last_name || ''} ${child.first_name || ''}`.trim() || 'お子様'
        : 'お子様'
      const eventsArray = visit.events as { id: string; name: string }[] | null
      const eventName = eventsArray?.[0]?.name

      lineNotificationResult = await sendReportNotification({
        lineUserId: parentLineUserId,
        visitId,
        childName,
        eventName,
        sessionId: visit.session_id,
      })
    }

    // レポートURLはvisit_idベース
    const reportUrl = `${APP_URL}/report/${visitId}`

    // console.log('[Complete Diagnosis] Success:', { visitId, reportId: report.id, lineNotificationSent: !!lineNotificationResult?.success })

    return NextResponse.json({
      success: true,
      report: {
        id: report.id,
        visitId,
        url: reportUrl,
      },
      lineNotification: lineNotificationResult,
    })
  } catch (error) {
    console.error('[Complete Diagnosis] Error:', error)
    return NextResponse.json(
      { success: false, error: 'server_error' },
      { status: 500 }
    )
  }
}

/**
 * ダミーのAI分析サマリーを生成
 */
function generateDummyAiSummary(): string {
  const summaries = [
    'お子様の口腔発達は概ね良好です。定期的な歯科検診と、正しい姿勢・呼吸習慣の維持をお勧めします。',
    '口腔内の状態は年齢相応の発達を示しています。引き続き、バランスの良い食事と適切な口腔ケアを心がけてください。',
    '全体的に健康的な口腔環境が観察されました。今後も定期的なチェックアップをお勧めします。',
  ]
  return summaries[Math.floor(Math.random() * summaries.length)]
}

/**
 * LINE通知を送信
 */
async function sendReportNotification(params: {
  lineUserId: string
  visitId: string
  childName: string
  eventName?: string
  sessionId?: string
}): Promise<{ success: boolean; error?: string }> {
  const { lineUserId, visitId, childName, eventName, sessionId } = params
  // レポートURLはvisit_idベース
  const reportUrl = `${APP_URL}/report/${visitId}`

  const flexMessage = {
    type: 'flex',
    altText: `${childName}さんの分析レポートが完成しました`,
    contents: {
      type: 'bubble',
      hero: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '🦷 cOralup',
            weight: 'bold',
            size: 'lg',
            color: '#F97316',
            align: 'center',
          },
        ],
        paddingAll: 'lg',
        backgroundColor: '#FFF7ED',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '診断レポート完成',
            weight: 'bold',
            size: 'xl',
            color: '#333333',
          },
          {
            type: 'text',
            text: `${childName}さんの口腔育成診断レポートが完成しました。`,
            size: 'sm',
            color: '#666666',
            margin: 'md',
            wrap: true,
          },
          ...(eventName
            ? [
              {
                type: 'text' as const,
                text: `📍 ${eventName}`,
                size: 'xs' as const,
                color: '#999999',
                margin: 'md' as const,
              },
            ]
            : []),
        ],
        paddingAll: '15px',
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            height: 'sm',
            action: {
              type: 'uri',
              label: 'レポートを見る',
              uri: reportUrl,
            },
            color: '#F97316',
          },
          {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: '※ レポートは90日間有効です',
                size: 'xxs',
                color: '#aaaaaa',
                align: 'center',
              },
            ],
            margin: 'md',
          },
        ],
        paddingAll: '15px',
      },
    },
  }

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [flexMessage],
      }),
    })

    const responseData = await response.json().catch(() => ({}))
    const sentAt = new Date().toISOString()

    // ログを記録
    await supabase.from('line_message_logs').insert({
      visit_id: visitId,
      session_id: sessionId || null,
      line_user_id: lineUserId,
      message_type: 'report',
      message_content: flexMessage,
      status: response.ok ? 'success' : 'failed',
      response: responseData,
      error_message: response.ok ? null : JSON.stringify(responseData),
      sent_at: sentAt,
    })

    if (!response.ok) {
      console.error('[LINE Notification] Failed:', responseData)
      return { success: false, error: JSON.stringify(responseData) }
    }

    // Visitステータスとステップを更新
    const { data: currentVisit } = await supabase
      .from('visits')
      .select('step_timestamps')
      .eq('id', visitId)
      .single()

    const timestamps = (currentVisit?.step_timestamps as Record<string, string>) || {}
    timestamps.line_sent = sentAt

    await supabase
      .from('visits')
      .update({
        status: 'report_sent',
        report_sent_at: sentAt,
        current_step: 'line_sent',
        step_timestamps: timestamps,
      })
      .eq('id', visitId)

    return { success: true }
  } catch (error) {
    console.error('[LINE Notification] Error:', error)
    return { success: false, error: String(error) }
  }
}





