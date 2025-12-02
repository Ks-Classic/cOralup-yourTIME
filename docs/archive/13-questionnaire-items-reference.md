# 親御さん用問診票 項目・回答タイプ・選択肢一覧表

## 概要

本ドキュメントは、親御さんが入力する問診票の全項目・回答タイプ・選択肢を一覧表形式でまとめた実装参照用ドキュメントです。

**用途**:
- 実装時の参照資料
- テスト時のチェックリスト
- データファイルとの整合性確認
- 仕様変更時の影響範囲確認

**関連ドキュメント**:
- [問診票データ構造仕様書](./08-questionnaire-data-spec.md)
- [デモ特化 - 完全実操作可能なUI実装](../TODO/07-ui-design/07-00-デモ特化-完全実操作可能なUI実装.md)

---

## 未就学児用問診票

### 全項目一覧表

| セクション | 項目ID | 項目名 | 回答タイプ | 選択肢 | 必須 | 条件付き表示 | バリデーション | プレースホルダー |
|-----------|--------|--------|-----------|--------|------|-------------|---------------|----------------|
| 基本情報 | furigana | ふりがな | text | - | 任意 | - | - | 例: たなか たろう |
| 基本情報 | child_name | お名前 | text | - | 必須 | - | minLength: 1, maxLength: 100 | 例: 田中 太郎 |
| 基本情報 | prefecture | 都道府県 | select | 47都道府県 | 任意 | - | - | 都道府県を選択してください |
| 基本情報 | nickname | ニックネーム | text | - | 任意 | - | maxLength: 50 | 例: たーくん |
| きょうだい | has_siblings | きょうだい | radio | いない・いる | 必須 | - | - | - |
| きょうだい | sibling_order | 何人目 | number | - | 条件付き必須 | has_siblings='has' | min: 1, max: 10 | 例: 1 |
| スマホ・タブレット・TV視聴 | screen_time | 視聴頻度と時間 | radio | ほぼ見ない・30分以内・○時間以内・それ以上 | 必須 | - | - | - |
| スマホ・タブレット・TV視聴 | screen_hours | 時間数 | number | - | 条件付き | screen_time='within_hours' | min: 0, max: 24 | 例: 2 |
| スマホ・タブレット・TV視聴 | screen_more_hours | それ以上の時間数 | number | - | 条件付き | screen_time='more' | min: 0, max: 24 | 例: 3 |
| 睡眠の様子 | sleep_conditions | 睡眠の様子 | checkbox | いびき・寝ぐずり・起きぐずり・夜泣き・頻回起き・うつ伏せ寝・仰向け・横向き寝・その他 | 任意 | - | - | - |
| 睡眠の様子 | sleep_other | その他（詳細） | text | - | 条件付き | sleep_conditionsに'other'含む | - | その他の睡眠の様子を記入してください |
| 睡眠時間 | bedtime | 就寝時刻 | number | - | 任意 | - | min: 0, max: 23 | 例: 21 |
| 睡眠時間 | sleep_pattern | 睡眠パターン | checkbox | 決まっていない・規則正しい・朝寝・昼寝・夕寝 | 任意 | - | - | - |
| 習い事 | lessons | 習い事 | checkbox | スイミング・体操・サッカー・野球・英語・その他 | 任意 | - | - | - |
| 習い事 | lessons_other | その他（詳細） | text | - | 条件付き | lessonsに'other'含む | - | その他の習い事を記入してください |
| 食事について | eating_habits | 食事の様子 | checkbox | 偏食・噛まない・飲み込めない・丸呑み食べ・一口量が多い・食べるのが早い・食べるのが遅い・その他 | 任意 | - | - | - |
| 食事について | eating_other | その他（詳細） | text | - | 条件付き | eating_habitsに'other'含む | - | その他の食事の様子を記入してください |
| 食べ物の好み | disliked_foods | 嫌いな食べ物 | textarea | - | 任意 | - | - | 例: にんじん、ピーマン |
| 食べ物の好み | liked_foods | 好きな食べ物 | textarea | - | 任意 | - | - | 例: りんご、バナナ |
| 同意事項 | photo_consent | 症例写真の使用 | radio | YES・NO | 必須 | - | - | - |

