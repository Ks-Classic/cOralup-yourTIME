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
- ✅ 親御さん向け問診票Webアプリ
- ✅ スタッフ向け診断管理Webアプリ
- ✅ LINE連携による自動通知
- ✅ AI姿勢・口腔分析機能
- ✅ 診断レポート自動生成
- ✅ リアルタイムデータ管理
- ✅ 管理者用管理画面（ダッシュボード・ユーザー管理・データ分析）
- ✅ 動的フォームシステム（イベント別カスタムフォーム・JSONBデータ管理）
- 🔄 Lark Base連携データ分析（今後実装）

## 技術仕様

### 技術スタック
- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes + Supabase
- **Database**: Supabase (PostgreSQL + JSONB)
- **Deployment**: Vercel
- **AI**: Google Gemini API
- **External Services**: LINE Messaging API, Lark Base API

### 動的フォームシステム
- **データ構造**: PostgreSQL JSONB型による柔軟なスキーマ管理
- **フォーム定義**: イベント別・タイプ別カスタムフォーム
- **回答管理**: リアルタイムデータ保存・集計・分析
- **キャッシュ**: Redisベースのレスポンスキャッシュ
- **同期**: Supabaseリアルタイム + Lark Baseデータ連携

### プロジェクト管理
- **進捗管理**: Linearによるタスク・プロジェクト管理
- **ドキュメント**: 詳細な要件定義・技術仕様・設計書完備
- **進捗率**: 70%完了（35/50タスク完了）
- **カテゴリ別管理**: Frontend/Backend/Database/AI/Admin/Integration/Testing/Documentation

#### 📊 現在の進捗状況
| カテゴリ | 進捗率 | ステータス |
|---------|--------|------------|
| Backend API | 100% | ✅ 完了 |
| Documentation | 90% | 🟢 ほぼ完了 |
| Database | 90% | 🟢 ほぼ完了 |
| Admin Panel | 85% | 🟢 ほぼ完了 |
| AI Integration | 85% | 🟢 ほぼ完了 |
| Frontend | 40% | 🟡 進行中 |
| External Integrations | 50% | 🟡 部分完了 |
| Testing & Deployment | 0% | 🔴 未着手 |

### システム構成
- 親御さん向け問診票Webアプリ
- スタッフ向け診断管理Webアプリ
- AI診断・レポート生成機能
- LINE連携による自動通知
- Lark Base連携によるデータ分析

## ディレクトリ構造

```
src/
├─ app/
│  ├─ (parent)/          # 親御さん向けページ
│  │  ├─ questionnaire/  # 問診票入力
│  │  └─ result/         # QRコード表示
│  ├─ (staff)/           # スタッフ向けページ
│  │  ├─ session/       # セッション詳細
│  │  ├─ diagnosis/      # 診断実施
│  │  ├─ analysis/       # AI分析・レポート
│  │  └─ report/         # レポート確認
│  ├─ (admin)/           # 管理者向けページ
│  │  ├─ users/         # ユーザー管理
│  │  ├─ diagnosis/      # 診断データ管理
│  │  ├─ forms/         # フォーム管理
│  │  ├─ events/        # イベント管理
│  │  └─ bi/            # BI分析
│  ├─ api/               # API エンドポイント
│  │  ├─ sessions/      # セッション管理
│  │  ├─ questionnaires/ # 問診票管理
│  │  ├─ diagnoses/      # 診断管理
│  │  ├─ ai/            # AI分析API
│  │  └─ line/          # LINE連携
│  ├─ agents/            # AI エージェント
│  └─ lib/              # 共通ユーティリティ
├─ components/          # 再利用コンポーネント
│  └─ ui/              # 基本UIコンポーネント
├─ hooks/              # カスタムフック
├─ types/               # TypeScript型定義
├─ utils/              # ユーティリティ関数
└─ docs/               # ドキュメント
    ├─ requirements.md     # 要件定義
    ├─ technical-spec.md   # 技術仕様
    ├─ user-flow-detailed.md # 詳細フローチャート
    ├─ admin-requirements.md # 管理者機能要件
    └─ admin-ui-wireframes.md # 管理者UIワイヤーフレーム
```

## 開発環境

### 必要なツール
- Node.js 18+
- npm/yarn/pnpm
- Supabase CLI
- Vercel CLI

### セットアップ
```bash
# パッケージインストール
npm install

# 環境変数設定（.env.local を作成）
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token_here
LINE_CHANNEL_SECRET=your_line_channel_secret_here
GEMINI_API_KEY=your_gemini_api_key_here

# データベースセットアップ
npx supabase start

# 開発サーバー起動
npm run dev
```

### プロジェクト構造
```
src/
├─ app/                    # Next.js App Router
│  ├─ (parent)/           # 親御さん向けページ
│  │  ├─ page.tsx        # 問診票入力
│  │  └─ result/page.tsx # 結果確認
│  ├─ (staff)/            # スタッフ向けページ
│  │  ├─ page.tsx        # 診断管理
│  │  └─ session/[id]/page.tsx # 個別セッション
│  ├─ api/                # API エンドポイント
│  │  ├─ sessions/route.ts
│  │  ├─ questionnaires/route.ts
│  │  ├─ diagnoses/route.ts
│  │  └─ ai/*/route.ts
│  ├─ agents/             # AI エージェント
│  │  ├─ index.ts
│  │  ├─ posture-analyzer/
│  │  └─ oral-analyzer/
│  └─ lib/                # 共通ユーティリティ
├─ components/            # 再利用コンポーネント
├─ hooks/                # カスタムフック
├─ types/                # TypeScript型定義
└─ utils/                # ユーティリティ関数
```

## デプロイ

### Vercel デプロイ
```bash
# デプロイ
vercel --prod

# 環境変数設定
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
vercel env add LINE_CHANNEL_ACCESS_TOKEN
vercel env add GEMINI_API_KEY
```

## ライセンス

© 2024 Coralup. All rights reserved.
