import type { FormSchemaConfig } from '@/types/forms'

/**
 * 基本情報フォームスキーマ（未就学児・小学生共通）
 * 
 * このスキーマは親御さんが最初に入力する基本情報ページで使用されます。
 * 「次へ」ボタンでDB保存（profiles, children, visits）後、問診ページへ遷移します。
 */
export const basicInfoFormSchema: FormSchemaConfig = {
  sections: [
    {
      id: 'basic_info',
      title: '基本情報',
      description: 'お子様の基本情報を入力してください',
      order: 1,
      fields: [
        {
          id: 'childName',
          name: 'お子様のお名前',
          type: 'text',
          required: true,
          placeholder: '山田 太郎',
        },
        {
          id: 'childFurigana',
          name: 'ふりがな',
          type: 'text',
          required: true,
          placeholder: 'やまだ たろう',
        },
        {
          id: 'birthYear',
          name: '生年（西暦）',
          type: 'select',
          required: true,
          options: Array.from({ length: 20 }, (_, i) => {
            const year = new Date().getFullYear() - i
            return { value: String(year), label: `${year}年` }
          }),
        },
        {
          id: 'birthMonth',
          name: '生月',
          type: 'select',
          required: true,
          options: Array.from({ length: 12 }, (_, i) => ({
            value: String(i + 1),
            label: `${i + 1}月`,
          })),
        },
        {
          id: 'birthDay',
          name: '生日',
          type: 'select',
          required: true,
          options: Array.from({ length: 31 }, (_, i) => ({
            value: String(i + 1),
            label: `${i + 1}日`,
          })),
        },
        {
          id: 'childGender',
          name: '性別',
          type: 'radio',
          required: true,
          options: [
            { value: 'male', label: '男の子' },
            { value: 'female', label: '女の子' },
          ],
        },
        {
          id: 'prefecture',
          name: 'お住まいの都道府県',
          type: 'select',
          required: true,
          placeholder: '選択してください',
          options: [
            // 関西圏（優先）
            { value: '大阪府', label: '大阪府' },
            { value: '兵庫県', label: '兵庫県' },
            { value: '京都府', label: '京都府' },
            { value: '奈良県', label: '奈良県' },
            { value: '和歌山県', label: '和歌山県' },
            { value: '滋賀県', label: '滋賀県' },
            // その他（北から順）
            { value: '北海道', label: '北海道' },
            { value: '青森県', label: '青森県' },
            { value: '岩手県', label: '岩手県' },
            { value: '宮城県', label: '宮城県' },
            { value: '秋田県', label: '秋田県' },
            { value: '山形県', label: '山形県' },
            { value: '福島県', label: '福島県' },
            { value: '茨城県', label: '茨城県' },
            { value: '栃木県', label: '栃木県' },
            { value: '群馬県', label: '群馬県' },
            { value: '埼玉県', label: '埼玉県' },
            { value: '千葉県', label: '千葉県' },
            { value: '東京都', label: '東京都' },
            { value: '神奈川県', label: '神奈川県' },
            { value: '新潟県', label: '新潟県' },
            { value: '富山県', label: '富山県' },
            { value: '石川県', label: '石川県' },
            { value: '福井県', label: '福井県' },
            { value: '山梨県', label: '山梨県' },
            { value: '長野県', label: '長野県' },
            { value: '岐阜県', label: '岐阜県' },
            { value: '静岡県', label: '静岡県' },
            { value: '愛知県', label: '愛知県' },
            { value: '三重県', label: '三重県' },
            { value: '鳥取県', label: '鳥取県' },
            { value: '島根県', label: '島根県' },
            { value: '岡山県', label: '岡山県' },
            { value: '広島県', label: '広島県' },
            { value: '山口県', label: '山口県' },
            { value: '徳島県', label: '徳島県' },
            { value: '香川県', label: '香川県' },
            { value: '愛媛県', label: '愛媛県' },
            { value: '高知県', label: '高知県' },
            { value: '福岡県', label: '福岡県' },
            { value: '佐賀県', label: '佐賀県' },
            { value: '長崎県', label: '長崎県' },
            { value: '熊本県', label: '熊本県' },
            { value: '大分県', label: '大分県' },
            { value: '宮崎県', label: '宮崎県' },
            { value: '鹿児島県', label: '鹿児島県' },
            { value: '沖縄県', label: '沖縄県' },
            { value: 'その他', label: 'その他' },
          ],
        },
        {
          id: 'parentName',
          name: '保護者のお名前',
          type: 'text',
          required: true,
          placeholder: '山田 花子',
        },
        {
          id: 'parentPhone',
          name: '電話番号',
          type: 'text',
          required: true,
          placeholder: '090-1234-5678',
          helperText: '※ LINE通知に使用します',
        },
      ],
    },
  ],
  settings: {
    showProgress: true,
    allowBackNavigation: true,
  },
}

/**
 * 小学生用基本情報フォームスキーマ
 * 未就学児と同じ内容だが、将来的に学年などの追加フィールドを想定
 */
export const basicInfoElementaryFormSchema: FormSchemaConfig = {
  ...basicInfoFormSchema,
  sections: [
    {
      ...basicInfoFormSchema.sections[0],
      fields: [
        ...basicInfoFormSchema.sections[0].fields,
        {
          id: 'schoolGrade',
          name: '学年',
          type: 'select',
          required: true,
          options: [
            { value: '1', label: '1年生' },
            { value: '2', label: '2年生' },
            { value: '3', label: '3年生' },
            { value: '4', label: '4年生' },
            { value: '5', label: '5年生' },
            { value: '6', label: '6年生' },
          ],
        },
      ],
    },
  ],
}






