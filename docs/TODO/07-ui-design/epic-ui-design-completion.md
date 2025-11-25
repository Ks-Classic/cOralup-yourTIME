# Epic: UI設計・モックアップ完成

## 概要
Coralupシステム全体のUI設計とモックアップを完成させ、誰でも実装できるレベルまで詳細化する。

## 目的
- 全画面のUI/UX設計を統一
- モックアップを完成させ、実際のアプリとして動作確認可能にする
- 実装者が迷わないレベルまで詳細化
- 不明点を0.05以下にする

## 対象範囲
- 親御さん向け全画面
- スタッフ向け全画面
- 管理者向け全画面
- 共通コンポーネント
- レスポンシブデザイン
- アクセシビリティ対応

## 関連ドキュメント
- `docs/designe/01-requirements.md` - 要件定義書
- `docs/designe/02-technical-spec.md` - 技術仕様書
- `docs/designe/03-user-flow-detailed.md` - 詳細ユーザーフロー
- `docs/designe/04-mockup-guide.md` - モックアップ確認ガイド
- `docs/designe/05-dynamic-form-design.md` - 動的フォーム設計
- `docs/designe/06-admin-requirements.md` - 管理者要件
- `docs/designe/07-admin-ui-wireframes.md` - 管理者UIワイヤーフレーム

## 含まれるストーリー

### 00. デモ特化 - 完全実操作可能なUI実装（最優先）
- [07-00-デモ特化-完全実操作可能なUI実装](./07-00-デモ特化-完全実操作可能なUI実装.md) ⭐ **デモ用・実操作可能な状態を目指す**

### 01. 親御さん向けUI完成
- [story-親御さんLINE連携画面](./story-親御さんLINE連携画面.md)
- [story-親御さん問診票入力画面](./story-親御さん問診票入力画面.md)
- [story-親御さんQRコード表示画面](./story-親御さんQRコード表示画面.md)
- [story-親御さん結果表示画面](./story-親御さん結果表示画面.md)

### 02. スタッフ向けUI完成
- [story-スタッフセッション一覧画面](./story-スタッフセッション一覧画面.md)
- [story-スタッフセッション詳細画面](./story-スタッフセッション詳細画面.md)
- [story-スタッフ診断入力画面](./story-スタッフ診断入力画面.md)
- [story-スタッフチェック内容確認画面](./story-スタッフチェック内容確認画面.md)
- [story-スタッフAI分析画面](./story-スタッフAI分析画面.md)
- [story-スタッフレポート送信画面](./story-スタッフレポート送信画面.md)

### 03. 管理者向けUI完成
- [story-管理者ダッシュボード画面](./story-管理者ダッシュボード画面.md)
- [story-管理者ユーザー管理画面](./story-管理者ユーザー管理画面.md)
- [story-管理者データ分析画面](./story-管理者データ分析画面.md)
- [story-管理者フォームビルダー画面](./story-管理者フォームビルダー画面.md)
- [story-管理者イベント管理画面](./story-管理者イベント管理画面.md)

### 04. 共通UIコンポーネント
- [story-共通UIコンポーネント実装](./story-共通UIコンポーネント実装.md)
- [story-レスポンシブデザイン対応](./story-レスポンシブデザイン対応.md)
- [story-アクセシビリティ対応](./story-アクセシビリティ対応.md)

## 成功基準
- [ ] 全画面のモックアップが完成している
- [ ] 全画面が実際のアプリとして動作する
- [ ] 各画面の仕様が不明点0.05以下で詳細化されている
- [ ] 実装者が迷わず実装できるレベルまで詳細化されている
- [ ] UI/UXが最高レベルで実装されている
- [ ] レスポンシブデザインが全画面で対応されている
- [ ] アクセシビリティがWCAG 2.1準拠で実装されている

## 進捗記録
- **2025-01-XX**: Epic作成完了
- **2025-01-XX**: 404エラー修正完了（Next.js 14のparams型対応）

## 関連リンク
- [Linear Epic](https://linear.app/ks-classic/epic/UI-design-completion)
- [GitHub Branch](https://github.com/yasuhikokohata/cOralup/tree/epic/ui-design-completion)

