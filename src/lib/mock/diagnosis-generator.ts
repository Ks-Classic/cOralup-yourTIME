/**
 * AI分析テスト用モックデータジェネレーター
 */

// 診断カテゴリと項目の定義
export const DIAGNOSIS_CATEGORIES = {
  tongue: {
    name: '舌',
    items: [
      { id: 'tongue_1', question: '舌小帯短縮症', options: ['有', '無'] },
      { id: 'tongue_2', question: 'ハート舌', options: ['有', '無'] },
      { id: 'tongue_3', question: '舌圧痕', options: ['有', '無'] },
      { id: 'tongue_4', question: '上下運動', options: ['可能', '困難'] },
      { id: 'tongue_5', question: '低位舌', options: ['有', '無'] },
    ],
  },
  dentition: {
    name: '歯列・咬合',
    items: [
      { id: 'dentition_1', question: '正常', options: ['有', '無'] },
      { id: 'dentition_2', question: '過蓋咬合', options: ['有', '無'] },
      { id: 'dentition_3', question: '開咬', options: ['有', '無'] },
      { id: 'dentition_4', question: '反対咬合', options: ['有', '無'] },
      { id: 'dentition_5', question: '叢生', options: ['有', '無'] },
    ],
  },
  lip: {
    name: '口唇',
    items: [
      { id: 'lip_1', question: '口唇閉鎖', options: ['可', '不可'] },
      { id: 'lip_2', question: '上唇小帯異常', options: ['有', '無'] },
      { id: 'lip_3', question: '上唇翻転', options: ['有', '無'] },
    ],
  },
  nose: {
    name: '鼻・扁桃',
    items: [
      { id: 'nose_3', question: '扁桃腺肥大', options: ['正常', '肥大1度', '肥大2度', '肥大3度'] },
    ],
  },
  face: {
    name: '顔面・頚部',
    items: [
      { id: 'face_1', question: '目の下のクマ', options: ['有', '無'] },
      { id: 'face_2', question: '左右差', options: ['有', '無'] },
      { id: 'face_5', question: '広頚筋緊張', options: ['有', '無'] },
    ],
  },
  breath: {
    name: '呼吸',
    items: [
      { id: 'breath_1', question: '口呼吸・鼻呼吸', options: ['口呼吸', '鼻呼吸'] },
    ],
  },
  swallow: {
    name: '嚥下',
    items: [
      { id: 'swallow_1', question: '舌突出癖', options: ['有', '無'] },
      { id: 'swallow_2', question: 'オトガイ筋収縮', options: ['有', '無'] },
    ],
  },
  foot: {
    name: '足',
    items: [
      { id: 'foot_1', question: '外反足', options: ['有', '無'] },
      { id: 'foot_2', question: '寝指', options: ['有', '無'] },
      { id: 'foot_3', question: '浮指', options: ['有', '無'] },
      { id: 'foot_4', question: '外反母趾', options: ['有', '無'] },
      { id: 'foot_5', question: '扁平足', options: ['有', '無'] },
    ],
  },
  posture: {
    name: '姿勢',
    items: [
      { id: 'posture_1', question: '正面間', options: ['左右対称', '非対称'] },
      { id: 'posture_2', question: '骨盤', options: ['後傾', 'ニュートラル', '前傾'] },
      { id: 'posture_3', question: '軸', options: ['まっすぐ', '反り腰', '猫背'] },
      { id: 'posture_4', question: '頭位', options: ['正常', 'フォワードヘッド'] },
      { id: 'posture_5', question: '下肢', options: ['正常', 'O脚', 'X脚'] },
    ],
  },
}

// 問診カテゴリと項目の定義（保護者入力）
export const QUESTIONNAIRE_CATEGORIES = {
  habit: {
    name: '習癖',
    items: [
      { id: 'habit_1', question: '指しゃぶり', options: ['有', '無'] },
      { id: 'habit_2', question: 'おしゃぶり', options: ['有', '無'] },
      { id: 'habit_3', question: '爪噛み', options: ['有', '無'] },
      { id: 'habit_4', question: '口ぽかん', options: ['有', '無'] },
      { id: 'habit_5', question: '向き癖', options: ['有', '無'] },
      { id: 'habit_6', question: '食いしばり', options: ['有', '無'] },
      { id: 'habit_7', question: '割座', options: ['有', '無'] },
      { id: 'habit_8', question: '歯ぎしり', options: ['有', '無'] },
    ],
  },
  nose_parent: {
    name: '鼻・扁桃（保護者）',
    items: [
      { id: 'nose_1', question: '鼻づまり', options: ['有', '無'] },
      { id: 'nose_2', question: 'アレルギー', options: ['有', '無'] },
    ],
  },
  eating: {
    name: '食習慣',
    items: [
      { id: 'eating_1', question: '偏食', options: ['有', '無'] },
      { id: 'eating_2', question: '丸のみ', options: ['有', '無'] },
      { id: 'eating_3', question: '噛まない', options: ['有', '無'] },
      { id: 'eating_4', question: '飲みこまない', options: ['有', '無'] },
    ],
  },
  sleep: {
    name: '睡眠',
    items: [
      { id: 'sleep_1', question: 'いびき', options: ['有', '無'] },
      { id: 'sleep_2', question: '起床時の呼吸', options: ['鼻', '口'] },
      { id: 'sleep_3', question: '昼間眠そう', options: ['有', '無'] },
    ],
  },
}

