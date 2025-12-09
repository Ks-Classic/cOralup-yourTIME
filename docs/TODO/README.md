# Coralup TODO プロジェクト管理

**最終更新: 2024-12-08**

---

## 🎯 現在のフェーズ: YourTIME イベント対応

### 目標: 2024/12/21 イベント本番

---

## 📋 タスク一覧

### 🔴 P0: YourTIME イベント必須（今週中）

#### 01-infra: DB基盤

| # | タスク | 詳細 | 状態 | 担当 |
|---|--------|------|------|------|
| 1.1 | マイグレーション適用 | `20241205000000_diagnosis_master_tables.sql` を本番適用 | ✅ | |
| 1.2 | マイグレーション適用 | `20241206000000_questionnaire_master_tables.sql` を本番適用 | ✅ | |
| 1.3 | マイグレーション適用 | `20241206000001_crm_tables.sql` を本番適用 | ✅ | |
| 1.4 | 診断カテゴリシード | `diagnosis_categories` に16カテゴリ投入 | ✅ | |
| 1.5 | 診断項目シード | `diagnosis_items` に約60項目投入 | ✅ | |
| 1.6 | 問診カテゴリシード | `questionnaire_categories` に約10カテゴリ投入 | ✅ | |
| 1.7 | 問診項目シード（未就学児） | `questionnaire_items` に未就学児用項目投入 | ✅ | |
| 1.8 | 問診項目シード（小学生） | `questionnaire_items` に小学生用項目投入 | ✅ | |
| 1.9 | YourTIMEイベント登録 | `events` テーブルにYourTIME 1件登録 | ✅ | |
| 1.10 | cOralup組織確認 | `organizations` に cOralup が登録されていることを確認 | ✅ | |

#### 02-parent: 問診画面DB連携（3段階保存フロー）

| # | タスク | 詳細 | 状態 | 担当 |
|---|--------|------|------|------|
| 2.0 | LINE Webhook実装 | 友だち追加→ `profiles` に `line_user_id`, `display_name` 即時登録 | ✅ | |
| 2.1 | 基本情報保存API | `POST /api/parent/basic-info` → `profiles` UPDATE + `children` + `visits` INSERT | ✅ | |
| 2.2 | 問診回答保存API | `POST /api/parent/questionnaire` → `questionnaire_responses` + `visits.status` 更新 | ✅ | |
| 2.3 | 問診項目取得API | `GET /api/questionnaire/items?target_age=preschool` | ✅ | |
| 2.4 | 問診画面DB読み込み | `src/app/(exhibition)/(parent)/` の問診画面をAPI化 | ✅ | |
| 2.5 | 画面遷移時保存処理 | 基本情報「次へ」→ API呼出、問診「次へ：QR表示」→ API呼出 | ✅ | |
| 2.6 | 旧テーブル互換保存 | `sessions`, `questionnaires` にも並行保存（互換用） | ✅ | |
| 2.7 | スタッフ側引き継ぎAPI | `GET /api/staff/session?visit_id=xxx` → 子供・保護者・問診データ取得 | ✅ | |
| 2.8 | 問診画面E2Eテスト | 未就学児/小学生フロー通しテスト | 📋 | |

#### 03-staff: 診断画面DB連携

| # | タスク | 詳細 | 状態 | 担当 |
|---|--------|------|------|------|
| 3.1 | 診断項目取得API作成 | `/api/diagnosis-schema?input_type=staff` | ✅ | |
| 3.2 | 診断画面をDB読み込みに変更 | `src/app/staff/diagnosis/[id]/page.tsx` | ✅ | |
| 3.3 | 診断回答保存API作成 | `POST /api/diagnoses` (正規化対応) | ✅ | |
| 3.4 | 診断回答を正規化テーブルに保存 | `diagnosis_responses` への INSERT | ✅ | |
| 3.5 | 旧テーブル互換保存 | `diagnoses` テーブルにも並行保存（互換用） | ✅ | |
| 3.6 | 診断画面E2Eテスト | 全カテゴリ入力テスト | 📋 | |
| 3.7 | レポート生成テスト | 正規化データからレポート生成確認 | 🔧 | |

