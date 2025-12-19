# Coralup プロジェクト

口腔育成のための診断・問診システム

## プロジェクト概要

Coralupは、歯科衛生士が行う問診・診断プロセスをデジタル化し、業務効率化と診断の質の標準化を実現するシステムです。

### 目的
- イベントという一過性の機会を、顧客との持続的な信頼関係を築く起点に変える
- 親御さんへの診断結果の自動送信を通じて、イベント後もブランドとの接点を維持
- 将来的な顧客獲得とリピート顧客の創出に繋げる

### 対象ユーザー
- **親御さん**: 問診票の入力と診断結果の受領
- **スタッフ**: 診断業務の実施と管理
- **管理者**: データ分析とシステム管理

### 主要機能
- ✅ 親御さん向け問診票Webアプリ（展示会用LIFFアプリ）
- ✅ スタッフ向け診断管理Webアプリ（QRスキャン・診断入力・履歴管理）
- ✅ LINE連携による自動通知（診断レポート送信）
- ✅ AI分析機能（Google Gemini API）
- ✅ 診断レポート自動生成・PDF出力
- ✅ リアルタイムデータ管理（管理者ダッシュボード）
- ✅ 動的フォームシステム（スキーマエディタ・JSONB管理）
- ✅ 管理者用管理画面（リアルタイム監視・履歴管理・AI設定・テストツール）

## 技術仕様

### 技術スタック
- **Frontend**: Next.js 15 (App Router + Turbopack) + React 19 + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes + Supabase
- **Database**: Supabase (PostgreSQL + JSONB)
- **ORM**: Drizzle ORM (スキーマ定義済み、段階的移行中)
- **Deployment**: Vercel
- **AI**: Google Gemini API
- **UI Components**: Radix UI + Framer Motion 11
- **External Services**: LINE Messaging API (LIFF)

### データ管理
- **データ構造**: PostgreSQL JSONB型による柔軟なスキーマ管理
- **フォーム定義**: 問診票・診断スキーマのリアルタイム編集
- **回答管理**: Supabaseリアルタイム同期

## ディレクトリ構造

```
src/
├─ app/
│  ├─ (exhibition)/        # 展示会用親御さん向けページ
│  │  └─ parent/           # 問診票・結果表示
│  ├─ staff/               # スタッフ向けページ
│  │  ├─ home/             # ホーム画面
│  │  ├─ scan/             # QRコードスキャン
│  │  ├─ diagnosis/        # 診断入力
│  │  ├─ history/          # 診断履歴
│  │  ├─ monitor/          # リアルタイム監視
│  │  ├─ login/            # ログイン
│  │  ├─ logout/           # ログアウト
│  │  └─ liff-login/       # LIFFログイン
│  ├─ admin/               # 管理者向けページ
│  │  ├─ components/       # 管理者UIコンポーネント
│  │  ├─ visits/           # 来訪履歴管理
│  │  ├─ schema-editor/    # スキーマエディタ
│  │  ├─ ai-test/          # AI分析テスト
│  │  └─ dev-tools/        # 開発ツール
│  ├─ report/              # レポート表示
│  │  └─ [id]/             # 個別レポート
│  ├─ api/                 # API エンドポイント
│  │  ├─ admin/            # 管理者API
│  │  ├─ ai/               # AI分析API
│  │  ├─ analysis/         # 分析API
│  │  ├─ auth/             # 認証API
│  │  ├─ diagnoses/        # 診断管理
│  │  ├─ diagnosis/        # 診断詳細
│  │  ├─ diagnosis-schema/ # 診断スキーマ
│  │  ├─ line/             # LINE連携
│  │  ├─ parent/           # 親御さん用API
│  │  ├─ photos/           # 写真アップロード
│  │  ├─ questionnaire/    # 問診票
│  │  ├─ questionnaire-schema/ # 問診票スキーマ
│  │  ├─ report/           # レポート生成
│  │  ├─ sessions/         # セッション管理
│  │  ├─ staff/            # スタッフAPI
│  │  └─ visits/           # 来訪管理
│  ├─ agents/              # AI エージェント
│  └─ demo/                # デモページ
├─ components/             # 再利用コンポーネント
│  ├─ admin/               # 管理者用コンポーネント
│  ├─ staff/               # スタッフ用コンポーネント
│  └─ ui/                  # 基本UIコンポーネント
├─ db/                     # Drizzle ORM
│  ├─ index.ts             # DBクライアント
│  └─ schema/              # スキーマ定義
├─ hooks/                  # カスタムフック
├─ lib/                    # ライブラリ・ユーティリティ
├─ types/                  # TypeScript型定義
├─ data/                   # 静的データ・スキーマ定義
└─ utils/                  # ユーティリティ関数

docs/
├─ designe/                # 設計ドキュメント
├─ TODO/                   # タスク管理ドキュメント
└─ archive/                # アーカイブ
```

## 開発環境

### 必要なツール
- Node.js 18.18+
- npm（または pnpm）
- Supabase CLI
- Vercel CLI

### セットアップ
```bash
# パッケージインストール
pnpm install

# 環境変数設定（.env.local を作成）
# docs/env.example.md を参照

# 開発サーバー起動
pnpm dev

# 複数ポートで起動（スタッフ・親御さん用）
pnpm dev:multi
```

### 主要スクリプト
```bash
pnpm dev          # 開発サーバー起動
pnpm dev:multi    # 複数ポートで起動
pnpm build        # プロダクションビルド
pnpm lint         # ESLint実行
pnpm type-check   # TypeScript型チェック
pnpm test         # テスト実行
```

## デプロイ

### Vercel デプロイ
```bash
# デプロイ
vercel --prod

# 環境変数は Vercel ダッシュボードで設定
```

### 必要な環境変数
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL` (Drizzle ORM用 - Supabase PostgreSQL接続文字列)
- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_CHANNEL_SECRET`
- `NEXT_PUBLIC_LIFF_ID`
- `GEMINI_API_KEY`

詳細は `docs/env.example.md` を参照してください。

## ライセンス

© 2024-2025 Coralup. All rights reserved.
