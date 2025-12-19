/**
 * AI分析テスト用モックデータジェネレーター
 * 
 * 設計方針:
 * - 項目構造（question名など）は常にDBから取得
 * - このファイルはテストモード用の「値」を生成するだけ
 * - DBの項目を変更したら自動的に反映される
 */

// 子供情報の型定義
export interface MockChildInfo {
  name: string
  age: number
  ageMonths: number
  gender: '男' | '女'
}

// 診断データの型定義（item.id -> 値）
export type MockDiagnosisData = Record<string, string>
export type MockQuestionnaireData = Record<string, string>

export interface MockScores {
  postureScore: number
  oralScore: number
}

export interface MockTestData {
  childInfo: MockChildInfo
  // id -> value のマッピング
  diagnosis: MockDiagnosisData
  questionnaire: MockQuestionnaireData
  scores: MockScores
  staffNotes: string
}

// 重症度プリセット
export type SeverityType = 'good' | 'mild' | 'moderate' | 'severe' | 'random'
export type AgeCategoryType = 'infant' | 'toddler' | 'schooler' | 'random'

export const SEVERITY_PRESETS: Record<SeverityType, { label: string; emoji: string; description: string }> = {
  good: { label: '良好', emoji: '🟢', description: '問題なし（スコア9-10）' },
  mild: { label: '軽度注意', emoji: '🟡', description: '軽微な問題（スコア6-7）' },
  moderate: { label: '要観察', emoji: '🟠', description: '複数の問題（スコア4-5）' },
  severe: { label: '要指導', emoji: '🔴', description: '多くの問題（スコア2-3）' },
  random: { label: 'ランダム', emoji: '🎲', description: '重症度ランダム' },
}

export const AGE_PRESETS: Record<AgeCategoryType, { label: string; emoji: string; description: string }> = {
  infant: { label: '乳児', emoji: '👶', description: '0-2歳' },
  toddler: { label: '幼児', emoji: '🧒', description: '3-5歳' },
  schooler: { label: '小学生', emoji: '📚', description: '6-12歳' },
  random: { label: 'ランダム', emoji: '🎲', description: '年齢ランダム' },
}

// 互換性のため
export type PresetType = SeverityType | AgeCategoryType
export const PRESETS = { ...SEVERITY_PRESETS, ...AGE_PRESETS }

// ヘルパー関数
const randomChoice = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
const randomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min

/**
 * DB項目からモック値を生成する
 * 
 * @param items DBから取得した診断項目リスト
 * @param severity 重症度（問題発生確率に影響）
 * @returns item.id -> 生成された値 のマッピング
 */
export function generateMockValuesFromDBItems(
  items: Array<{ id: string; question: string; options: any; answer_type: string }>,
  severity: SeverityType = 'moderate'
): Record<string, string> {
  const result: Record<string, string> = {}

  // 問題発生確率
  let problemProbability: number
  switch (severity) {
    case 'good': problemProbability = 0.05; break
    case 'mild': problemProbability = 0.2; break
    case 'moderate': problemProbability = 0.4; break
    case 'severe': problemProbability = 0.7; break
    default: problemProbability = 0.3
  }

  for (const item of items) {
    const options = normalizeOptions(item.options)

    if (options.length === 0) {
      // オプションがない場合はスキップまたはデフォルト値
      result[item.id] = ''
      continue
    }

    if (options.length === 2) {
      // 2択の場合、問題系かどうかで確率を調整
      const labels = options.map(o => o.label)
      const hasIssueOption = labels.some(l => ['有', '不可', '困難', '口呼吸'].includes(l))

      if (hasIssueOption) {
        const goodOption = options.find(o => ['無', '可', '可能', '正常', '鼻呼吸', '左右対称', 'ニュートラル', 'まっすぐ'].includes(o.label))
        const badOption = options.find(o => o !== goodOption)
        result[item.id] = Math.random() < problemProbability
          ? (badOption?.label || options[0].label)
          : (goodOption?.label || options[1].label)
      } else {
        result[item.id] = randomChoice(options).label
      }
    } else {
      // 複数選択肢
      if (severity === 'good') {
        const normalOption = options.find(o => ['正常', 'ニュートラル', 'まっすぐ', '鼻呼吸', '無'].includes(o.label))
        result[item.id] = normalOption?.label || options[0].label
      } else if (severity === 'severe') {
        const problemOption = options.find(o => !['正常', 'ニュートラル', 'まっすぐ', '鼻呼吸', '無'].includes(o.label))
        result[item.id] = problemOption?.label || randomChoice(options).label
      } else {
        result[item.id] = randomChoice(options).label
      }
    }
  }

  return result
}