export interface MockChildInfo {
  name: string
  age: number
  ageMonths: number
  gender: '男' | '女'
}

export interface MockDiagnosisData {
  [categoryKey: string]: {
    [itemId: string]: string
  }
}

export interface MockQuestionnaireData {
  [categoryKey: string]: {
    [itemId: string]: string
  }
}

export interface MockScores {
  postureScore: number
  oralScore: number
}

export interface MockTestData {
  childInfo: MockChildInfo
  questionnaire: MockQuestionnaireData
  diagnosis: MockDiagnosisData
  scores: MockScores
  staffNotes: string
}

// ランダム選択ヘルパー
const randomChoice = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
const randomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min

// プリセット定義
export type PresetType = 'good' | 'mild' | 'moderate' | 'severe' | 'random' | 'infant' | 'toddler' | 'schooler'

export const PRESETS: Record<PresetType, { label: string; emoji: string; description: string }> = {
  good: { label: '良好', emoji: '🟢', description: '問題なし（スコア9-10）' },
  mild: { label: '軽度注意', emoji: '🟡', description: '軽微な問題（スコア6-7）' },
  moderate: { label: '要観察', emoji: '🟠', description: '複数の問題（スコア4-5）' },
  severe: { label: '要指導', emoji: '🔴', description: '多くの問題（スコア2-3）' },
  random: { label: 'ランダム', emoji: '🎲', description: '完全ランダム生成' },
  infant: { label: '乳児', emoji: '👶', description: '0-2歳' },
  toddler: { label: '幼児', emoji: '🧒', description: '3-5歳' },
  schooler: { label: '小学生', emoji: '📚', description: '6-12歳' },
}

/**
 * モックデータを生成
 */
export function generateMockData(preset: PresetType = 'random'): MockTestData {
  const childInfo = generateChildInfo(preset)
  const { questionnaire, diagnosis } = generateResponses(preset)
  const scores = generateScores(preset)
  const staffNotes = generateStaffNotes(preset)

  return {
    childInfo,
    questionnaire,
    diagnosis,
    scores,
    staffNotes,
  }
}

function generateChildInfo(preset: PresetType): MockChildInfo {
  const names = ['太郎', '花子', '健太', 'さくら', '翔', '美咲', '大輝', '結衣']
  
  let age: number
  let ageMonths: number

  switch (preset) {
    case 'infant':
      age = randomInt(0, 2)
      break
    case 'toddler':
      age = randomInt(3, 5)
      break
    case 'schooler':
      age = randomInt(6, 12)
      break
    default:
      age = randomInt(2, 10)
  }

  ageMonths = randomInt(0, 11)

  return {
    name: randomChoice(names),
    age,
    ageMonths,
    gender: randomChoice(['男', '女'] as const),
  }
}

function generateResponses(preset: PresetType): { questionnaire: MockQuestionnaireData; diagnosis: MockDiagnosisData } {
  const questionnaire: MockQuestionnaireData = {}
  const diagnosis: MockDiagnosisData = {}

  // 問題発生確率を決定
  let problemProbability: number
  switch (preset) {
    case 'good':
      problemProbability = 0.05
      break
    case 'mild':
      problemProbability = 0.2
      break
    case 'moderate':
      problemProbability = 0.4
      break
    case 'severe':
      problemProbability = 0.7
      break
    default:
      problemProbability = 0.3
  }

  // 問診データ生成
  for (const [catKey, category] of Object.entries(QUESTIONNAIRE_CATEGORIES)) {
    questionnaire[catKey] = {}
    for (const item of category.items) {
      if (item.options.length === 2 && item.options.includes('有') && item.options.includes('無')) {
        // 有/無の場合、問題確率に基づいて選択
        questionnaire[catKey][item.id] = Math.random() < problemProbability ? '有' : '無'
      } else {
        questionnaire[catKey][item.id] = randomChoice(item.options)
      }
    }
  }

  // 診断データ生成
  for (const [catKey, category] of Object.entries(DIAGNOSIS_CATEGORIES)) {
    diagnosis[catKey] = {}
    for (const item of category.items) {
      if (item.options.length === 2) {
        const hasIssue = item.options.includes('有') || item.options.includes('不可') || item.options.includes('困難')
        if (hasIssue) {
          const goodOption = item.options.find(o => o === '無' || o === '可' || o === '可能' || o === '正常' || o === '鼻呼吸' || o === '左右対称' || o === 'ニュートラル' || o === 'まっすぐ')
          const badOption = item.options.find(o => o !== goodOption)
          diagnosis[catKey][item.id] = Math.random() < problemProbability ? (badOption || item.options[0]) : (goodOption || item.options[1])
        } else {
          diagnosis[catKey][item.id] = randomChoice(item.options)
        }
      } else {
        // 複数選択肢の場合
        if (preset === 'good') {
          // 良好プリセットは正常系を選ぶ
          const normalOption = item.options.find(o => o === '正常' || o === 'ニュートラル' || o === 'まっすぐ' || o === '鼻呼吸')
          diagnosis[catKey][item.id] = normalOption || item.options[0]
        } else if (preset === 'severe') {
          // 重度プリセットは問題系を選ぶ
          const problemOption = item.options.find(o => o !== '正常' && o !== 'ニュートラル' && o !== 'まっすぐ' && o !== '鼻呼吸')
          diagnosis[catKey][item.id] = problemOption || randomChoice(item.options)
        } else {
          diagnosis[catKey][item.id] = randomChoice(item.options)
        }
      }
    }
  }

  return { questionnaire, diagnosis }
}

