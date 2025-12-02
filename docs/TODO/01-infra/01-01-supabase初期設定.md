# Story: Supabaseプロジェクト初期設定 (KS-153)

## 概要
Coralupシステムで利用するSupabaseプロジェクトを新規に立ち上げ、環境変数や接続設定を整備する。

## 含まれるタスク
- [x] KS-154: Supabaseプロジェクト作成・初期設定
  - [ ] Supabaseアカウント作成/ログイン (https://supabase.com)
  - [ ] 新規プロジェクト作成
    - プロジェクト名: `coralup`
    - Database Password: 強力なパスワードを生成
    - Region: `Northeast Asia (Tokyo)`
    - Pricing Plan: `Free`
  - [ ] 初期テーブル作成（SQL Editorで実行）
    ```sql
    -- sessions, questionnaires, diagnoses, reports, photos テーブル
    -- 詳細なSQLは下記「データベーススキーマ」セクション参照
    ```
  - [ ] プロジェクトURL・anonキーの取得
    - Settings → API から取得
    - `NEXT_PUBLIC_SUPABASE_URL`
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] Vercel環境変数設定
    - Vercel Dashboard → Settings → Environment Variables
    - Production, Preview, Development すべてに設定

## データベーススキーマ

以下のSQLをSupabase SQL Editorで実行してください：

```sql
-- セッションテーブル
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  parent_name TEXT,
  parent_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 問診票テーブル
CREATE TABLE questionnaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT REFERENCES sessions(session_id) ON DELETE CASCADE,
  child_name TEXT NOT NULL,
  child_age INTEGER NOT NULL,
  child_gender TEXT NOT NULL,
  medical_history JSONB DEFAULT '[]',
  concerns JSONB DEFAULT '[]',
  ideal_goals JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 診断テーブル
CREATE TABLE diagnoses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT REFERENCES sessions(session_id) ON DELETE CASCADE,
  posture_analysis JSONB,
  oral_analysis JSONB,
  staff_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- レポートテーブル
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT REFERENCES sessions(session_id) ON DELETE CASCADE,
  pdf_url TEXT,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 写真テーブル
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT REFERENCES sessions(session_id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  url TEXT NOT NULL,
  custom_title TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_sessions_session_id ON sessions(session_id);
CREATE INDEX idx_questionnaires_session_id ON questionnaires(session_id);
CREATE INDEX idx_diagnoses_session_id ON diagnoses(session_id);
CREATE INDEX idx_reports_session_id ON reports(session_id);
CREATE INDEX idx_photos_session_id ON photos(session_id);
```

## 成功基準
- [ ] Supabaseコンソール上でプロジェクトが作成され、接続情報が整理されている
- [ ] 接続に必要な環境変数がVercelに設定され、Next.jsから利用可能
- [ ] テーブル／スキーマが初期状態で準備され、他機能が接続テストできる
- [ ] ビルドエラーが解消され、Vercelデプロイが成功する

## 進捗記録
- **2025-10-03**: ストーリーファイル作成完了

## 関連リンク
- [Linear Issue](https://linear.app/ks-classic/issue/KS-153/story-supabaseプロジェクト初期設定)
- [GitHub Branch](https://github.com/yasuhikokohata/cOralup/tree/yasuhikokohata/ks-153-story-supabaseプロジェクト初期設定)

