import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getStaffSession } from '@/lib/staff-auth'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST: 特定のvisitをリセット
 * - ステータスを指定した状態に戻す
 * - オプションで関連データも削除
 */
export async function POST(request: NextRequest) {
    try {
        // 管理者権限チェック
        const session = await getStaffSession()
        if (!session) {
            return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const {
            visitId,
            targetStatus = 'waiting',
            targetStep = 'line_registered',
            deleteResponses = false,
            deletePhotos = false,
            deleteReports = false,
        } = body

        if (!visitId) {
            return NextResponse.json({ success: false, error: 'visitId is required' }, { status: 400 })
        }

        // 1. visitのステータスをリセット
        const { error: updateError } = await supabase
            .from('visits')
            .update({
                status: targetStatus,
                current_step: targetStep,
                report_sent_at: null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', visitId)

        if (updateError) {
            console.error('[Reset Visit] Update error:', updateError)
            return NextResponse.json({ success: false, error: 'update_failed' }, { status: 500 })
        }

        const deletedCounts = {
            questionnaireResponses: 0,
            diagnosisResponses: 0,
            photos: 0,
            reports: 0,
        }

        // 2. オプション: 問診・診断回答を削除
        if (deleteResponses) {
            const { count: qrCount } = await supabase
                .from('questionnaire_responses')
                .delete({ count: 'exact' })
                .eq('visit_id', visitId)
            deletedCounts.questionnaireResponses = qrCount || 0

            const { count: drCount } = await supabase
                .from('diagnosis_responses')
                .delete({ count: 'exact' })
                .eq('visit_id', visitId)
            deletedCounts.diagnosisResponses = drCount || 0
        }

        // 3. オプション: 写真を削除
        if (deletePhotos) {
            const { count: photoCount } = await supabase
                .from('visit_photos')
                .delete({ count: 'exact' })
                .eq('visit_id', visitId)
            deletedCounts.photos = photoCount || 0
        }

        // 4. オプション: レポートを削除
        if (deleteReports) {
            const { count: repCount } = await supabase
                .from('reports')
                .delete({ count: 'exact' })
                .eq('visit_id', visitId)
            deletedCounts.reports = repCount || 0
        }

        console.log('[Reset Visit] Completed:', { visitId, targetStatus, targetStep, deletedCounts })

        return NextResponse.json({
            success: true,
            visitId,
            newStatus: targetStatus,
            newStep: targetStep,
            deleted: deletedCounts,
        })
    } catch (error) {
        console.error('[Reset Visit] Error:', error)
        return NextResponse.json({ success: false, error: 'server_error' }, { status: 500 })
    }
}
