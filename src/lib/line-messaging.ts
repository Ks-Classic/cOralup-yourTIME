/**
 * LINE Messaging API ユーティリティ
 * - Push Message 残数チェック
 * - 送信前の安全性確認
 */

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN

interface LineQuotaInfo {
    /** 月間上限数 (-1 = 無制限) */
    totalUsage: number
    /** 今月の使用済み数 */
    usedCount: number
    /** 残り送信可能数 (-1 = 無制限) */
    remaining: number
    /** 上限に達しているか */
    isLimitReached: boolean
    /** 残り少ない（10%以下）か */
    isLow: boolean
}

/**
 * LINE Push Message の月間残数を取得
 * https://developers.line.biz/en/reference/messaging-api/#get-consumption
 */
export async function getLineMessageQuota(): Promise<LineQuotaInfo | null> {
    if (!LINE_CHANNEL_ACCESS_TOKEN) {
        console.warn('[LINE Quota] LINE_CHANNEL_ACCESS_TOKEN is not set')
        return null
    }

    try {
        // 1. 月間上限を取得
        const quotaRes = await fetch('https://api.line.me/v2/bot/message/quota', {
            headers: { Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` },
        })
        const quotaData = await quotaRes.json()

        // 2. 今月の使用量を取得
        const consumptionRes = await fetch('https://api.line.me/v2/bot/message/quota/consumption', {
            headers: { Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` },
        })
        const consumptionData = await consumptionRes.json()

        const totalUsage = quotaData.value ?? -1 // -1 means unlimited
        const usedCount = consumptionData.totalUsage ?? 0
        const remaining = totalUsage === -1 ? -1 : Math.max(0, totalUsage - usedCount)
        const isLimitReached = totalUsage !== -1 && remaining <= 0
        const isLow = totalUsage !== -1 && remaining > 0 && (remaining / totalUsage) <= 0.1

        console.log(`[LINE Quota] 上限: ${totalUsage}, 使用済み: ${usedCount}, 残り: ${remaining}`)

        return { totalUsage, usedCount, remaining, isLimitReached, isLow }
    } catch (error) {
        console.error('[LINE Quota] Failed to check quota:', error)
        return null  // エラー時はnull（送信は止めない）
    }
}

/**
 * LINE Push Message を送信（残数チェック付き）
 * @returns success: 送信成功, quotaExceeded: 上限到達で送信スキップ
 */
export async function sendPushMessageSafe(params: {
    to: string
    messages: any[]
}): Promise<{
    success: boolean
    quotaExceeded: boolean
    responseData?: any
    error?: string
    quota?: LineQuotaInfo | null
}> {
    const { to, messages } = params

    if (!LINE_CHANNEL_ACCESS_TOKEN) {
        return { success: false, quotaExceeded: false, error: 'LINE_CHANNEL_ACCESS_TOKEN is not set' }
    }

    // 残数チェック
    const quota = await getLineMessageQuota()
    if (quota?.isLimitReached) {
        console.warn(`[LINE] ⚠️ 月間上限到達: ${quota.usedCount}/${quota.totalUsage} — 送信スキップ`)
        return { success: false, quotaExceeded: true, quota }
    }
    if (quota?.isLow) {
        console.warn(`[LINE] ⚠️ 残数わずか: 残り${quota.remaining}通 (${quota.usedCount}/${quota.totalUsage})`)
    }

    // 送信
    try {
        const response = await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
            },
            body: JSON.stringify({ to, messages }),
        })

        const responseData = await response.json().catch(() => ({}))

        if (!response.ok) {
            const errorText = JSON.stringify(responseData)
            console.error('[LINE] Push message failed:', errorText)
            return { success: false, quotaExceeded: false, responseData, error: errorText, quota }
        }

        return { success: true, quotaExceeded: false, responseData, quota }
    } catch (error) {
        console.error('[LINE] Push message error:', error)
        return { success: false, quotaExceeded: false, error: String(error), quota }
    }
}
