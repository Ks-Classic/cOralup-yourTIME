# Coralup TODO プロジェクト管理

**最終更新: 2025-12-16**

---

## 🎯 現在のフェーズ: Phase 2 自社CRM整備

### Phase 1 完了: YourTIME イベント（2024/12/21）✅ 成功

---

## � 完了状況サマリー

### ✅ Phase 1 完了タスク（2024/12）

| カテゴリ | 完了数 | 備考 |
|---------|--------|------|
| 01-infra: DB基盤 | 16/16 ✅ | RLS, API対応含む |
| 02-parent: 問診画面 | 18/18 ✅ | LIFF実装完了 |
| 03-staff: 診断画面 | 22/22 ✅ | LINE認証完了 |
| 04-admin: 管理画面 | 9/9 ✅ | スキーマエディタ+来場者管理 |
| 07-本番テスト | 11/11 ✅ | イベント本番実施済み |
| 08-診断フロー改善 | 5/6 ✅ | 1件残（下部メニュー被り） |

---

## 🚨 緊急対応タスク（2026-02-16 追加）

**並列ワークストリーム**: [PARALLEL-WORKSTREAMS.md](../architecture/PARALLEL-WORKSTREAMS.md)
**デバッグ分析レポート**: [DEBUG-ANALYSIS-REPORT.md](../architecture/DEBUG-ANALYSIS-REPORT.md)

### 🔴 15-スタッフ説明会対応（本日対応）

**詳細**: [15-スタッフ説明会対応.md](./15-スタッフ説明会対応.md)

| # | タスク | 詳細 | 状態 |
|---|--------|------|------|
| 15.1 | Webhook URL設定確認 | LINE Developers で確認 | 📋 |
| 15.2 | 環境変数設定確認 | Vercel 環境変数チェック | 📋 |
| 15.3 | 友だち追加テスト | 自分のアカウントで確認 | 📋 |
| 15.4 | LIFF ログインテスト | `/staff/liff-login` 動作確認 | 📋 |
| 15.5 | デモモード動作確認 | 診断フロー体験確認 | 📋 |
| 15.6 | 説明会実施（2回目・3回目） | スタッフ全員登録完了 | 📋 |
| 15.7 | 登録状況確認 | SQL クエリで確認 | 📋 |

### 🔴 16-P0 データ消失バグ修正（次回イベント前必須）

**詳細**: [16-P0-データ消失バグ修正.md](./16-P0-データ消失バグ修正.md) | **Stream A**

| # | タスク | 詳細 | 状態 | 工数 |
|---|--------|------|------|------|
| A1 | `flushToStorage` 追加 | `useDiagnosisStorage.ts` | 📋 | 2h |
| A2 | `completeDiagnosis` にDB最終保存追加 | `diagnosis/[id]/page.tsx` | 📋 | 1h |
| A3 | `runAnalysis` DB保存失敗をブロッキングに | 同上 | 📋 | 0.5h |
| A4 | `beforeunload` イベントハンドラ追加 | 同上 | 📋 | 0.5h |
| A5 | 「次の診断へ」ボタンに保存確認追加 | 同上 | 📋 | 0.5h |

### 🟠 17-P1 カメラ安定化（並列可）

**詳細**: [17-P1-カメラ安定化.md](./17-P1-カメラ安定化.md) | **Stream B**

| # | タスク | 詳細 | 状態 | 工数 |
|---|--------|------|------|------|
| B1 | `currentPhotoType` を `useRef` にも保存 | LIFF state 更新遅延対策 | 📋 | 1h |
| B2 | `handleFileCapture` で ref + state 両方チェック | B1依存 | 📋 | 0.5h |
| B3 | アンマウント時ストリームクリーンアップ | MediaStream リソースリーク対策 | 📋 | 0.5h |
| B4 | Blob URL 解放 | メモリリーク防止 | 📋 | 0.5h |

### 🟠 18-P1 ステータス遷移整理（並列可）

**詳細**: [18-P1-ステータス遷移整理.md](./18-P1-ステータス遷移整理.md) | **Stream C**

| # | タスク | 詳細 | 状態 | 工数 |
|---|--------|------|------|------|
| C1 | `VisitStatus` 型定義 | 遷移マップ作成 | 📋 | 1h |
| C2 | `updateVisitStatus` ユーティリティ | バリデーション付き | 📋 | 1h |
| C3-5 | 全API Route 移行 | 3ファイル | 📋 | 2h |

