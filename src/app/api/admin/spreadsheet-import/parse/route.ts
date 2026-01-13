import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * スプレッドシートCSVパースAPI
 * 
 * CSVファイルをパースし、プレビュー用データを返す
 */
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File | null

        if (!file) {
            return NextResponse.json(
                { success: false, error: 'ファイルが選択されていません' },
                { status: 400 }
            )
        }

        // CSVファイルの内容を読み取り
        const text = await file.text()
        const lines = text.split('\n').filter(line => line.trim())

        if (lines.length < 2) {
            return NextResponse.json(
                { success: false, error: 'CSVファイルにデータがありません' },
                { status: 400 }
            )
        }

        // ヘッダー行をスキップしてデータ行をパース
        const rows = []
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i]
            // CSVの各フィールドをパース（カンマ区切り、ダブルクォート対応）
            const fields = parseCSVLine(line)

            if (fields.length < 5) continue // 不完全な行はスキップ

            const [timestamp, childName, furigana, birthdayRaw, email] = fields

            // 生年月日を変換（YYYYMMDD → YYYY-MM-DD）
            const birthday = formatBirthday(birthdayRaw.trim())

            rows.push({
                rowNumber: i,
                timestamp: timestamp.trim(),
                childName: childName.trim(),
                furigana: furigana.trim(),
                birthday,
                email: email.trim(),
            })
        }

        return NextResponse.json({
            success: true,
            data: {
                rows,
                totalCount: rows.length,
            }
        })

    } catch (error) {
        console.error('CSVパースエラー:', error)
        return NextResponse.json(
            { success: false, error: 'CSVの解析に失敗しました' },
            { status: 500 }
        )
    }
}

/**
 * CSV行をパース（ダブルクォート対応）
 */
function parseCSVLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
        const char = line[i]

        if (char === '"') {
            inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
            result.push(current)
            current = ''
        } else {
            current += char
        }
    }
    result.push(current)

    return result
}

/**
 * 生年月日を変換（YYYYMMDD → YYYY-MM-DD）
 */
function formatBirthday(raw: string): string {
    // すでにハイフン区切りの場合はそのまま
    if (raw.includes('-')) return raw

    // 8桁の数字の場合（YYYYMMDD）
    if (/^\d{8}$/.test(raw)) {
        return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
    }

    // その他の形式はそのまま返す
    return raw
}