function generateScores(preset: PresetType): MockScores {
  switch (preset) {
    case 'good':
      return { postureScore: randomInt(8, 10), oralScore: randomInt(8, 10) }
    case 'mild':
      return { postureScore: randomInt(6, 8), oralScore: randomInt(6, 8) }
    case 'moderate':
      return { postureScore: randomInt(4, 6), oralScore: randomInt(4, 6) }
    case 'severe':
      return { postureScore: randomInt(1, 4), oralScore: randomInt(1, 4) }
    default:
      return { postureScore: randomInt(1, 10), oralScore: randomInt(1, 10) }
  }
}

function generateStaffNotes(preset: PresetType): string {
  const notes: Record<PresetType, string[]> = {
    good: ['特になし', '良好な状態です', '経過観察のみ'],
    mild: ['軽度の注意が必要', '定期的な確認を推奨'],
    moderate: ['複数の項目で注意が必要', '専門医への相談を検討'],
    severe: ['早めの対応が必要', '専門医への紹介を推奨'],
    random: ['', '特になし', '経過観察', '要フォロー'],
    infant: ['月齢を考慮した評価', '発達段階として正常範囲'],
    toddler: ['年齢相応の状態', '習癖の改善指導を検討'],
    schooler: ['学童期の特徴を考慮', '自己管理の指導も視野に'],
  }

  return randomChoice(notes[preset])
}

/**
 * テストデータをAPI用フォーマットに変換
 */
export function formatForAPI(data: MockTestData) {
  // 問診データをフラット化
  const flatQuestionnaire: Record<string, string> = {}
  for (const [, items] of Object.entries(data.questionnaire)) {
    for (const [itemId, value] of Object.entries(items)) {
      flatQuestionnaire[itemId] = value
    }
  }

  // 診断データをフラット化
  const flatDiagnosis: Record<string, string> = {}
  for (const [, items] of Object.entries(data.diagnosis)) {
    for (const [itemId, value] of Object.entries(items)) {
      flatDiagnosis[itemId] = value
    }
  }

  // 問題点を抽出
  const postureIssues: string[] = []
  const oralIssues: string[] = []

  // 姿勢関連の問題抽出
  if (data.diagnosis.posture) {
    for (const [itemId, value] of Object.entries(data.diagnosis.posture)) {
      const item = DIAGNOSIS_CATEGORIES.posture.items.find(i => i.id === itemId)
      if (item && value !== '正常' && value !== 'ニュートラル' && value !== 'まっすぐ' && value !== '左右対称') {
        postureIssues.push(`${item.question}: ${value}`)
      }
    }
  }
  if (data.diagnosis.foot) {
    for (const [itemId, value] of Object.entries(data.diagnosis.foot)) {
      if (value === '有') {
        const item = DIAGNOSIS_CATEGORIES.foot.items.find(i => i.id === itemId)
        if (item) postureIssues.push(item.question)
      }
    }
  }

  // 口腔関連の問題抽出
  for (const catKey of ['tongue', 'dentition', 'lip', 'breath', 'swallow'] as const) {
    const category = data.diagnosis[catKey]
    if (category) {
      for (const [itemId, value] of Object.entries(category)) {
        const catData = DIAGNOSIS_CATEGORIES[catKey]
        const item = catData?.items.find(i => i.id === itemId)
        if (item) {
          const isIssue = value === '有' || value === '不可' || value === '困難' || value === '口呼吸'
          if (isIssue) {
            oralIssues.push(`${item.question}: ${value}`)
          }
        }
      }
    }
  }

  return {
    testMode: true,
    testData: {
      childName: data.childInfo.name,
      childAge: data.childInfo.age,
      childAgeMonths: data.childInfo.ageMonths,
      childGender: data.childInfo.gender,
      questionnaire: flatQuestionnaire,
      diagnosis: flatDiagnosis,
      postureScore: data.scores.postureScore,
      oralScore: data.scores.oralScore,
      postureIssues,
      oralIssues,
      staffNotes: data.staffNotes,
    },
  }
}




