# Lark Base テーブル設計書

## 概要

展示会当日のリアルタイム監視用 Lark Base テーブル設計。
Supabase の visits テーブルと同期し、非エンジニアスタッフでも状況を把握できるダッシュボードを提供する。

---

## 1. テーブル構成

### テーブル1: `来場者ログ` (visits_log)

メインの来場者管理テーブル。visits テーブルと 1:1 で同期。

| フィールド名 | 型 | 説明 | Supabase対応 |
|-------------|-----|------|--------------|
| visit_id | テキスト | Supabase visits.id (UUID) | visits.id |
| child_name | テキスト | お子様の名前 | children.last_name + first_name |
| parent_name | テキスト | 親御さんの名前 | profiles.display_name |
| status | 単一選択 | 進捗状況 | visits.status |
| staff_name | テキスト | 担当スタッフ名 | profiles.display_name |
| visit_time | 日時 | 来場時刻 | visits.visit_date |
| updated_at | 日時 | 最終更新時刻 | - |
| reception_number | テキスト | 受付番号 | visits.reception_number |
| event_name | テキスト | イベント名 | events.name |
| child_age_months | 数値 | 月齢 | visits.child_age_months |
| diagnosis_summary | テキスト | 診断結果サマリ | oral_diagnoses.diagnosis_summary |

**status の選択肢:**
- `waiting` - 待機中
- `in_progress` - 診断中
- `completed` - 診断完了
- `report_sent` - レポート送信済み

---

### テーブル2: `リアルタイム集計` (realtime_stats)

本日の集計値を表示するテーブル。

| フィールド名 | 型 | 説明 |
|-------------|-----|------|
| metric_name | テキスト | 指標名 |
| value | 数値 | 値 |
| updated_at | 日時 | 更新時刻 |

**集計指標:**
- 本日の来場者数
- 待機中の人数
- 診断完了数
- レポート送信済み

---

### テーブル3: `異常検知アラート` (alerts)

システムが検知した異常を記録するテーブル。

| フィールド名 | 型 | 説明 |
|-------------|-----|------|
| alert_type | 単一選択 | アラート種別 |
| description | テキスト | 詳細説明 |
| visit_id | テキスト | 関連する visit ID |
| created_at | 日時 | 検知時刻 |
| resolved | チェックボックス | 解決済みか |

**alert_type の選択肢:**
- `timeout` - タイムアウト（30分以上待機）
- `error` - システムエラー
- `data_mismatch` - データ不整合

---

## 2. Lark Base セットアップ手順

### Step 1: Base アプリ作成

1. Lark にログイン
2. 「Base」を開く
3. 「新規作成」→「空のBase」
4. 名前: `cOralup 展示会監視`

### Step 2: テーブル作成

上記の設計に従い、3つのテーブルを作成。

### Step 3: App Token / Table ID 取得

1. Base の URL から `app_token` を取得
   - 例: `https://xxx.larksuite.com/base/APP_TOKEN_HERE`
2. 各テーブルの URL から `table_id` を取得
   - 例: `https://xxx.larksuite.com/base/xxx/TABLE_ID_HERE`

### Step 4: 環境変数設定

```env
# Lark App 認証情報
LARK_APP_ID=cli_xxxxxxxxxx
LARK_APP_SECRET=xxxxxxxxxx

# Lark Base 設定
LARK_BASE_APP_TOKEN=appXXXXXXXXXXXX
LARK_BASE_TABLE_ID=tblXXXXXXXXXXXX      # 来場者ログ
LARK_STATS_TABLE_ID=tblYYYYYYYYYYYY    # リアルタイム集計
LARK_ALERTS_TABLE_ID=tblZZZZZZZZZZZZ   # 異常検知アラート
```

---

## 3. ダッシュボードビュー設定

### 推奨ビュー

#### ビュー1: 「本日の来場者」
- フィルター: `visit_time` が今日
- ソート: `visit_time` 降順
- 表示カラム: child_name, status, staff_name, visit_time

#### ビュー2: 「待機中」
- フィルター: `status` = `waiting`
- ソート: `visit_time` 昇順（長く待っている順）
- 条件付き書式: 30分以上待機は赤背景

#### ビュー3: 「スタッフ別進捗」
- グループ化: `staff_name`
- 集計: 各ステータスの件数

#### ビュー4: 「アラート一覧」
- テーブル: alerts
- フィルター: `resolved` = false
- ソート: `created_at` 降順

---

## 4. 同期フロー

```mermaid
sequenceDiagram
    participant App as Next.js App
    participant DB as Supabase DB
    participant Edge as Edge Function
    participant Lark as Lark Base

    App->>DB: INSERT/UPDATE visits
    DB->>Edge: Database Webhook
    Edge->>DB: 関連データ取得 (JOIN)
    Edge->>Lark: POST /records (Upsert)
    Edge->>Lark: 統計テーブル更新
    Note over Lark: ダッシュボードに即反映
```

---

## 5. 注意事項

### API レート制限
- Lark API: 100 requests/min
- 大量更新時はバッチ処理を検討

### データ整合性
- visit_id をキーとして Upsert
- 削除は同期しない（Lark 側で手動削除）

### セキュリティ
- App Secret は環境変数で管理
- Edge Function 経由でのみアクセス

---

## 6. トラブルシューティング

### 同期されない場合
1. Edge Function のログを確認
2. Lark API のレスポンスを確認
3. 環境変数が正しく設定されているか確認

### トークンエラー
- App ID / Secret が正しいか確認
- アプリの権限設定を確認（Bitable の読み書き権限）

### レコードが重複する場合
- visit_id でのフィルターが正しく動作しているか確認
- テーブルの visit_id フィールドがテキスト型か確認

