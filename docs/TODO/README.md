# Coralup TODO プロジェクト管理

## ✅ 実装ステータス (2024/12/02 更新)

### 完了 ✅

#### インフラ・基盤
- [x] DB設計・マイグレーション (`supabase/migrations/20241201000000_init_schema.sql`)
- [x] Storageバケット設定 (`supabase/migrations/20241201000001_storage_buckets.sql`)
- [x] Lark Webhook Trigger (`supabase/migrations/20241202000001_lark_webhook_trigger.sql`)

#### Agent 1: 親御さんフロー ✅
- [x] セッション開始画面 (`src/app/(exhibition)/(parent)/parent/page.tsx`)
- [x] 問診フォーム (`src/app/(exhibition)/(parent)/parent/questionnaire/[id]/page.tsx`)
- [x] QR表示画面 (`src/app/(exhibition)/(parent)/parent/result/[id]/page.tsx`)
- [x] localStorage連携 (`src/hooks/useQuestionnaireStorage.ts`)

#### Agent 2: スタッフ認証 ✅
- [x] PIN認証API (`src/app/api/staff/auth/route.ts`)
- [x] セッション引継ぎAPI (`src/app/api/staff/session/route.ts`)
- [x] 認証Hook (`src/hooks/useStaffAuth.ts`)
- [x] QRスキャナー (`src/components/staff/QRScanner.tsx`)
- [x] 手動検索 (`src/components/staff/ManualVisitSearch.tsx`)
- [x] PIN入力UI (`src/app/(exhibition)/staff/login/page.tsx`)

#### Agent 3: 診断機能 ✅
- [x] 診断データ自動保存 (`src/hooks/useDiagnosisStorage.ts`)
- [x] 統合診断ページ (`src/app/staff/diagnosis/[id]/page.tsx`)

#### Agent 4: AI分析 ✅
- [x] Geminiクライアント (`src/lib/gemini.ts`)
- [x] 口腔診断プロンプト (`src/agents/oral-diagnosis/prompt.md`)
- [x] 出力スキーマ (`src/agents/oral-diagnosis/schema.ts`)
- [x] 分析API (`src/app/api/analysis/route.ts`)
- [x] 分析結果編集UI (`src/app/(exhibition)/staff/analysis/[id]/page.tsx`)

#### Agent 5: Lark連携 ✅
- [x] Lark APIクライアント (`src/lib/lark.ts`)
- [x] Edge Function (`supabase/functions/lark-sync/index.ts`)

#### LINE連携 ✅
- [x] LINE Login - モック実装
- [x] LINE Webhook - モック実装
- [x] LINE Push/Flex Message

### 進行中 🔄
- [ ] 写真アップロードAPI連携

### 未着手 📝 (Phase 2)
- [ ] 管理画面UI
- [ ] PDF生成
- [ ] データ分析BI

---

## 📁 タスクフォルダ構造

### 01-infra (基盤構築) ✅
| タスク | ファイル | ステータス |
|--------|----------|------------|
| Supabase初期設定 | [supabase初期設定.md](01-infra/supabase初期設定.md) | ✅ |
| セッション管理 | [セッション管理.md](01-infra/セッション管理.md) | ✅ |
| DBマイグレーション | [DBマイグレーション.md](01-infra/DBマイグレーション.md) | ✅ |

### 02-parent (親御さん機能) ✅
| タスク | ファイル | ステータス |
|--------|----------|------------|
| LINE連携 | [LINE連携.md](02-parent/LINE連携.md) | ✅ モック |
| セッション開始 | [セッション開始.md](02-parent/セッション開始.md) | ✅ |
| 問診フォーム | [問診フォーム.md](02-parent/問診フォーム.md) | ✅ |
| 結果表示QR | [結果表示QR.md](02-parent/結果表示QR.md) | ✅ |

### 03-staff (スタッフ機能) ✅
| タスク | ファイル | ステータス |
|--------|----------|------------|
| セッション一覧 | [セッション一覧.md](03-staff/セッション一覧.md) | ✅ |
| 診断フォーム | [診断フォーム.md](03-staff/診断フォーム.md) | ✅ |
| AI分析 | [AI分析.md](03-staff/AI分析.md) | ✅ |
| レポート送信 | [レポート送信.md](03-staff/レポート送信.md) | ✅ |

### 04-admin (管理機能) 📝 Phase 2
| タスク | ファイル | ステータス |
|--------|----------|------------|
| ダッシュボード | [ダッシュボード.md](04-admin/ダッシュボード.md) | 📝 |
| ユーザー管理 | [ユーザー管理.md](04-admin/ユーザー管理.md) | 📝 |
| データ分析BI | [データ分析BI.md](04-admin/データ分析BI.md) | 📝 |

---

## 📚 設計ドキュメント

| ファイル | 内容 |
|---------|------|
| [01-要件定義書.md](../designe/01-要件定義書.md) | 要件定義書 (12/21 MVP) |
| [02-技術仕様書.md](../designe/02-技術仕様書.md) | 技術仕様書 |
| [06-DB設計書.md](../designe/06-DB設計書.md) | DB設計書 |
| [20-スタッフ認証仕様書.md](../designe/20-スタッフ認証仕様書.md) | PIN認証仕様 |
| [21-QRコード仕様書.md](../designe/21-QRコード仕様書.md) | QRコード仕様 |
| [23-Lark-Base-テーブル設計.md](../designe/23-Lark-Base-テーブル設計.md) | Lark連携 |

---

## 運用ルール

1. タスクの進捗は各mdファイル内のチェックボックスで管理
2. 完了したタスクはこのREADMEのステータスを更新
3. 新規タスクは適切なフォルダに追加
