/**
 * 小学生以上用問診票フォームスキーマ（完全実装版）
 * デモ特化 - 完全実操作可能なUI実装用
 */
import type { FormSchemaConfig } from '@/types/forms'
import { prefectures } from './prefectures'

export const elementaryFormSchema: FormSchemaConfig = {
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
          id: 'grade',
          name: '学年',
          type: 'select',
          required: false,
          placeholder: '学年を選択してください',
          options: [
            { value: '1', label: '小学1年生' },
            { value: '2', label: '小学2年生' },
            { value: '3', label: '小学3年生' },
            { value: '4', label: '小学4年生' },
            { value: '5', label: '小学5年生' },
            { value: '6', label: '小学6年生' },
            { value: '7', label: '中学1年生' },
            { value: '8', label: '中学2年生' },
            { value: '9', label: '中学3年生' },
          ],
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
      id: 'sleep',
      title: '睡眠の様子',
      description: '睡眠に関する項目を選択してください',
      order: 2,
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
            { value: 'frequent_waking', label: '頻回起き' },
            { value: 'prone', label: 'うつ伏せ寝' },
            { value: 'supine', label: '仰向け' },
            { value: 'side', label: '横向き寝' },
          ],
        },
      ],
    },
    {
      id: 'lessons',
      title: '習い事',
      description: '現在通っている習い事を記入してください',
      order: 3,
      fields: [
        {
          id: 'lessons',
          name: '習い事',
          type: 'textarea',
          required: false,
          placeholder: '例: スイミング、ピアノ',
          rows: 3,
        },
      ],
    },
    {
      id: 'concerns',
      title: '気になること',
      description: '当てはまる項目を選択してください',
      order: 4,
      fields: [
        {
          id: 'concerns',
          name: '気になること',
          type: 'checkbox',
          required: false,
          options: [
            { value: 'mouth_open', label: 'お口がポカンと開いていることがある' },
            { value: 'teeth_worry', label: '将来歯並びや噛み合わせが良くなるか不安' },
            { value: 'articulation', label: '滑舌が悪いと感じることがある' },
            { value: 'posture', label: '姿勢が悪いと感じる' },
            { value: 'sleep_position', label: 'ママとお子様の寝る位置が決まっている' },
            { value: 'night_waking', label: '夜中に起きることがある' },
            { value: 'bedwetting', label: 'おねしょをする' },
            { value: 'tired', label: 'すぐ「疲れた」と言う(体力がない)' },
            { value: 'restless', label: '落ち着きがない' },
          ],
        },
      ],
    },
    {
      id: 'screen_time',
      title: 'ゲーム・スマホ・タブレット・TV視聴',
      description: '1日の視聴時間を教えてください',
      order: 5,
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
      id: 'sleep_time',
      title: '睡眠時間',
      description: '睡眠時間に関する情報を入力してください',
      order: 6,
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
          ],
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
            { value: 'fast', label: '食べるのが早い(あまり噛んでいない)' },
            { value: 'large_bite', label: '一口量が多かったり詰め込みたべをする' },
            { value: 'restless', label: '食事中じっとしていない' },
            { value: 'drinks_water', label: '食事中よく水分をとる' },
            { value: 'tv_on', label: '食事中テレビがついている' },
            { value: 'picky', label: '好き嫌いが多い' },
            { value: 'seiza', label: '割座(お姉さん座り)をする' },
            { value: 'often_sick', label: 'よく体調を崩す' },
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
      id: 'consent',
      title: '同意事項',
      description: '症例写真の使用について',
      order: 8,
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

