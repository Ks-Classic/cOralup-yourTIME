/**
 * Next.js Instrumentation
 * サーバー起動時に1回だけ実行される初期化処理
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
    // Server-side only（Edge Runtimeでは実行されない）
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const { logEnvValidation } = await import('@/lib/env-validation')
        logEnvValidation()
    }
}