**注意**: 生年月日と性別は、基本情報入力画面で別途入力されます。フォームスキーマには含まれていません。

### 選択肢マスターデータ

#### radio: きょうだい
- `value: "none"`, `label: "いない"`
- `value: "has"`, `label: "いる"`

#### radio: 視聴頻度と時間
- `value: "almost_none"`, `label: "ほぼ見ない"`
- `value: "within_30min"`, `label: "30分以内"`
- `value: "within_hours"`, `label: "○時間以内"`
- `value: "more"`, `label: "それ以上"`

#### checkbox: 睡眠の様子
- `value: "snoring"`, `label: "いびき"`
- `value: "bedtime_fuss"`, `label: "寝ぐずり"`
- `value: "wake_fuss"`, `label: "起きぐずり"`
- `value: "night_crying"`, `label: "夜泣き"`
- `value: "frequent_waking"`, `label: "頻回起き"`
- `value: "prone"`, `label: "うつ伏せ寝"`
- `value: "supine"`, `label: "仰向け"`
- `value: "side"`, `label: "横向き寝"`
- `value: "other"`, `label: "その他"`

#### checkbox: 睡眠パターン
- `value: "irregular"`, `label: "決まっていない"`
- `value: "regular"`, `label: "規則正しい"`
- `value: "morning_nap"`, `label: "朝寝"`
- `value: "afternoon_nap"`, `label: "昼寝"`
- `value: "evening_nap"`, `label: "夕寝"`

#### checkbox: 習い事
- `value: "swimming"`, `label: "スイミング"`
- `value: "gymnastics"`, `label: "体操"`
- `value: "soccer"`, `label: "サッカー"`
- `value: "baseball"`, `label: "野球"`
- `value: "english"`, `label: "英語"`
- `value: "other"`, `label: "その他"`

#### checkbox: 食事の様子
- `value: "picky"`, `label: "偏食"`
- `value: "no_chew"`, `label: "噛まない"`
- `value: "cannot_swallow"`, `label: "飲み込めない(吐き出す)"`
- `value: "swallow_whole"`, `label: "丸呑み食べ"`
- `value: "large_bite"`, `label: "一口量が多い"`
- `value: "fast"`, `label: "食べるのが早い"`
- `value: "slow"`, `label: "食べるのが遅い"`
- `value: "other"`, `label: "その他"`

#### radio: 症例写真の使用
- `value: "yes"`, `label: "YES"`
- `value: "no"`, `label: "NO"`

#### select: 都道府県
47都道府県の完全なリストは `src/data/prefectures.ts` を参照してください。

---

## 小学生以上用問診票

### 全項目一覧表

