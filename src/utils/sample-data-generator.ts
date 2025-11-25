/**
 * サンプルデータ生成ユーティリティ
 * デモページ用に全項目のサンプルデータを生成
 */
import type { FormSchemaConfig, FormFieldConfig } from '@/types/forms'

/**
 * フィールドタイプに応じてサンプル値を生成
 */
function generateFieldSampleValue(field: FormFieldConfig): any {
  // 必須でないフィールドは、ランダムに空にする（よりリアルなサンプルデータ）
  // ただし、デモ用なので必須でないフィールドも基本的に入力する
  if (!field.required && Math.random() < 0.2) {
    return undefined
  }

  switch (field.type) {
    case 'text':
    case 'email':
    case 'tel':
      if (field.id.includes('furigana')) {
        return 'たなか たろう'
      }
      if (field.id.includes('child_name') || field.id.includes('name')) {
        return '田中 太郎'
      }
      if (field.id.includes('nickname')) {
        return 'たーくん'
      }
      if (field.id.includes('phone')) {
        return '090-1234-5678'
      }
      if (field.id.includes('email')) {
        return 'sample@example.com'
      }
      if (field.id.includes('other')) {
        return 'その他の詳細情報'
      }
      return 'サンプルテキスト'

    case 'textarea':
      if (field.id.includes('disliked_foods')) {
        return 'にんじん、ピーマン、トマト'
      }
      if (field.id.includes('liked_foods')) {
        return 'りんご、バナナ、いちご'
      }
      if (field.id.includes('lessons')) {
        return 'スイミング、ピアノ'
      }
      return 'サンプルテキスト\n複数行のサンプルデータです。'

    case 'number':
      if (field.validation?.min !== undefined && field.validation?.max !== undefined) {
        const min = field.validation.min
        const max = field.validation.max
        // 範囲の中間値付近を返す
        return Math.floor((min + max) / 2)
      }
      if (field.id.includes('hours') || field.id.includes('time')) {
        return 2
      }
      if (field.id.includes('order') || field.id.includes('sibling')) {
        return 1
      }
      if (field.id.includes('bedtime')) {
        return 21
      }
      return 1

    case 'select':
      if (field.options && field.options.length > 0) {
        // 最初のオプションを返す（都道府県の場合は適当なものを選ぶ）
        if (field.id.includes('prefecture')) {
          return '13' // 東京都
        }
        if (field.id.includes('grade')) {
          return '1' // 小学1年生
        }
        return field.options[0].value
      }
      return undefined

    case 'radio':
      if (field.options && field.options.length > 0) {
        // 必須フィールドの場合は最初のオプションを返す
        if (field.required) {
          return field.options[0].value
        }
        // 必須でない場合は、ランダムに選択（デモ用なので基本的に入力）
        return Math.random() < 0.8 ? field.options[0].value : undefined
      }
      return undefined

    case 'checkbox':
    case 'multi-select':
      if (field.options && field.options.length > 0) {
        // デモ用なので、2-3個のオプションを選択
        const selectedCount = Math.min(
          Math.floor(Math.random() * 2) + 2, // 2-3個
          field.options.length
        )
        const shuffled = [...field.options].sort(() => Math.random() - 0.5)
        return shuffled.slice(0, selectedCount).map(opt => opt.value)
      }
      return []

    case 'date':
      // 日付のサンプル値（YYYY-MM-DD形式）
      const today = new Date()
      const year = today.getFullYear()
      const month = String(today.getMonth() + 1).padStart(2, '0')
      const day = String(today.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`

    default:
      return undefined
  }
}

/**
 * フォームスキーマに基づいてサンプルデータを生成（関連フィールドも考慮）
 */
export function generateSampleData(schema: FormSchemaConfig): Record<string, any> {
  const sampleData: Record<string, any> = {}

  schema.sections.forEach(section => {
    section.fields.forEach(field => {
      const value = generateFieldSampleValue(field)
      if (value !== undefined) {
        sampleData[field.id] = value
      }
    })
  })

  // 関連フィールドの処理
  // screen_timeがwithin_hoursの場合、screen_hoursに値を設定
  if (sampleData.screen_time === 'within_hours' && !sampleData.screen_hours) {
    sampleData.screen_hours = 2
  }
  // screen_timeがmoreの場合、screen_more_hoursに値を設定
  if (sampleData.screen_time === 'more' && !sampleData.screen_more_hours) {
    sampleData.screen_more_hours = 3
  }
  // has_siblingsがhasの場合、sibling_orderに値を設定
  if (sampleData.has_siblings === 'has' && !sampleData.sibling_order) {
    sampleData.sibling_order = 1
  }
  // sleep_conditionsにotherが含まれている場合、sleep_otherに値を設定
  if (Array.isArray(sampleData.sleep_conditions) && sampleData.sleep_conditions.includes('other') && !sampleData.sleep_other) {
    sampleData.sleep_other = 'その他の睡眠の様子'
  }
  // eating_habitsにotherが含まれている場合、eating_otherに値を設定
  if (Array.isArray(sampleData.eating_habits) && sampleData.eating_habits.includes('other') && !sampleData.eating_other) {
    sampleData.eating_other = 'その他の食事の様子'
  }
  // lessonsにotherが含まれている場合、lessons_otherに値を設定
  if (Array.isArray(sampleData.lessons) && sampleData.lessons.includes('other') && !sampleData.lessons_other) {
    sampleData.lessons_other = 'その他の習い事'
  }

  return sampleData
}

/**
 * 基本情報フォームのサンプルデータを生成
 */
export function generateBasicInfoSampleData(): {
  furigana: string
  childName: string
  birthYear: number
  birthMonth: number
  birthDay: number
  prefecture: string
  childGender: 'male' | 'female' | 'other'
  nickname: string
  parentName: string
  parentPhone: string
} {
  const currentYear = new Date().getFullYear()
  const birthYear = currentYear - 6 // 6歳のサンプル
  const birthMonth = 4 // 4月
  const birthDay = 15 // 15日

  return {
    furigana: 'たなか たろう',
    childName: '田中 太郎',
    birthYear,
    birthMonth,
    birthDay,
    prefecture: '東京都',
    childGender: 'male' as const,
    nickname: 'たーくん',
    parentName: '田中 花子',
    parentPhone: '090-1234-5678',
  }
}

