# Coralup TODO プロジェクト管理

**最終更新: 2024-12-12**

---

## 🎯 現在のフェーズ: 本番環境テスト + LINE設定

### 目標: 2024/12/21 イベント本番

---

## 🚀 優先タスク

### 並行実装グループ

以下のタスクは**並行で実装可能**です：

#### 🔵 グループA: 親御さんLIFF問診（コード実装）
- Phase 2: LIFF問診ページ実装
- Phase 3: Webhook更新（LIFF URL）

#### 🔵 グループB: スタッフLINE認証（手動設定）
- LINE Developers Console設定
- 環境変数設定
- E2Eテスト

#### 🔵 グループC: 親御さんLINE設定（手動設定）
- LINE Loginチャネル作成
- LIFFアプリ作成
- 環境変数設定

### 📋 残作業サマリー

**スタッフ用（コード実装完了）:**
1. LINE Developers Console設定（手動）
2. 環境変数設定
3. E2Eテスト

**親御さん用（コード実装必要）:**
1. LINE Loginチャネル作成（手動）
2. LIFFアプリ作成（手動）
3. LIFF問診ページ実装（コード）
4. 環境変数設定
5. E2Eテスト

---

## 📋 タスク一覧

### 🔴 P0: YourTIME イベント必須（〜12/20）

#### 01-infra: DB基盤 ✅

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
| 1.11 | RLS有効化 | 全テーブルにRLS ON + service_roleポリシー | ✅ | |
| 1.12 | API Service Role移行 | クライアント直Supabase廃止→サーバーAPI経由 | ✅ | |

#### 02-parent: 問診画面DB連携 ✅

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

#### 02-parent-liff: 親御さんLIFF問診 🆕 **← 優先実装**

**詳細**: [02-06-親御さんLIFF実装.md](./02-parent/02-06-親御さんLIFF実装.md)
**仕様書**: [32-LIFF実装の前提条件と手順.md](../designe/32-LIFF実装の前提条件と手順.md)

| # | タスク | 詳細 | 状態 | 備考 |
|---|--------|------|------|------|
| 2.8 | LINE Loginチャネル作成 | 既存プロバイダー内に作成 | 📋 | 手動設定 |
| 2.9 | LIFFアプリ作成 | LINE Loginチャネル内で作成 | 📋 | 手動設定 |
| 2.10 | @line/liff追加 | `pnpm add @line/liff` | 📋 | |
| 2.11 | LIFF問診ページ作成 | `/parent/questionnaire/liff` | 📋 | |
| 2.12 | LIFF初期化処理 | `liff.init()` + エラーハンドリング | 📋 | |
| 2.13 | 既存visit復元API | `GET /api/parent/visit?line_user_id=xxx` | 📋 | |
| 2.14 | 問診データ自動保存 | 入力ごとにDB保存（離脱対策） | 📋 | |
| 2.15 | 外部ブラウザフォールバック | LINEアプリへ誘導 | 📋 | |
| 2.16 | ウェルカムメッセージ更新 | ボタンをLIFF URLに変更 | 📋 | |
| 2.17 | 環境変数設定 | `NEXT_PUBLIC_PARENT_LIFF_ID` 等 | 📋 | 手動設定 |
| 2.18 | LIFF E2Eテスト | 起動→問診→離脱復元→QR表示 | 📋 | LINE設定後 |

#### 03-staff: 診断画面DB連携 ✅

| # | タスク | 詳細 | 状態 | 担当 |
|---|--------|------|------|------|
| 3.1 | 診断項目取得API作成 | `/api/diagnosis-schema?input_type=staff` | ✅ | |
| 3.2 | 診断画面をDB読み込みに変更 | `src/app/staff/diagnosis/[id]/page.tsx` | ✅ | |
| 3.3 | 診断回答保存API作成 | `POST /api/diagnoses` (正規化対応) | ✅ | |
| 3.4 | 診断回答を正規化テーブルに保存 | `diagnosis_responses` への INSERT | ✅ | |
| 3.5 | 旧テーブル互換保存 | `diagnoses` テーブルにも並行保存（互換用） | ✅ | |
| 3.6 | staff/report API化 | クライアント直Supabase廃止 | ✅ | |
| 3.7 | staff/analysis API化 | クライアント直Supabase廃止 | ✅ | |

#### 03-staff-auth: スタッフLINE認証 ✅ コード実装完了

**仕様書**: [28-スタッフLINE認証仕様書.md](../designe/28-スタッフLINE認証仕様書.md)

