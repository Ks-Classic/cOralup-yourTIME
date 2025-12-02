import { z } from 'zod'

/**
 * 口腔診断エージェントの出力スキーマ
 */

export const FindingSchema = z.object({
  category: z.string(),
  observation: z.string(),
  severity: z.enum(['normal', 'mild', 'moderate', 'severe']),
  relatedItems: z.array(z.string()).optional(),
})

export const OralDiagnosisOutputSchema = z.object({
  summary: z.enum(['A', 'B', 'C']),
  summaryDescription: z.string().optional(),
  findings: z.array(FindingSchema),
  recommendations: z.array(z.string()),
  parentComment: z.string(),
  professionalNote: z.string().optional(),
})

export type Finding = z.infer<typeof FindingSchema>
export type OralDiagnosisOutput = z.infer<typeof OralDiagnosisOutputSchema>

/**
 * AIレスポンス（JSON文字列）をパースしてバリデーション
 */
export function parseOralDiagnosisResponse(text: string): OralDiagnosisOutput {
  // JSON部分を抽出（マークダウンコードブロック対応）
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from response')
  }
  
  const jsonStr = jsonMatch[1] || jsonMatch[0]
  const parsed = JSON.parse(jsonStr)
  
  return OralDiagnosisOutputSchema.parse(parsed)
}

/**
 * デフォルトのフォールバックレスポンス（AI分析失敗時）
 */
export function getDefaultOralDiagnosisOutput(): OralDiagnosisOutput {
  return {
    summary: 'B',
    summaryDescription: 'AI分析が完了しませんでした',
    findings: [
      {
        category: '評価不能',
        observation: 'AI分析に失敗したため、手動での評価が必要です',
        severity: 'normal',
      }
    ],
    recommendations: ['スタッフによる手動評価をお願いします'],
    parentComment: '診断結果の詳細は担当スタッフからご説明いたします。',
  }
}

/**
 * 分析入力データの型定義
 */
export interface OralAnalysisInput {
  childInfo: {
    ageYears: number
    ageMonths: number
    gender: 'male' | 'female' | 'other'
  }
  questionnaire: Record<string, unknown>
  diagnosis: Record<string, unknown>
  photoUrls?: string[]
}

/**
 * プロンプトテンプレートにデータを埋め込む
 */
export function buildOralAnalysisPrompt(input: OralAnalysisInput): string {
  const { childInfo, questionnaire, diagnosis, photoUrls } = input
  
  const genderLabel = {
    male: '男の子',
    female: '女の子',
    other: 'その他'
  }[childInfo.gender]
  
  return `
あなたは小児歯科・口腔機能発達の専門家です。
提供された診断データを分析し、お子様の口腔機能の状態を評価してください。

## お子様情報
- 年齢: ${childInfo.ageYears}歳${childInfo.ageMonths}ヶ月
- 性別: ${genderLabel}

## 問診データ（保護者入力）
${JSON.stringify(questionnaire, null, 2)}

## 診断データ（スタッフ入力）
${JSON.stringify(diagnosis, null, 2)}

${photoUrls && photoUrls.length > 0 ? `## 写真\n${photoUrls.length}枚の写真が添付されています。` : ''}

## 分析観点

以下のカテゴリごとに評価してください：

1. **舌の状態**: 舌小帯、低位舌、吸い上げ能力など
2. **歯列・咬合**: 噛み合わせ、歯並びの状態
3. **口唇**: 閉鎖能力、小帯異常など
4. **呼吸・嚥下**: 口呼吸の有無、嚥下パターン
5. **習癖の影響**: 指しゃぶりなどの影響

## 出力形式

以下のJSON形式で出力してください：

\`\`\`json
{
  "summary": "A" | "B" | "C",
  "summaryDescription": "総合評価の説明（50文字以内）",
  "findings": [
    {
      "category": "カテゴリ名",
      "observation": "観察結果",
      "severity": "normal" | "mild" | "moderate" | "severe",
      "relatedItems": ["関連する診断項目ID"]
    }
  ],
  "recommendations": ["推奨事項1", "推奨事項2"],
  "parentComment": "保護者向けのわかりやすいコメント（200-300文字）",
  "professionalNote": "専門家向けの詳細メモ（任意）"
}
\`\`\`

## 評価基準
- **A（良好）**: 年齢相応の発達、特に問題なし
- **B（要観察）**: 軽度の問題あり、経過観察推奨
- **C（要相談）**: 専門医への相談推奨

## 注意事項
- 保護者向けコメントは専門用語を避け、やさしい言葉で
- 不安を煽らず、前向きなトーンで
- 4歳以下は発達段階を考慮
`.trim()
}