#### 03-staff-auth: スタッフLINE認証 🆕

| # | タスク | 詳細 | 状態 | 担当 |
|---|--------|------|------|------|
| 3.8 | LINE公式アカウント作成 | 「cOralupスタッフ」Messaging APIチャネル | 📋 | |
| 3.9 | LINEログインチャネル作成 | OAuth認証用チャネル | 📋 | |
| 3.10 | Webhook API実装 | 友だち追加→profiles作成 | 📋 | |
| 3.11 | OAuth認証実装 | LINEログイン + セッションCookie | 📋 | |
| 3.12 | スタッフホーム画面 | `/staff/home` QRスキャン + 履歴メニュー | 📋 | |
| 3.13 | 対応履歴一覧画面 | `/staff/history` 自分の対応一覧 | 📋 | |
| 3.14 | 対応詳細画面 | `/staff/history/[sessionId]` 問診・診断結果表示 | 📋 | |
| 3.15 | 診断時スタッフ紐付け | visits.staff_profile_id 設定 | 📋 | |
| 3.16 | スタッフ認証E2Eテスト | 友だち追加→ログイン→診断→履歴確認 | 📋 | |

#### 04-test: 本番前テスト

| # | タスク | 詳細 | 状態 | 担当 |
|---|--------|------|------|------|
| 4.1 | 全フロー通しテスト | 親問診→スタッフ診断→レポート送信 | 📋 | |
| 4.2 | 本番環境デプロイ | Vercel本番へデプロイ | 📋 | |
| 4.3 | 本番DB確認 | Supabase本番でデータ確認 | 📋 | |
| 4.4 | Lark同期確認 | Lark Baseへのデータ同期確認 | 📋 | |
| 4.5 | 現場リハーサル | 実機でのテスト | 📋 | |

---

### 🟡 P1: イベント後〜次回イベント前（2025/1月）

#### 05-analysis: データ分析基盤

| # | タスク | 詳細 | 状態 | 担当 |
|---|--------|------|------|------|
| 5.1 | 診断結果集計View作成 | `diagnosis_summary_view` SQL作成 | 📋 | |
| 5.2 | 問診結果集計View作成 | `questionnaire_summary_view` SQL作成 | 📋 | |
| 5.3 | イベント別集計View作成 | `event_analytics_view` SQL作成 | 📋 | |
| 5.4 | Lark Base同期設定 | Supabase → Lark 自動同期 | 📋 | |
| 5.5 | Larkダッシュボード作成 | 診断数、項目別集計 | 📋 | |

#### 06-admin: 管理画面基盤

| # | タスク | 詳細 | 状態 | 担当 |
|---|--------|------|------|------|
| 6.1 | 管理画面レイアウト | `src/app/admin/layout.tsx` 整備 | 🔧 | |
| 6.2 | イベント一覧画面 | `src/app/admin/events/page.tsx` | 📋 | |
| 6.3 | イベント作成画面 | `src/app/admin/events/new/page.tsx` | 📋 | |
| 6.4 | イベント編集画面 | `src/app/admin/events/[id]/edit/page.tsx` | 📋 | |
| 6.5 | セッション一覧画面 | `src/app/admin/sessions/page.tsx` | 📋 | |
| 6.6 | セッション詳細画面 | `src/app/admin/sessions/[id]/page.tsx` | 📋 | |

#### 07-schema-editor: スキーマエディタ完成

| # | タスク | 詳細 | 状態 | 担当 |
|---|--------|------|------|------|
| 7.1 | 診断カテゴリCRUD API | `/api/admin/diagnosis-schema` | ✅ | |
| 7.2 | 診断項目CRUD API | `/api/admin/diagnosis-schema` | ✅ | |
| 7.3 | 問診カテゴリCRUD API | `/api/admin/questionnaire-schema` | ✅ | |
| 7.4 | 問診項目CRUD API | `/api/admin/questionnaire-schema` | ✅ | |
| 7.5 | スキーマエディタUI完成 | カテゴリ/項目の追加・編集・削除 | ✅ | |
| 7.6 | プレビュー機能 | 編集内容のリアルタイムプレビュー | ✅ | |
| 7.7 | 保存・反映機能 | 変更の保存と実画面への反映 | ✅ | |

