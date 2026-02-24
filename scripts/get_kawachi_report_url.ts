import { config } from 'dotenv'
import { db } from '../src/db'
import { reports } from '../src/db/schema'
import { eq } from 'drizzle-orm'

config({ path: '.env.local' })

const REPORT_ID = 'f69130ea-abfe-48eb-a5aa-74d63382bf47'

async function getReportUrl() {
    console.log('📋 レポートURLを取得しています...\n')

    const reportRecords = await db.select().from(reports).where(eq(reports.id, REPORT_ID)).limit(1)

    if (reportRecords.length === 0) {
        console.log('❌ レポートが見つかりません')
        return
    }

    const report = reportRecords[0]

    console.log('✅ レポート情報:')
    console.log(`   Report ID: ${report.id}`)
    console.log(`   Visit ID: ${report.visitId}`)
    console.log(`   Session ID: ${report.sessionId}`)
    console.log(`   ステータス: ${report.status}`)
    console.log(`   作成日: ${report.createdAt}`)
    console.log()
    console.log('🌐 正しいレポートURL:')
    console.log(`   ローカル:`)
    console.log(`   http://localhost:3000/report/${report.visitId}`)
    console.log()
    console.log(`   本番環境:`)
    console.log(`   https://coralup-yourtime.vercel.app/report/${report.visitId}`)
    console.log()
    console.log('📝 メモ:')
    console.log(`   - URLには visitId を使用します（reportId ではありません）`)
    console.log(`   - Visit ID: ${report.visitId}`)
}

getReportUrl()
    .catch(console.error)
    .finally(() => process.exit(0))