### 🟡 19-P2 ネットワークレジリエンス

**詳細**: [19-P2-ネットワークレジリエンス.md](./19-P2-ネットワークレジリエンス.md) | **Stream D**

| # | タスク | 詳細 | 状態 | 工数 |
|---|--------|------|------|------|
| D1 | `fetchWithRetry` ユーティリティ | Exponential backoff | 📋 | 2h |
| D2 | 401 → ログインリダイレクト | セッション切れ対応 | 📋 | 1h |
| D3 | online/offline イベント対応 | 自動再取得 | 📋 | 1h |
| D4 | `maxDuration` 設定追加 | Vercel タイムアウト対策 | 📋 | 0.5h |

---

## 🚀 現在の進行タスク（Phase 2: 2025 Q1）

### 🆕 10-sibling: 兄弟対応機能（Phase 2.5）

**設計書**: [37-兄弟対応機能設計書.md](../designe/37-兄弟対応機能設計書.md)

| # | タスク | 詳細 | 状態 | 担当 |
|---|--------|------|------|------|
| 10.1 | `/api/parent/visit` 複数子供対応 | 全子供を返すように修正 | ✅ | |
| 10.2 | `/api/parent/basic-info` childId対応 | 既存/新規子供の分岐 | 📋 | |
| 10.3 | 子供選択UIコンポーネント作成 | `ChildSelector.tsx` | ✅ | |
| 10.4 | LIFF問診ページに選択ステップ追加 | `page.tsx` 改修 | 📋 | |
| 10.5 | 問診完了画面に「もう1人追加」追加 | LIFF page.tsx に実装 | ✅ | |
| 10.6 | 兄弟対応E2Eテスト | 2人分問診→別々診断 | 📋 | |

### 05-analysis: データ分析基盤

| # | タスク | 詳細 | 状態 | 担当 |
|---|--------|------|------|------|
| 5.1 | 診断結果集計View作成 | `diagnosis_summary_view` SQL作成 | 📋 | |
| 5.2 | 問診結果集計View作成 | `questionnaire_summary_view` SQL作成 | 📋 | |
| 5.3 | イベント別集計View作成 | `event_analytics_view` SQL作成 | 📋 | |
| 5.4 | Lark Base同期設定 | DB Trigger + Edge Function | 📋 | |
| 5.5 | Larkダッシュボード作成 | 診断数、項目別集計 | 📋 | |

### 06-admin-ext: 管理画面拡張

| # | タスク | 詳細 | 状態 | 担当 |
|---|--------|------|------|------|
| 6.1 | 管理画面レイアウト整備 | `src/app/admin/layout.tsx` | 🔧 | |
| 6.2 | 診断進捗リアルタイム表示 | `/admin/visits` 完成 | ✅ | |
| 6.3 | イベント一覧画面 | `src/app/admin/events/page.tsx` | 📋 | |
| 6.4 | イベント作成画面 | `src/app/admin/events/new/page.tsx` | 📋 | |
| 6.5 | イベント編集画面 | `src/app/admin/events/[id]/edit/page.tsx` | 📋 | |
| 6.6 | ステータス管理標準化 | Status(LifeCycle)とStepの分離 | ✅ | |

### 08-crm: CRMデータ整備

| # | タスク | 詳細 | 状態 | 担当 |
|---|--------|------|------|------|
| 8.1 | profiles データ設計 | 既存スタッフ情報の整理 | 📋 | |
| 8.2 | profiles データ投入 | スタッフ情報をDBに登録 | 📋 | |
| 8.3 | visits と sessions 紐付け | 過去データのマッピング | 📋 | |
| 8.4 | children データ整備 | 患者情報の正規化 | 📋 | |
| 8.5 | event_staffs 設定 | イベント×スタッフの紐付け | 📋 | |

### 残作業: 診断フロー改善

| # | タスク | 詳細 | 状態 |
|---|--------|------|------|
| 4 | 下部メニューとのコンテンツ被り | 各ページに `pb-20` 追加 | ⬜ 未着手 |

---

## ✅ 完了タスク一覧（Phase 1）

### 01-infra: DB基盤 ✅ 全完了

