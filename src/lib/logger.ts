import { headers } from 'next/headers'

// JSTの日時フォーマッター
const formatJST = (date: Date) => {
    return new Intl.DateTimeFormat('ja-JP', {
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3,
    }).format(date)
}

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogContext {
    userId?: string
    staffId?: string
    path?: string
    method?: string
    [key: string]: any
}

class Logger {
    getContext(): LogContext { // Made public or protected as needed, simplified for this context
        // サーバーサイドでの実行時にヘッダーから情報を取得（可能な場合）
        // 注意: Next.jsのheaders()は非同期コンテキストでのみ動作するため、
        // ここで直接呼び出すとエラーになる可能性があります。
        // そのため、コンテキストは明示的に引数として渡す設計にします。
        return {}
    }

    private async sendAlert(message: string, context: LogContext, error?: any) {
        const webhookUrl = process.env.SYSTEM_ALERT_WEBHOOK_URL
        if (!webhookUrl) return

        try {
            const timestamp = formatJST(new Date())
            // Lark/Slack等で読みやすい形式に整形
            const text = `🚨 **Error Detected**\n` +
                `**Time**: ${timestamp}\n` +
                `**Message**: ${message}\n` +
                `**Path**: ${context.path || 'N/A'}\n` +
                `**User**: ${context.staffName || 'Unknown'} (${context.staffId || 'N/A'})\n` +
                `**Error**: ${error?.message || 'N/A'}`

            // Fire and forget - ログ送信で自身の処理をブロックしない
            fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    msg_type: 'text', // Lark format example
                    content: { text }
                })
            }).catch(e => console.error('Failed to send alert:', e))
        } catch (e) {
            console.error('Failed to prepare alert:', e) // Safety net
        }
    }

    private formatMessage(level: LogLevel, message: string, context: LogContext = {}, error?: any) {
        const timestamp = formatJST(new Date())

        // エラー時はアラート送信（非同期）
        if (level === 'error') {
            this.sendAlert(message, context, error)
        }

        // エラーオブジェクトのシリアライズ
        const errorData = error ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
            cause: error.cause,
        } : undefined

        const logEntry = {
            timestamp,
            level,
            message,
            ...context,
            error: errorData,
        }

        // 開発環境では読みやすく表示（オプション）
        if (process.env.NODE_ENV === 'development') {
            const colorMap = {
                info: '\x1b[36m', // Cyan
                warn: '\x1b[33m', // Yellow
                error: '\x1b[31m', // Red
                debug: '\x1b[90m', // Gray
            }
            const reset = '\x1b[0m'
            const details = [context, error].filter(Boolean).map(item => JSON.stringify(item)).join(' ')
            process.stdout.write(`${colorMap[level]}[${level.toUpperCase()}]${reset} ${message}${details ? ` ${details}` : ''}\n`)
        } else {
            // 本番環境（Vercelなど）ではJSON形式で出力
            const output = `${JSON.stringify(logEntry)}\n`
            if (level === 'error') {
                process.stderr.write(output)
            } else {
                process.stdout.write(output)
            }
        }
    }

    info(message: string, context?: LogContext) {
        this.formatMessage('info', message, context)
    }

    warn(message: string, context?: LogContext, error?: any) {
        this.formatMessage('warn', message, context, error)
    }

    error(message: string, context?: LogContext, error?: any) {
        this.formatMessage('error', message, context, error)
    }

    debug(message: string, context?: LogContext) {
        this.formatMessage('debug', message, context)
    }
}

export const logger = new Logger()
