/**
 * 環境変数バリデーション
 * アプリケーション起動時に必須環境変数の存在を確認し、
 * 不足している場合は明確なエラーメッセージを出力する。
 * 
 * サイレント障害（undefinedのまま動いて、特定操作時に初めて失敗）を防止。
 */

interface EnvVarConfig {
    /** 環境変数名（優先順） */
    names: string[]
    /** この環境変数の用途 */
    description: string
    /** 必須かどうか（falseの場合は警告のみ） */
    required: boolean
}

const ENV_VARS: EnvVarConfig[] = [
    // Supabase
    {
        names: ['DATABASE_URL'],
        description: 'Supabase PostgreSQL接続URL',
        required: true,
    },
    {
        names: ['NEXT_PUBLIC_SUPABASE_URL'],
        description: 'Supabase プロジェクトURL',
        required: true,
    },
    {
        names: ['NEXT_PUBLIC_SUPABASE_ANON_KEY'],
        description: 'Supabase 匿名キー',
        required: true,
    },
    // Gemini AI
    {
        names: ['GEMINI_API_KEY', 'GOOGLE_AI_API_KEY'],
        description: 'Google Gemini API キー',
        required: true,
    },
    // LINE Messaging API
    {
        names: ['LINE_CHANNEL_ACCESS_TOKEN', 'LINE_MESSAGING_CHANNEL_ACCESS_TOKEN'],
        description: 'LINE Messaging API チャネルアクセストークン',
        required: true,
    },
    {
        names: ['LINE_CHANNEL_SECRET', 'LINE_MESSAGING_CHANNEL_SECRET'],
        description: 'LINE Messaging API チャネルシークレット',
        required: true,
    },
    // LIFF
    {
        names: ['NEXT_PUBLIC_LIFF_ID'],
        description: 'LINE LIFF アプリケーションID',
        required: true,
    },
    // App
    {
        names: ['NEXT_PUBLIC_APP_URL'],
        description: 'アプリケーションURL（LINE通知のリンク先）',
        required: false, // デフォルト値あり
    },
    // Staff Auth
    {
        names: ['STAFF_AUTH_SECRET'],
        description: 'スタッフ認証シークレット',
        required: false,
    },
]

export interface EnvValidationResult {
    valid: boolean
    errors: string[]
    warnings: string[]
}

/**
 * 環境変数をバリデーションし、結果を返す
 */
export function validateEnv(): EnvValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    for (const config of ENV_VARS) {
        const found = config.names.find(name => process.env[name])

        if (!found) {
            const varNames = config.names.join(' or ')
            const message = `${varNames} — ${config.description}`

            if (config.required) {
                errors.push(`❌ 未設定: ${message}`)
            } else {
                warnings.push(`⚠️ 未設定: ${message}`)
            }
        }
    }

    return { valid: errors.length === 0, errors, warnings }
}

/**
 * 環境変数バリデーションを実行し、結果をログ出力する。
 * next.config.ts やアプリの初期化処理で呼び出す。
 */
export function logEnvValidation(): void {
    const result = validateEnv()

    if (result.errors.length > 0) {
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.error('🚨 必須環境変数が不足しています:')
        result.errors.forEach(e => console.error(`  ${e}`))
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    }

    if (result.warnings.length > 0) {
        console.warn('[ENV] オプション環境変数:')
        result.warnings.forEach(w => console.warn(`  ${w}`))
    }

    if (result.valid && result.warnings.length === 0) {
        console.log('[ENV] ✅ すべての環境変数が設定済み')
    }
}