| # | タスク | 詳細 | 状態 |
|---|--------|------|------|
| 1.1 | マイグレーション適用 | `20241205000000_diagnosis_master_tables.sql` | ✅ |
| 1.2 | マイグレーション適用 | `20241206000000_questionnaire_master_tables.sql` | ✅ |
| 1.3 | マイグレーション適用 | `20241206000001_crm_tables.sql` | ✅ |
| 1.4 | 診断カテゴリシード | `diagnosis_categories` に16カテゴリ | ✅ |
| 1.5 | 診断項目シード | `diagnosis_items` に約60項目 | ✅ |
| 1.6 | 問診カテゴリシード | `questionnaire_categories` に約10カテゴリ | ✅ |
| 1.7 | 問診項目シード（未就学児） | `questionnaire_items` | ✅ |
| 1.8 | 問診項目シード（小学生） | `questionnaire_items` | ✅ |
| 1.9 | YourTIMEイベント登録 | `events` テーブル | ✅ |
| 1.10 | cOralup組織確認 | `organizations` | ✅ |
| 1.11 | RLS有効化 | 全テーブルRLS ON + service_roleポリシー | ✅ |
| 1.12 | API Service Role移行 | クライアント直Supabase廃止 | ✅ |
| 1.13 | reports拡張マイグレーション | `uuid`, `visit_id`, AI分析カラム | ✅ |
| 1.14 | line_message_logs作成 | LINE送信ログテーブル | ✅ |
| 1.15 | visits冗長カラム削除 | `line_user_id`, `parent_name`, `parent_phone` | ✅ |
| 1.16 | visit_id統一 | 全テーブルに `visit_id` カラム追加 | ✅ |

### 02-parent: 問診画面DB連携 ✅ 全完了

| # | タスク | 詳細 | 状態 |
|---|--------|------|------|
| 2.0 | LINE Webhook実装 | profiles即時登録 | ✅ |
| 2.1 | 基本情報保存API | `/api/parent/basic-info` | ✅ |
| 2.2 | 問診回答保存API | `/api/parent/questionnaire` | ✅ |
| 2.3 | 問診項目取得API | `/api/questionnaire/items` | ✅ |
| 2.4 | 問診画面DB読み込み | API化 | ✅ |
| 2.5 | 画面遷移時保存処理 | 基本情報→問診→QR | ✅ |
| 2.6 | 旧テーブル互換保存 | sessions, questionnaires | ✅ |
| 2.7 | スタッフ側引き継ぎAPI | `/api/staff/session` | ✅ |
| 2.8 | LINE Loginチャネル作成 | 手動設定 | ✅ |
| 2.9 | LIFFアプリ作成 | 手動設定 | ✅ |
| 2.10 | @line/liff追加 | パッケージ追加 | ✅ |
| 2.11 | LIFF問診ページ作成 | `/parent/questionnaire/liff` | ✅ |
| 2.12 | LIFF初期化処理 | エラーハンドリング含む | ✅ |
| 2.13 | 既存visit復元API | `/api/parent/visit` | ✅ |
| 2.14 | 問診データ自動保存 | 離脱対策 | ✅ |
| 2.15 | 外部ブラウザフォールバック | LINEアプリ誘導 | ✅ |
| 2.16 | ウェルカムメッセージ更新 | LIFF URL対応 | ✅ |
| 2.17 | 環境変数設定 | LIFF ID等 | ✅ |
| 2.18 | LIFF E2Eテスト | 本番テスト完了 | ✅ |

### 03-staff: 診断画面DB連携 ✅ 全完了

| # | タスク | 詳細 | 状態 |
|---|--------|------|------|
| 3.1 | 診断項目取得API作成 | `/api/diagnosis-schema` | ✅ |
| 3.2 | 診断画面をDB読み込みに変更 | 動的生成 | ✅ |
| 3.3 | 診断回答保存API作成 | `/api/diagnoses` | ✅ |
| 3.4 | 診断回答を正規化テーブルに保存 | `diagnosis_responses` | ✅ |
| 3.5 | 旧テーブル互換保存 | `diagnoses` | ✅ |
| 3.6 | staff/report API化 | サーバー経由 | ✅ |
| 3.7 | staff/analysis API化 | サーバー経由 | ✅ |
| 3.8 | LINE公式アカウント作成 | スタッフ用 | ✅ |
| 3.9 | LINE Loginチャネル作成 | 手動設定 | ✅ |
| 3.10 | Webhook API実装 | `/api/line/staff-webhook` | ✅ |
| 3.11 | LIFF認証実装 | `/api/auth/staff-session` | ✅ |
| 3.12 | 認証ユーティリティ | `staff-auth.ts` | ✅ |
| 3.13 | LIFFログイン画面 | `/staff/liff-login` | ✅ |
| 3.14 | ログイン案内画面 | `/staff/login` | ✅ |
| 3.15 | スタッフホーム画面 | `/staff/home` | ✅ |
| 3.16 | 対応履歴一覧画面 | `/staff/history` | ✅ |
| 3.17 | 対応詳細画面 | `/staff/history/[sessionId]` | ✅ |
| 3.18 | ログアウト | `/staff/logout` | ✅ |
| 3.19 | LIFF作成 | 手動設定 | ✅ |
| 3.20 | Webhook URL設定 | 手動設定 | ✅ |
| 3.21 | 環境変数設定 | LINE_STAFF_*等 | ✅ |
| 3.22 | スタッフ認証E2Eテスト | 本番テスト完了 | ✅ |

