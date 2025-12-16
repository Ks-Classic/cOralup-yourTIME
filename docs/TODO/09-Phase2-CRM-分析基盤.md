# Phase 2: 自社CRM整備・データ分析基盤

**作成日: 2025-12-16**
**期間: 2025 Q1（1月〜3月）**

---

## 概要

Phase 1（YourTIMEイベント）の成功を受けて、以下の目標に向けてシステムを拡張します。

### Phase 2 目標

1. **データ分析基盤の構築**: イベントで蓄積したデータを可視化・分析
2. **CRMデータ整備**: profiles, children, events のデータ整備
3. **管理画面拡張**: イベント管理、セッション管理の強化
4. **Lark連携強化**: リアルタイム同期の本格運用

---

## タスク一覧

### 05-analysis: データ分析基盤

| # | タスク | 詳細 | 優先度 | 状態 |
|---|--------|------|--------|------|
| 5.1 | 診断結果集計View | `diagnosis_summary_view` SQL作成 | 🔴 高 | 📋 |
| 5.2 | 問診結果集計View | `questionnaire_summary_view` SQL作成 | 🔴 高 | 📋 |
| 5.3 | イベント別集計View | `event_analytics_view` SQL作成 | 🟡 中 | 📋 |
| 5.4 | Lark Base同期設定 | DB Trigger + Edge Function | 🟡 中 | 📋 |
| 5.5 | Larkダッシュボード | 診断数、項目別集計 | 🟡 中 | 📋 |

### 06-admin-ext: 管理画面拡張

| # | タスク | 詳細 | 優先度 | 状態 |
|---|--------|------|--------|------|
| 6.1 | 管理画面レイアウト整備 | 統一ナビゲーション | 🟡 中 | 🔧 |
| 6.2 | 診断進捗リアルタイム表示 | `/admin/visits` 完成 | 🔴 高 | ✅ |
| 6.3 | イベント一覧画面 | `/admin/events` | 🟡 中 | 📋 |
| 6.4 | イベント作成・編集画面 | `/admin/events/new`, `[id]/edit` | 🟡 中 | 📋 |
| 6.5 | データエクスポート機能 | CSV/Excel出力 | 🟢 低 | 📋 |

### 08-crm: CRMデータ整備

| # | タスク | 詳細 | 優先度 | 状態 |
|---|--------|------|--------|------|
| 8.1 | profiles データ設計 | 既存スタッフ情報整理 | 🔴 高 | 📋 |
| 8.2 | profiles データ投入 | スタッフ情報登録 | 🔴 高 | 📋 |
| 8.3 | visits と sessions 紐付け | 過去データマッピング | 🟡 中 | 📋 |
| 8.4 | children データ整備 | 患者情報正規化 | 🟡 中 | 📋 |
| 8.5 | event_staffs 設定 | イベント×スタッフ紐付け | 🟡 中 | 📋 |

---

## 実装計画

### 1月: 分析基盤構築

```
Week 1-2: 集計Viewの作成・テスト
├── diagnosis_summary_view
├── questionnaire_summary_view
└── event_analytics_view

Week 3-4: Lark連携
├── Edge Function実装
├── DB Trigger設定
└── ダッシュボード構築
```

### 2月: 管理画面拡張

```
Week 1-2: イベント管理
├── イベント一覧
├── イベント作成
└── イベント編集

Week 3-4: データ管理
├── データエクスポート
├── 一括操作機能
└── 検索・フィルター強化
```

### 3月: 運用安定化

```
Week 1-2: CRMデータ整備
├── profiles整備
├── children整備
└── event_staffs整備

Week 3-4: ドキュメント・運用
├── 運用マニュアル作成
├── スタッフトレーニング
└── 本番移行
```

---

## 技術詳細

### 集計View SQL例

```sql
-- 診断結果集計View
CREATE OR REPLACE VIEW diagnosis_summary_view AS
SELECT 
  e.id as event_id,
  e.name as event_name,
  di.question as item_name,
  dr.value,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY e.id, di.id), 1) as percentage
FROM events e
JOIN visits v ON e.id = v.event_id
JOIN diagnosis_responses dr ON v.id = dr.visit_id
JOIN diagnosis_items di ON dr.item_id = di.id
GROUP BY e.id, e.name, di.id, di.question, dr.value
ORDER BY e.name, di.display_order, count DESC;
```

### Lark連携アーキテクチャ

```
Supabase → DB Trigger → Edge Function → Lark Base API
    └── 1〜3秒以内にリアルタイム反映
```

---

## 完了基準

### Phase 2 完了条件

- [ ] 集計Viewが全て動作している
- [ ] Larkダッシュボードでリアルタイム監視が可能
- [ ] イベント管理画面でCRUD操作が可能
- [ ] スタッフ・患者データが正規化されている
- [ ] 運用マニュアルが完成している

---

## 関連ドキュメント

| ファイル | 内容 |
|---------|------|
| [06-DB設計書.md](../designe/06-DB設計書.md) | データベース設計 |
| [23-Lark-Base-テーブル設計.md](../designe/23-Lark-Base-テーブル設計.md) | Lark同期設計 |
| [07-実装ロードマップ.md](../designe/07-実装ロードマップ.md) | ロードマップ |
