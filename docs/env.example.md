# 環境変数設定ガイド

このファイルを参考に `.env.local` を作成してください。

```bash
cp docs/env.example.md .env.local
# 以下の内容をコピーして値を設定
```

---

## 環境変数一覧

```env
# ============================================================================
# cOralup 環境変数設定
# ============================================================================

# ----------------------------------------------------------------------------
# アプリケーション基本設定
# ----------------------------------------------------------------------------
NEXT_PUBLIC_APP_URL=https://coralup.vercel.app
NEXT_PUBLIC_BASE_URL=https://coralup.vercel.app

# ----------------------------------------------------------------------------
# Supabase 設定
# ----------------------------------------------------------------------------
# Supabase プロジェクトURL
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co

# Supabase Anon Key（クライアント用、公開可）
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase Service Role Key（サーバー専用、非公開）
# ⚠️ このキーは絶対にクライアントに露出させないこと
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ----------------------------------------------------------------------------
# LINE 親御さん用 - Messaging API チャネル
# ----------------------------------------------------------------------------
# LINE Developers Console > 親御さん用チャネル > Messaging API設定
LINE_CHANNEL_ID=1234567890
LINE_CHANNEL_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
LINE_CHANNEL_ACCESS_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ----------------------------------------------------------------------------
# LINE 親御さん用 - LINE Login チャネル（LIFF用）
# ----------------------------------------------------------------------------
# LINE Developers Console > 親御さん用プロバイダー > LINE Loginチャネル
LINE_LOGIN_CHANNEL_ID=1234567890
LINE_LOGIN_CHANNEL_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# LIFF ID（LINE Loginチャネル内で作成）
# 形式: 1234567890-xxxxxxxx
NEXT_PUBLIC_PARENT_LIFF_ID=1234567890-xxxxxxxx

# ----------------------------------------------------------------------------
# LINE スタッフ用 - Messaging API チャネル
# ----------------------------------------------------------------------------
# LINE Developers Console > スタッフ用チャネル > Messaging API設定
LINE_STAFF_CHANNEL_ID=1234567890
LINE_STAFF_CHANNEL_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
LINE_STAFF_CHANNEL_ACCESS_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ----------------------------------------------------------------------------
# LINE スタッフ用 - LINE Login チャネル（LIFF用）
# ----------------------------------------------------------------------------
# LINE Developers Console > スタッフ用プロバイダー > LINE Loginチャネル
LINE_STAFF_LOGIN_CHANNEL_ID=1234567890
LINE_STAFF_LOGIN_CHANNEL_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# LIFF ID（LINE Loginチャネル内で作成）
# 形式: 1234567890-xxxxxxxx
NEXT_PUBLIC_STAFF_LIFF_ID=1234567890-xxxxxxxx

# ----------------------------------------------------------------------------
# スタッフ認証設定
# ----------------------------------------------------------------------------
# JWTセッション署名用シークレット（32文字以上推奨）
# 生成コマンド: openssl rand -base64 32
STAFF_SESSION_SECRET=your-super-secret-key-change-in-production

# ----------------------------------------------------------------------------
# 管理画面設定
# ----------------------------------------------------------------------------
# 管理API認証キー（Bearer認証用）
# 生成コマンド: openssl rand -hex 32
ADMIN_API_KEY=your-admin-api-key-change-in-production

# ----------------------------------------------------------------------------
# AI分析設定
# ----------------------------------------------------------------------------
# Google Gemini API Key
# https://makersuite.google.com/app/apikey
GEMINI_API_KEY=AIzaSy...

# ----------------------------------------------------------------------------
# cOralup 固有設定
# ----------------------------------------------------------------------------
# cOralup組織ID（organizations テーブルのUUID）
CORALUP_ORG_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# デフォルトイベントID（events テーブルのUUID）
# YourTIME等のイベントID
DEFAULT_EVENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# ----------------------------------------------------------------------------
# Lark連携設定（オプション）
# ----------------------------------------------------------------------------
# Lark Open Platform > アプリ設定
LARK_APP_ID=cli_xxxxxxxxxxxxxxxx
LARK_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Lark Base（多次元表）設定
LARK_BASE_APP_TOKEN=xxxxxxxxxxxxxxxx
LARK_BASE_TABLE_ID=tblxxxxxxxxxxxxxxxx
```

---

## 環境変数の分類

### 🔴 必須（アプリ動作に必要）

| 変数名 | 用途 | 取得場所 |
|--------|------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase接続 | Supabase Dashboard |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase接続 | Supabase Dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | サーバーAPI用 | Supabase Dashboard |

### 🟡 LINE連携（親御さん用）

| 変数名 | 用途 | 取得場所 |
|--------|------|----------|
| `LINE_CHANNEL_SECRET` | Webhook署名検証 | LINE Developers > Messaging API |
| `LINE_CHANNEL_ACCESS_TOKEN` | メッセージ送信 | LINE Developers > Messaging API |
| `NEXT_PUBLIC_PARENT_LIFF_ID` | LIFF問診画面 | LINE Developers > LINE Login > LIFF |

### 🟡 LINE連携（スタッフ用）

| 変数名 | 用途 | 取得場所 |
|--------|------|----------|
| `LINE_STAFF_CHANNEL_SECRET` | Webhook署名検証 | LINE Developers > Messaging API |
| `LINE_STAFF_CHANNEL_ACCESS_TOKEN` | メッセージ送信 | LINE Developers > Messaging API |
| `NEXT_PUBLIC_STAFF_LIFF_ID` | LIFFログイン | LINE Developers > LINE Login > LIFF |
| `STAFF_SESSION_SECRET` | JWT署名 | 自分で生成 |

### 🟢 オプション

| 変数名 | 用途 | 取得場所 |
|--------|------|----------|
| `GEMINI_API_KEY` | AI分析 | Google AI Studio |
| `ADMIN_API_KEY` | 管理画面認証 | 自分で生成 |
| `CORALUP_ORG_ID` | 組織ID | DBのorganizationsテーブル |
| `DEFAULT_EVENT_ID` | デフォルトイベント | DBのeventsテーブル |
| `LARK_*` | Lark連携 | Lark Open Platform |

---

## LINE Webhook URL設定

LINE Developers Consoleで以下のURLを設定:

| 用途 | Webhook URL |
|------|-------------|
| 親御さん用 | `https://your-domain.vercel.app/api/line/webhook` |
| スタッフ用 | `https://your-domain.vercel.app/api/line/staff-webhook` |

---

## シークレット生成コマンド

```bash
# STAFF_SESSION_SECRET 生成
openssl rand -base64 32

# ADMIN_API_KEY 生成
openssl rand -hex 32
```

---

## Vercel環境変数設定

1. Vercel Dashboard > プロジェクト > Settings > Environment Variables
2. 各変数を追加
3. `NEXT_PUBLIC_*` は全環境、それ以外は `Production` のみにチェック

