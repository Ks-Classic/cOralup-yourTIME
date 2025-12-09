import type { FormSchemaConfig } from '@/types/forms'

// 小学生以上向けのデフォルト問診スキーマ（モック用）
export const elementaryFormSchema: FormSchemaConfig = {
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
          placeholder: '例: 山田 花子',
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
          id: 'grade',
          name: '学年',
          type: 'select',
          required: true,
          options: [
            { value: '1', label: '小学1年' },
            { value: '2', label: '小学2年' },
            { value: '3', label: '小学3年' },
            { value: '4', label: '小学4年' },
            { value: '5', label: '小学5年' },
            { value: '6', label: '小学6年' },
          ],
        },
      ],
    },
    {
      id: 'lifestyle',
      title: '生活習慣',
      description: '生活リズムや運動習慣について教えてください',
      order: 2,
      fields: [
        {
          id: 'sleep_hours',
          name: '平均睡眠時間（時間）',
          type: 'number',
          required: true,
          placeholder: '例: 9',
          validation: { min: 5, max: 12 },
        },
        {
          id: 'screen_time',
          name: '1日のスクリーンタイム',
          type: 'select',
          required: true,
          options: [
            { value: 'short', label: '〜1時間' },
            { value: 'medium', label: '1〜2時間' },
            { value: 'long', label: '2時間以上' },
          ],
        },
      ],
    },
  ],
  settings: {
    showProgress: true,
    allowBackNavigation: true,
  },
}

export default elementaryFormSchema