### 04-admin: 管理画面 ✅ 全完了

| # | タスク | 詳細 | 状態 |
|---|--------|------|------|
| 4.1 | 診断カテゴリCRUD API | `/api/admin/diagnosis-schema` | ✅ |
| 4.2 | 診断項目CRUD API | `/api/admin/diagnosis-schema` | ✅ |
| 4.3 | 問診カテゴリCRUD API | `/api/admin/questionnaire-schema` | ✅ |
| 4.4 | 問診項目CRUD API | `/api/admin/questionnaire-schema` | ✅ |
| 4.5 | スキーマエディタUI完成 | `/admin/schema-editor` | ✅ |
| 4.6 | プレビュー機能 | リアルタイムプレビュー | ✅ |
| 4.7 | 保存・反映機能 | 変更保存と反映 | ✅ |
| 4.8 | ADMIN_API_KEY認証 | Bearer認証 | ✅ |
| 4.9 | 来場者管理画面 | `/admin/visits` | ✅ |

### 07-本番テスト ✅ 全完了（YourTIME 2024/12/21 実施済み）

| # | タスク | 詳細 | 状態 |
|---|--------|------|------|
| 7.1 | LINE登録テスト | profiles登録確認 | ✅ |
| 7.2 | 問診フォームテスト | 基本情報→問診→QR表示 | ✅ |
| 7.3 | QRスキャンテスト | データ引き継ぎ確認 | ✅ |
| 7.4 | 写真撮影テスト | Storageアップロード確認 | ✅ |
| 7.5 | 診断入力テスト | Auto Save動作確認 | ✅ |
| 7.6 | AI分析テスト | Gemini API動作確認 | ✅ |
| 7.7 | LINE送信テスト | レポート送信確認 | ✅ |
| 7.8 | 通しテスト | 全フロー実行 | ✅ |
| 7.9 | エラーケーステスト | オフライン等対応確認 | ✅ |
| 7.10 | テストデータクリア | 本番前クリーンアップ | ✅ |
| 7.11 | 最終リハーサル | 本番想定通しテスト | ✅ |

### 08-診断フロー改善 ✅ ほぼ完了

| # | タスク | 詳細 | 状態 |
|---|--------|------|------|
| 1 | staff-sessionモジュール不在エラー | import修正 | ✅ |
| 2 | LINE通知エラー | 環境変数名修正 | ✅ |
| 3 | レポートページ404エラー | API修正 | ✅ |
| 4 | 下部メニューとのコンテンツ被り | `pb-20`追加 | ⬜ |
| 5 | カテゴリバー連動スクロール | useEffect追加 | ✅ |
| 6 | 問診結果UI/UX改善 | 敬称・ラベル表示対応 | ✅ |

---

## 📁 実装済みファイル一覧

### API構成

