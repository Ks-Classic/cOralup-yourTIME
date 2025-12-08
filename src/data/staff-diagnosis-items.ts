/**
 * スタッフ用診断評価表の項目定義（モックデータ）
 * UIUX確認用のサンプルデータ
 * Lark Baseの評価表項目を基に作成
 * 
 * 仕様書: docs/TODO/07-ui-design/07-00-デモ特化-完全実操作可能なUI実装.md Phase 1.2.1
 */

/**
 * 診断評価表の項目定義インターフェース
 * 
 * 各診断評価項目の構造を定義します。
 * この型は診断入力画面で使用され、診断評価表の各項目を表現します。
 * 
 * @see src/types/index.ts Diagnosis - 診断結果全体の型定義
 * @see docs/designe/11-type-definitions.md - 型定義の詳細ドキュメント
 */
export interface DiagnosisItem {
  /** 項目の一意なID（例: 'tongue_1', 'lip_4'） */
  id: string
  /** カテゴリ名（例: '習癖', '舌', '歯列・咬合'） */
  category: string
  /** サブカテゴリ名（通常はcategoryと同じ） */
  subCategory: string
  /** 質問文 */
  question: string
  /** 回答タイプ */
  answerType: 'checkbox' | 'radio' | 'text' | 'number' | 'textarea'
  /** 選択肢（checkbox/radioの場合に必須） */
  options?: { value: string; label: string }[]
  /** 必須項目かどうか */
  required: boolean
  /** 入力者タイプ（保護者/スタッフ） */
  inputType: 'parent' | 'staff'
  /** 分析に利用するかどうか */
  analysisUse?: boolean
  /** 補足説明 */
  note?: string
  /** プレースホルダー（text/number/textareaの場合） */
  placeholder?: string
  /** 単位（numberの場合、例: 'kg'） */
  unit?: string
  /** 最小値（numberの場合） */
  min?: number
  /** 最大値（numberの場合） */
  max?: number
}

