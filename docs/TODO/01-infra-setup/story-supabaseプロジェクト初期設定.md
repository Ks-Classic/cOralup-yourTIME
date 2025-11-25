# Story: Supabaseプロジェクト初期設定 (KS-153)

## 概要
Coralupシステムで利用するSupabaseプロジェクトを新規に立ち上げ、環境変数や接続設定を整備する。

## 含まれるタスク
- [x] KS-154: Supabaseプロジェクト作成・初期設定
  - [ ] Supabaseアカウント作成/ログイン
  - [ ] 新規プロジェクト作成（プロジェクト名、パスワード、リージョン）
  - [ ] 初期テーブル（sessions/questionnaires/diagnoses など）用SQLの実行
  - [ ] プロジェクトURL・anonキー・serviceキーの取得と安全な保管

## 成功基準
- [ ] Supabaseコンソール上でプロジェクトが作成され、接続情報が整理されている
- [ ] 接続に必要な環境変数が`.env.local`等に設定され、Next.jsから利用可能
- [ ] テーブル／スキーマが初期状態で準備され、他機能が接続テストできる

## 進捗記録
- **2025-10-03**: ストーリーファイル作成完了

## 関連リンク
- [Linear Issue](https://linear.app/ks-classic/issue/KS-153/story-supabaseプロジェクト初期設定)
- [GitHub Branch](https://github.com/yasuhikokohata/cOralup/tree/yasuhikokohata/ks-153-story-supabaseプロジェクト初期設定)

