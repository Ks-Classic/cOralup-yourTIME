/**
 * スタッフ用診断項目のサンプルデータ生成ユーティリティ
 * デモページ用に全項目のサンプルデータを生成
 */
import type { DiagnosisItem } from '@/data/staff-diagnosis-items'

/**
 * 診断項目に基づいてサンプルデータを生成
 */
export function generateStaffDiagnosisSampleData(items: DiagnosisItem[]): Record<string, any> {
  const sampleData: Record<string, any> = {}

  items.forEach(item => {
    if (item.inputType === 'staff') {
      const value = generateDiagnosisItemSampleValue(item)
      if (value !== undefined) {
        sampleData[item.id] = value
      }
    }
  })

  return sampleData
}

/**
 * 診断項目タイプに応じてサンプル値を生成
 */
function generateDiagnosisItemSampleValue(item: DiagnosisItem): any {
  // 必須でないフィールドは、ランダムに空にする（デモ用なので基本的に入力）
  if (!item.required && Math.random() < 0.2) {
    return undefined
  }

  switch (item.answerType) {
    case 'radio':
      if (item.options && item.options.length > 0) {
        // 必須フィールドの場合は最初のオプションを返す
        if (item.required) {
          return item.options[0].value
        }
        // 必須でない場合は、ランダムに選択（デモ用なので基本的に入力）
        return Math.random() < 0.8 ? item.options[0].value : undefined
      }
      return undefined

    case 'checkbox':
      if (item.options && item.options.length > 0) {
        // デモ用なので、1-2個のオプションを選択
        const selectedCount = Math.min(
          Math.floor(Math.random() * 2) + 1, // 1-2個
          item.options.length
        )
        const shuffled = [...item.options].sort(() => Math.random() - 0.5)
        return shuffled.slice(0, selectedCount).map(opt => opt.value)
      }
      return []

    case 'text':
      if (item.id.includes('shoe_1') || item.id.includes('メーカー')) {
        return 'ナイキ'
      }
      return 'サンプルテキスト'

    case 'number':
      if (item.unit === 'kg') {
        // 口唇圧の場合、2.0-3.0の範囲
        return 2.5
      }
      if (item.min !== undefined && item.max !== undefined) {
        return Math.floor((item.min + item.max) / 2)
      }
      return 1

    case 'textarea':
      return '特記事項のサンプルテキストです。\nデモ用の入力データです。'

    default:
      return undefined
  }
}

