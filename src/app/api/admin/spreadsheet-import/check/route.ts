import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { children, visits } from '@/db/schema'
import { eq, and, sql } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

interface CheckRow {
    childName: string
    furigana?: string
    birthday: string
}

/**
 * DB存在チェックAPI
 * 
 * 各行について既存DBを検索し、マッチ状況を返す
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { rows } = body as { rows: CheckRow[] }

        if (!rows || !Array.isArray(rows)) {
            return NextResponse.json(
                { success: false, error: 'rowsが必要です' },
                { status: 400 }
            )
        }

        const results = []
        let foundCount = 0
        let notFoundCount = 0

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i]
            const { childName, furigana, birthday } = row

            // 名前を姓・名に分割（ふりがなを参照して分割位置を推測）
            const [lastName, firstName] = splitName(childName, furigana)

            // DBを検索（姓・名・生年月日で検索）
            const existingChildren = await db
                .select({
                    id: children.id,
                    firstName: children.firstName,
                    lastName: children.lastName,
                    parentProfileId: children.parentProfileId,
                })
                .from(children)
                .where(
                    and(
                        eq(children.lastName, lastName),
                        eq(children.firstName, firstName || ''),
                        eq(sql`DATE(${children.birthday})`, birthday)
                    )
                )
                .limit(1)

            if (existingChildren.length > 0) {
                const child = existingChildren[0]

                // 既存のvisitを取得
                const existingVisits = await db
                    .select({
                        id: visits.id,
                        status: visits.status,
                    })
                    .from(visits)
                    .where(eq(visits.childId, child.id))
                    .limit(1)

                results.push({
                    rowNumber: i + 1,
                    status: 'found' as const,
                    existingChild: {
                        id: child.id,
                        firstName: child.firstName,
                        lastName: child.lastName,
                        parentProfileId: child.parentProfileId,
                    },
                    existingVisit: existingVisits.length > 0 ? {
                        id: existingVisits[0].id,
                        status: existingVisits[0].status,
                    } : undefined,
                })
                foundCount++
            } else {
                results.push({
                    rowNumber: i + 1,
                    status: 'not_found' as const,
                })
                notFoundCount++
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                results,
                summary: {
                    found: foundCount,
                    notFound: notFoundCount,
                }
            }
        })

    } catch (error) {
        console.error('DB検索エラー:', error)
        return NextResponse.json(
            { success: false, error: 'DB検索に失敗しました' },
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
            const lastNameLength = furiganaParts[0].length

            for (let splitAt = 1; splitAt <= Math.min(4, normalized.length - 1); splitAt++) {
                const candidateLast = normalized.slice(0, splitAt)

                if (Math.abs(candidateLast.length * 1.5 - lastNameLength) <= 1.5) {
                    return [candidateLast, normalized.slice(splitAt)]
                }
            }

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
