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
            // 性別を正規化（DBの制約: male, female, other のみ）
            const normalizeGender = (g: string): string | null => {
                const lower = g.toLowerCase().trim()
                if (lower === 'male' || lower === 'm' || lower === '男' || lower === '男性') return 'male'
                if (lower === 'female' || lower === 'f' || lower === '女' || lower === '女性') return 'female'
                if (lower === 'other' || lower === 'その他') return 'other'
                return null // 不明な値は保存しない
            }

            const normalizedGender = normalizeGender(gender)

            if (normalizedGender) {
                const visitRows = await db
                    .select({ childId: visits.childId })
                    .from(visits)
                    .where(eq(visits.id, visitId))
                    .limit(1)

                if (visitRows.length > 0 && visitRows[0].childId) {
                    await db
                        .update(children)
                        .set({ gender: normalizedGender, updatedAt: new Date() })
                        .where(eq(children.id, visitRows[0].childId))
                }
            } else {
                console.warn(`[Paper Recovery] Invalid gender value: '${gender}', skipping update`)
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
                storagePath: 'paper-recovery/no-image',
                metadata: {
                    questionnaire_data: questionnaire,
                    saved_at: new Date().toISOString(),
                },
            } as typeof visitPhotos.$inferInsert)
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
                .set({ metadata: newMetadata } as Partial<typeof visitPhotos.$inferInsert>)
                .where(eq(visitPhotos.id, paperPhotos[0].id))
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