| セクション | 項目ID | 項目名 | 回答タイプ | 選択肢 | 必須 | 条件付き表示 | バリデーション | プレースホルダー |
|-----------|--------|--------|-----------|--------|------|-------------|---------------|----------------|
| 基本情報 | furigana | ふりがな | text | - | 任意 | - | - | 例: たなか たろう |
| 基本情報 | child_name | お名前 | text | - | 必須 | - | minLength: 1, maxLength: 100 | 例: 田中 太郎 |
| 基本情報 | prefecture | 都道府県 | select | 47都道府県 | 任意 | - | - | 都道府県を選択してください |
| 基本情報 | grade | 学年 | select | 小学1年生～中学3年生 | 任意 | - | - | 学年を選択してください |
| 基本情報 | nickname | ニックネーム | text | - | 任意 | - | maxLength: 50 | 例: たーくん |
| 睡眠の様子 | sleep_conditions | 睡眠の様子 | checkbox | いびき・寝ぐずり・起きぐずり・頻回起き・うつ伏せ寝・仰向け・横向き寝 | 任意 | - | - | - |
| 習い事 | lessons | 習い事 | textarea | - | 任意 | - | - | 例: スイミング、ピアノ |
| 気になること | concerns | 気になること | checkbox | お口がポカンと開いていることがある・将来歯並びや噛み合わせが良くなるか不安・滑舌が悪いと感じることがある・姿勢が悪いと感じる・ママとお子様の寝る位置が決まっている・夜中に起きることがある・おねしょをする・すぐ「疲れた」と言う・落ち着きがない | 任意 | - | - | - |
| ゲーム・スマホ・タブレット・TV視聴 | screen_time | 視聴頻度と時間 | radio | ほぼ見ない・30分以内・○時間以内・それ以上 | 必須 | - | - | - |
| ゲーム・スマホ・タブレット・TV視聴 | screen_hours | 時間数 | number | - | 条件付き | screen_time='within_hours' | min: 0, max: 24 | 例: 2 |
| ゲーム・スマホ・タブレット・TV視聴 | screen_more_hours | それ以上の時間数 | number | - | 条件付き | screen_time='more' | min: 0, max: 24 | 例: 3 |
| 睡眠時間 | bedtime | 就寝時刻 | number | - | 任意 | - | min: 0, max: 23 | 例: 21 |
| 睡眠時間 | sleep_pattern | 睡眠パターン | checkbox | 決まっていない・規則正しい | 任意 | - | - | - |
| 食事について | eating_habits | 食事の様子 | checkbox | 食べるのが早い・一口量が多かったり詰め込みたべをする・食事中じっとしていない・食事中よく水分をとる・食事中テレビがついている・好き嫌いが多い・割座をする・よく体調を崩す・その他 | 任意 | - | - | - |
| 食事について | eating_other | その他（詳細） | text | - | 条件付き | eating_habitsに'other'含む | - | その他の食事の様子を記入してください |
| 同意事項 | photo_consent | 症例写真の使用 | radio | YES・NO | 必須 | - | - | - |

**注意**: 生年月日と性別は、基本情報入力画面で別途入力されます。フォームスキーマには含まれていません。

### 選択肢マスターデータ

#### select: 学年
- `value: "1"`, `label: "小学1年生"`
- `value: "2"`, `label: "小学2年生"`
- `value: "3"`, `label: "小学3年生"`
- `value: "4"`, `label: "小学4年生"`
- `value: "5"`, `label: "小学5年生"`
- `value: "6"`, `label: "小学6年生"`
- `value: "7"`, `label: "中学1年生"`
- `value: "8"`, `label: "中学2年生"`
- `value: "9"`, `label: "中学3年生"`

#### checkbox: 睡眠の様子
- `value: "snoring"`, `label: "いびき"`
- `value: "bedtime_fuss"`, `label: "寝ぐずり"`
- `value: "wake_fuss"`, `label: "起きぐずり"`
- `value: "frequent_waking"`, `label: "頻回起き"`
- `value: "prone"`, `label: "うつ伏せ寝"`
- `value: "supine"`, `label: "仰向け"`
- `value: "side"`, `label: "横向き寝"`

#### checkbox: 気になること
- `value: "mouth_open"`, `label: "お口がポカンと開いていることがある"`
- `value: "teeth_worry"`, `label: "将来歯並びや噛み合わせが良くなるか不安"`
- `value: "articulation"`, `label: "滑舌が悪いと感じることがある"`
- `value: "posture"`, `label: "姿勢が悪いと感じる"`
- `value: "sleep_position"`, `label: "ママとお子様の寝る位置が決まっている"`
- `value: "night_waking"`, `label: "夜中に起きることがある"`
- `value: "bedwetting"`, `label: "おねしょをする"`
- `value: "tired"`, `label: "すぐ「疲れた」と言う(体力がない)"`
- `value: "restless"`, `label: "落ち着きがない"`

#### checkbox: 睡眠パターン
- `value: "irregular"`, `label: "決まっていない"`
- `value: "regular"`, `label: "規則正しい"`

#### checkbox: 食事の様子
- `value: "fast"`, `label: "食べるのが早い(あまり噛んでいない)"`
- `value: "large_bite"`, `label: "一口量が多かったり詰め込みたべをする"`
- `value: "restless"`, `label: "食事中じっとしていない"`
- `value: "drinks_water"`, `label: "食事中よく水分をとる"`
- `value: "tv_on"`, `label: "食事中テレビがついている"`
- `value: "picky"`, `label: "好き嫌いが多い"`
- `value: "seiza"`, `label: "割座(お姉さん座り)をする"`
- `value: "often_sick"`, `label: "よく体調を崩す"`
- `value: "other"`, `label: "その他"`

