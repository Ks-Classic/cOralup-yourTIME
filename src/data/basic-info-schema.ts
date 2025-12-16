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






