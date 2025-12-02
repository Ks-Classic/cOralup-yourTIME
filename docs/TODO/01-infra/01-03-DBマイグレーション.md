# 01-04 DBマイグレーション実行

## 概要
Supabaseデータベースに初期スキーマとStorageバケットを作成する。

## 優先度
**最優先**（全ての実装の前提条件）

---

## マイグレーションファイル一覧

1. `supabase/migrations/20241201000000_init_schema.sql` - 基本テーブル構造
2. `supabase/migrations/20241201000001_storage_buckets.sql` - Storageバケット作成
3. `supabase/migrations/20241202000001_lark_webhook_trigger.sql` - Lark連携トリガー（既存）

---

## 実行方法

### 方法1: Supabase Dashboard（推奨）

1. Supabase Dashboardにログイン
2. プロジェクトを選択
3. **SQL Editor** を開く
4. 各マイグレーションファイルの内容をコピー＆ペースト
5. **Run** ボタンをクリック
6. エラーがないか確認

### 方法2: Supabase CLI（ローカル開発用）

```bash
# Supabase CLIがインストールされている場合
supabase db push

# または個別に実行
supabase db execute --file supabase/migrations/20241201000000_init_schema.sql
supabase db execute --file supabase/migrations/20241201000001_storage_buckets.sql
```

---

## 実行順序

**重要**: 以下の順序で実行してください。

1. ✅ `20241201000000_init_schema.sql` - 基本テーブル構造
2. ✅ `20241201000001_storage_buckets.sql` - Storageバケット
3. ✅ `20241202000001_lark_webhook_trigger.sql` - Lark連携（既に実行済みの場合はスキップ）

---

## 作成されるテーブル

### 基本テーブル
- `sessions` - セッション管理
- `questionnaires` - 問診票データ
- `diagnoses` - 診断結果
- `reports` - レポート管理

### 動的フォームテーブル
- `events` - イベント管理
- `form_schemas` - フォームスキーマ定義
- `form_responses` - フォーム回答データ
- `form_fields` - フォーム項目定義
- `form_schema_versions` - フォームスキーマバージョン履歴
- `form_cache` - フォームキャッシュ

### ビュー
- `user_responses_view` - ユーザー統合ビュー
- `diagnosis_analytics_view` - 診断データ統合ビュー
- `form_analytics_view` - フォーム分析ビュー

---

## 作成されるStorageバケット

- `diagnosis-photos` - 診断写真用（5MB制限、JPEG/PNG/WebP）
- `avatars` - アバター用（2MB制限、JPEG/PNG/WebP）

---

## 確認方法

### テーブル確認
```sql
-- テーブル一覧を確認
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

### Storageバケット確認
1. Supabase Dashboard → **Storage** を開く
2. `diagnosis-photos` と `avatars` バケットが存在することを確認

### インデックス確認
```sql
-- インデックス一覧を確認
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;
```

---

## エラー対処

### エラー: "relation already exists"
- テーブルが既に存在する場合は、`CREATE TABLE IF NOT EXISTS` を使用しているため問題ありません
- 既存のテーブル構造を確認し、必要に応じて手動で修正してください

### エラー: "permission denied"
- Supabase Dashboardから実行している場合、権限は自動的に付与されます
- ローカルから実行している場合、適切な権限で接続しているか確認してください

### エラー: "bucket already exists"
- Storageバケットが既に存在する場合は、`ON CONFLICT DO NOTHING` によりスキップされます
- 既存のバケット設定を確認してください

---

## 次のステップ

マイグレーション実行後、以下を確認：

1. ✅ 環境変数が正しく設定されているか（`.env.local`）
2. ✅ Supabase接続テスト（`pnpm dev` でエラーが出ないか）
3. ✅ Storageバケットへのアップロードテスト（Agent 3実装時）

---

## 参照ドキュメント

- [06-DB設計書.md](../../designe/06-DB設計書.md)
- [22-画像アップロード仕様書.md](../../designe/22-画像アップロード仕様書.md)
- [01-03-環境変数セットアップ.md](01-03-環境変数セットアップ.md)

