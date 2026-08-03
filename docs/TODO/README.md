# Coralup TODO プロジェクト管理

**最終更新: 2026-07-16（8/2 YourTIME運用準備をP0化・レポート後の相談案内追加）**

---

## 🎯 現在のフェーズ: 8/2 YourTIME運用準備

8/2までは、[23-YourTIME-2026-08-02運用準備.md](./23-YourTIME-2026-08-02運用準備.md) を最優先の正本とする。スタッフ登録・全員のデモ練習・本番相当スモークを先に完了し、全体リファクタリングはイベント後へ延期する。

### 2026-06-29 方針更新

現行運用では **Supabase/Postgres + アプリ内管理画面を唯一の正本** とする。
Lark Base は当日運用・レポート反映に必須ではなく、DBに正規化データが残っていれば後続の集計・レポート・外部出力は再生成可能。

そのため、Lark連携は新規開発対象から外し、既存のLark関連実装・マイグレーション・環境変数・設計書は「アプリ挙動に影響しないこと」を確認しながら削除する。

**最優先の整備対象**

| 優先度 | 領域 | 方針 |
|---|---|---|
| P0 | ID正本 | `visits.id` / `visitId` を全データ紐付けの正本にする。`sessionId` はQR・受付表示・サポート用のみ |
| P0 | 状態管理 | `visits.status` は `waiting/in_progress/completed/published/cancelled` のみ。詳細進捗は `currentStep` に閉じる |
| P0 | レポート | レポートURLは現行実装に合わせて `/report/{visitId}`。DBに `reports.visit_id` があれば後から再表示・再送可能 |
| P1 | リアルタイム | Larkではなく `/api/admin/realtime-status` と管理画面を正本にする。必要なら将来Supabase Realtimeへ一本化 |
| P1 | レガシー削除 | Lark同期、旧Supabase helper、旧report/staff API、旧status前提ドキュメントを段階的に削除 |

### 🔐 2026-06-29 セキュリティハードニング 本番デプロイ完了 ✅

**3コミットを origin/main へ push＝107日ぶりの本番デプロイ。ビルド成功・本番ライブ検証パス。**

| コミット | 内容 |
|---|---|
| `34dbde2` | スタッフ認証ハードニング（デフォルトJWT鍵廃止＋LINE IDトークン検証） |
| `4d07229` | デモ診断レポートをスタッフ本人LINEへ送信＋デモ診断UI刷新 |
| `6f747fb` | admin認証を middleware で一元 fail-closed 化（C-1権限昇格修正含む） |

**直った穴（本番で401/307を実証）**: `/api/admin/*` 10本超の無認証/ fail-open（DB書込・削除可能だった）→ middleware一箇所でfail-closed集約。`/admin` の `ADMIN_PASSWORD` 未設定 fail-open も解消。

**デプロイ前必須env**: `ADMIN_PASSWORD`（本番設定済）/ `STAFF_SESSION_SECRET`（設定済）。

**残課題（次スプリント）**: H-1恒久=Upstashレート制限 / M-1=admin Cookie HMAC化 / H-3=デモ送信rate-limit ほか。詳細 → [21-残リスク台帳と最高品質レビュー.md §6.5](./21-残リスク台帳と最高品質レビュー.md)

**残・実機確認（15.x と重複）**: スタッフLIFFログイン→デモ診断UI操作→本人デモLINE着信 / 保護者 問診→QR→診断→レポート 通し / 管理者 `/admin-login`→schema-editor。

### ♻️ 2026-06-30 運用正本化リファクタリング 本番デプロイ完了 ✅

**追加4コミットを本番デプロイ。型チェック+本番ビルド+全フロー本番ライブ200を検証。**

| コミット | 内容 |
|---|---|
| `c0817b6` | デモ診断のLINE送信失敗・問診UI・分析文面を本番相当に修正 |
| `8e76007` | AIモデル一覧を公式現行IDに修正（Gemini 3.1 Flash-Lite追加・無効ID削除） |
| `5fec5bd` | 運用正本化（Lark撤去・visit-status統一・レポートURL=visitId・本番/デモUI共通化） |
| `883bfec` | 親レポート生成プロンプトを正本化（最適化版＋原本バックアップ） |

**確定事項**:
- **Lark sync 完全終了**: コード撤去（lib/lark・lark-sync・test 削除）＋ 本番DBにトリガー/関数が**元から存在せず**を確認（撤去migration実行=no-op）。Lark依存は残っていない。
- **AIモデル**: `/admin/ai-test` で active プロンプトの `model_name` を変えるだけで本番モデルが切替可。推奨=`gemini-3.1-flash-lite`（公式コスパ/低レイテンシ最適）。本番プロンプト正本= [docs/prompts/親レポート生成プロンプト.md](../prompts/親レポート生成プロンプト.md)。
- **既知の運用注意**: 旧SDK `@google/generative-ai` は非推奨（thinking明示制御不可）→ `@google/genai` 移行は thinking制御が要るとき。死にenv `GEMINI_MODEL`(本番)はコード未参照。