```
src/app/api/
├── admin/                      # 管理画面API
│   ├── diagnosis-schema/       ✅ 診断スキーマCRUD
│   ├── schemas/                ✅ 問診スキーマCRUD
│   └── visits/                 ✅ 来場者一覧
├── ai/                         # AI分析API
│   ├── analyze-oral/           ✅ 口腔分析
│   ├── analyze-posture/        ✅ 姿勢分析
│   └── generate-report/        ✅ レポート生成
├── analysis/                   ✅ 統合分析API
├── auth/
│   └── staff-session/          ✅ スタッフセッション発行
├── diagnoses/                  ✅ 診断結果CRUD
├── diagnosis/
│   └── complete/               ✅ 診断完了統合API
├── diagnosis-schema/           ✅ 診断スキーマ取得（公開）
├── line/
│   ├── confirm-delivery/       ✅ 配信確認
│   ├── send-report/            ✅ レポート送信
│   ├── staff-webhook/          ✅ スタッフWebhook
│   └── webhook/                ✅ 親御さんWebhook
├── parent/
│   ├── basic-info/             ✅ 基本情報保存
│   ├── questionnaire/          ✅ 問診回答CRUD
│   └── visit/                  ✅ visit復元
├── photos/
│   └── upload/                 ✅ 写真アップロード
├── questionnaire/
│   └── items/                  ✅ 問診項目取得
├── report/
│   ├── [id]/                   ✅ レポート取得・作成
│   └── create/                 ✅ レポート新規作成
├── staff/
│   ├── analysis-data/          ✅ AI分析用データ
│   ├── auth/                   ✅ 認証
│   ├── history/                ✅ 履歴取得
│   ├── report/                 ✅ レポート作成
│   └── session/                ✅ セッション管理
└── visits/
    ├── record-error/           ✅ エラーログ
    └── update-step/            ✅ ステップ更新
```

### ページ構成

```
src/app/
├── page.tsx                    ✅ トップページ
├── admin/
│   ├── page.tsx                ✅ 管理ダッシュボード
│   ├── visits/                 ✅ 来場者管理
│   └── schema-editor/          ✅ スキーマエディタ
├── staff/
│   ├── diagnosis/
│   │   ├── [id]/               ✅ 診断ページ
│   │   └── demo/               ✅ デモページ
│   ├── scan/                   ✅ QRスキャン
│   ├── home/                   ✅ ホーム
│   ├── history/                ✅ 履歴一覧
│   ├── login/                  ✅ ログイン案内
│   ├── liff-login/             ✅ LIFFログイン
│   ├── logout/                 ✅ ログアウト
│   └── monitor/                ✅ モニター
├── (exhibition)/
│   └── parent/
│       └── questionnaire/
│           └── liff/           ✅ LIFF問診ページ
└── report/
    └── [id]/                   ✅ レポート表示
```

### コンポーネント・ライブラリ

```
src/
├── agents/
│   └── oral-diagnosis/
│       └── schema.ts           ✅ AI分析スキーマ
├── components/
│   └── diagnosis/              ✅ 診断コンポーネント群
└── lib/
    ├── gemini.ts               ✅ Gemini APIクライアント
    ├── liff-utils.ts           ✅ LIFFユーティリティ
    ├── staff-auth.ts           ✅ JWT認証ユーティリティ
    └── supabase.ts             ✅ Supabaseクライアント
```

---

## 📚 関連ドキュメント

| ファイル | 内容 | 更新日 |
|---------|------|--------|
| [00-企画書_ビジョン.md](../designe/00-企画書_ビジョン.md) | プロジェクトビジョン | 2025-12-16 |
| [02-技術仕様書.md](../designe/02-技術仕様書.md) | 技術仕様・API設計 | 2025-12-16 |
| [04-データフロー設計.md](../designe/04-データフロー設計.md) | データフロー設計 | 2025-12-16 |
| [06-DB設計書.md](../designe/06-DB設計書.md) | データベース設計 | 2025-12-16 |
| [07-実装ロードマップ.md](../designe/07-実装ロードマップ.md) | 実装ロードマップ | 2025-12-16 |
| [28-スタッフLINE認証仕様書.md](../designe/28-スタッフLINE認証仕様書.md) | スタッフ認証設計 | - |
| [30-LINE全体構成図.md](../designe/30-LINE全体構成図.md) | LINE構成図 | - |

---

## 🏷️ ステータス凡例

| 記号 | 意味 |
|------|------|
| ✅ | 完了 |
| 🔧 | 作業中 |
| 📋 | 未着手 |
| ⏸️ | 保留 |
| ⬜ | 未着手（優先度低） |

---

## 📅 スケジュール

```
2024/12 ✅ Phase 1 完了
├── Week 1-2: DB基盤整備、マスタデータ投入
├── Week 3: テスト・調整
├── Week 4: クリーンアップ・リハーサル
└── 12/21: YourTIME イベント本番 ✅ 成功

2025 Q1 🔧 Phase 2 進行中
├── 1月: 自社CRM整備、Lark連携
├── 2月: 管理画面拡張
└── 3月: 運用安定化

2025 Q2〜 📋 Phase 3 予定
├── 4月: マルチテナント基盤
├── 5月: 医院向けβ版
└── 6月〜: トレーナー向け、マッチング
```
