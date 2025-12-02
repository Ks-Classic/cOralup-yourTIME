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

#### インフラ・基盤
- [x] DB設計・マイグレーション作成 (\`supabase/migrations/20241201000000_init_schema.sql\`)
- [x] Storageバケット設定 (\`supabase/migrations/20241201000001_storage_buckets.sql\`)
- [x] Lark Webhook Trigger (\`supabase/migrations/20241202000001_lark_webhook_trigger.sql\`)

#### Agent 1: 親御さんフロー ✅
- [x] セッション開始画面 (\`src/app/(exhibition)/(parent)/parent/page.tsx\`)
- [x] 問診フォーム (\`src/app/(exhibition)/(parent)/parent/questionnaire/[id]/page.tsx\`)
- [x] QR表示画面 (\`src/app/(exhibition)/(parent)/parent/result/[id]/page.tsx\`)
- [x] localStorage連携 (\`src/hooks/useQuestionnaireStorage.ts\`)

#### Agent 2: スタッフ認証・セッション引継ぎ ✅
- [x] PIN認証API (\`src/app/api/staff/auth/route.ts\`)
- [x] セッション引継ぎAPI (\`src/app/api/staff/session/route.ts\`)
- [x] 認証Hook (\`src/hooks/useStaffAuth.ts\`) - localStorage 12時間有効
- [x] QRスキャナー (\`src/components/staff/QRScanner.tsx\`) - html5-qrcode
- [x] 手動検索 (\`src/components/staff/ManualVisitSearch.tsx\`)
- [x] PIN入力UI (\`src/app/(exhibition)/staff/login/page.tsx\`)
- [x] 診断ページ (\`src/app/(exhibition)/staff/diagnosis/page.tsx\`)

#### Agent 3: 診断機能 ✅
- [x] 診断データ自動保存 (\`src/hooks/useDiagnosisStorage.ts\`)
- [x] 統合診断ページ (\`src/app/staff/diagnosis/[id]/page.tsx\`)

#### Agent 4: AI分析 ✅
- [x] Geminiクライアント (\`src/lib/gemini.ts\`) - gemini-2.5-pro対応
- [x] 口腔診断プロンプト (\`src/agents/oral-diagnosis/prompt.md\`)
- [x] 出力スキーマ (\`src/agents/oral-diagnosis/schema.ts\`)
- [x] 分析API (\`src/app/api/analysis/route.ts\`)
- [x] 分析結果編集UI (\`src/app/(exhibition)/staff/analysis/[id]/page.tsx\`)

#### Agent 5: Lark連携 ✅
- [x] Lark APIクライアント (\`src/lib/lark.ts\`)
- [x] Larkテスト (\`src/lib/__tests__/lark.test.ts\`)
- [x] Edge Function (\`supabase/functions/lark-sync/index.ts\`)
- [x] テーブル設計ドキュメント (\`docs/designe/23-Lark-Base-テーブル設計.md\`)

#### LINE連携
- [x] LINE Login（親御さん認証）- モック実装
- [x] LINE Webhook（友だち追加時の自動登録）- モック実装
- [x] LINE Push Message（シンプルテキスト）
- [x] LINE Flex Message（スタッフ情報付きリッチカード）

#### レポート機能
- [x] レポートWebページ (\`src/app/staff/report/[id]/page.tsx\`)

### 進行中 🔄
- [ ] 写真アップロードAPI連携（Storage統合）

### 未着手 📝
- [ ] 管理画面UI（Phase 2）
- [ ] PDF生成（オプション）
- [ ] データ分析BI（Phase 2）

---

## �� タスクフォルダ構造

### 01-基盤構築 (Infra & Auth) ✅
| タスク | ファイル | ステータス |
|--------|----------|------------|
| Supabase初期設定 | [story-supabaseプロジェクト初期設定.md](01-infra-setup/story-supabaseプロジェクト初期設定.md) | ✅ |
| セッション管理 | [story-セッション管理システム.md](01-infra-setup/story-セッション管理システム.md) | ✅ |
| DBマイグレーション | [01-04-DBマイグレーション実行.md](01-基盤構築/01-04-DBマイグレーション実行.md) | ✅ |

### 02-フォームビルダー ✅
| タスク | ファイル | ステータス |
|--------|----------|------------|
| 動的フォームビルダー | [story-動的フォームビルダー.md](02-form-builder/story-動的フォームビルダー.md) | ✅ |
| データ同期 | [story-データ同期メカニズム.md](02-form-builder/story-データ同期メカニズム.md) | ✅ |

### 03-親御さん機能 (Agent 1) ✅
| タスク | ファイル | ステータス |
|--------|----------|------------|
| LINE連携 | [story-line連携.md](03-parent-features/story-line連携.md) | ✅ モック |
| セッション開始 | [story-セッション開始フォーム改善.md](03-parent-features/story-セッション開始フォーム改善.md) | ✅ |
| 問診フォーム | [story-問診フォーム動的レンダリング.md](03-parent-features/story-問診フォーム動的レンダリング.md) | ✅ |
| 結果表示QR | [story-結果表示画面実装.md](03-parent-features/story-結果表示画面実装.md) | ✅ |

### 04-スタッフ機能 (Agent 2, 3, 4) ✅
| タスク | ファイル | ステータス |
|--------|----------|------------|
| セッション一覧 | [story-セッション一覧・検索機能.md](04-staff-features/story-セッション一覧・検索機能.md) | ✅ |
| 診断フォーム | [story-診断フォーム入力.md](04-staff-features/story-診断フォーム入力.md) | ✅ |
| AI分析実行 | [story-ai分析実行・結果確認.md](04-staff-features/story-ai分析実行・結果確認.md) | ✅ |
| レポート生成 | [story-レポート生成・送信.md](04-staff-features/story-レポート生成・送信.md) | ✅ |
| リアルタイム通知 | [story-リアルタイム通知システム.md](04-staff-features/story-リアルタイム通知システム.md) | 📝 Phase 2 |

### 05-管理機能 (Phase 2) 📝
| タスク | ファイル | ステータス |
|--------|----------|------------|
| ダッシュボード | [story-ダッシュボード実装.md](05-admin-features/story-ダッシュボード実装.md) | 📝 |
| ユーザー管理 | [story-ユーザー管理画面.md](05-admin-features/story-ユーザー管理画面.md) | 📝 |
| データ分析BI | [story-データ分析・bi機能.md](05-admin-features/story-データ分析・bi機能.md) | 📝 |

### 06-ビジネス連携 📝
| タスク | ファイル | ステータス |
|--------|----------|------------|
| 外部サービス連携 | [epic-外部サービス連携完成.md](06-business/epic-外部サービス連携完成.md) | �� |
| ビジネス関連 | [epic-ビジネス関連タスク.md](06-business/epic-ビジネス関連タスク.md) | 📝 |

### 07-UI/UXデザイン
| タスク | ファイル | ステータス |
|--------|----------|------------|
| デモ特化UI | [07-00-デモ特化-完全実操作可能なUI実装.md](07-ui-design/07-00-デモ特化-完全実操作可能なUI実装.md) | ✅ |
| 統合診断ページ | [07-07-統合診断ページ実装-todo.md](07-ui-design/07-07-統合診断ページ実装-todo.md) | ✅ |

---

## 🆕 実装済みファイル一覧

### ページ (src/app)
\`\`\`
# 親御さんフロー (exhibition)
src/app/(exhibition)/(parent)/parent/page.tsx                    # セッション開始
src/app/(exhibition)/(parent)/parent/questionnaire/[id]/page.tsx # 問診フォーム
src/app/(exhibition)/(parent)/parent/result/[id]/page.tsx        # QR表示

# スタッフフロー (exhibition)
src/app/(exhibition)/staff/login/page.tsx                        # PIN認証
src/app/(exhibition)/staff/diagnosis/page.tsx                    # QRスキャン
src/app/(exhibition)/staff/analysis/[id]/page.tsx                # AI分析結果

# スタッフフロー (通常)
src/app/staff/page.tsx                                           # スタッフトップ
src/app/staff/diagnosis/[id]/page.tsx                            # 診断入力
src/app/staff/analysis/[id]/page.tsx                             # 分析詳細
src/app/staff/report/[id]/page.tsx                               # レポート
src/app/staff/review/[id]/page.tsx                               # レビュー
src/app/staff/session/[id]/page.tsx                              # セッション詳細
\`\`\`

### API (src/app/api)
\`\`\`
src/app/api/staff/auth/route.ts                                  # PIN認証
src/app/api/staff/session/route.ts                               # セッション引継ぎ
src/app/api/analysis/route.ts                                    # AI分析
\`\`\`

### Hooks (src/hooks)
\`\`\`
src/hooks/useQuestionnaireStorage.ts                             # 問診localStorage
src/hooks/useDiagnosisStorage.ts                                 # 診断localStorage
src/hooks/useDiagnosisData.ts                                    # 診断データ取得
src/hooks/useStaffAuth.ts                                        # スタッフ認証
src/hooks/useFormSchema.ts                                       # フォームスキーマ
\`\`\`

### ライブラリ (src/lib)
\`\`\`
src/lib/supabase.ts                                              # Supabaseクライアント
src/lib/gemini.ts                                                # Gemini APIクライアント
src/lib/lark.ts                                                  # Lark APIクライアント
src/lib/__tests__/lark.test.ts                                   # Larkテスト
\`\`\`

### コンポーネント (src/components)
\`\`\`
src/components/staff/QRScanner.tsx                               # QRスキャナー
src/components/staff/ManualVisitSearch.tsx                       # 手動検索
\`\`\`

### AI エージェント (src/agents)
\`\`\`
src/agents/oral-diagnosis/prompt.md                              # 診断プロンプト
src/agents/oral-diagnosis/schema.ts                              # 出力スキーマ
\`\`\`

### Supabase
\`\`\`
supabase/migrations/20241201000000_init_schema.sql               # 初期スキーマ
supabase/migrations/20241201000001_storage_buckets.sql           # Storage設定
supabase/migrations/20241202000001_lark_webhook_trigger.sql      # Lark Webhook
supabase/functions/lark-sync/index.ts                            # Lark Edge Function
\`\`\`

---

## 運用ルール

1. タスクの進捗は各mdファイル内のチェックボックスで管理
2. 新しいタスクが発生したら、適切なフォルダに連番ファイルを作成
3. 完了したタスクファイルはそのまま残し、チェックを入れる
4. **並列実装時は担当エージェントを明記**
5. **実装完了時はこのREADMEのステータスを更新**