#### radio: 視聴頻度と時間（未就学児用と同じ）
- `value: "almost_none"`, `label: "ほぼ見ない"`
- `value: "within_30min"`, `label: "30分以内"`
- `value: "within_hours"`, `label: "○時間以内"`
- `value: "more"`, `label: "それ以上"`

#### radio: 症例写真の使用（未就学児用と同じ）
- `value: "yes"`, `label: "YES"`
- `value: "no"`, `label: "NO"`

#### select: 都道府県（未就学児用と同じ）
47都道府県の完全なリストは `src/data/prefectures.ts` を参照してください。

---

## 実装ファイルとの対応関係

### 未就学児用問診票
- **データファイル**: `src/data/preschooler-form-schema.ts`
- **型定義**: `src/types/forms.ts`

### 小学生以上用問診票
- **データファイル**: `src/data/elementary-form-schema.ts`
- **型定義**: `src/types/forms.ts`

### 共通データ
- **都道府県リスト**: `src/data/prefectures.ts`

---

## 07-00-デモ特化-完全実操作可能なUI実装.md との対応関係

### Phase 1.1.1: 未就学児用問診票の完全な項目定義
この一覧表の「未就学児用問診票」セクションが、Phase 1.1.1の実装基準となります。

**チェック項目**:
- [ ] 基本情報セクション: 4項目すべて実装済み
- [ ] きょうだいセクション: 2項目すべて実装済み
- [ ] スマホ・タブレット・TV視聴セクション: 3項目すべて実装済み
- [ ] 睡眠の様子セクション: 2項目すべて実装済み
- [ ] 睡眠時間セクション: 2項目すべて実装済み
- [ ] 習い事セクション: 2項目すべて実装済み
- [ ] 食事についてセクション: 2項目すべて実装済み
- [ ] 食べ物の好みセクション: 2項目すべて実装済み
- [ ] 同意事項セクション: 1項目実装済み

### Phase 1.1.2: 小学生以上用問診票の完全な項目定義
この一覧表の「小学生以上用問診票」セクションが、Phase 1.1.2の実装基準となります。

**チェック項目**:
- [ ] 基本情報セクション: 5項目すべて実装済み
- [ ] 睡眠の様子セクション: 1項目実装済み
- [ ] 習い事セクション: 1項目実装済み
- [ ] 気になることセクション: 1項目実装済み
- [ ] ゲーム・スマホ・タブレット・TV視聴セクション: 3項目すべて実装済み
- [ ] 睡眠時間セクション: 2項目すべて実装済み
- [ ] 食事についてセクション: 2項目すべて実装済み
- [ ] 同意事項セクション: 1項目実装済み

### Phase 1.1.3: 問診票データファイルの作成・更新
この一覧表と実装ファイル（`preschooler-form-schema.ts`、`elementary-form-schema.ts`）の整合性を確認してください。

**確認項目**:
- [ ] すべての項目が実装ファイルに含まれている
- [ ] すべての選択肢が正しく定義されている
- [ ] バリデーションルールが正しく設定されている
- [ ] 条件付き表示ロジックが正しく実装されている
- [ ] プレースホルダーが正しく設定されている

### Phase 2: 親御さん問診票入力画面の完全実装
この一覧表を参照して、すべての項目が正しく実装されているか確認してください。

**確認項目**:
- [ ] すべてのフィールドタイプが正しくレンダリングされている
- [ ] すべての選択肢が正しく表示されている
- [ ] 条件付き表示が正しく動作している
- [ ] バリデーションが正しく動作している

### Phase 6: 動作確認・テスト
この一覧表を使用して、すべての項目が正しく動作するかテストしてください。

**テスト項目**:
- [ ] すべての項目が入力可能である
- [ ] すべての選択肢が選択可能である
- [ ] 条件付き表示が正しく動作する
- [ ] バリデーションが正しく動作する
- [ ] 必須項目チェックが正しく動作する

---

## 更新履歴

- **2025-01-XX**: 初版作成

