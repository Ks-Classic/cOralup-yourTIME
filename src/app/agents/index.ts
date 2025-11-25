import { z } from 'zod'

// AIエージェントの基底クラス
export abstract class BaseAgent {
  protected abstract prompt: string
  protected abstract inputSchema: z.ZodSchema
  protected abstract outputSchema: z.ZodSchema

  constructor(protected apiKey: string) {}

  async run(input: unknown): Promise<unknown> {
    // 入力の検証
    const validatedInput = this.inputSchema.parse(input)

    // AI API呼び出し
    const result = await this.callAI(validatedInput)

    // 出力の検証
    return this.outputSchema.parse(result)
  }

  protected abstract callAI(input: any): Promise<unknown>
}

// 姿勢分析エージェント
export class PostureAnalysisAgent extends BaseAgent {
  protected prompt = `
あなたは口腔育成の専門家として、姿勢写真からお子様の姿勢状態を分析します。

分析項目:
1. 頭部の位置と傾き
2. 肩の高さの左右差
3. 背骨のカーブ状態
4. 骨盤の傾き
5. 足の位置とバランス

入力データ:
- 写真の説明または特徴
- お子様の年齢
- 既往歴や気になる症状

出力はJSON形式で以下の情報を含めてください:
- overall_score: 全体評価（1-10）
- issues: 問題点の配列
- recommendations: 改善提案の配列
- severity: 深刻度（low/medium/high）
- details: 詳細な分析結果
  `.trim()

  protected inputSchema = z.object({
    imageDescription: z.string(),
    age: z.number(),
    medicalHistory: z.array(z.string()),
    concerns: z.array(z.string()),
  })

  protected outputSchema = z.object({
    overallScore: z.number().min(1).max(10),
    issues: z.array(z.string()),
    recommendations: z.array(z.string()),
    severity: z.enum(['low', 'medium', 'high']),
    details: z.object({
      headPosition: z.string(),
      shoulderBalance: z.string(),
      spineCurve: z.string(),
      pelvisTilt: z.string(),
      footBalance: z.string(),
    }),
  })

  protected async callAI(input: any): Promise<unknown> {
    // Google Gemini API または OpenAI API を呼び出す
    const response = await fetch('/api/ai/analyze-posture', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    })

    return await response.json()
  }
}

// 口腔分析エージェント
export class OralAnalysisAgent extends BaseAgent {
  protected prompt = `
あなたは口腔機能の専門家として、口腔内写真からお子様の口腔状態を分析します。

分析項目:
1. 咬合状態
2. 歯並びの評価
3. 舌の位置と機能
4. 口腔内の清潔度
5. 発音・嚥下機能の推定

入力データ:
- 口腔内写真の説明または特徴
- お子様の年齢
- 既往歴や気になる症状

出力はJSON形式で以下の情報を含めてください:
- overall_score: 全体評価（1-10）
- issues: 問題点の配列
- recommendations: 改善提案の配列
- severity: 深刻度（low/medium/high）
- details: 詳細な分析結果
  `.trim()

  protected inputSchema = z.object({
    imageDescription: z.string(),
    age: z.number(),
    medicalHistory: z.array(z.string()),
    concerns: z.array(z.string()),
  })

  protected outputSchema = z.object({
    overallScore: z.number().min(1).max(10),
    issues: z.array(z.string()),
    recommendations: z.array(z.string()),
    severity: z.enum(['low', 'medium', 'high']),
    details: z.object({
      biteCondition: z.string(),
      teethAlignment: z.string(),
      tonguePosition: z.string(),
      oralCleanliness: z.string(),
      functionEstimation: z.string(),
    }),
  })

  protected async callAI(input: any): Promise<unknown> {
    const response = await fetch('/api/ai/analyze-oral', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    })

    return await response.json()
  }
}

// レポート生成エージェント
export class ReportGeneratorAgent extends BaseAgent {
  protected prompt = `
あなたは口腔育成の専門家として、診断結果から親御さん向けのレポートを生成します。

入力データ:
- 問診票の内容
- 姿勢分析結果
- 口腔分析結果
- スタッフの所見

出力はJSON形式で以下の情報を含めてください:
- summary: 全体の要約
- analysis: 詳細な分析内容
- recommendations: 改善提案
- next_steps: 次のステップの提案
- encouraging_message: 励ましのメッセージ
  `.trim()

  protected inputSchema = z.object({
    questionnaire: z.any(),
    postureAnalysis: z.any(),
    oralAnalysis: z.any(),
    staffNotes: z.string().optional(),
  })

  protected outputSchema = z.object({
    summary: z.string(),
    analysis: z.string(),
    recommendations: z.array(z.string()),
    nextSteps: z.array(z.string()),
    encouragingMessage: z.string(),
  })

  protected async callAI(input: any): Promise<unknown> {
    const response = await fetch('/api/ai/generate-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    })

    return await response.json()
  }
}

// エージェントファクトリ
export const createAgent = (type: 'posture' | 'oral' | 'report', apiKey: string) => {
  switch (type) {
    case 'posture':
      return new PostureAnalysisAgent(apiKey)
    case 'oral':
      return new OralAnalysisAgent(apiKey)
    case 'report':
      return new ReportGeneratorAgent(apiKey)
    default:
      throw new Error(`Unknown agent type: ${type}`)
  }
}

