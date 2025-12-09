import type { FormSchemaConfig } from '@/types/forms'

// 未就学児向けのデフォルト問診スキーマ（モック用）
export const preschoolerFormSchema: FormSchemaConfig = {
  sections: [
    {
      id: 'basic-info',
      title: '基本情報',
      description: 'お子様の基礎情報を入力してください',
      order: 1,
      fields: [
        {
          id: 'child_name',
          name: 'お子様のお名前',
          type: 'text',
          required: true,
          placeholder: '例: 田中 太郎',
        },
        {
          id: 'child_gender',
          name: '性別',
          type: 'radio',
          required: true,
          options: [
            { value: 'male', label: '男' },
            { value: 'female', label: '女' },
            { value: 'other', label: 'その他' },
          ],
        },
        {
          id: 'birth_year',
          name: '生まれた年',
          type: 'number',
          required: true,
          placeholder: '例: 2020',
          validation: { min: 2015, max: new Date().getFullYear() },
        },
      ],
    },
    {
      id: 'health',
      title: '生活のようす',
      description: '日常の生活リズムについて教えてください',
      order: 2,
      fields: [
        {
          id: 'sleep_hours',
          name: '平均睡眠時間（時間）',
          type: 'number',
          required: true,
          placeholder: '例: 10',
          validation: { min: 5, max: 15 },
        },
        {
          id: 'allergies',
          name: 'アレルギー',
          type: 'textarea',
          required: false,
          placeholder: 'ある場合はご記入ください',
        },
      ],
    },
  ],
  settings: {
    showProgress: true,
    allowBackNavigation: true,
  },
}

export default preschoolerFormSchema
