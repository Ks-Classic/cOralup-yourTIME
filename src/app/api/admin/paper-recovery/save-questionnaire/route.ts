import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { visitPhotos, visits, children } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

interface QuestionnaireData {
    has_siblings?: string
    sibling_order?: number | null
    screen_time?: string
    screen_hours?: number | null
    sleep_conditions?: string[]
    bedtime?: number | null
    sleep_pattern?: string[]
    lessons?: string[]
    eating_habits?: string[]
    disliked_foods?: string | null
    liked_foods?: string | null
    photo_consent?: string
}

interface RequestBody {
    visitId: string
    questionnaire: QuestionnaireData
    gender?: string  // 性別（male/female/other）
}

/**
 * 問診データ保存API
 * 
 * Geminiで抽出した問診データをvisitPhotos.metadataに保存し、
 * 性別はchildrenテーブルに保存する
 */
export async function POST(request: NextRequest) {
    try {
        // デバッグ: 環境変数の状態を確認
        const dbUrl = process.env.DATABASE_URL || process.env.DATABASE_URL_DIRECT
        console.log('[save-questionnaire] DATABASE_URL set:', !!dbUrl, dbUrl ? dbUrl.substring(0, 40) + '...' : 'not set')

        const body = await request.json() as RequestBody
        const { visitId, questionnaire, gender } = body

        if (!visitId) {
            return NextResponse.json(
                { success: false, error: 'visitIdが必要です' },
                { status: 400 }
            )
        }

        if (!questionnaire) {
            return NextResponse.json(
                { success: false, error: 'questionnaireが必要です' },
                { status: 400 }
            )
        }

        // 性別をchildrenに保存
        if (gender) {
            const visitRows = await db
                .select({ childId: visits.childId })
                .from(visits)
                .where(eq(visits.id, visitId))
                .limit(1)

            if (visitRows.length > 0 && visitRows[0].childId) {
                await db
                    .update(children)
                    .set({ gender, updatedAt: new Date() })
                    .where(eq(children.id, visitRows[0].childId))

                console.log(`[Paper Recovery] Updated gender to '${gender}' for childId: ${visitRows[0].childId}`)
            }
        }

        // paper_questionnaireタイプの写真を取得
        const paperPhotos = await db
            .select()
            .from(visitPhotos)
            .where(
                and(
                    eq(visitPhotos.visitId, visitId),
                    eq(visitPhotos.photoType, 'paper_questionnaire')
                )
            )
            .limit(1)

        if (paperPhotos.length === 0) {
            // 写真がない場合は新規作成
            await db.insert(visitPhotos).values({
                visitId,
                photoType: 'paper_questionnaire',
                metadata: {
                    questionnaire_data: questionnaire,
                    saved_at: new Date().toISOString(),
                },
            })
            console.log(`[Paper Recovery] Created new paper_questionnaire record for visitId: ${visitId}`)
        } else {
            // 既存の写真のmetadataを更新
            const existingMetadata = (paperPhotos[0].metadata as Record<string, any>) || {}
            const newMetadata = {
                ...existingMetadata,
                questionnaire_data: questionnaire,
                saved_at: new Date().toISOString(),
            }

            await db
                .update(visitPhotos)
                .set({ metadata: newMetadata })
                .where(eq(visitPhotos.id, paperPhotos[0].id))

            console.log(`[Paper Recovery] Updated paper_questionnaire metadata for visitId: ${visitId}`)
        }

        return NextResponse.json({
            success: true,
            data: {
                savedFields: Object.keys(questionnaire).length,
                genderSaved: !!gender,
            }
        })

    } catch (error) {
        console.error('問診データ保存エラー:', error)
        return NextResponse.json(
            { success: false, error: '問診データの保存に失敗しました' },
            { status: 500 }
        )
    }
}