export const diagnosisItems: DiagnosisItem[] = [
  // 習癖（保護者）
  { id: 'habit_1', category: '習癖', subCategory: '習癖', question: '指しゃぶり', answerType: 'checkbox', options: [{ value: 'yes', label: '有' }, { value: 'no', label: '無' }], required: true, inputType: 'parent' },
  { id: 'habit_2', category: '習癖', subCategory: '習癖', question: 'おしゃぶり', answerType: 'checkbox', options: [{ value: 'yes', label: '有' }, { value: 'no', label: '無' }], required: true, inputType: 'parent' },
  { id: 'habit_3', category: '習癖', subCategory: '習癖', question: '爪噛', answerType: 'checkbox', options: [{ value: 'yes', label: '有' }, { value: 'no', label: '無' }], required: true, inputType: 'parent' },
  { id: 'habit_4', category: '習癖', subCategory: '習癖', question: '口ぽかん', answerType: 'checkbox', options: [{ value: 'yes', label: '有' }, { value: 'no', label: '無' }], required: true, inputType: 'parent' },
  { id: 'habit_5', category: '習癖', subCategory: '習癖', question: '向き癖', answerType: 'checkbox', options: [{ value: 'yes', label: '有' }, { value: 'no', label: '無' }], required: true, inputType: 'parent' },
  { id: 'habit_6', category: '習癖', subCategory: '習癖', question: '食いしばり', answerType: 'checkbox', options: [{ value: 'yes', label: '有' }, { value: 'no', label: '無' }], required: true, inputType: 'parent' },
  { id: 'habit_7', category: '習癖', subCategory: '習癖', question: '割座', answerType: 'checkbox', options: [{ value: 'yes', label: '有' }, { value: 'no', label: '無' }], required: true, inputType: 'parent' },
  { id: 'habit_8', category: '習癖', subCategory: '習癖', question: '歯ぎしり', answerType: 'checkbox', options: [{ value: 'yes', label: '有' }, { value: 'no', label: '無' }], required: true, inputType: 'parent' },
  { id: 'habit_9', category: '習癖', subCategory: '習癖', question: 'その他', answerType: 'checkbox', options: [{ value: 'yes', label: '有' }, { value: 'no', label: '無' }], required: true, inputType: 'parent' },
  
  // 舌（スタッフ）
  { id: 'tongue_1', category: '舌', subCategory: '舌', question: '舌小帯短縮症', answerType: 'radio', options: [{ value: 'yes', label: '有' }, { value: 'no', label: '無' }], required: true, inputType: 'staff' },
  { id: 'tongue_2', category: '舌', subCategory: '舌', question: 'ハート舌', answerType: 'radio', options: [{ value: 'yes', label: '有' }, { value: 'no', label: '無' }], required: true, inputType: 'staff' },
  { id: 'tongue_3', category: '舌', subCategory: '舌', question: '舌圧痕', answerType: 'radio', options: [{ value: 'yes', label: '有' }, { value: 'no', label: '無' }], required: true, inputType: 'staff' },
  { id: 'tongue_4', category: '舌', subCategory: '舌', question: '上下運動', answerType: 'radio', options: [{ value: 'possible', label: '可能' }, { value: 'difficult', label: '困難' }], required: true, inputType: 'staff', analysisUse: true },
  { id: 'tongue_5', category: '舌', subCategory: '舌', question: '低位舌', answerType: 'radio', options: [{ value: 'yes', label: '有' }, { value: 'no', label: '無' }], required: true, inputType: 'staff', analysisUse: true },
  { id: 'tongue_6', category: '舌', subCategory: '舌', question: '舌下静脈怒張', answerType: 'radio', options: [{ value: 'yes', label: '有' }, { value: 'no', label: '無' }], required: true, inputType: 'staff' },
  { id: 'tongue_7', category: '舌', subCategory: '舌', question: '吸い上げ', answerType: 'radio', options: [{ value: 'front', label: '前' }, { value: 'center', label: '中央' }, { value: 'back', label: '奥' }], required: true, inputType: 'staff' },
  { id: 'tongue_8', category: '舌', subCategory: '舌', question: '吸い上げ保持', answerType: 'radio', options: [{ value: 'possible', label: '可能' }, { value: 'difficult', label: '困難' }], required: true, inputType: 'staff' },
  
  // 歯列・咬合（スタッフ）
  { id: 'dentition_1', category: '歯列・咬合', subCategory: '歯列・咬合', question: '正常', answerType: 'checkbox', options: [{ value: 'yes', label: '有' }, { value: 'no', label: '無' }], required: true, inputType: 'staff', analysisUse: true },
  { id: 'dentition_2', category: '歯列・咬合', subCategory: '歯列・咬合', question: '過蓋合', answerType: 'checkbox', options: [{ value: 'yes', label: '有' }, { value: 'no', label: '無' }], required: true, inputType: 'staff', analysisUse: true },
  { id: 'dentition_3', category: '歯列・咬合', subCategory: '歯列・咬合', question: 'かいこう', answerType: 'checkbox', options: [{ value: 'yes', label: '有' }, { value: 'no', label: '無' }], required: true, inputType: 'staff', analysisUse: true },
  { id: 'dentition_4', category: '歯列・咬合', subCategory: '歯列・咬合', question: '反対咬合', answerType: 'checkbox', options: [{ value: 'yes', label: '有' }, { value: 'no', label: '無' }], required: true, inputType: 'staff', analysisUse: true },
  { id: 'dentition_5', category: '歯列・咬合', subCategory: '歯列・咬合', question: '叢生', answerType: 'checkbox', options: [{ value: 'yes', label: '有' }, { value: 'no', label: '無' }], required: true, inputType: 'staff', analysisUse: true },
  
  // 口唇（スタッフ）
  { id: 'lip_1', category: '口唇', subCategory: '口唇', question: '口唇閉鎖', answerType: 'radio', options: [{ value: 'possible', label: '可' }, { value: 'impossible', label: '不可' }], required: true, inputType: 'staff' },
  { id: 'lip_2', category: '口唇', subCategory: '口唇', question: '上唇小帯異常', answerType: 'radio', options: [{ value: 'yes', label: '有' }, { value: 'no', label: '無' }], required: true, inputType: 'staff' },
  { id: 'lip_3', category: '口唇', subCategory: '口唇', question: '上唇翻転', answerType: 'radio', options: [{ value: 'yes', label: '有' }, { value: 'no', label: '無' }], required: true, inputType: 'staff' },
  { id: 'lip_4', category: '口唇', subCategory: '口唇', question: '口唇圧', answerType: 'number', required: false, inputType: 'staff', unit: 'kg', placeholder: '例: 2.5', note: '実施できない場合は「不可」の項目' },
  
  // 鼻・扁桃
  { id: 'nose_1', category: '鼻・扁桃', subCategory: '鼻・扁桃', question: '鼻づまり', answerType: 'radio', options: [{ value: 'yes', label: '有' }, { value: 'no', label: '無' }], required: true, inputType: 'parent' },
  { id: 'nose_2', category: '鼻・扁桃', subCategory: '鼻・扁桃', question: 'アレルギー', answerType: 'radio', options: [{ value: 'yes', label: '有' }, { value: 'no', label: '無' }], required: true, inputType: 'parent' },
  { id: 'nose_3', category: '鼻・扁桃', subCategory: '鼻・扁桃', question: '扁桃腺肥大', answerType: 'radio', options: [{ value: 'normal', label: '正常' }, { value: 'degree1', label: '肥大1度' }, { value: 'degree2', label: '肥大2度' }, { value: 'degree3', label: '肥大3度' }], required: true, inputType: 'staff', analysisUse: true },
  
  // 顔面・頚部（スタッフ）
  { id: 'face_1', category: '顔面・頚部', subCategory: '顔面・頚部', question: '目の下のクマ', answerType: 'radio', options: [{ value: 'yes', label: '有' }, { value: 'no', label: '無' }], required: true, inputType: 'staff' },
  { id: 'face_2', category: '顔面・頚部', subCategory: '顔面・頚部', question: '左右差', answerType: 'radio', options: [{ value: 'yes', label: '有' }, { value: 'no', label: '無' }], required: true, inputType: 'staff' },
  { id: 'face_3', category: '顔面・頚部', subCategory: '顔面・頚部', question: 'イー：中顔面', answerType: 'radio', options: [{ value: 'normal', label: '普通' }, { value: 'hard', label: '硬い' }], required: true, inputType: 'staff' },
  { id: 'face_4', category: '顔面・頚部', subCategory: '顔面・頚部', question: '口角下制筋', answerType: 'radio', options: [{ value: 'yes', label: '有' }, { value: 'no', label: '無' }], required: true, inputType: 'staff' },
  { id: 'face_5', category: '顔面・頚部', subCategory: '顔面・頚部', question: '広頚筋緊張', answerType: 'radio', options: [{ value: 'yes', label: '有' }, { value: 'no', label: '無' }], required: true, inputType: 'staff' },
  
  // 呼吸（スタッフ）
  { id: 'breath_1', category: '呼吸', subCategory: '呼吸', question: '口呼吸・鼻呼吸', answerType: 'radio', options: [{ value: 'mouth', label: '口呼吸' }, { value: 'nose', label: '鼻呼吸' }], required: true, inputType: 'staff' },
  
  // 嚥下（スタッフ）
  { id: 'swallow_1', category: '嚥下', subCategory: '嚥下', question: '舌突出癖', answerType: 'radio', options: [{ value: 'yes', label: '有' }, { value: 'no', label: '無' }], required: true, inputType: 'staff' },
  { id: 'swallow_2', category: '嚥下', subCategory: '嚥下', question: 'オトガイ筋収縮', answerType: 'radio', options: [{ value: 'yes', label: '有' }, { value: 'no', label: '無' }], required: true, inputType: 'staff' },
  
  // 食習慣（保護者）
  { id: 'eating_1', category: '食習慣', subCategory: '食習慣', question: '偏食', answerType: 'checkbox', options: [{ value: 'yes', label: '有' }, { value: 'no', label: '無' }], required: true, inputType: 'parent' },
  { id: 'eating_2', category: '食習慣', subCategory: '食習慣', question: '丸のみ', answerType: 'checkbox', options: [{ value: 'yes', label: '有' }, { value: 'no', label: '無' }], required: true, inputType: 'parent' },
  { id: 'eating_3', category: '食習慣', subCategory: '食習慣', question: '噛まない', answerType: 'checkbox', options: [{ value: 'yes', label: '有' }, { value: 'no', label: '無' }], required: true, inputType: 'parent' },
  { id: 'eating_4', category: '食習慣', subCategory: '食習慣', question: '飲みこまない', answerType: 'checkbox', options: [{ value: 'yes', label: '有' }, { value: 'no', label: '無' }], required: true, inputType: 'parent' },
  { id: 'eating_5', category: '食習慣', subCategory: '食習慣', question: 'TV見ながら食事', answerType: 'checkbox', options: [{ value: 'yes', label: 'TV有' }, { value: 'no', label: 'TV無' }], required: true, inputType: 'parent' },
  { id: 'eating_6', category: '食習慣', subCategory: '食習慣', question: 'TV位置', answerType: 'checkbox', options: [{ value: 'front', label: '正面' }, { value: 'right', label: '右' }, { value: 'left', label: '左' }], required: true, inputType: 'parent' },
  
  // 睡眠（保護者）
  { id: 'sleep_1', category: '睡眠', subCategory: '睡眠', question: 'いびき・歯ぎしり', answerType: 'checkbox', options: [{ value: 'grinding_yes', label: '歯ぎしり(有)' }, { value: 'grinding_no', label: '歯ぎしり(無)' }, { value: 'apnea_yes', label: '睡眠時無呼吸(有)' }, { value: 'apnea_no', label: '睡眠時無呼吸(無)' }], required: true, inputType: 'parent' },
  { id: 'sleep_2', category: '睡眠', subCategory: '睡眠', question: '起床時の呼吸', answerType: 'radio', options: [{ value: 'nose', label: '鼻' }, { value: 'mouth', label: '口' }], required: true, inputType: 'parent' },
  { id: 'sleep_3', category: '睡眠', subCategory: '睡眠', question: '昼間の状態', answerType: 'radio', options: [{ value: 'yes', label: '有' }, { value: 'no', label: '無' }], required: true, inputType: 'parent' },
  
  // 足（スタッフ）
  { id: 'foot_1', category: '足', subCategory: '足', question: '外反足', answerType: 'checkbox', options: [{ value: 'yes', label: '有' }, { value: 'no', label: '無' }], required: true, inputType: 'staff', analysisUse: true, note: '4歳以下は一概に判断できないので、参考程度の表現にとどめる' },
  { id: 'foot_2', category: '足', subCategory: '足', question: '寝指', answerType: 'checkbox', options: [{ value: 'yes', label: '有' }, { value: 'no', label: '無' }], required: true, inputType: 'staff', analysisUse: true, note: '4歳以下は一概に判断できないので、参考程度の表現にとどめる' },
  { id: 'foot_3', category: '足', subCategory: '足', question: '浮指', answerType: 'checkbox', options: [{ value: 'yes', label: '有' }, { value: 'no', label: '無' }], required: true, inputType: 'staff', analysisUse: true, note: '4歳以下は一概に判断できないので、参考程度の表現にとどめる' },
  { id: 'foot_4', category: '足', subCategory: '足', question: '外反母趾', answerType: 'checkbox', options: [{ value: 'yes', label: '有' }, { value: 'no', label: '無' }], required: true, inputType: 'staff', analysisUse: true, note: '4歳以下は一概に判断できないので、参考程度の表現にとどめる' },
  { id: 'foot_5', category: '足', subCategory: '足', question: '扁平足', answerType: 'checkbox', options: [{ value: 'yes', label: '有' }, { value: 'no', label: '無' }], required: true, inputType: 'staff', analysisUse: true, note: '4歳以下は一概に判断できないので、参考程度の表現にとどめる' },
  { id: 'foot_6', category: '足', subCategory: '足', question: 'ハイアーチ', answerType: 'checkbox', options: [{ value: 'yes', label: '有' }, { value: 'no', label: '無' }], required: true, inputType: 'staff', analysisUse: true },
  
  // 全身・姿勢（スタッフ）
  { id: 'posture_1', category: '全身', subCategory: '全身', question: '正面間', answerType: 'radio', options: [{ value: 'symmetric', label: '左右対称' }, { value: 'asymmetric', label: '非対称' }], required: false, inputType: 'staff', analysisUse: true, note: '写真が撮れなかったときに記載' },
  { id: 'posture_2', category: '姿勢', subCategory: '姿勢', question: '骨盤', answerType: 'radio', options: [{ value: 'posterior', label: '後傾' }, { value: 'neutral', label: 'ニュートラル' }, { value: 'anterior', label: '前傾' }], required: false, inputType: 'staff', analysisUse: true, note: '写真が撮れなかったときに記載' },
  { id: 'posture_3', category: '姿勢', subCategory: '姿勢', question: '軸', answerType: 'radio', options: [{ value: 'straight', label: 'まっすぐ' }, { value: 'swayback', label: '反り腰' }, { value: 'kyphosis', label: '猫背' }], required: false, inputType: 'staff', analysisUse: true, note: '写真が撮れなかったときに記載' },
  { id: 'posture_4', category: '姿勢', subCategory: '姿勢', question: '頭位', answerType: 'radio', options: [{ value: 'normal', label: '正常' }, { value: 'forward', label: 'フォワードヘッド' }], required: false, inputType: 'staff', analysisUse: true, note: '写真が撮れなかったときに記載' },
  { id: 'posture_5', category: '姿勢', subCategory: '姿勢', question: '下肢', answerType: 'radio', options: [{ value: 'normal', label: '正常' }, { value: 'bow', label: 'O脚' }, { value: 'knock', label: 'X脚' }], required: false, inputType: 'staff', analysisUse: true, note: '写真が撮れなかったときに記載' },
  
  // 靴（スタッフ）
  { id: 'shoe_1', category: '靴', subCategory: '靴', question: 'メーカー', answerType: 'text', required: false, inputType: 'staff', placeholder: '例: ナイキ', note: 'お出かけ用の場合は不要' },
  { id: 'shoe_2', category: '靴', subCategory: '靴', question: '靴の固定', answerType: 'radio', options: [{ value: 'tape', label: 'テープ' }, { value: 'none', label: '無' }, { value: 'yes', label: '有' }], required: false, inputType: 'staff', note: 'お出かけ用の場合は不要' },
  { id: 'shoe_3', category: '靴', subCategory: '靴', question: 'サイズアウト', answerType: 'radio', options: [{ value: 'no', label: '無' }, { value: 'yes', label: '有' }], required: false, inputType: 'staff', note: 'お出かけ用の場合は不要' },
  { id: 'shoe_4', category: '靴', subCategory: '靴', question: 'ソールの減り', answerType: 'radio', options: [{ value: 'no', label: '無' }, { value: 'yes', label: '有' }], required: false, inputType: 'staff', note: 'お出かけ用の場合は不要' },
  
  // 機能検査（スタッフ）
  { id: 'exam_1', category: '機能検査', subCategory: '機能検査', question: 'ストレッチボード', answerType: 'radio', options: [{ value: '20', label: '20度' }, { value: '30', label: '30度' }, { value: '40', label: '40度' }], required: true, inputType: 'staff' },
  { id: 'exam_2', category: 'サーモグラフ', subCategory: 'サーモグラフ', question: '足指', answerType: 'radio', options: [{ value: 'visible', label: '写る' }, { value: 'not_visible', label: '写らない' }], required: true, inputType: 'staff' },
  { id: 'exam_3', category: 'サーモグラフ', subCategory: 'サーモグラフ', question: '重心位置', answerType: 'radio', options: [{ value: 'center', label: '中央' }, { value: 'right', label: '右' }, { value: 'left', label: '左' }], required: true, inputType: 'staff' },
  { id: 'exam_4', category: 'サーモグラフ', subCategory: 'サーモグラフ', question: '偏平足', answerType: 'radio', options: [{ value: 'no', label: '無' }, { value: 'yes', label: '有' }], required: true, inputType: 'staff' },
]

// カテゴリ別にグループ化
export const diagnosisItemsByCategory = diagnosisItems.reduce((acc, item) => {
  if (!acc[item.category]) {
    acc[item.category] = []
  }
  acc[item.category].push(item)
  return acc
}, {} as Record<string, DiagnosisItem[]>)

// カテゴリの順序定義
export const categoryOrder = [
  '習癖',
  '舌',
  '歯列・咬合',
  '口唇',
  '鼻・扁桃',
  '顔面・頚部',
  '呼吸',
  '嚥下',
  '食習慣',
  '睡眠',
  '足',
  '全身',
  '姿勢',
  '靴',
  '機能検査',
  'サーモグラフ',
]