**残・実機確認**: `/admin/ai-test` で 3.1 Flash-Lite ＋ 新プロンプト → テスト診断1本（速度・文面）。

### 📨 2026-06-30 デモLINE通知を本番Flexフォーマットに統一 本番デプロイ完了 ✅

**コミット `16bd5e9` を origin/main へ push＝本番デプロイ。型チェック+lint+本番ビルド+単体テスト5件パス。スタッフLINEで実着信確認済み。**

本番(保護者宛=Flexバブル) と デモ(スタッフ本人宛=旧素テキスト) で通知の見た目が別物だった問題を解消。Flex生成を共通lib `src/lib/line-report-message.ts`（`buildReportFlexMessage()`）に切り出し、`send-report`/`send-demo-report` 両ルートが同一生成元を使用（doc 22「UIは1つ、データソースだけ切替」のLINE版・ドリフト防止）。デモは本番と同形Flex＋ボタンが `/report/demo` を開く。安全装置（宛先=スタッフ本人のみ/DBログ書かない/専用チャネル）は維持。

**残（次回・軽微）**: デモ通知の細部に微調整したい点あり（本日は保留）。詳細 → [22-デモモード本番UI統一.md §9](./22-デモモード本番UI統一.md)

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
| 5.4 | Lark Base同期設定 | **削除対象**。アプリ挙動に影響しないことを確認して廃止 | 🗑️ | |
| 5.5 | Larkダッシュボード作成 | **廃止**。管理画面/レポートAPIに集約 | 🗑️ | |

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

### 20-refactor: 運用正本リファクタリング（2026-06-29追加）

**詳細**: [20-運用正本リファクタリング.md](./20-運用正本リファクタリング.md)
**残リスク台帳**: [21-残リスク台帳と最高品質レビュー.md](./21-残リスク台帳と最高品質レビュー.md)

| # | タスク | 詳細 | 状態 |
|---|--------|------|------|
| 20.1 | Lark連携削除 | lib/lark・lark-sync・test 削除。本番DBにトリガー/関数無しを確認(no-op)。完全終了 | ✅ |
| 20.2 | status/currentStep統一 | visit-status.ts/core/types・updateVisitProgress を各APIに適用。デプロイ済 | ✅ |
| 20.3 | レポートURL統一 | `reportUuid→/report/{visitId}` 移行。旧 report/create・staff/report 削除。デプロイ済 | ✅ |
| 20.4 | sessionId依存削減 | 保存・取得APIを `visitId` 優先へ移行（5fec5bd） | ✅ |
| 20.5 | レガシーAPI棚卸し | 旧report/staff API・旧lark helper・旧docs を削除/注記。デプロイ済 | ✅ |
| 20.6 | 本番反映チェックリスト | migration/疎通/ロールバック基準を運用可能にする | ✅ |

### 22-demo: デモモード本番UI統一（2026-06-29追加）

**詳細**: [22-デモモード本番UI統一.md](./22-デモモード本番UI統一.md)

| # | タスク | 詳細 | 状態 |
|---|--------|------|------|
| 22.1 | 本番/デモ差分棚卸し | state/API/UI差分を一覧化 | 📋 |
| 22.2 | 共通型切り出し | `src/types/staff-diagnosis.ts` を新設しdemo pageで使用（4d07229） | ✅ |
| 22.3 | Provider分離 | production/demo のデータソース切替 | 📋 |
| 22.4 | UI単一化 | 共有 `StaffDiagnosisBottomNav`/`PhotoModals`/型に統一。本番 `staff/diagnosis/[id]` も共有化しデプロイ済（5fec5bd）。`StaffDiagnosisExperience` 名での完全1コンポ統合は任意で残 | ✅ |
| 22.5 | デモ副作用防止 | デモはDB/Storageへ書き込まない（写真/診断はlocalStorageのみ）。デモLINEは本人宛・DBログ無し。調査で確認済 | ✅ |
| 22.6 | UI同一性テスト | 本番/デモの主要操作差分を検証 | 📋 |
| 22.7 | LINE通知フォーマット統一 | `buildReportFlexMessage()` で本番=デモ同形Flex化。実機着信確認（16bd5e9）。細部微調整は次回 | ✅ |

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
│   ├── send-report/            ✅ レポート送信（保護者宛Flex）
│   ├── send-demo-report/       ✅ デモLINE送信（スタッフ本人宛・本番同形Flex）
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
    ├── line-report-message.ts  ✅ レポート通知Flex生成（本番/デモ共通SSoT）
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
