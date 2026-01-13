import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { profiles, children, visits } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'

export const dynamic = 'force-dynamic'

interface ImportRow {
    childName: string
    furigana: string
    birthday: string
    email: string
    existingChildId?: string
}

/**
 * インポート実行API
 * 
 * スプレッドシートのデータをDBにインポートする
 * - 既存childがあればそのまま使用し、visitを新規作成
 * - 既存childがなければprofiles + children + visitsを新規作成
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { rows } = body as { rows: ImportRow[] }

        if (!rows || !Array.isArray(rows)) {
            return NextResponse.json(
                { success: false, error: 'rowsが必要です' },
                { status: 400 }
            )
        }

        const imported = []

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i]
            const { childName, furigana, birthday, email, existingChildId } = row

            // 名前を姓・名に分割（ふりがなを参照して分割位置を推測）
            const [lastName, firstName] = splitName(childName, furigana)
            const [lastNameKana, firstNameKana] = splitName(furigana)

            let childId: string
            let profileId: string
            let action: 'used_existing' | 'created_new'

            if (existingChildId) {
                // ケースB: 既存childあり
                childId = existingChildId

                // 既存childからparent_profile_idを取得
                const existingChild = await db
                    .select({ parentProfileId: children.parentProfileId })
                    .from(children)
                    .where(eq(children.id, existingChildId))
                    .limit(1)

                if (existingChild.length === 0 || !existingChild[0].parentProfileId) {
                    // childはあるがprofileがない場合、profileを新規作成
                    const newProfile = await db
                        .insert(profiles)
                        .values({
                            email,
                            role: 'parent',
                        })
                        .returning({ id: profiles.id })

                    profileId = newProfile[0].id

                    // childのparent_profile_idを更新
                    await db
                        .update(children)
                        .set({ parentProfileId: profileId })
                        .where(eq(children.id, existingChildId))
                } else {
                    profileId = existingChild[0].parentProfileId

                    // 既存profileにメアドがない場合は更新
                    await db
                        .update(profiles)
                        .set({ email })
                        .where(eq(profiles.id, profileId))
                }

                action = 'used_existing'
            } else {
                // ケースC: 完全新規
                // 1. profilesを新規作成（メアドのみ）
                const newProfile = await db
                    .insert(profiles)
                    .values({
                        email,
                        role: 'parent',
                        // 親の名前はスプレッドシートにないのでnull
                    })
                    .returning({ id: profiles.id })

                profileId = newProfile[0].id

                // 2. childrenを新規作成
                const newChild = await db
                    .insert(children)
                    .values({
                        parentProfileId: profileId,
                        firstName,
                        lastName,
                        firstNameKana,
                        lastNameKana,
                        birthday, // YYYY-MM-DD形式の文字列をそのまま渡す
                    })
                    .returning({ id: children.id })

                childId = newChild[0].id
                action = 'created_new'
            }

            // 3. visitsを新規作成
            const sessionId = `PAPER-${Date.now()}-${String(i + 1).padStart(3, '0')}`
            const visitData = {
                sessionId,
                childId,
                parentProfileId: profileId,
                status: 'in_progress',
                currentStep: 'questionnaire_started', // DB制約に合わせた有効な値
                visitDate: new Date('2025-12-21'), // イベント日
                errorInfo: {
                    source: 'paper',  // 紙問診票からのインポート
                    imported_at: new Date().toISOString(),
                },
            }
            const newVisit = await db
                .insert(visits)
                .values(visitData as typeof visits.$inferInsert)
                .returning({ id: visits.id })

            imported.push({
                rowNumber: i + 1,
                childId,
                visitId: newVisit[0].id,
                action,
            })
        }

        return NextResponse.json({
            success: true,
            data: {
                imported,
                totalImported: imported.length,
            }
        })

    } catch (error) {
        console.error('インポートエラー:', error)
        return NextResponse.json(
            { success: false, error: 'インポートに失敗しました' },
            { status: 500 }
        )
    }
}

/**
 * 名前を姓・名に分割
 * - 全角スペースを半角に統一
 * - 複数スペースを1つに
 * - 前後の空白を除去
 * - スペースがない場合はふりがなを参照して分割位置を推測
 */
function splitName(fullName: string, furigana?: string): [string, string] {
    // 全角スペースを半角に変換、複数スペースを1つに統一
    const normalized = fullName
        .trim()
        .replace(/\u3000/g, ' ')  // 全角スペース→半角
        .replace(/\s+/g, ' ')     // 複数スペース→1つ
        .trim()

    // スペースで分割できる場合
    const parts = normalized.split(' ')
    if (parts.length >= 2) {
        return [parts[0], parts.slice(1).join(' ')]
    }

    // スペースがない場合、ふりがなを参照して分割位置を推測
    if (furigana) {
        const normalizedFurigana = furigana
            .trim()
            .replace(/\u3000/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()

        const furiganaParts = normalizedFurigana.split(' ')
        if (furiganaParts.length >= 2) {
            // ふりがなの姓の文字数を参考に漢字を分割
            const lastNameLength = furiganaParts[0].length

            // 漢字とひらがなで文字数の対応を推測（1:1.5〜2くらい）
            // より正確には形態素解析が必要だが、簡易的に1:1で試す
            // 日本語の姓は通常1〜4文字
            for (let splitAt = 1; splitAt <= Math.min(4, normalized.length - 1); splitAt++) {
                const candidateLast = normalized.slice(0, splitAt)
                const candidateFirst = normalized.slice(splitAt)

                // ふりがなの姓の長さに近い位置で分割
                if (Math.abs(candidateLast.length * 1.5 - lastNameLength) <= 1.5) {
                    return [candidateLast, candidateFirst]
                }
            }

            // 見つからなければ2文字で分割（日本人の姓で最も一般的）
            if (normalized.length >= 2) {
                return [normalized.slice(0, 2), normalized.slice(2)]
            }
        }
    }

    // それでもダメな場合は2文字で分割を試みる
    if (normalized.length >= 2) {
        return [normalized.slice(0, 2), normalized.slice(2)]
    }

    return [normalized, '']
}
