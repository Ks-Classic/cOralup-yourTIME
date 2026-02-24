# データ検索の最適な方法 - cOralup

## 検索結果（河内さん一家）

✅ **お子さん**: 河内 佑友（かわうち ゆうと）さん
- ID: `089b183f-29a3-4096-875e-c588e2ebabe3`
- 誕生日: 2017-06-26（7歳）
- 性別: 男の子
- 作成日: 2025-12-21

✅ **親御さん**: 河内 香織（かわうち かおり）さん
- ID: `def28b90-746e-45d4-97d3-32c26d607d61`
- 役割: parent
- LINE ID: `Ufb74237fb9d5c1da46ce6d43390699ec`
- 作成日: 2025-12-21

---

## 🎯 情報探索の最適な方法

データベース上の情報を探す目的に応じて、最適な手法が異なります。

### 1️⃣ **開発・デバッグ・アドホック調査 → Drizzle スクリプト**

**推奨度: ⭐⭐⭐⭐⭐**

**メリット:**
- ✅ **型安全**: TypeScriptでフルサポート、コンパイル時にエラー検出
- ✅ **再利用可能**: スクリプトをコミットして、チーム共有可能
- ✅ **複雑なロジック**: JOIN、条件分岐、データ加工を柔軟に記述
- ✅ **CI/CD統合**: 自動テストやデータ検証に組み込める
- ✅ **環境変数管理**: `.env.local` で環境切り替えが容易

**使用例:**
```bash
# 今回のような検索
npx tsx scripts/check_kawachi_data.ts

# データ整合性チェック
npx tsx scripts/check_db_integrity.ts
```

**向いているケース:**
- 特定のユーザーの状態確認
- データ移行前の検証
- 定期的なデータ品質チェック
- バグ調査（例: なぜこのユーザーのレポートが生成されないのか？）

---

### 2️⃣ **リアルタイム監視・ダッシュボード → Admin UIビュー + Supabase Realtime**

**推奨度: ⭐⭐⭐⭐**

**メリット:**
- ✅ **リアルタイム**: Supabase Realtimeで変更を即座に反映
- ✅ **非エンジニア対応**: クリニックスタッフが直接操作可能
- ✅ **可視化**: グラフや統計情報を視覚的に表示
- ✅ **フィルタリング**: UI上で柔軟に検索・絞り込み

**実装例（cOralupで既に実装済み）:**
```typescript
// src/app/admin/hooks/useRealtimeStatus.ts
// リアルタイムで来場者ステータスを監視
const subscription = supabase
  .channel('visits_changes')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'visits' },
    (payload) => {
      // UI自動更新
    }
  )
```

**向いているケース:**
- 診断セッションの進行状況監視
- スタッフのアクティビティ確認
- エラー率のモニタリング
- 統計ダッシュボード

---

### 3️⃣ **ワンタイム調査・緊急確認 → Supabase Dashboard SQL Editor**

**推奨度: ⭐⭐⭐**

**メリット:**
- ✅ **即座にアクセス**: ブラウザでSupabase Dashboardを開くだけ
- ✅ **シンプル**: 単純なSELECT文で十分
- ✅ **履歴保存**: Supabaseが実行したクエリを保存

**使用例:**
```sql
-- Supabase Dashboard > SQL Editor
SELECT 
  c.id, 
  c.last_name, 
  c.first_name, 
  c.birthday,
  p.display_name as parent_name
FROM children c
LEFT JOIN profiles p ON c.parent_profile_id = p.id
WHERE c.last_name ILIKE '%河内%'
  OR c.last_name_kana ILIKE '%かわうち%';
```

**向いているケース:**
- 緊急時のデータ確認（本番環境で今すぐ確認したい）
- データの存在確認（〇〇さんは登録されている？）
- 単純な集計（今日の診断数は？）

**デメリット:**
- ❌ 型安全性なし
- ❌ スクリプトとして再利用しにくい
- ❌ ローカル環境での検証不可

---

### 4️⃣ **Larkなど外部ツール連携 → Edge Function / Webhook**

**推奨度: ⭐⭐⭐**