---

### 🟢 P2: 自社CRM整備（2025 Q1）

#### 08-crm: CRMデータ整備

| # | タスク | 詳細 | 状態 | 担当 |
|---|--------|------|------|------|
| 8.1 | profiles データ設計 | 既存スタッフ情報の整理 | 📋 | |
| 8.2 | profiles データ投入 | スタッフ情報をDBに登録 | 📋 | |
| 8.3 | visits と sessions 紐付け | 過去データのマッピング | 📋 | |
| 8.4 | children データ整備 | 患者情報の正規化 | 📋 | |
| 8.5 | event_staffs 設定 | イベント×スタッフの紐付け | 📋 | |

#### 09-lark: Lark連携強化

| # | タスク | 詳細 | 状態 | 担当 |
|---|--------|------|------|------|
| 9.1 | Lark Base テーブル設計 | 診断/問診/イベント/スタッフ | 📋 | |
| 9.2 | Supabase→Lark同期API | Edge Function作成 | 📋 | |
| 9.3 | 定期同期バッチ | 日次同期の設定 | 📋 | |
| 9.4 | Larkダッシュボード | KPI可視化 | 📋 | |

#### 10-course: 講座管理

| # | タスク | 詳細 | 状態 | 担当 |
|---|--------|------|------|------|
| 10.1 | 講座一覧画面 | `src/app/admin/courses/page.tsx` | 📋 | |
| 10.2 | 講座作成画面 | `src/app/admin/courses/new/page.tsx` | 📋 | |
| 10.3 | 受講者管理画面 | `src/app/admin/courses/[id]/enrollments/page.tsx` | 📋 | |
| 10.4 | 受講履歴API | `/api/admin/enrollments` | 📋 | |

#### 11-meeting: MTG/議事録管理

| # | タスク | 詳細 | 状態 | 担当 |
|---|--------|------|------|------|
| 11.1 | MTG一覧画面 | `src/app/admin/meetings/page.tsx` | 📋 | |
| 11.2 | MTG作成画面 | `src/app/admin/meetings/new/page.tsx` | 📋 | |
| 11.3 | 議事録編集画面 | `src/app/admin/meetings/[id]/page.tsx` | 📋 | |
| 11.4 | Lark連携 | MTG→Lark自動同期 | 📋 | |

---

### 🔵 P3: マルチテナント化（2025 Q2〜）

#### 12-multitenant: マルチテナント基盤

| # | タスク | 詳細 | 状態 | 担当 |
|---|--------|------|------|------|
| 12.1 | RLS設計 | organization_id による行レベルセキュリティ | 📋 | |
| 12.2 | RLSポリシー作成 | 全テーブルにRLS適用 | 📋 | |
| 12.3 | 認証強化 | Supabase Auth または Clerk | 📋 | |
| 12.4 | JWT organization_id 埋め込み | 認証トークンに組織ID含める | 📋 | |
| 12.5 | API organization_id フィルタ | 全APIで組織フィルタ適用 | 📋 | |

#### 13-clinic: 医院向け機能

| # | タスク | 詳細 | 状態 | 担当 |
|---|--------|------|------|------|
| 13.1 | 医院登録フロー | 新規医院のオンボーディング | 📋 | |
| 13.2 | 医院用ダッシュボード | 患者一覧、診断履歴 | 📋 | |
| 13.3 | 診断項目カスタマイズUI | 表示ON/OFF、順序変更 | 📋 | |
| 13.4 | 問診項目カスタマイズUI | ラベル変更、項目追加 | 📋 | |
| 13.5 | スタッフ管理画面 | 医院内スタッフの管理 | 📋 | |
| 13.6 | 請求管理 | subscriptions テーブル活用 | 📋 | |