/**
 * オプションを正規化
 */
function normalizeOptions(options: any): Array<{ value: string; label: string }> {
  if (!options) return []
  if (typeof options === 'string') {
    try {
      options = JSON.parse(options)
    } catch {
      return []
    }
  }
  if (!Array.isArray(options)) return []

  return options.map((opt: any) => {
    if (typeof opt === 'string') return { value: opt, label: opt }
    return { value: opt.value || opt.label || '', label: opt.label || opt.value || '' }
  })
}

/**
 * 子供情報を生成
 */
export function generateChildInfo(ageCategory: AgeCategoryType = 'toddler'): MockChildInfo {
  const names = ['太郎', '花子', '健太', 'さくら', '翔', '美咲', '大輝', '結衣']

  let age: number
  switch (ageCategory) {
    case 'infant': age = randomInt(0, 2); break
    case 'toddler': age = randomInt(3, 5); break
    case 'schooler': age = randomInt(6, 12); break
    default: age = randomInt(2, 10)
  }

  return {
    name: randomChoice(names),
    age,
    ageMonths: randomInt(0, 11),
    gender: randomChoice(['男', '女'] as const),
  }
}

/**
 * スコアを生成
 */
export function generateScores(severity: SeverityType = 'moderate'): MockScores {
  switch (severity) {
    case 'good': return { postureScore: randomInt(8, 10), oralScore: randomInt(8, 10) }
    case 'mild': return { postureScore: randomInt(6, 8), oralScore: randomInt(6, 8) }
    case 'moderate': return { postureScore: randomInt(4, 6), oralScore: randomInt(4, 6) }
    case 'severe': return { postureScore: randomInt(1, 4), oralScore: randomInt(1, 4) }
    default: return { postureScore: randomInt(1, 10), oralScore: randomInt(1, 10) }
  }
}

/**
 * スタッフメモを生成
 */
export function generateStaffNotes(severity: SeverityType = 'moderate'): string {
  const notes: Record<string, string[]> = {
    good: ['特になし', '良好な状態です', '経過観察のみ'],
    mild: ['軽度の注意が必要', '定期的な確認を推奨'],
    moderate: ['複数の項目で注意が必要', '専門医への相談を検討'],
    severe: ['早めの対応が必要', '専門医への紹介を推奨'],
    random: ['', '特になし', '経過観察', '要フォロー'],
  }
  return randomChoice(notes[severity] || notes.random)
}

// 後方互換性のためのダミーエクスポート（旧コードが参照している場合）
export const DIAGNOSIS_CATEGORIES = {}
export const QUESTIONNAIRE_CATEGORIES = {}

/**
 * 後方互換性のためのダミー関数
 * 注意: この関数は非推奨。generateMockValuesFromDBItems を使用してください
 */
export function generateMockData(
  severity: SeverityType = 'moderate',
  ageCategory: AgeCategoryType = 'toddler'
): MockTestData {
  console.warn('generateMockData is deprecated. Use generateMockValuesFromDBItems with DB items.')
  return {
    childInfo: generateChildInfo(ageCategory),
    diagnosis: {},
    questionnaire: {},
    scores: generateScores(severity),
    staffNotes: generateStaffNotes(severity),
  }
}
