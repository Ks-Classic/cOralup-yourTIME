# Coralup TODO プロジェクト管理

## 🚀 並列実装計画

### エージェント向け指示書
- **[00-エージェント簡易指示.md](00-エージェント簡易指示.md)** - 各エージェントが最初に読む簡潔な指示
- **[00-エージェント指示書.md](00-エージェント指示書.md)** - 詳細な実装指示（ファイル単位）
- **[00-並列実装計画.md](00-並列実装計画.md)** - 全体計画・タイムライン

各エージェントは **00-エージェント簡易指示.md** から開始してください。

---

## 📚 設計ドキュメント一覧

### コア設計
| ファイル | 内容 |
|---------|------|
| [00-企画書_ビジョン.md](../designe/00-企画書_ビジョン.md) | 企画書・ビジョン |
| [01-要件定義書.md](../designe/01-要件定義書.md) | 要件定義書 (12/21 MVP) |
| [02-技術仕様書.md](../designe/02-技術仕様書.md) | 技術仕様書 |
| [03-ユーザーフロー詳細.md](../designe/03-ユーザーフロー詳細.md) | ユーザーフロー詳細 |
| [04-データフロー設計.md](../designe/04-データフロー設計.md) | データフロー設計 |
| [05-ワークフロー設計.md](../designe/05-ワークフロー設計.md) | ワークフロー設計 |
| [06-DB設計書.md](../designe/06-DB設計書.md) | DB設計書 |
| [07-実装ロードマップ.md](../designe/07-実装ロードマップ.md) | 実装ロードマップ |

### 詳細仕様
| ファイル | 内容 |
|---------|------|
| [18-環境変数・設定仕様書.md](../designe/18-環境変数・設定仕様書.md) | 環境変数一覧、.env.example |
| [19-エラーハンドリング方針.md](../designe/19-エラーハンドリング方針.md) | API/ネットワーク/バリデーションエラー |
| [20-スタッフ認証仕様書.md](../designe/20-スタッフ認証仕様書.md) | PIN認証詳細、セッション管理 |
| [21-QRコード仕様書.md](../designe/21-QRコード仕様書.md) | QRデータ形式、生成/スキャンライブラリ |
| [22-画像アップロード仕様書.md](../designe/22-画像アップロード仕様書.md) | Storageバケット設計、ファイル命名規則 |
| [23-Lark-Base-テーブル設計.md](../designe/23-Lark-Base-テーブル設計.md) | Lark Base連携テーブル設計 |

### リファレンス
| ファイル | 内容 |
|---------|------|
| [13-問診項目リファレンス.md](../designe/13-問診項目リファレンス.md) | 問診項目一覧 |
| [14-診断項目リファレンス.md](../designe/14-診断項目リファレンス.md) | 診断項目一覧 |
| [16-診断画面UI最適化ガイド.md](../designe/16-診断画面UI最適化ガイド.md) | 診断画面UI設計 |

---

## ✅ 実装ステータス (2024/12/02 更新)

### 完了 ✅
- [x] DB設計・マイグレーション作成 (`supabase/migrations/`)
- [x] Storageバケット設定 (`20241201000001_storage_buckets.sql`)
- [x] LINE Login（親御さん認証）
- [x] LINE Webhook（友だち追加時の自動登録）
- [x] LINE Push Message（シンプルテキスト）
- [x] LINE Flex Message（スタッフ情報付きリッチカード）
- [x] レポートWebページ（`/report/[id]`）
- [x] **親御さんフロー** ✅ Agent 1
  - セッション開始画面、問診フォーム、QR表示
  - localStorage連携（useQuestionnaireStorage.ts）
- [x] **Lark Base連携** (`src/lib/lark.ts`, Edge Function) ✅ Agent 5
- [x] **診断データ自動保存** (`useDiagnosisStorage.ts`) ✅ Agent 3
- [x] **統合診断ページUI** (`/staff/diagnosis/[id]`) ✅ Agent 3

### Agent 4 完了 ✅
- [x] Geminiクライアント実装 (`src/lib/gemini.ts`) - gemini-2.5-pro対応
- [x] 口腔診断プロンプト・スキーマ (`src/agents/oral-diagnosis/`)
- [x] 分析API (`src/app/api/analysis/route.ts`) - POST/GET/PATCH
- [x] 分析結果編集UI (`src/app/(exhibition)/staff/analysis/[id]/page.tsx`)

### Agent 2 完了 ✅
- [x] スタッフPIN認証 (`src/app/api/staff/auth/route.ts`, `src/hooks/useStaffAuth.ts`)
- [x] PIN認証UI (`src/app/(exhibition)/staff/login/page.tsx`)
- [x] QRスキャナー (`src/components/staff/QRScanner.tsx`)
- [x] 手動検索 (`src/components/staff/ManualVisitSearch.tsx`)
- [x] セッション引継ぎAPI (`src/app/api/staff/session/route.ts`)

