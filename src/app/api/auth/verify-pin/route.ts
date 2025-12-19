import { NextRequest, NextResponse } from 'next/server'

// 環境変数からPINを取得（STAFF_PIN_CODEを優先、STAFF_PINを後方互換として維持）
const STAFF_PIN = process.env.STAFF_PIN_CODE || process.env.STAFF_PIN || '1234'

/**
 * POST: PIN検証
 * Body: { pin: string }
 */
export async function POST(request: NextRequest) {
    try {
        const { pin } = await request.json()

        if (!pin) {
            return NextResponse.json(
                { valid: false, error: 'PIN is required' },
                { status: 400 }
            )
        }

        // PIN照合
        const isValid = pin === STAFF_PIN

        if (isValid) {
            return NextResponse.json({ valid: true })
        } else {
            return NextResponse.json(
                { valid: false, error: 'Invalid PIN' },
                { status: 401 }
            )
        }
    } catch (error) {
        console.error('[PIN Verify] Error:', error)
        return NextResponse.json(
            { valid: false, error: 'Internal error' },
            { status: 500 }
        )
    }
}