#### 14-trainer: トレーナー向け機能

| # | タスク | 詳細 | 状態 | 担当 |
|---|--------|------|------|------|
| 14.1 | トレーナー登録フロー | 新規トレーナーのオンボーディング | 📋 | |
| 14.2 | 簡易版診断ツール | 個人利用向け | 📋 | |
| 14.3 | クライアント管理 | 顧客情報 | 📋 | |
| 14.4 | ワークプログラム | 継続支援コンテンツ | 📋 | |

#### 15-platform-admin: プラットフォーム管理

| # | タスク | 詳細 | 状態 | 担当 |
|---|--------|------|------|------|
| 15.1 | 全組織一覧画面 | 医院/トレーナー一覧 | 📋 | |
| 15.2 | 利用統計ダッシュボード | usage_metrics 可視化 | 📋 | |
| 15.3 | エラー監視画面 | error_logs 可視化 | 📋 | |
| 15.4 | 機能フラグ管理 | feature_flags 管理UI | 📋 | |

---

## 📁 タスクファイル構造

```
docs/TODO/
├── README.md（本ファイル）
├── 01-infra/
│   ├── 01-01-supabase初期設定.md ✅
│   ├── 01-02-セッション管理.md ✅
│   ├── 01-03-DBマイグレーション.md ✅
│   ├── 01-04-マスタシード.md 📋 NEW
│   └── 01-05-本番デプロイ.md 📋 NEW
├── 02-parent/
│   ├── 02-01-LINE連携.md ✅
│   ├── 02-02-セッション開始.md ✅
│   ├── 02-03-問診フォーム.md ✅
│   ├── 02-04-結果表示QR.md ✅
│   └── 02-05-問診DB連携.md 📋 NEW
├── 03-staff/
│   ├── 03-01-セッション一覧.md ✅
│   ├── 03-02-診断フォーム.md ✅
│   ├── 03-03-AI分析.md ✅
│   ├── 03-04-レポート送信.md ✅
│   ├── 03-05-診断DB連携.md 📋 NEW
│   └── 03-06-スタッフLINE認証.md 📋 NEW
├── 04-admin/
│   ├── 04-01-ダッシュボード.md 📋
│   ├── 04-02-ユーザー管理.md 📋
│   ├── 04-03-データ分析BI.md 📋
│   ├── 04-04-スキーマエディタ.md ✅
│   ├── 04-05-イベント管理.md 📋 NEW
│   └── 04-06-講座管理.md 📋 NEW
├── 05-analysis/
│   ├── 05-01-集計View.md 📋 NEW
│   └── 05-02-Lark連携.md 📋 NEW
└── 06-multitenant/
    ├── 06-01-RLS設計.md 📋 NEW
    ├── 06-02-医院向け機能.md 📋 NEW
    └── 06-03-トレーナー向け機能.md 📋 NEW
```

---

## 📚 関連ドキュメント

| ファイル | 内容 |
|---------|------|
| [00-企画書_ビジョン.md](../designe/00-企画書_ビジョン.md) | プロジェクトビジョン |
| [06-DB設計書.md](../designe/06-DB設計書.md) | データベース設計 |
| [07-実装ロードマップ.md](../designe/07-実装ロードマップ.md) | 実装スケジュール |
| [26-診断項目DB設計書.md](../designe/26-診断項目DB設計書.md) | 診断マスタ設計 |
| [27-問診項目DB設計書.md](../designe/27-問診項目DB設計書.md) | 問診マスタ設計 |
| [28-スタッフLINE認証仕様書.md](../designe/28-スタッフLINE認証仕様書.md) | スタッフ認証設計 🆕 |

---

## 🏷️ ステータス凡例

| 記号 | 意味 |
|------|------|
| ✅ | 完了 |
| 🔧 | 作業中 |
| 📋 | 未着手 |
| ⏸️ | 保留 |
| ❌ | キャンセル |
