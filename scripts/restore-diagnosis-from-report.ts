/**
 * AIレポートから診断項目を逆算してDBに保存するスクリプト
 * 
 * 使用方法:
 * npx tsx scripts/restore-diagnosis-from-report.ts
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!

// 診断項目のマッピング（question → id, options）
interface DiagnosisItemDef {
    id: string
    question: string
    category: string
    options: { label: string; value: string }[]
}

async function getDiagnosisItems(): Promise<DiagnosisItemDef[]> {
    const { data: items } = await supabase
        .from('diagnosis_items')
        .select('id, question, options, category_id')
        .eq('is_active', true)
        .eq('input_type', 'staff')

    const { data: categories } = await supabase
        .from('diagnosis_categories')
        .select('id, name')

    const catMap: Record<string, string> = {}
    categories?.forEach(c => catMap[c.id] = c.name)

    return (items || []).map(item => ({
        id: item.id,
        question: item.question,
        category: catMap[item.category_id] || '',
        options: typeof item.options === 'string' ? JSON.parse(item.options) : (item.options || [])
    }))
}

async function extractDiagnosisFromReport(
    aiSummary: string,
    diagnosisItems: DiagnosisItemDef[]
): Promise<Record<string, string>> {
    const itemsDescription = diagnosisItems.map(item => {
        const optLabels = item.options.map(o => o.label || o).join(', ')
        return `- ${item.category}/${item.question}: [${optLabels}]`
    }).join('\n')

    const prompt = `以下のAI分析レポートから、診断項目の値を推定してください。

【AIレポート】
${aiSummary}

【診断項目と選択肢】
${itemsDescription}

【出力形式】
各項目について、レポートから読み取れる値をJSON形式で出力してください。
レポートに記載がない項目は含めないでください。
選択肢から最も近い値を選んでください。

例:
{
  "舌小帯短縮症": "有",
  "舌の動き": "良い",
  "歯列・咬合": "過蓋咬合",
  "口唇閉鎖": "不可",
  "口呼吸・鼻呼吸": "口呼吸"
}

【回答】`

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.1,
                responseMimeType: 'application/json'
            }
        })
    })
    const data = await response.json()

    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
    try {
        return JSON.parse(content)
    } catch {
        console.error('JSON parse error:', content)
        return {}
    }
}

async function saveDiagnosisResponses(
    visitId: string,
    sessionId: string,
    extractedValues: Record<string, string>,
    diagnosisItems: DiagnosisItemDef[]
) {
    // questionからitemIdへのマップ（複数形式でマッチ）
    const questionToItem: Record<string, DiagnosisItemDef> = {}
    diagnosisItems.forEach(item => {
        // questionのみ
        questionToItem[item.question] = item
        // カテゴリ/question形式
        questionToItem[`${item.category}/${item.question}`] = item
    })

    let savedCount = 0
    for (const [question, value] of Object.entries(extractedValues)) {
        const item = questionToItem[question]
        if (!item) {
            console.log(`    [SKIP] 項目不一致: "${question}" = ${value}`)
            continue
        }

        // optionsからvalueを取得
        let actualValue = value
        if (item.options && item.options.length > 0) {
            const opt = item.options.find(o => o.label === value || o.value === value)
            if (opt) {
                actualValue = opt.value
            }
        }

        // DBに保存
        const { error } = await supabase
            .from('diagnosis_responses')
            .insert({
                visit_id: visitId,
                session_id: sessionId,
                item_id: item.id,
                value: actualValue,
                metadata: { restored_from_report: true },
                answered_at: new Date().toISOString()
            })

        if (error) {
            console.error(`Error saving ${question}:`, error.message)
        } else {
            savedCount++
        }
    }
    return savedCount
}

async function main() {
    console.log('=== 診断データ復元スクリプト ===\n')

    // 診断項目定義を取得
    const diagnosisItems = await getDiagnosisItems()
    console.log(`診断項目数: ${diagnosisItems.length}`)

    // 配信確認完了したvisitを取得
    const { data: visits } = await supabase
        .from('visits')
        .select('id, session_id, current_step')
        .eq('current_step', 'line_confirmed')

    console.log(`対象visit数: ${visits?.length || 0}\n`)

    for (const visit of visits || []) {
        // レポートを取得
        const { data: reports } = await supabase
            .from('reports')
            .select('ai_summary')
            .eq('visit_id', visit.id)

        if (!reports?.length || !reports[0].ai_summary) {
            console.log(`[${visit.id.substring(0, 8)}] レポートなし - スキップ`)
            continue
        }

        const aiSummary = reports[0].ai_summary

        // 既存の診断データがあるか確認
        const { count } = await supabase
            .from('diagnosis_responses')
            .select('id', { count: 'exact', head: true })
            .eq('visit_id', visit.id)

        if (count && count > 0) {
            console.log(`[${visit.id.substring(0, 8)}] 既存データあり (${count}件) - スキップ`)
            continue
        }

        console.log(`[${visit.id.substring(0, 8)}] 復元中...`)

        // AIでレポートから診断項目を抽出
        const extractedValues = await extractDiagnosisFromReport(aiSummary, diagnosisItems)
        console.log(`  抽出項目数: ${Object.keys(extractedValues).length}`)

        // DBに保存
        const savedCount = await saveDiagnosisResponses(
            visit.id,
            visit.session_id,
            extractedValues,
            diagnosisItems
        )
        console.log(`  保存完了: ${savedCount}件`)
    }

    console.log('\n=== 完了 ===')
}

main().catch(console.error)
