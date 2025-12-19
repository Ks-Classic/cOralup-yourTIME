import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

// Gemini APIの初期化
const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null

// Supabase クライアント (Service Role)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)


export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const body = await request.json()
    const { sessionId, visitId, questionnaire, postureAnalysis, oralAnalysis, staffNotes, testMode, testData, customPrompt } = body

    let rData: any[] | null = null
    let qData: any | null = null
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
      // セクションごとの変数
      postureDetails: '',
      oralDetails: '',
      questionnaireDetails: ''
    }

    // テストモード: 直接データを使用
    if (testMode && testData) {
      dataForPrompt.childName = testData.childName || 'テスト太郎'
      dataForPrompt.childAge = String(testData.childAge || 5)
      dataForPrompt.childAgeMonths = testData.childAgeMonths || 0
      dataForPrompt.childGender = testData.childGender || '男'
      dataForPrompt.postureScore = String(testData.postureScore || 5)
      dataForPrompt.oralScore = String(testData.oralScore || 5)
      dataForPrompt.postureIssues = testData.postureIssues?.join(', ') || 'なし'
      dataForPrompt.oralIssues = testData.oralIssues?.join(', ') || 'なし'
      dataForPrompt.staffNotes = testData.staffNotes || ''

      // データの振り分け
      const qDetails: string[] = []
      const pDetails: string[] = []
      const oDetails: string[] = []
      const allD: string[] = []

      // 新形式: questionnaireMeta { itemId: { question, value } }
      if (testData.questionnaireMeta) {
        for (const [, meta] of Object.entries(testData.questionnaireMeta as Record<string, { question: string, value: string }>)) {
          const line = `${meta.question}: ${meta.value}`
          qDetails.push(line)
          allD.push(`[問診] ${line}`)
        }
      }

      // 新形式: diagnosisMeta { itemId: { question, value } }
      if (testData.diagnosisMeta) {
        for (const [, meta] of Object.entries(testData.diagnosisMeta as Record<string, { question: string, value: string }>)) {
          const line = `${meta.question}: ${meta.value}`
          // 質問名やカテゴリ名で振り分け（簡易実装）
          if (meta.question.includes('姿勢') || meta.question.includes('肩') || meta.question.includes('足') ||
            meta.question.includes('骨盤') || meta.question.includes('軸') || meta.question.includes('頭位') ||
            meta.question.includes('下肢') || meta.question.includes('外反') || meta.question.includes('浮指') ||
            meta.question.includes('扁平足') || meta.question.includes('正面間')) {
            pDetails.push(line)
          } else {
            oDetails.push(line)
          }
          allD.push(`[診断] ${line}`)
        }
      }

      dataForPrompt.questionnaireDetails = qDetails.join('\n')
      dataForPrompt.postureDetails = pDetails.join('\n')
      dataForPrompt.oralDetails = oDetails.join('\n')
      dataForPrompt.diagnosisDetails = allD.join('\n')

    } else if (sessionId || visitId) {
      // 本番モード: DBからデータを取得
      // visitIdがあればそれを使用、なければsessionIdから取得
      let targetSessionId = sessionId
      let visitData: any = null

      if (visitId) {
        // visitIdからsessionIdとchild_age_monthsを取得
        const { data: visit, error: visitError } = await supabase
          .from('visits')
          .select('session_id, child_age_months')
          .eq('id', visitId)
          .single()

        if (visitError) {
          console.error('Visit fetch error:', visitError)
          return NextResponse.json({ error: 'Visitデータの取得に失敗しました' }, { status: 500 })
        }
        targetSessionId = visit.session_id
        visitData = visit
      } else if (targetSessionId) {
        // sessionIdからvisitデータを取得して月齢を取得
        const { data: visit } = await supabase
          .from('visits')
          .select('child_age_months')
          .eq('session_id', targetSessionId)
          .single()
        visitData = visit
      }

      // 1. 問診データを取得
      const { data: qResult, error: qError } = await supabase
        .from('questionnaires')
        .select('*')
        .eq('session_id', targetSessionId)
        .single()

      qData = qResult

      // 2. 診断データを取得
      const { data: dData, error: dError } = await supabase
        .from('diagnoses')
        .select('*')
        .eq('session_id', targetSessionId)
        .single()

      // 3. 診断回答データを取得（itemのidも取得して変数マッピングに使用）
      const { data: respData, error: rError } = await supabase
        .from('diagnosis_responses')
        .select(`
          value,
          diagnosis_items (
            id,
            question,
            diagnosis_categories (
              name
            )
          )
        `)
        .eq('session_id', targetSessionId)

      rData = respData

      if (qError || dError) {
        console.error('Data fetch error:', qError, dError)
        return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 500 })
      }

      // 年齢の設定（月齢があれば使用）
      if (visitData?.child_age_months) {
        dataForPrompt.childAgeMonths = visitData.child_age_months
        dataForPrompt.childAge = String(Math.floor(visitData.child_age_months / 12))
      } else {
        dataForPrompt.childAge = qData?.child_age || ''
      }

      dataForPrompt.childName = qData?.child_name || ''
      dataForPrompt.childGender = qData?.child_gender || ''
      dataForPrompt.medicalHistory = Array.isArray(qData?.medical_history) ? qData.medical_history.join(', ') : (qData?.medical_history || 'なし')
      dataForPrompt.concerns = Array.isArray(qData?.concerns) ? qData.concerns.join(', ') : (qData?.concerns || 'なし')

      // 問診データの詳細化
      const qLines: string[] = []
      if (qData) {
        if (qData.medical_history) qLines.push(`既往歴: ${Array.isArray(qData.medical_history) ? qData.medical_history.join(', ') : qData.medical_history}`)
        if (qData.concerns) qLines.push(`気になる症状: ${Array.isArray(qData.concerns) ? qData.concerns.join(', ') : qData.concerns}`)
        if (qData.eating_habits) qLines.push(`食事の習慣: ${qData.eating_habits}`)
        if (qData.sleeping_habits) qLines.push(`睡眠の様子: ${qData.sleeping_habits}`)
      }

      const pAnalysis = dData?.posture_analysis || {}
      const oAnalysis = dData?.oral_analysis || {}
      dataForPrompt.postureScore = pAnalysis.overall_score || pAnalysis.overallScore || '不明'
      dataForPrompt.postureIssues = Array.isArray(pAnalysis.issues) ? pAnalysis.issues.join(', ') : 'なし'
      dataForPrompt.oralScore = oAnalysis.overall_score || oAnalysis.overallScore || '不明'
      dataForPrompt.oralIssues = Array.isArray(oAnalysis.issues) ? oAnalysis.issues.join(', ') : 'なし'
      dataForPrompt.staffNotes = dData?.staff_notes || ''

      // DBデータのセクション振り分け
      const pDetails: string[] = []
      const oDetails: string[] = []
      const allD: string[] = []

      if (rData && rData.length > 0) {
        rData.forEach((r: any) => {
          const category = r.diagnosis_items?.diagnosis_categories?.name || 'その他'
          const question = r.diagnosis_items?.question || ''
          const answer = r.value
          const line = `${question}: ${answer}`

          // 姿勢・全身・足 これら以外はすべて口腔（受皿を広くする）
          const isPosture = category.includes('姿勢') || category.includes('全身') || category.includes('足') || category.includes('体')

          if (isPosture) {
            pDetails.push(line)
          } else {
            oDetails.push(line)
          }
          allD.push(`[${category}] ${line}`)
        })
      }

      dataForPrompt.questionnaireDetails = qLines.join('\n') || 'なし'
      dataForPrompt.postureDetails = pDetails.join('\n') || 'なし'
      dataForPrompt.oralDetails = oDetails.join('\n') || 'なし'
      dataForPrompt.diagnosisDetails = allD.join('\n') || 'なし'

    } else {
      // 既存ロジック: リクエストボディから直接使用
      if (!questionnaire || !postureAnalysis || !oralAnalysis) {
        return NextResponse.json(
          { error: '必要なデータが提供されていません' },
          { status: 400 }
        )
      }
      dataForPrompt.childName = questionnaire.child_name
      dataForPrompt.childAge = questionnaire.child_age
      dataForPrompt.childGender = questionnaire.child_gender
      dataForPrompt.medicalHistory = questionnaire.medical_history?.join(', ') || 'なし'
      dataForPrompt.concerns = questionnaire.concerns?.join(', ') || 'なし'
      dataForPrompt.postureScore = postureAnalysis.overall_score || postureAnalysis.overallScore
      dataForPrompt.postureIssues = postureAnalysis.issues?.join(', ') || 'なし'
      dataForPrompt.oralScore = oralAnalysis.overall_score || oralAnalysis.overallScore
      dataForPrompt.oralIssues = oralAnalysis.issues?.join(', ') || 'なし'
      dataForPrompt.staffNotes = staffNotes || 'なし'
    }

    // APIキーがない場合はエラーを返す
    if (!genAI) {
      console.error('[AI Report] GEMINI_API_KEY is not configured')
      return NextResponse.json(
        { error: 'GEMINI_API_KEYが設定されていません。環境変数を確認してください。' },
        { status: 500 }
      )
    }

    // 年齢表示の構築（月齢がある場合は○歳○ヶ月形式で表示）
    let ageDisplay: string
    if (dataForPrompt.childAgeMonths > 0) {
      const years = Math.floor(dataForPrompt.childAgeMonths / 12)
      const months = dataForPrompt.childAgeMonths % 12
      ageDisplay = months > 0 ? `${years}歳${months}ヶ月` : `${years}歳`
    } else if (dataForPrompt.childAge) {
      ageDisplay = `${dataForPrompt.childAge}歳`
    } else {
      ageDisplay = ''
    }

    // プロンプト構築（DBまたはカスタムテンプレートを使用）
    let prompt: string
    let finalTemplate = customPrompt
    let variableConfig: any[] = body.variableConfig || []
    let modelName: string = body.modelName || process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite'

    // カスタムプロンプトが提供されていない場合、DBから有効なプロンプトを取得
    if (!finalTemplate) {
      const { data: dbPrompt } = await supabase
        .from('ai_prompts')
        .select('prompt_template, variable_config, model_name')
        .eq('is_active', true)
        .maybeSingle()

      if (dbPrompt) {
        finalTemplate = dbPrompt.prompt_template
        variableConfig = dbPrompt.variable_config || []
        // DBに保存されたモデル名を優先使用
        if (dbPrompt.model_name) {
          modelName = dbPrompt.model_name
        }
      }
    }

    // デバッグ情報を収集
    const debugInfo: {
      allItemsMapKeys?: string[]
      allItemsMapEntries?: Record<string, string>
      variableReplacements?: Array<{
        variableName: string
        requestedItemIds: string[]
        foundItems: string[]
        notFoundItems: string[]
        replacement: string
      }>
      finalPromptPreview?: string
    } = {}

    if (finalTemplate) {
      // テンプレート変数の置換 (ageDisplayのみ)
      prompt = finalTemplate
        .replace(/\{\{\s*ageDisplay\s*\}\}/g, ageDisplay || '')

      // 動的な変数を置換 (Variable Maker の設定)
      if (variableConfig && variableConfig.length > 0) {
        // すべての回答データをフラットなマップにする（検索用）
        const allItemsMap = new Map<string, string>()

        // 1. 問診データをマップに追加
        if (typeof qData !== 'undefined' && qData) {
          Object.entries(qData).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
              allItemsMap.set(key, `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
            }
          })
        } else if (testData?.questionnaireMeta) {
          // テストモード: 新形式（questionnaireMeta: { itemId: { question, value } }）
          Object.entries(testData.questionnaireMeta).forEach(([itemId, meta]: [string, any]) => {
            // itemIdと質問名の両方をキーとして登録
            allItemsMap.set(itemId, `${meta.question}: ${meta.value}`)
            allItemsMap.set(meta.question, `${meta.question}: ${meta.value}`)
          })
        }

        // 2. 診断データをマップに追加
        if (typeof rData !== 'undefined' && rData && rData.length > 0) {
          // 本番モード: DBから取得したデータ
          rData.forEach((r: any) => {
            const id = r.diagnosis_items?.id
            const question = r.diagnosis_items?.question
            const value = r.value
            if (id) allItemsMap.set(id, `${question}: ${value}`)
            if (question) allItemsMap.set(question, `${question}: ${value}`)
          })
        } else if (testData?.diagnosisMeta) {
          // テストモード: 新形式（diagnosisMeta: { itemId: { question, value } }）
          Object.entries(testData.diagnosisMeta).forEach(([itemId, meta]: [string, any]) => {
            // itemIdと質問名の両方をキーとして登録
            allItemsMap.set(itemId, `${meta.question}: ${meta.value}`)
            allItemsMap.set(meta.question, `${meta.question}: ${meta.value}`)
          })
        }

        // デバッグ: マップの内容を記録
        if (testMode) {
          debugInfo.allItemsMapKeys = Array.from(allItemsMap.keys())
          debugInfo.allItemsMapEntries = Object.fromEntries(allItemsMap)
          debugInfo.variableReplacements = []
        }

        variableConfig.forEach((cfg: any) => {
          if (!cfg.name) return

          const targetLines: string[] = []
          const itemIds = cfg.itemIds || []
          const priorityItemIds = cfg.priorityItemIds || []
          const foundItems: string[] = []
          const notFoundItems: string[] = []

          itemIds.forEach((id: string) => {
            const line = allItemsMap.get(id)
            if (line) {
              const isPriority = priorityItemIds.includes(id)
              targetLines.push(isPriority ? `[★最重要] ${line}` : line)
              foundItems.push(id)
            } else {
              notFoundItems.push(id)
            }
          })

          const replacement = targetLines.join('\n') || 'なし'
          const regex = new RegExp(`\\{\\{${cfg.name}\\}\\}`, 'g')
          prompt = prompt.replace(regex, replacement)

          // デバッグ情報を記録
          if (testMode) {
            debugInfo.variableReplacements?.push({
              variableName: cfg.name,
              requestedItemIds: itemIds,
              foundItems,
              notFoundItems,
              replacement
            })
          }
        })

        // デバッグ: 最終プロンプトのプレビュー（最初の500文字）
        if (testMode) {
          debugInfo.finalPromptPreview = prompt.substring(0, 1000)
          console.log('[AI Report Debug] Variable replacement info:', JSON.stringify(debugInfo, null, 2))
        }
      }
    } else {
      // プロンプトが見つからない場合の最小限のフォールバック
      // 通常は管理画面で設定されたプロンプトが使用されるべき
      prompt = `
`.trim()
    }

    // Gemini APIでレポート生成（選択されたモデルを使用）
    const model = genAI.getGenerativeModel({ model: modelName })

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    // テストモードやJSONでない場合はそのまま返す
    if (testMode || !text.trim().startsWith('{')) {
      return NextResponse.json({
        summary: '', // 互換性のため空文字
        analysis: text, // 全文をここに入れる
        recommendations: [],
        nextSteps: [],
        encouragingMessage: '',
        rawText: text, // 明示的に生テキストも返す
        // テストモード時にデバッグ情報を含める
        debug: testMode ? debugInfo : undefined
      })
    }

    // JSONを抽出してパース (既存の互換性維持)
    try {
      // レスポンスからJSON部分を抽出
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('JSONがレスポンスから見つかりませんでした')
      }

      const reportResult = JSON.parse(jsonMatch[0])

      // DB保存ロジックなどは、JSON形式の場合のみ実行（今回は省略）

      return NextResponse.json(reportResult)
    } catch (parseError) {
      console.warn('JSON parse warning, returning raw text:', parseError)
      return NextResponse.json({
        summary: '',
        analysis: text,
        recommendations: [],
        nextSteps: [],
        encouragingMessage: '',
        rawText: text
      })
    }
  } catch (error) {
    console.error('Error in report generation:', error)
    return NextResponse.json(
      { error: 'レポート生成中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

