/**
 * 年齢計算とフォームタイプ判定のユーティリティ
 */

/**
 * 生年月日から年齢を計算する
 * @param birthDate 生年月日
 * @returns 年齢（数値）
 */
export function calculateAge(birthDate: Date): number {
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  
  return age
}

/**
 * 未就学児かどうかを判定（0-6歳）
 * @param age 年齢
 * @returns 未就学児の場合true
 */
export function isPreschooler(age: number): boolean {
  return age >= 0 && age <= 6
}

/**
 * 年齢からフォームタイプを取得
 * @param age 年齢
 * @returns 'preschooler' | 'elementary'
 */
export function getFormType(age: number): 'preschooler' | 'elementary' {
  return isPreschooler(age) ? 'preschooler' : 'elementary'
}

/**
 * 年・月・日からDateオブジェクトを作成
 * @param year 年
 * @param month 月（1-12）
 * @param day 日
 * @returns Dateオブジェクト
 */
export function createDateFromParts(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day)
}

/**
 * 現在の年から過去の年のリストを生成（生年月日用）
 * @param startAge 開始年齢（デフォルト: 0歳）
 * @param endAge 終了年齢（デフォルト: 18歳）
 * @returns 年の配列（降順）
 */
export function generateYearOptions(startAge: number = 0, endAge: number = 18): number[] {
  const currentYear = new Date().getFullYear()
  const years: number[] = []
  
  for (let i = endAge; i >= startAge; i--) {
    years.push(currentYear - i)
  }
  
  return years
}

/**
 * 月のリストを生成
 * @returns 1-12の配列
 */
export function generateMonthOptions(): number[] {
  return Array.from({ length: 12 }, (_, i) => i + 1)
}

/**
 * 日のリストを生成（月と年を考慮）
 * @param year 年
 * @param month 月（1-12）
 * @returns 日の配列
 */
export function generateDayOptions(year: number, month: number): number[] {
  const daysInMonth = new Date(year, month, 0).getDate()
  return Array.from({ length: daysInMonth }, (_, i) => i + 1)
}