### 進行中 🔄
- [ ] 写真アップロードAPI連携（Agent 3）

### 未着手 📝
- [ ] 管理画面UI（Phase 2）
- [ ] PDF生成（オプション）
- [ ] データ分析BI（Phase 2）

---

## 📁 タスクフォルダ構造

### 01-基盤構築 (Infra & Auth)
*   [01-01-Supabase初期設定](01-infra-setup/story-supabaseプロジェクト初期設定.md) ✅
*   [01-02-セッション管理](01-infra-setup/story-セッション管理システム.md) ✅
*   [01-04-DBマイグレーション実行](01-基盤構築/01-04-DBマイグレーション実行.md) ✅

### 02-親御さん機能 (Parent Features) → Agent 1 ✅ 完了
*   [LINE連携](03-parent-features/story-line連携.md) ✅ モック実装済み
*   [セッション開始フォーム](03-parent-features/story-セッション開始フォーム改善.md) ✅ 完了
*   [問診フォーム](03-parent-features/story-問診フォーム動的レンダリング.md) ✅ 完了
*   [結果表示QR](03-parent-features/story-結果表示画面実装.md) ✅ 完了

### 03-スタッフ機能 (Staff Features) → Agent 2, 3, 4
*   [セッション一覧](04-staff-features/story-セッション一覧・検索機能.md) ✅
*   [診断フォーム入力](04-staff-features/story-診断フォーム入力.md) ✅
*   [AI分析実行](04-staff-features/story-ai分析実行・結果確認.md) ✅ Agent 4完了
*   [レポート生成・送信](04-staff-features/story-レポート生成・送信.md) ✅

### 04-AI分析レポート (Analysis & Report) → Agent 4, 5
*   [データ分析BI](05-admin-features/story-データ分析・bi機能.md) 📝
*   Lark連携 ✅ (実装完了: `src/lib/lark.ts`, `supabase/functions/lark-sync/`)

### 05-管理機能 (Admin Features) → Phase 2
*   [ダッシュボード](05-admin-features/story-ダッシュボード実装.md) 📝
*   [ユーザー管理](05-admin-features/story-ユーザー管理画面.md) 📝

---

## 🆕 新規実装ファイル一覧

### Agent 1: 親御さんフロー (完了)
```
src/hooks/useQuestionnaireStorage.ts         # localStorage連携フック
src/components/parent/QRDisplay.tsx          # QRコード表示コンポーネント
src/app/(exhibition)/(parent)/parent/page.tsx                    # セッション開始画面
src/app/(exhibition)/(parent)/parent/questionnaire/[id]/page.tsx # 問診フォーム
src/app/(exhibition)/(parent)/parent/result/[id]/page.tsx        # QR表示画面
```

### Agent 4: AI分析 (完了)
```
src/lib/gemini.ts                            # Gemini APIクライアント
src/agents/oral-diagnosis/prompt.md          # 口腔診断プロンプト
src/agents/oral-diagnosis/schema.ts          # 出力スキーマ
src/app/api/analysis/route.ts                # 分析API
src/app/(exhibition)/staff/analysis/[id]/page.tsx  # 分析結果編集UI
```

### Agent 5: Lark連携 (完了)
```
src/lib/lark.ts                              # Lark APIクライアント
src/lib/__tests__/lark.test.ts               # テスト
supabase/functions/lark-sync/index.ts        # Edge Function
supabase/migrations/20241202000001_lark_webhook_trigger.sql
docs/designe/23-Lark-Base-テーブル設計.md    # ドキュメント
```

### Agent 2: スタッフ認証・セッション引継ぎ (完了)
```
src/app/api/staff/auth/route.ts              # PIN認証API
src/app/api/staff/session/route.ts           # セッション引継ぎAPI
src/hooks/useStaffAuth.ts                    # 認証Hook (localStorage 12時間有効)
src/components/staff/QRScanner.tsx           # html5-qrcodeでQRスキャン
src/components/staff/ManualVisitSearch.tsx   # 受付番号で手動検索
src/app/(exhibition)/staff/login/page.tsx    # PIN入力UI
src/app/(exhibition)/staff/diagnosis/page.tsx # QRスキャナー統合版
```

### Agent 3: 診断機能 (進行中)
```
src/hooks/useDiagnosisStorage.ts             # 自動保存フック
src/app/staff/diagnosis/[id]/page.tsx        # 統合診断ページ (更新)
```

---

## 運用ルール

1. タスクの進捗は各mdファイル内のチェックボックスで管理
2. 新しいタスクが発生したら、適切なフォルダに連番ファイルを作成
3. 完了したタスクファイルはそのまま残し、チェックを入れる
4. **並列実装時は担当エージェントを明記**
5. **実装完了時はこのREADMEのステータスを更新**
