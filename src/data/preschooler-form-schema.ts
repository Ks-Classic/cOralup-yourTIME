/**
 * 未就学児用問診票フォームスキーマ（完全実装版）
 * デモ特化 - 完全実操作可能なUI実装用
 */
import type { FormSchemaConfig } from '@/types/forms'
import { prefectures } from './prefectures'

export const preschoolerFormSchema: FormSchemaConfig = {
  sections: [
    {
      id: 'basic_info',
      title: '基本情報',
      description: 'お子様の基本情報を入力してください',
      order: 1,
      fields: [
        {
          id: 'furigana',
          name: 'ふりがな',
          type: 'text',
          required: false,
          placeholder: '例: たなか たろう',
        },
        {
          id: 'child_name',
          name: 'お名前',
          type: 'text',
          required: true,
          placeholder: '例: 田中 太郎',
          validation: {
            minLength: 1,
            maxLength: 100,
          },
        },
        {
          id: 'prefecture',
          name: '都道府県',
          type: 'select',
          required: false,
          placeholder: '都道府県を選択してください',
          options: prefectures,
        },
        {
          id: 'nickname',
          name: 'ニックネーム',
          type: 'text',
          required: false,
          placeholder: '例: たーくん',
          validation: {
            maxLength: 50,
          },
        },
      ],
    },
    {
      id: 'siblings',
      title: 'きょうだい',
      description: 'きょうだいの有無を教えてください',
      order: 2,
      fields: [
        {
          id: 'has_siblings',
          name: 'きょうだい',
          type: 'radio',
          required: true,
          options: [
            { value: 'none', label: 'いない' },
            { value: 'has', label: 'いる' },
          ],
        },
        {
          id: 'sibling_order',
          name: '何人目',
          type: 'number',
          required: false,
          placeholder: '例: 1',
          validation: { min: 1, max: 10 },
          helperText: 'きょうだいがいる場合のみ入力してください',
        },
      ],
    },
    {
      id: 'screen_time',
      title: 'スマホ・タブレット・TV視聴',
      description: '1日の視聴時間を教えてください',
      order: 3,
      fields: [
        {
          id: 'screen_time',
          name: '視聴頻度と時間',
          type: 'radio',
          required: true,
          options: [
            { value: 'almost_none', label: 'ほぼ見ない' },
            { value: 'within_30min', label: '30分以内' },
            { value: 'within_hours', label: '○時間以内' },
            { value: 'more', label: 'それ以上' },
          ],
        },
        {
          id: 'screen_hours',
          name: '時間数',
          type: 'number',
          required: false,
          placeholder: '例: 2',
          validation: { min: 0, max: 24 },
          helperText: '「○時間以内」を選択した場合のみ入力してください',
        },
        {
          id: 'screen_more_hours',
          name: 'それ以上の時間数',
          type: 'number',
          required: false,
          placeholder: '例: 3',
          validation: { min: 0, max: 24 },
          helperText: '「それ以上」を選択した場合のみ入力してください',
        },
      ],
    },
    {
      id: 'sleep',
      title: '睡眠の様子',
      description: '睡眠に関する項目を選択してください',
      order: 4,
      fields: [
        {
          id: 'sleep_conditions',
          name: '睡眠の様子',
          type: 'checkbox',
          required: false,
          options: [
            { value: 'snoring', label: 'いびき' },
            { value: 'bedtime_fuss', label: '寝ぐずり' },
            { value: 'wake_fuss', label: '起きぐずり' },
            { value: 'night_crying', label: '夜泣き' },
            { value: 'frequent_waking', label: '頻回起き' },
            { value: 'prone', label: 'うつ伏せ寝' },
            { value: 'supine', label: '仰向け' },
            { value: 'side', label: '横向き寝' },
            { value: 'other', label: 'その他' },
          ],
        },
        {
          id: 'sleep_other',
          name: 'その他（詳細）',
          type: 'text',
          required: false,
          placeholder: 'その他の睡眠の様子を記入してください',
          helperText: '「その他」を選択した場合のみ入力してください',
        },
      ],
    },
    {
      id: 'sleep_time',
      title: '睡眠時間',
      description: '睡眠時間に関する情報を入力してください',
      order: 5,
      fields: [
        {
          id: 'bedtime',
          name: '就寝時刻',
          type: 'number',
          required: false,
          placeholder: '例: 21',
          validation: { min: 0, max: 23 },
        },
        {
          id: 'sleep_pattern',
          name: '睡眠パターン',
          type: 'checkbox',
          required: false,
          options: [
            { value: 'irregular', label: '決まっていない' },
            { value: 'regular', label: '規則正しい' },
            { value: 'morning_nap', label: '朝寝' },
            { value: 'afternoon_nap', label: '昼寝' },
            { value: 'evening_nap', label: '夕寝' },
          ],
        },
      ],
    },
    {
      id: 'lessons',
      title: '習い事',
      description: '現在通っている習い事を選択してください',
      order: 6,
      fields: [
        {
          id: 'lessons',
          name: '習い事',
          type: 'checkbox',
          required: false,
          options: [
            { value: 'swimming', label: 'スイミング' },
            { value: 'gymnastics', label: '体操' },
            { value: 'soccer', label: 'サッカー' },
            { value: 'baseball', label: '野球' },
            { value: 'english', label: '英語' },
            { value: 'other', label: 'その他' },
          ],
        },
        {
          id: 'lessons_other',
          name: 'その他（詳細）',
          type: 'text',
          required: false,
          placeholder: 'その他の習い事を記入してください',
          helperText: '「その他」を選択した場合のみ入力してください',
        },
      ],
    },
    {
      id: 'eating',
      title: '食事について',
      description: '食事に関する項目を選択してください',
      order: 7,
      fields: [
        {
          id: 'eating_habits',
          name: '食事の様子',
          type: 'checkbox',
          required: false,
          options: [
            { value: 'picky', label: '偏食' },
            { value: 'no_chew', label: '噛まない' },
            { value: 'cannot_swallow', label: '飲み込めない(吐き出す)' },
            { value: 'swallow_whole', label: '丸呑み食べ' },
            { value: 'large_bite', label: '一口量が多い' },
            { value: 'fast', label: '食べるのが早い' },
            { value: 'slow', label: '食べるのが遅い' },
            { value: 'other', label: 'その他' },
          ],
        },
        {
          id: 'eating_other',
          name: 'その他（詳細）',
          type: 'text',
          required: false,
          placeholder: 'その他の食事の様子を記入してください',
          helperText: '「その他」を選択した場合のみ入力してください',
        },
      ],
    },
    {
      id: 'food_preferences',
      title: '食べ物の好み',
      description: '好きな食べ物・嫌いな食べ物を教えてください',
      order: 8,
      fields: [
        {
          id: 'disliked_foods',
          name: '嫌いな食べ物',
          type: 'textarea',
          required: false,
          placeholder: '例: にんじん、ピーマン',
          rows: 3,
        },
        {
          id: 'liked_foods',
          name: '好きな食べ物',
          type: 'textarea',
          required: false,
          placeholder: '例: りんご、バナナ',
          rows: 3,
        },
      ],
    },
    {
      id: 'consent',
      title: '同意事項',
      description: '症例写真の使用について',
      order: 9,
      fields: [
        {
          id: 'photo_consent',
          name: '学会発表や資料作成のために症例写真の使用にご協力いただけますか？',
          type: 'radio',
          required: true,
          options: [
            { value: 'yes', label: 'YES' },
            { value: 'no', label: 'NO' },
          ],
          helperText: '※目元は隠し個人が特定されることはありません。',
        },
      ],
    },
  ],
  settings: {
    showProgress: true,
    allowBackNavigation: true,
    submitButtonText: '送信する',
  },
}

