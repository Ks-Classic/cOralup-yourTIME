# 型定義ドキュメント

## 概要
このドキュメントでは、cOralupプロジェクトで使用される主要な型定義について説明します。

## 診断評価項目の型定義

### DiagnosisItem インターフェース

**ファイル**: `src/data/staff-diagnosis-items.ts`

診断評価表の各項目を定義するインターフェースです。

```typescript
export interface DiagnosisItem {
  id: string                    // 項目の一意なID
  category: string              // カテゴリ名（例: '習癖', '舌', '歯列・咬合'）
  subCategory: string           // サブカテゴリ名（通常はcategoryと同じ）
  question: string              // 質問文
  answerType: 'checkbox' | 'radio' | 'text' | 'number' | 'textarea'  // 回答タイプ
  options?: {                   // 選択肢（checkbox/radioの場合に必須）
    value: string
    label: string
  }[]
  required: boolean             // 必須項目かどうか
  inputType: 'parent' | 'staff' // 入力者タイプ（保護者/スタッフ）
  analysisUse?: boolean         // 分析に利用するかどうか
  note?: string                 // 補足説明
  placeholder?: string          // プレースホルダー（text/number/textareaの場合）
  unit?: string                 // 単位（numberの場合、例: 'kg'）
  min?: number                  // 最小値（numberの場合）
  max?: number                  // 最大値（numberの場合）
}
```

### 使用例

```typescript
// ラジオボタン項目の例
{
  id: 'tongue_1',
  category: '舌',
  subCategory: '舌',
  question: '舌小帯短縮症',
  answerType: 'radio',
  options: [
    { value: 'yes', label: '有' },
    { value: 'no', label: '無' }
  ],
  required: true,
  inputType: 'staff'
}

// 数値入力項目の例
{
  id: 'lip_4',
  category: '口唇',
  subCategory: '口唇',
  question: '口唇圧',
  answerType: 'number',
  required: false,
  inputType: 'staff',
  unit: 'kg',
  placeholder: '例: 2.5',
  note: '実施できない場合は「不可」の項目'
}
```

### カテゴリ順序

`categoryOrder`配列でカテゴリの表示順序を定義しています。

```typescript
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
  'その他',
]
```

## 問診票フォームの型定義

### FormFieldType

**ファイル**: `src/types/forms.ts`

問診票フォームで使用されるフィールドタイプです。

```typescript
export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'email'
  | 'tel'
  | 'date'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'multi-select'
  | 'file'
```

### FormFieldConfig

問診票フォームの各フィールドを定義する型です。

```typescript
export type FormFieldConfig = {
  id: string
  name: string
  type: FormFieldType
  required?: boolean
  placeholder?: string
  helperText?: string
  options?: FormFieldOption[]
  defaultValue?: string | number | boolean | (string | number | boolean)[]
  validation?: FormFieldValidation
  rows?: number
  min?: number
  max?: number
  step?: number
}
```

**注意**: `FormFieldConfig`は問診票用、`DiagnosisItem`は診断評価表用で、用途が異なります。

## 診断結果の型定義

### Diagnosis インターフェース

**ファイル**: `src/types/index.ts`

診断結果全体を表すインターフェースです。

```typescript
export interface Diagnosis {
  id: string
  sessionId: string
  postureAnalysis?: PostureAnalysis
  oralAnalysis?: OralAnalysis
  diagnosisItems: Record<string, any>  // DiagnosisItemの回答値
  aiAnalysis?: string
  staffNotes?: string
  photos: PhotoInfo[]
  createdAt: string
  updatedAt: string
}
```

**注意**: `diagnosisItems`は`Record<string, any>`型で、各`DiagnosisItem`のIDをキーとして回答値を格納します。

## 型定義の整合性

### DiagnosisItem と Diagnosis の関係

- `DiagnosisItem`: 診断評価表の項目定義（スキーマ）
- `Diagnosis.diagnosisItems`: 診断評価表の回答値（データ）

例：
```typescript
// 項目定義（DiagnosisItem）
{
  id: 'tongue_1',
  question: '舌小帯短縮症',
  answerType: 'radio',
  options: [{ value: 'yes', label: '有' }, { value: 'no', label: '無' }]
}

// 回答値（Diagnosis.diagnosisItems）
{
  tongue_1: 'yes'  // または 'no'
}
```

### FormFieldConfig と DiagnosisItem の違い

| 項目 | FormFieldConfig | DiagnosisItem |
|------|----------------|---------------|
| 用途 | 問診票フォーム | 診断評価表 |
| ファイル | `src/types/forms.ts` | `src/data/staff-diagnosis-items.ts` |
| 入力者 | 保護者 | 保護者またはスタッフ |
| 構造 | セクション単位 | カテゴリ単位 |

## 型定義のベストプラクティス

1. **型の一貫性**: 同じ概念には同じ型を使用する
2. **型の明確性**: 型名は用途を明確に示す
3. **型の再利用**: 共通の型は`src/types/`に定義する
4. **型のドキュメント化**: 複雑な型にはコメントを追加する

## 関連ファイル

- `src/data/staff-diagnosis-items.ts`: 診断評価項目の定義
- `src/types/forms.ts`: 問診票フォームの型定義
- `src/types/index.ts`: 共通の型定義
- `src/app/(staff)/diagnosis/[id]/page.tsx`: 診断入力画面（DiagnosisItemを使用）

## 更新履歴

- 2025-01-XX: 初版作成

