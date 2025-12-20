import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { visits, questionnaires, diagnoses, diagnosisResponses, diagnosisItems, diagnosisCategories, aiPrompts } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Gemini APIの初期化
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, visitId, testMode, testData, customPrompt } = body

    let dataForPrompt = {
      childName: '',
      childAge: '',
      childAgeMonths: 0,
      childGender: '',
      medicalHistory: '',
      concerns: '',
      postureScore: '',
      postureIssues: '',
      oralScore: '',
      oralIssues: '',
      staffNotes: '',
      diagnosisDetails: '',
      postureDetails: '',
      oralDetails: '',
      questionnaireDetails: ''
    }

    let qData: any = null
    let rData: any[] = []

    if (testMode && testData) {
      // テストモード: フロントエンドから送られたデータを使用
      dataForPrompt.childName = testData.childName || 'テスト太郎'
      dataForPrompt.childAgeMonths = testData.childAgeMonths || 0
      dataForPrompt.childAge = String(Math.floor(dataForPrompt.childAgeMonths / 12))
      dataForPrompt.childGender = testData.childGender || ''
      dataForPrompt.postureScore = String(testData.postureScore || '不明')
      dataForPrompt.oralScore = String(testData.oralScore || '不明')
      dataForPrompt.postureIssues = Array.isArray(testData.postureIssues) ? testData.postureIssues.join(', ') : 'なし'
      dataForPrompt.oralIssues = Array.isArray(testData.oralIssues) ? testData.oralIssues.join(', ') : 'なし'
      dataForPrompt.staffNotes = testData.staffNotes || ''

      // diagnosisMeta から rData 形式に変換
      if (testData.diagnosisMeta) {
        Object.entries(testData.diagnosisMeta).forEach(([itemId, meta]: [string, any]) => {
          rData.push({
            itemId,
            question: meta.question,
            value: meta.value,
            categoryName: ''
          })
        })
      }

      // questionnaireMeta から qData を構築
      if (testData.questionnaireMeta) {
        qData = {}
        Object.entries(testData.questionnaireMeta).forEach(([itemId, meta]: [string, any]) => {
          qData[itemId] = meta.value
          // rData にも追加（変数置換で使用）
          rData.push({
            itemId,
            question: meta.question,
            value: meta.value,
            categoryName: ''
          })
        })
      }

      // diagnosisDetails/questionnaireDetails を構築
      const diagLines: string[] = []
      const questLines: string[] = []
      if (testData.diagnosisMeta) {
        Object.values(testData.diagnosisMeta).forEach((meta: any) => {
          diagLines.push(`${meta.question}: ${meta.value}`)
        })
      }
      if (testData.questionnaireMeta) {
        Object.values(testData.questionnaireMeta).forEach((meta: any) => {
          questLines.push(`${meta.question}: ${meta.value}`)
        })
      }
      dataForPrompt.diagnosisDetails = diagLines.join('\n') || 'なし'
      dataForPrompt.questionnaireDetails = questLines.join('\n') || 'なし'

    } else if (sessionId || visitId) {
      let targetSessionId = sessionId
      let visitData: any = null

      if (visitId) {
        const vRows = await db.select().from(visits).where(eq(visits.id, visitId)).limit(1)
        visitData = vRows[0]
        if (!visitData) return NextResponse.json({ error: 'Visit not found' }, { status: 404 })
        targetSessionId = visitData.sessionId
      } else {
        const vRows = await db.select().from(visits).where(eq(visits.sessionId, sessionId)).limit(1)
        visitData = vRows[0]
      }

      // 問診データ取得
      const qRows = await db.select().from(questionnaires).where(eq(questionnaires.sessionId, targetSessionId)).limit(1)
      qData = qRows[0]

      // 診断データ取得
      const dRows = await db.select().from(diagnoses).where(eq(diagnoses.sessionId, targetSessionId)).limit(1)
      const dData = dRows[0]

      // 診断回答取得
      rData = await db
        .select({
          value: diagnosisResponses.value,
          question: diagnosisItems.question,
          categoryName: diagnosisCategories.name,
          itemId: diagnosisItems.id
        })
        .from(diagnosisResponses)
        .leftJoin(diagnosisItems, eq(diagnosisResponses.itemId, diagnosisItems.id))
        .leftJoin(diagnosisCategories, eq(diagnosisItems.categoryId, diagnosisCategories.id))
        .where(eq(diagnosisResponses.sessionId, targetSessionId))

      // データのマッピング
      dataForPrompt.childName = qData?.childName || ''
      dataForPrompt.childAgeMonths = visitData?.childAgeMonths || 0
      dataForPrompt.childAge = String(Math.floor(dataForPrompt.childAgeMonths / 12))
      dataForPrompt.childGender = qData?.childGender || ''
      dataForPrompt.medicalHistory = Array.isArray(qData?.medicalHistory) ? qData?.medicalHistory.join(', ') : (qData?.medicalHistory || 'なし')
      dataForPrompt.concerns = Array.isArray(qData?.concerns) ? qData?.concerns.join(', ') : (qData?.concerns || 'なし')

      const pAnalysis = (dData?.postureAnalysis as any) || {}
      const oAnalysis = (dData?.oralAnalysis as any) || {}
      dataForPrompt.postureScore = String(pAnalysis.overall_score || pAnalysis.overallScore || '不明')
      dataForPrompt.postureIssues = Array.isArray(pAnalysis.issues) ? pAnalysis.issues.join(', ') : 'なし'
      dataForPrompt.oralScore = String(oAnalysis.overall_score || oAnalysis.overallScore || '不明')
      dataForPrompt.oralIssues = Array.isArray(oAnalysis.issues) ? oAnalysis.issues.join(', ') : 'なし'
      dataForPrompt.staffNotes = dData?.staffNotes || ''

      const pDetails: string[] = []
      const oDetails: string[] = []
      const allD: string[] = []

      rData.forEach((r) => {
        const category = r.categoryName || 'その他'
        const question = r.question || ''
        const line = `${question}: ${r.value}`
        const isPosture = category.includes('姿勢') || category.includes('全身') || category.includes('足') || category.includes('体')
        if (isPosture) pDetails.push(line)
        else oDetails.push(line)
        allD.push(`[${category}] ${line}`)
      })

      dataForPrompt.postureDetails = pDetails.join('\n') || 'なし'
      dataForPrompt.oralDetails = oDetails.join('\n') || 'なし'
      dataForPrompt.diagnosisDetails = allD.join('\n') || 'なし'

      // 問診データの詳細を構築
      if (qData) {
        const questLines: string[] = []
        // 問診データから主要フィールドを抽出
        if (qData.childName) questLines.push(`お子様の名前: ${qData.childName}`)
        if (qData.childGender) questLines.push(`性別: ${qData.childGender}`)
        if (qData.medicalHistory) questLines.push(`既往歴: ${Array.isArray(qData.medicalHistory) ? qData.medicalHistory.join(', ') : qData.medicalHistory}`)
        if (qData.concerns) questLines.push(`気になること: ${Array.isArray(qData.concerns) ? qData.concerns.join(', ') : qData.concerns}`)
        if (qData.idealGoals) questLines.push(`理想の状態: ${Array.isArray(qData.idealGoals) ? qData.idealGoals.join(', ') : qData.idealGoals}`)
        if (qData.notes) questLines.push(`備考: ${qData.notes}`)
        dataForPrompt.questionnaireDetails = questLines.join('\n') || 'なし'
      }
    }

    if (!genAI) return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 })

    const years = Math.floor(dataForPrompt.childAgeMonths / 12)
    const months = dataForPrompt.childAgeMonths % 12
    const ageDisplay = months > 0 ? `${years}歳${months}ヶ月` : `${years}歳`

    let finalTemplate = customPrompt
    let variableConfig: any[] = body.variableConfig || []
    let modelName: string = body.modelName || 'gemini-2.5-flash-lite'

    if (!finalTemplate) {
      const activePrompts = await db.select().from(aiPrompts).where(eq(aiPrompts.isActive, true)).limit(1)
      if (activePrompts[0]) {
        finalTemplate = activePrompts[0].promptTemplate
        if (!variableConfig.length) variableConfig = activePrompts[0].variableConfig as any[] || []
        if (!body.modelName && activePrompts[0].modelName) modelName = activePrompts[0].modelName
      }
    }

    if (!finalTemplate) return NextResponse.json({ error: 'Prompt template not found' }, { status: 500 })

    // システム変数の置換
    let prompt = finalTemplate
      .replace(/\{\{\s*ageDisplay\s*\}\}/g, ageDisplay)
      .replace(/\{\{\s*childName\s*\}\}/g, dataForPrompt.childName)
      .replace(/\{\{\s*childAge\s*\}\}/g, dataForPrompt.childAge)
      .replace(/\{\{\s*childGender\s*\}\}/g, dataForPrompt.childGender)
      .replace(/\{\{\s*postureScore\s*\}\}/g, dataForPrompt.postureScore)
      .replace(/\{\{\s*oralScore\s*\}\}/g, dataForPrompt.oralScore)
      .replace(/\{\{\s*postureIssues\s*\}\}/g, dataForPrompt.postureIssues)
      .replace(/\{\{\s*oralIssues\s*\}\}/g, dataForPrompt.oralIssues)
      .replace(/\{\{\s*staffNotes\s*\}\}/g, dataForPrompt.staffNotes)
      .replace(/\{\{\s*diagnosisDetails\s*\}\}/g, dataForPrompt.diagnosisDetails)
      .replace(/\{\{\s*questionnaireDetails\s*\}\}/g, dataForPrompt.questionnaireDetails)
      .replace(/\{\{\s*postureDetails\s*\}\}/g, dataForPrompt.postureDetails)
      .replace(/\{\{\s*oralDetails\s*\}\}/g, dataForPrompt.oralDetails)
      .replace(/\{\{\s*medicalHistory\s*\}\}/g, dataForPrompt.medicalHistory)
      .replace(/\{\{\s*concerns\s*\}\}/g, dataForPrompt.concerns)

    // カスタム変数置換
    if (variableConfig && variableConfig.length > 0) {
      const allItemsMap = new Map<string, string>()
      if (qData) {
        Object.entries(qData).forEach(([k, v]) => allItemsMap.set(k, `${k}: ${v}`))
      }
      rData.forEach(r => {
        if (r.itemId) allItemsMap.set(r.itemId, `${r.question}: ${r.value}`)
        if (r.question) allItemsMap.set(r.question, `${r.question}: ${r.value}`)
      })

      variableConfig.forEach((cfg: any) => {
        const itemIds = cfg.itemIds || []
        const lines = itemIds.map((id: string) => allItemsMap.get(id)).filter(Boolean)
        const replacement = lines.join('\n') || 'なし'
        prompt = prompt.replace(new RegExp(`\\{\\{${cfg.name}\\}\\}`, 'g'), replacement)
      })
    }

    const model = genAI.getGenerativeModel({ model: modelName })
    const result = await model.generateContent(prompt)
    const text = result.response.text()

    if (testMode || !text.trim().startsWith('{')) {
      return NextResponse.json({
        summary: '',
        analysis: text,
        recommendations: [],
        nextSteps: [],
        encouragingMessage: '',
        rawText: text
      })
    }

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      return NextResponse.json(JSON.parse(jsonMatch![0]))
    } catch {
      return NextResponse.json({ summary: '', analysis: text, rawText: text })
    }
  } catch (error) {
    console.error('Error generating report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