**メリット:**
- ✅ **自動同期**: データベース更新時に自動でLarkに送信
- ✅ **非技術者向け**: Larkベースで閲覧・検索可能
- ✅ **通知**: メンション・アラートで重要イベントを即座に共有

**実装例（cOralupで既に実装済み）:**
```typescript
// supabase/migrations/functions/lark-sync/index.ts
// 診断完了時に自動的にLarkに同期
Deno.serve(async (req) => {
  const { record } = await req.json()
  
  // Lark APIにPOST
  await fetch('https://open.larksuite.com/open-apis/bitable/v1/...')
})
```

**向いているケース:**
- BI連携（Power BI、Looker、Lark Base）
- クライアント向けレポート自動生成
- Slackなどへの リアルタイム通知

**デメリット:**
- ❌ 初期セットアップが複雑
- ❌ データ同期の遅延やズレが発生する可能性

---

### 5️⃣ **カスタムビュー（Materialized View）→ 複雑な集計の高速化**

**推奨度: ⭐⭐**

**メリット:**
- ✅ **パフォーマンス最適化**: 複雑なJOINや集計をあらかじめ計算
- ✅ **シンプルなクエリ**: アプリ側は単純なSELECTのみ

**使用例:**
```sql
-- migration: 20260115_create_child_summary_view.sql
CREATE MATERIALIZED VIEW child_summary AS
SELECT 
  c.id,
  c.last_name || ' ' || c.first_name AS full_name,
  p.display_name AS parent_name,
  COUNT(v.id) AS visit_count,
  MAX(v.created_at) AS last_visit
FROM children c
LEFT JOIN profiles p ON c.parent_profile_id = p.id
LEFT JOIN visits v ON v.child_id = c.id
GROUP BY c.id, p.display_name;

-- 定期リフレッシュ
REFRESH MATERIALIZED VIEW child_summary;
```

**向いているケース:**
- 統計ダッシュボード（月次レポート、ランキング）
- 大量データの集計（100万件以上）
- 読み取り専用のアーカイブデータ

**デメリット:**
- ❌ リアルタイム性なし（手動/定期リフレッシュ必要）
- ❌ メンテナンスコスト（スキーマ変更時に再作成）

---

## 📊 ユースケース別の推奨手法

| 目的 | 推奨手法 | 理由 |
|------|---------|------|
| 「河内さん」がいるか確認 | **Drizzle スクリプト** | 再現可能、型安全、スクリプト保存でナレッジ化 |
| 診断フローのデバッグ | **Drizzle スクリプト** | ステップごとのデータ確認、複雑なJOIN可能 |
| 今日の診断数を確認 | **Supabase Dashboard** | 単純なクエリ、即座に結果確認 |
| 診断進行状況をリアルタイム監視 | **Admin UIビュー** | 非エンジニア対応、Realtime購読 |
| 月次レポート自動生成 | **Lark連携** | 自動化、BI可視化 |
| 大量データの統計分析 | **Materialized View** | パフォーマンス最適化 |

---

## ✅ cOralupでの推奨ワークフロー

### 開発時
1. **ローカルで検証**: Drizzleスクリプトで開発環境確認
2. **本番で確認**: 必要時のみSupabase Dashboardで直接クエリ

### 運用時
1. **日常監視**: Admin UIのリアルタイムダッシュボード
2. **トラブルシューティング**: Drizzleスクリプトで深掘り調査
3. **レポート**: Lark自動同期で外部共有

---

## 🛠️ 今回のケースで最適だった理由

**Drizzleスクリプト** が最適だった理由:
1. ✅ 特定の人物名での検索（アドホック）
2. ✅ childrenとprofilesの両方を調査（複数テーブル）
3. ✅ 親子関係の確認（リレーション取得）
4. ✅ 結果を詳細に表示（カスタムフォーマット）
5. ✅ 再利用可能（他の名前でも使える）

---

## 📂 参考実装

- **Drizzleスクリプト例**: `scripts/check_kawachi_data.ts` (今回作成)
- **データ整合性チェック**: `scripts/check_db_integrity.ts`
- **Admin UI**: `src/app/admin/hooks/useRealtimeStatus.ts`
- **Lark同期**: `supabase/migrations/functions/lark-sync/index.ts`