| # | タスク | 詳細 | 状態 | 備考 |
|---|--------|------|------|------|
| 3.8 | LINE公式アカウント作成 | 「cOralupスタッフ」Messaging APIチャネル | 📋 | 手動設定 |
| 3.9 | LINE Loginチャネル作成 | LIFFアプリ用 | 📋 | 手動設定 |
| 3.10 | Webhook API実装 | `POST /api/line/staff-webhook` 友だち追加→profiles作成 | ✅ | `src/app/api/line/staff-webhook/route.ts` |
| 3.11 | LIFF認証実装 | `POST /api/auth/staff-session` + Cookie発行 | ✅ | `src/app/api/auth/staff-session/route.ts` |
| 3.12 | 認証ユーティリティ | JWT生成・検証・Cookie管理 | ✅ | `src/lib/staff-auth.ts` |
| 3.13 | LIFFログイン画面 | `/staff/liff-login` LIFF初期化→セッション発行 | ✅ | `src/app/staff/liff-login/page.tsx` |
| 3.14 | ログイン案内画面 | `/staff/login` Cookie切れ時の案内 | ✅ | `src/app/staff/login/page.tsx` |
| 3.15 | スタッフホーム画面 | `/staff/home` QRスキャン + 履歴メニュー | ✅ | `src/app/staff/home/page.tsx` |
| 3.16 | 対応履歴一覧画面 | `/staff/history` 自分の対応一覧 | ✅ | `src/app/staff/history/page.tsx` |
| 3.17 | 対応詳細画面 | `/staff/history/[sessionId]` 問診・診断結果表示 | ✅ | `src/app/staff/history/[sessionId]/page.tsx` |
| 3.18 | ログアウト | `/staff/logout` Cookie削除 | ✅ | `src/app/staff/logout/page.tsx` |
| 3.19 | LIFF作成 | LINE Loginチャネル内でLIFFアプリ作成 | 📋 | 手動設定 |
| 3.20 | Webhook URL設定 | `/api/line/staff-webhook` を登録 | 📋 | 手動設定 |
| 3.21 | 環境変数設定 | `LINE_STAFF_*`, `NEXT_PUBLIC_STAFF_LIFF_ID`, `STAFF_SESSION_SECRET` | 📋 | 手動設定 |
| 3.22 | スタッフ認証E2Eテスト | 友だち追加→ログイン→診断→履歴確認 | 📋 | LINE設定後 |

#### 04-admin: 管理画面 ✅

| # | タスク | 詳細 | 状態 | 担当 |
|---|--------|------|------|------|
| 4.1 | 診断カテゴリCRUD API | `/api/admin/diagnosis-schema` | ✅ | |
| 4.2 | 診断項目CRUD API | `/api/admin/diagnosis-schema` | ✅ | |
| 4.3 | 問診カテゴリCRUD API | `/api/admin/questionnaire-schema` | ✅ | |
| 4.4 | 問診項目CRUD API | `/api/admin/questionnaire-schema` | ✅ | |
| 4.5 | スキーマエディタUI完成 | カテゴリ/項目の追加・編集・削除 | ✅ | |
| 4.6 | プレビュー機能 | 編集内容のリアルタイムプレビュー | ✅ | |
| 4.7 | 保存・反映機能 | 変更の保存と実画面への反映 | ✅ | |
| 4.8 | ADMIN_API_KEY認証 | 管理画面APIにBearer認証実装 | ✅ | |

#### 07-本番テスト: 実データフローテスト

**詳細**: [07-本番テスト/README.md](./07-本番テスト/README.md)
**仕様書**: [29-本番テストフロー仕様書.md](../designe/29-本番テストフロー仕様書.md)

| # | タスク | 詳細 | 状態 | 期限 |
|---|--------|------|------|------|
| 7.1 | LINE登録テスト | 友だち追加→profiles登録確認 | 📋 | 12/14 |
| 7.2 | 問診フォームテスト | 基本情報→問診→QR表示→DB登録確認 | 📋 | 12/14 |
| 7.3 | QRスキャンテスト | データ引き継ぎ確認 | 📋 | 12/15 |
| 7.4 | 写真撮影テスト | Storageアップロード→DB登録確認 | 📋 | 12/15 |
| 7.5 | 診断入力テスト | Auto Save→diagnosis_responses登録確認 | 📋 | 12/16 |
| 7.6 | AI分析テスト | Gemini API動作確認 | 📋 | 12/16 |
| 7.7 | LINE送信テスト | レポート送信→LINE通知確認 | 📋 | 12/17 |
| 7.8 | 通しテスト | 全フロー3回実行 | 📋 | 12/18 |
| 7.9 | エラーケーステスト | オフライン、タイムアウト等 | 📋 | 12/18 |
| 7.10 | テストデータクリア | 本番前クリーンアップ | 📋 | 12/20 |
| 7.11 | 最終リハーサル | 本番想定通しテスト | 📋 | 12/20 |

---

