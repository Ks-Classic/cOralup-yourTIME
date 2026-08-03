import { NextResponse } from 'next/server'
import { db } from '@/db'
import {
    visits, children, profiles, reports, lineMessageLogs,
    diagnosisResponses, diagnosisItems, diagnosisCategories,
    questionnaires, aiAnalysisLogs
} from '@/db/schema'
import { eq, gte, lte, sql, desc, and, ne, isNotNull, inArray, type SQL } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/analytics/report?eventIds=uuid1,uuid2&includeTest=false
 * GET /api/admin/analytics/report?from=YYYY-MM-DD&to=YYYY-MM-DD&includeTest=false
 *
 * eventIdsが指定された場合はそのイベント群のvisitのみを対象にする（期間フィルタは無視）。
 * 未指定の場合は従来どおりfrom/toの期間で絞り込む。
 *
 * 世界水準の包括的エビデンスレポートAPI
 * Part 0: Executive Summary
 * Part 1: 基礎集計
 * Part 2: 臨床エビデンス (診断項目別有所見率)
 * Part 3: 多変量相関分析 (φ係数ヒートマップ)
 * Part 4: 年齢発達ベンチマーク
 * Part 5: マーケティングインサイト
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const fromStr = searchParams.get('from')
        const toStr = searchParams.get('to')
        const eventIds = (searchParams.get('eventIds') ?? '')
            .split(',')
            .map(id => id.trim())
            .filter(Boolean)
        const includeTest = searchParams.get('includeTest') === 'true'

        const fromDate = fromStr ? new Date(fromStr + 'T00:00:00+09:00') : new Date('2025-01-01T00:00:00+09:00')
        const toDate = toStr ? new Date(toStr + 'T23:59:59+09:00') : new Date()

        const visitScope: SQL = eventIds.length > 0
            ? inArray(visits.eventId, eventIds)
            : and(
                gte(visits.createdAt, fromDate),
                lte(visits.createdAt, toDate)
            )!

        // ============================================================
        // CORE: 全visitデータ取得
        // ============================================================
        const allVisits = await db
            .select({
                id: visits.id,
                sessionId: visits.sessionId,
                status: visits.status,
                currentStep: visits.currentStep,
                visitDate: visits.visitDate,
                createdAt: visits.createdAt,
                childAgeMonths: visits.childAgeMonths,
                childId: visits.childId,
                lineUserId: visits.lineUserId,
                reportSentAt: visits.reportSentAt,
                stepTimestamps: visits.stepTimestamps,
                isTestData: visits.isTestData,
                parentProfileId: visits.parentProfileId,
                eventId: visits.eventId,
            })
            .from(visits)
            .where(visitScope)
            .orderBy(desc(visits.createdAt))

        const filteredVisits = includeTest ? allVisits : allVisits.filter(v => !v.isTestData)
        const totalVisits = filteredVisits.length
        const visitIds = filteredVisits.map(v => v.id)

        // ============================================================
        // PART 1: 基礎集計
        // ============================================================
        // 1a. 年齢分布 (ブループリントの発達段階区分)
        const ageGroups = {
            '0-1歳 (乳児期)': 0,
            '2-3歳 (乳歯列完成期)': 0,
            '4-5歳 (乳歯列安定期)': 0,
            '6-8歳 (混合歯列期)': 0,
            '9歳以上 (永久歯列移行期)': 0,
            '不明': 0,
        }
        filteredVisits.forEach(v => {
            const months = v.childAgeMonths
            if (!months || months <= 0) ageGroups['不明']++
            else if (months < 24) ageGroups['0-1歳 (乳児期)']++
            else if (months < 48) ageGroups['2-3歳 (乳歯列完成期)']++
            else if (months < 72) ageGroups['4-5歳 (乳歯列安定期)']++
            else if (months < 108) ageGroups['6-8歳 (混合歯列期)']++
            else ageGroups['9歳以上 (永久歯列移行期)']++
        })

        // 1b. 性別分布 (children JOIN)
        const genderDistribution: Record<string, number> = { '男': 0, '女': 0, '不明': 0 }
        if (visitIds.length > 0) {
            const childIds = filteredVisits.filter(v => v.childId).map(v => v.childId!)
            if (childIds.length > 0) {
                const childrenData = await db
                    .select({
                        id: children.id,
                        gender: children.gender,
                    })
                    .from(children)
                    .where(sql`${children.id} IN ${childIds}`)
                childrenData.forEach(c => {
                    if (c.gender === 'male') genderDistribution['男']++
                    else if (c.gender === 'female') genderDistribution['女']++
                    else genderDistribution['不明']++
                })
            }
        }

        // 1c. 時間帯別来場者数
        const hourlyDistribution: Record<number, number> = {}
        for (let h = 8; h <= 20; h++) hourlyDistribution[h] = 0
        filteredVisits.forEach(v => {
            const d = v.visitDate || v.createdAt
            if (d) {
                const jstHour = (new Date(d).getUTCHours() + 9) % 24
                hourlyDistribution[jstHour] = (hourlyDistribution[jstHour] || 0) + 1
            }
        })

        // 1d. ファネル分析
        const stepOrder = [
            'questionnaire_started', 'questionnaire_completed',
            'diagnosis_started', 'photos_uploaded',
            'analysis_completed', 'report_generated',
            'line_sent', 'line_confirmed',
        ]
        const funnel: Record<string, number> = {
            lineRegistered: 0, questionnaireStarted: 0, questionnaireCompleted: 0,
            diagnosisStarted: 0, photosUploaded: 0, analysisCompleted: 0,
            reportGenerated: 0, lineSent: 0, lineConfirmed: 0,
        }
        filteredVisits.forEach(v => {
            funnel.lineRegistered++
            const step = v.currentStep
            if (!step) return
            const stepIndex = stepOrder.indexOf(step)
            if (stepIndex < 0) return
            if (stepIndex >= 0) funnel.questionnaireStarted++
            if (stepIndex >= 1) funnel.questionnaireCompleted++
            if (stepIndex >= 2) funnel.diagnosisStarted++
            if (stepIndex >= 3) funnel.photosUploaded++
            if (stepIndex >= 4) funnel.analysisCompleted++
            if (stepIndex >= 5) funnel.reportGenerated++
            if (stepIndex >= 6) funnel.lineSent++
            if (stepIndex >= 7) funnel.lineConfirmed++
        })

        // ============================================================
        // PART 2: 臨床エビデンス
        // ============================================================
        // 全診断項目 + カテゴリ + 回答 を取得
        const diagnosisData = await db
            .select({
                visitId: diagnosisResponses.visitId,
                categoryName: diagnosisCategories.name,
                categoryOrder: diagnosisCategories.displayOrder,
                itemQuestion: diagnosisItems.question,
                itemId: diagnosisItems.id,
                itemOrder: diagnosisItems.displayOrder,
                answerType: diagnosisItems.answerType,
                itemNote: diagnosisItems.note,
                value: diagnosisResponses.value,
                options: diagnosisItems.options,
                childAgeMonths: visits.childAgeMonths,
            })
            .from(diagnosisResponses)
            .innerJoin(diagnosisItems, eq(diagnosisResponses.itemId, diagnosisItems.id))
            .innerJoin(diagnosisCategories, eq(diagnosisItems.categoryId, diagnosisCategories.id))
            .innerJoin(visits, eq(diagnosisResponses.visitId, visits.id))
            .where(
                and(
                    visitScope,
                    includeTest ? undefined : eq(visits.isTestData, false)
                )
            )
            .orderBy(diagnosisCategories.displayOrder, diagnosisItems.displayOrder)

        // 2a. カテゴリ別・項目別の回答分布を集計
        type ItemStats = {
            question: string
            note: string | null
            answerType: string
            totalResponses: number
            valueCounts: Record<string, number>
            options: any
        }
        type CategoryStats = {
            name: string
            order: number
            items: Record<string, ItemStats>
        }

        const clinicalEvidence: Record<string, CategoryStats> = {}

        // Aggregate by unique category (deduplicate by name)
        const categoryIdToName = new Map<string, { name: string; order: number }>()

        diagnosisData.forEach(row => {
            const catKey = row.categoryName
            if (!clinicalEvidence[catKey]) {
                clinicalEvidence[catKey] = {
                    name: row.categoryName,
                    order: row.categoryOrder ?? 0,
                    items: {},
                }
            }
            const cat = clinicalEvidence[catKey]

            const itemKey = row.itemQuestion
            if (!cat.items[itemKey]) {
                cat.items[itemKey] = {
                    question: row.itemQuestion,
                    note: row.itemNote,
                    answerType: row.answerType,
                    totalResponses: 0,
                    valueCounts: {},
                    options: row.options,
                }
            }
            const item = cat.items[itemKey]
            item.totalResponses++
            item.valueCounts[row.value] = (item.valueCounts[row.value] || 0) + 1
        })

        // 2b. 年齢層別有所見率
        type AgeGroupClinical = Record<string, Record<string, Record<string, number>>>
        // Structure: ageGroup -> itemQuestion -> value -> count
        const ageGroupClinical: AgeGroupClinical = {}
        const ageGroupLabels = ['0-1歳', '2-3歳', '4-5歳', '6-8歳', '9歳以上']

        const getAgeGroup = (months: number | null): string => {
            if (!months || months <= 0) return '不明'
            if (months < 24) return '0-1歳'
            if (months < 48) return '2-3歳'
            if (months < 72) return '4-5歳'
            if (months < 108) return '6-8歳'
            return '9歳以上'
        }

        diagnosisData.forEach(row => {
            const ageGroup = getAgeGroup(row.childAgeMonths)
            if (ageGroup === '不明') return

            if (!ageGroupClinical[ageGroup]) ageGroupClinical[ageGroup] = {}
            if (!ageGroupClinical[ageGroup][row.itemQuestion]) ageGroupClinical[ageGroup][row.itemQuestion] = {}
            const item = ageGroupClinical[ageGroup][row.itemQuestion]
            item[row.value] = (item[row.value] || 0) + 1
        })

        // ============================================================
        // PART 3: 多変量相関分析 (φ係数)
        // ============================================================
        // Build per-visit binary feature matrix for key clinical items
        const keyItems = [
            '口呼吸・鼻呼吸', '低位舌', '口唇閉鎖', 'ハート舌',
            '骨盤', '軸', '頭位', '下肢',
            '外反足', '浮指', '扁平足', '外反母趾',
            '舌突出癖', 'オトガイ筋収縮',
            '目の下のクマ', '左右差', '広頚筋緊張',
            '扁桃腺肥大',
        ]

        // visitId -> { itemQuestion -> value }
        const visitFeatures = new Map<string, Record<string, string>>()
        diagnosisData.forEach(row => {
            if (!row.visitId) return
            if (!keyItems.includes(row.itemQuestion)) return
            if (!visitFeatures.has(row.visitId)) {
                visitFeatures.set(row.visitId, {})
            }
            visitFeatures.get(row.visitId)![row.itemQuestion] = row.value
        })

        // Convert to binary: "abnormal" = 1 for each item
        const abnormalValues: Record<string, string[]> = {
            '口呼吸・鼻呼吸': ['mouth'],
            '低位舌': ['yes'],
            '口唇閉鎖': ['impossible'],
            'ハート舌': ['yes'],
            '骨盤': ['posterior', 'anterior'],
            '軸': ['swayback', 'kyphosis'],
            '頭位': ['forward'],
            '下肢': ['bow', 'knock'],
            '外反足': ['yes'],
            '浮指': ['yes'],
            '扁平足': ['yes'],
            '外反母趾': ['yes'],
            '舌突出癖': ['yes'],
            'オトガイ筋収縮': ['yes'],
            '目の下のクマ': ['yes'],
            '左右差': ['yes'],
            '広頚筋緊張': ['yes'],
            '扁桃腺肥大': ['degree1', 'degree2', 'degree3'],
        }

        const displayLabels: Record<string, string> = {
            '口呼吸・鼻呼吸': '口呼吸',
            '口唇閉鎖': '口唇閉鎖不全',
            '扁桃腺肥大': '扁桃腺肥大',
            '骨盤': '骨盤異常',
            '軸': '軸異常(猫背等)',
            '頭位': 'フォワードヘッド',
            '下肢': '下肢異常(O脚/X脚)',
        }

        // Compute φ coefficient matrix
        const presentItems = keyItems.filter(item => {
            let hasData = false
            visitFeatures.forEach(features => {
                if (features[item] !== undefined) hasData = true
            })
            return hasData
        })

        const correlationMatrix: Array<{
            item1: string
            item2: string
            phi: number
            n: number
            item1Rate: number
            item2Rate: number
        }> = []

        for (let i = 0; i < presentItems.length; i++) {
            for (let j = i + 1; j < presentItems.length; j++) {
                const item1 = presentItems[i]
                const item2 = presentItems[j]

                let a = 0, b = 0, c = 0, d = 0 // 2x2 contingency table
                visitFeatures.forEach(features => {
                    const val1 = features[item1]
                    const val2 = features[item2]
                    if (val1 === undefined || val2 === undefined) return

                    const isAbnormal1 = abnormalValues[item1]?.includes(val1) ?? false
                    const isAbnormal2 = abnormalValues[item2]?.includes(val2) ?? false

                    if (isAbnormal1 && isAbnormal2) a++
                    else if (isAbnormal1 && !isAbnormal2) b++
                    else if (!isAbnormal1 && isAbnormal2) c++
                    else d++
                })

                const n = a + b + c + d
                if (n < 5) continue // Skip if too few samples

                const phi = (a * d - b * c) / Math.sqrt((a + b) * (c + d) * (a + c) * (b + d))

                correlationMatrix.push({
                    item1: displayLabels[item1] || item1,
                    item2: displayLabels[item2] || item2,
                    phi: isNaN(phi) ? 0 : Number(phi.toFixed(3)),
                    n,
                    item1Rate: n > 0 ? Number(((a + b) / n * 100).toFixed(1)) : 0,
                    item2Rate: n > 0 ? Number(((a + c) / n * 100).toFixed(1)) : 0,
                })
            }
        }

        // Sort by absolute phi value
        correlationMatrix.sort((x, y) => Math.abs(y.phi) - Math.abs(x.phi))

        // ============================================================
        // PART 4: 年齢別ベンチマーク
        // ============================================================
        // Key benchmark items with their "positive" values
        const benchmarkItems = [
            { question: '口唇閉鎖', label: '口唇閉鎖可能率', positiveValues: ['possible'] },
            { question: '低位舌', label: '低位舌なし率', positiveValues: ['no'] },
            { question: '口呼吸・鼻呼吸', label: '鼻呼吸率', positiveValues: ['nose'] },
            { question: '舌突出癖', label: '舌突出癖なし率', positiveValues: ['no'] },
            { question: '浮指', label: '浮指なし率', positiveValues: ['no'] },
            { question: '扁平足', label: '扁平足なし率(足カテゴリ)', positiveValues: ['no'] },
        ]

        const ageGroupBenchmarks: Record<string, Record<string, { positive: number; total: number; rate: number }>> = {}
        ageGroupLabels.forEach(ag => {
            ageGroupBenchmarks[ag] = {}
        })

        diagnosisData.forEach(row => {
            const ageGroup = getAgeGroup(row.childAgeMonths)
            if (ageGroup === '不明') return

            const bm = benchmarkItems.find(b => b.question === row.itemQuestion)
            if (!bm) return

            if (!ageGroupBenchmarks[ageGroup][bm.label]) {
                ageGroupBenchmarks[ageGroup][bm.label] = { positive: 0, total: 0, rate: 0 }
            }
            const entry = ageGroupBenchmarks[ageGroup][bm.label]
            entry.total++
            if (bm.positiveValues.includes(row.value)) entry.positive++
            entry.rate = entry.total > 0 ? Number((entry.positive / entry.total * 100).toFixed(1)) : 0
        })

        // 口唇圧の数値データ (number型)
        const lipPressureData: Record<string, number[]> = {}
        ageGroupLabels.forEach(ag => { lipPressureData[ag] = [] })
        diagnosisData.forEach(row => {
            if (row.itemQuestion !== '口唇圧') return
            const ageGroup = getAgeGroup(row.childAgeMonths)
            if (ageGroup === '不明') return
            const val = parseFloat(row.value)
            if (!isNaN(val)) lipPressureData[ageGroup].push(val)
        })

        const lipPressureStats: Record<string, { median: number | null; mean: number | null; count: number }> = {}
        ageGroupLabels.forEach(ag => {
            const arr = lipPressureData[ag].sort((a, b) => a - b)
            if (arr.length === 0) {
                lipPressureStats[ag] = { median: null, mean: null, count: 0 }
            } else {
                const mid = Math.floor(arr.length / 2)
                const median = arr.length % 2 !== 0 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2
                const mean = arr.reduce((s, v) => s + v, 0) / arr.length
                lipPressureStats[ag] = {
                    median: Number(median.toFixed(2)),
                    mean: Number(mean.toFixed(2)),
                    count: arr.length,
                }
            }
        })

        // ============================================================
        // PART 5: マーケティングインサイト
        // ============================================================
        // 保護者の関心事 (questionnaires.concerns) - テーブルが存在しない場合に備えてtry-catch
        let concernsData: Array<{ concerns: any; idealGoals: any }> = []
        // テキスト分析: 単語頻度を集計
        const wordFreq: Record<string, number> = {}
        const goalFreq: Record<string, number> = {}

        try {
            concernsData = await db
                .select({
                    concerns: questionnaires.concerns,
                    idealGoals: questionnaires.idealGoals,
                })
                .from(questionnaires)
                .where(isNotNull(questionnaires.concerns))

            concernsData.forEach(row => {
                const parseText = (data: any): string[] => {
                    if (!data) return []
                    if (typeof data === 'string') return [data]
                    if (Array.isArray(data)) return data.filter(d => typeof d === 'string')
                    if (typeof data === 'object') return Object.values(data).filter(d => typeof d === 'string') as string[]
                    return []
                }

                parseText(row.concerns).forEach(text => {
                    const keywords = [
                        '歯並び', '歯並', '噛み合わせ', '呼吸', '口呼吸', '鼻呼吸',
                        '姿勢', '指しゃぶり', '口ぽかん', '発音', '滑舌',
                        '食事', '偏食', '食べ', '丸のみ', '噛まない', '噛',
                        'いびき', '睡眠', '寝',
                        '歯ぎしり', '心配', '気になる',
                        '舌', '唇', '扁桃', '鼻づまり', 'アレルギー',
                        '虫歯', 'むし歯', 'フッ素',
                        '矯正', '育成',
                    ]
                    keywords.forEach(kw => {
                        if (text.includes(kw)) {
                            wordFreq[kw] = (wordFreq[kw] || 0) + 1
                        }
                    })
                })

                parseText(row.idealGoals).forEach(text => {
                    const keywords = [
                        '歯並び', '噛み合わせ', '鼻呼吸', '姿勢', '健康',
                        '予防', '成長', '発達', '改善', '矯正', '育成',
                    ]
                    keywords.forEach(kw => {
                        if (text.includes(kw)) {
                            goalFreq[kw] = (goalFreq[kw] || 0) + 1
                        }
                    })
                })
            })
        } catch (e) {
            console.warn('[Report API] questionnaires table not available, skipping marketing text analysis:', e)
        }

        // AI分析評価分布
        const aiGrades: Record<string, number> = { 'A': 0, 'B': 0, 'C': 0, '不明': 0 }
        try {
            const aiAnalysis = await db
                .select({
                    outputData: aiAnalysisLogs.outputData,
                    visitId: aiAnalysisLogs.visitId,
                    status: aiAnalysisLogs.status,
                })
                .from(aiAnalysisLogs)
                .where(eq(aiAnalysisLogs.status, 'success'))

            aiAnalysis.forEach(row => {
                const output = row.outputData as any
                if (!output) { aiGrades['不明']++; return }
                const content = typeof output === 'string' ? output : JSON.stringify(output)
                if (content.includes('A') && (content.includes('良好') || content.includes('問題なし') || content.includes('年齢相応'))) {
                    aiGrades['A']++
                } else if (content.includes('C') && (content.includes('要相談') || content.includes('専門') || content.includes('相談'))) {
                    aiGrades['C']++
                } else if (content.includes('B') || content.includes('要観察') || content.includes('経過')) {
                    aiGrades['B']++
                } else {
                    aiGrades['不明']++
                }
            })
        } catch (e) {
            console.warn('[Report API] ai_analysis_logs query failed:', e)
        }

        // ============================================================
        // PART 0: Executive Summary (集約)
        // ============================================================
        // 平均年齢
        const agesMonths = filteredVisits.map(v => v.childAgeMonths).filter(a => a && a > 0) as number[]
        const avgAgeMonths = agesMonths.length > 0 ? agesMonths.reduce((s, v) => s + v, 0) / agesMonths.length : 0
        const sdAgeMonths = agesMonths.length > 1
            ? Math.sqrt(agesMonths.reduce((s, v) => s + Math.pow(v - avgAgeMonths, 2), 0) / (agesMonths.length - 1))
            : 0

        // 完走率
        const completionRate = totalVisits > 0 ? Number((funnel.lineSent / totalVisits * 100).toFixed(1)) : 0

        // 主要所見率 Top5
        const findingRates: Array<{ item: string; rate: number; count: number; total: number }> = []
        Object.values(clinicalEvidence).forEach(cat => {
            Object.values(cat.items).forEach(item => {
                if (item.totalResponses < 3) return // 少なすぎるデータは除外
                // 「異常」側の割合を計算
                const itemName = item.question
                const abVals = abnormalValues[itemName]
                if (abVals) {
                    const abnormalCount = abVals.reduce((sum, v) => sum + (item.valueCounts[v] || 0), 0)
                    const rate = Number((abnormalCount / item.totalResponses * 100).toFixed(1))
                    findingRates.push({
                        item: displayLabels[itemName] || itemName,
                        rate,
                        count: abnormalCount,
                        total: item.totalResponses,
                    })
                }
            })
        })
        findingRates.sort((a, b) => b.rate - a.rate)

        // LINE配信状況（イベント絞り込み時はvisitId経由、期間指定時はcreatedAtで絞る）
        const lineStats = await db
            .select({
                status: lineMessageLogs.status,
                cnt: sql<number>`count(*)`,
            })
            .from(lineMessageLogs)
            .where(
                eventIds.length > 0
                    ? (visitIds.length > 0 ? inArray(lineMessageLogs.visitId, visitIds) : sql`false`)
                    : and(
                        gte(lineMessageLogs.createdAt, fromDate),
                        lte(lineMessageLogs.createdAt, toDate)
                    )
            )
            .groupBy(lineMessageLogs.status)

        const lineDelivery = { total: 0, success: 0, failed: 0 }
        lineStats.forEach(row => {
            const cnt = Number(row.cnt)
            lineDelivery.total += cnt
            if (row.status === 'success') lineDelivery.success += cnt
            else lineDelivery.failed += cnt
        })

        // 診断済みvisit数
        const diagnosisVisitCount = new Set(diagnosisData.map(d => d.visitId)).size

        // ============================================================
        // Build response
        // ============================================================
        // Build correlationItems for heatmap
        const correlationItems = [...new Set(correlationMatrix.flatMap(c => [c.item1, c.item2]))]

        return NextResponse.json({
            generatedAt: new Date().toISOString(),
            period: eventIds.length > 0
                ? { mode: 'events' as const, eventIds }
                : { mode: 'range' as const, from: fromDate.toISOString(), to: toDate.toISOString() },
            dataQuality: {
                totalVisitsIncludingTest: allVisits.length,
                totalVisits,
                testDataExcluded: allVisits.length - filteredVisits.length,
                includeTest,
            },

            // Part 0: Executive Summary
            executiveSummary: {
                totalVisits,
                avgAge: Number((avgAgeMonths / 12).toFixed(1)),
                sdAge: Number((sdAgeMonths / 12).toFixed(1)),
                avgAgeMonths: Math.round(avgAgeMonths),
                maleCount: genderDistribution['男'],
                femaleCount: genderDistribution['女'],
                completionRate,
                diagnosisVisitCount,
                diagnosisCompletionRate: totalVisits > 0 ? Number((diagnosisVisitCount / totalVisits * 100).toFixed(1)) : 0,
                lineDelivery,
                lineSuccessRate: lineDelivery.total > 0 ? Number((lineDelivery.success / lineDelivery.total * 100).toFixed(1)) : 0,
                topFindings: findingRates.slice(0, 5),
                topCorrelations: correlationMatrix.slice(0, 3).map(c => ({
                    pair: `${c.item1} × ${c.item2}`,
                    phi: c.phi,
                    n: c.n,
                })),
                aiGrades,
            },

            // Part 1: 基礎集計
            basicStats: {
                ageDistribution: ageGroups,
                genderDistribution,
                hourlyDistribution,
                funnel,
            },

            // Part 2: 臨床エビデンス
            clinicalEvidence: Object.values(clinicalEvidence)
                .sort((a, b) => a.order - b.order)
                .map(cat => ({
                    category: cat.name,
                    items: Object.values(cat.items).map(item => ({
                        question: item.question,
                        note: item.note,
                        answerType: item.answerType,
                        totalResponses: item.totalResponses,
                        valueCounts: item.valueCounts,
                        options: item.options,
                    })),
                })),
            ageGroupClinical,

            // Part 3: 相関分析
            correlationAnalysis: {
                matrix: correlationMatrix,
                items: correlationItems,
                sampleSizeWarning: totalVisits < 30 ? '⚠️ サンプルサイズ(N<30)が統計的検出力を満たしていない可能性があります' : null,
            },

            // Part 4: ベンチマーク
            ageBenchmarks: {
                rateByAge: ageGroupBenchmarks,
                lipPressure: lipPressureStats,
                ageGroupLabels,
            },

            // Part 5: マーケインサイト
            marketingInsights: {
                parentConcerns: Object.entries(wordFreq)
                    .sort(([, a], [, b]) => b - a)
                    .map(([word, count]) => ({ word, count })),
                parentGoals: Object.entries(goalFreq)
                    .sort(([, a], [, b]) => b - a)
                    .map(([word, count]) => ({ word, count })),
                totalQuestionnaires: concernsData.length,
                aiGrades,
            },
        })

    } catch (error) {
        console.error('[Admin Analytics Report API] Error:', error)
        return NextResponse.json(
            { error: 'レポートデータの取得に失敗しました', details: String(error) },
            { status: 500 }
        )
    }
}