### 🟡 P1: イベント後〜次回イベント前（2025/1月）

#### 05-analysis: データ分析基盤

| # | タスク | 詳細 | 状態 | 担当 |
|---|--------|------|------|------|
| 5.1 | 診断結果集計View作成 | `diagnosis_summary_view` SQL作成 | 📋 | |
| 5.2 | 問診結果集計View作成 | `questionnaire_summary_view` SQL作成 | 📋 | |
| 5.3 | イベント別集計View作成 | `event_analytics_view` SQL作成 | 📋 | |
| 5.4 | Lark Base同期設定 | DB Trigger + Edge Function | 📋 | |
| 5.5 | Larkダッシュボード作成 | 診断数、項目別集計 | 📋 | |

#### 06-admin-ext: 管理画面拡張

| # | タスク | 詳細 | 状態 | 担当 |
|---|--------|------|------|------|
| 6.1 | 管理画面レイアウト | `src/app/admin/layout.tsx` 整備 | 🔧 | |
| 6.2 | イベント一覧画面 | `src/app/admin/events/page.tsx` | 📋 | |
| 6.3 | イベント作成画面 | `src/app/admin/events/new/page.tsx` | 📋 | |
| 6.4 | イベント編集画面 | `src/app/admin/events/[id]/edit/page.tsx` | 📋 | |
| 6.5 | セッション一覧画面 | `src/app/admin/sessions/page.tsx` | 📋 | |
| 6.6 | セッション詳細画面 | `src/app/admin/sessions/[id]/page.tsx` | 📋 | |

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

---

## 📁 実装済みファイル一覧

### スタッフLINE認証関連

```
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   └── staff-session/route.ts  ✅ セッション発行API
│   │   └── line/
│   │       └── staff-webhook/route.ts  ✅ 友だち追加Webhook
│   └── staff/
│       ├── liff-login/page.tsx         ✅ LIFFログイン画面
│       ├── login/page.tsx              ✅ ログイン案内画面
│       ├── home/page.tsx               ✅ ホーム画面
│       ├── history/
│       │   ├── page.tsx                ✅ 対応履歴一覧
│       │   └── [sessionId]/page.tsx    ✅ 対応詳細
│       └── logout/page.tsx             ✅ ログアウト
└── lib/
    └── staff-auth.ts                   ✅ JWT認証ユーティリティ
```

### 親御さんLIFF関連（実装予定）

```
src/
├── app/
│   ├── api/
│   │   ├── line/
│   │   │   └── webhook/route.ts        ✅ 友だち追加Webhook（既存）
│   │   └── parent/
│   │       └── visit/route.ts          📋 既存visit復元API（新規）
│   └── (exhibition)/
│       └── parent/
│           └── questionnaire/
│               └── liff/page.tsx       📋 LIFF問診ページ（新規）
└── lib/
    └── liff-utils.ts                   📋 LIFF初期化ユーティリティ（新規）
```

---

## 📚 関連ドキュメント

| ファイル | 内容 |
|---------|------|
| [00-企画書_ビジョン.md](../designe/00-企画書_ビジョン.md) | プロジェクトビジョン |
| [06-DB設計書.md](../designe/06-DB設計書.md) | データベース設計 |
| [28-スタッフLINE認証仕様書.md](../designe/28-スタッフLINE認証仕様書.md) | スタッフ認証設計 |
| [30-LINE全体構成図.md](../designe/30-LINE全体構成図.md) | LINE構成図 ✅ 更新済み |
| [31-親御さんLIFF採用のメリット.md](../designe/31-親御さんLIFF採用のメリット.md) | LIFF採用理由 ✅ 更新済み |
| [32-LIFF実装の前提条件と手順.md](../designe/32-LIFF実装の前提条件と手順.md) | LIFF実装手順 ✅ 更新済み |
| [33-LINE公式アカウント構成の理解.md](../designe/33-LINE公式アカウント構成の理解.md) | LINE構成理解 ✅ 更新済み |

---

## 🏷️ ステータス凡例

| 記号 | 意味 |
|------|------|
| ✅ | 完了 |
| 🔧 | 作業中 |
| 📋 | 未着手 |
| ⏸️ | 保留 |
| ❌ | キャンセル |

---

## 📅 スケジュール概要

```
12/12    : ドキュメント更新 ✅ + 親御さんLIFF実装開始
12/13    : 親御さんLIFF実装完了 + LINE Developers Console設定（両方）
12/14    : 環境変数設定 + スタッフ認証E2Eテスト
12/15    : 親御さんLIFF E2Eテスト
12/16-17 : 本番テスト（問診〜診断〜レポート）
12/18-19 : 通しテスト + 不具合修正
12/20    : テストデータクリア + 最終リハーサル
12/21    : YourTIME イベント本番
```
