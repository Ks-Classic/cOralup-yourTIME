# Staff配下404エラー対応 SOW (Statement of Work)

## 問題の概要

`http://localhost:3000/staff` 配下のすべてのページが404エラーを返している。

## 現状調査結果

### 1. ディレクトリ構造の確認

**存在するファイル:**
- ✅ `src/app/(staff)/layout.tsx` - スタッフ用レイアウト
- ✅ `src/app/(staff)/staff/page.tsx` - `/staff` ページ
- ✅ `src/app/(staff)/session/[id]/page.tsx` - `/staff/session/[id]` ページ
- ✅ `src/app/(staff)/session/demo/page.tsx` - `/staff/session/demo` ページ
- ✅ `src/app/(staff)/diagnosis/[id]/page.tsx` - `/staff/diagnosis/[id]` ページ
- ✅ `src/app/(staff)/diagnosis/demo/page.tsx` - `/staff/diagnosis/demo` ページ
- ✅ `src/app/(staff)/analysis/[id]/page.tsx` - `/staff/analysis/[id]` ページ
- ✅ `src/app/(staff)/analysis/demo/page.tsx` - `/staff/analysis/demo` ページ
- ✅ `src/app/(staff)/report/[id]/page.tsx` - `/staff/report/[id]` ページ
- ✅ `src/app/(staff)/report/demo/page.tsx` - `/staff/report/demo` ページ
- ✅ `src/app/(staff)/review/[id]/page.tsx` - `/staff/review/[id]` ページ
- ✅ `src/app/(staff)/review/demo/page.tsx` - `/staff/review/demo` ページ

**不足しているファイル:**
- ❌ `src/app/(staff)/session/page.tsx` - `/staff/session` インデックスページ
- ❌ `src/app/(staff)/diagnosis/page.tsx` - `/staff/diagnosis` インデックスページ
- ❌ `src/app/(staff)/analysis/page.tsx` - `/staff/analysis` インデックスページ
- ❌ `src/app/(staff)/report/page.tsx` - `/staff/report` インデックスページ
- ❌ `src/app/(staff)/review/page.tsx` - `/staff/review` インデックスページ（ナビゲーションにはないが、一貫性のため）

### 2. ナビゲーション設定の確認

`src/app/(staff)/layout.tsx` のナビゲーション設定:
```typescript
const navigation = [
  { href: '/staff', label: 'ダッシュボード', ... },
  { href: '/staff/session', label: 'セッション一覧', ... },
  { href: '/staff/diagnosis', label: '診断入力', ... },
  { href: '/staff/analysis', label: 'AI分析', ... },
  { href: '/staff/report', label: 'レポート送信', ... },
  { href: '/staff/settings', label: '設定', ... }
]
```

### 3. 問題の原因

Next.js App Routerでは、`/staff/session` のようなルートにアクセスするには、`src/app/(staff)/session/page.tsx` ファイルが必要です。
現在は `[id]` と `demo` のサブページのみが存在し、インデックスページが存在しないため、404エラーが発生しています。

## 対応方針

### オプション1: リダイレクトページを作成（推奨）

各セクションのインデックスページをリダイレクトページとして作成し、適切なページにリダイレクトする。

**メリット:**
- 実装が簡単
- 既存のページ構造を維持できる
- `/parent/questionnaire/page.tsx` と同じパターンで一貫性がある

**実装例:**
- `/staff/session` → `/staff` にリダイレクト（セッション一覧はダッシュボードに表示）
- `/staff/diagnosis` → `/staff/diagnosis/demo` にリダイレクト（または適切なページ）
- `/staff/analysis` → `/staff/analysis/demo` にリダイレクト
- `/staff/report` → `/staff/report/demo` にリダイレクト

### オプション2: 実際のインデックスページを作成

各セクションに実際の機能を持つインデックスページを作成する。

**メリット:**
- より直感的なナビゲーション
- 各セクションの一覧ページとして機能

**デメリット:**
- 実装コストが高い
- `/staff` ページと機能が重複する可能性

## 推奨対応

**オプション1（リダイレクト）を推奨します。**

理由:
1. `/staff` ページに既にセッション一覧が表示されている
2. 実装が簡単で、既存のパターンと一貫性がある
3. ユーザー体験への影響が最小限

## 実装タスク（修正版）

1. ✅ 現状調査完了
2. ✅ `src/app/(staff)/session/page.tsx` を作成（リダイレクト: `/staff`）
3. ⚠️ `src/app/(staff)/diagnosis/page.tsx` を修正（**リダイレクトではなく、実際の統合診断ページとして実装**）
4. ✅ `src/app/(staff)/analysis/page.tsx` を作成（リダイレクト: `/staff/diagnosis/demo#step=analysis`）
5. ✅ `src/app/(staff)/report/page.tsx` を作成（リダイレクト: `/staff/diagnosis/demo#step=report`）
6. ✅ `src/app/(staff)/review/page.tsx` を作成（リダイレクト: `/staff/diagnosis/demo#step=review`）
7. ⏳ `/staff/diagnosis/page.tsx` を統合診断ページとして実装（QR読み取り・セッションID入力ステップ）
8. ⏳ ビルドキャッシュクリア（`.next` ディレクトリ削除）
9. ⏳ 動作確認

## 設計ドキュメントとの整合性確認

### 設計ドキュメントの要件

**`16-field-optimized-diagnosis-page-design.md` および `04-mockup-guide.md` によると:**

1. **`/staff/session`** - ❌ **削除された**（343行目: 「セッション一覧ページ（`/staff/session`）は削除されました」）
2. **`/staff/diagnosis`** - ✅ **実際に存在すべきページ**（統合診断ページのエントリーポイント、セッションID未確定時）
3. **`/staff/analysis`** - ❌ **統合診断ページに統合された**（`#step=analysis`）
4. **`/staff/report`** - ❌ **統合診断ページに統合された**（`#step=report`）
5. **`/staff/review`** - ❌ **統合診断ページに統合された**（`#step=review`）

### 正しいリダイレクト先の決定

設計ドキュメントに基づく正しい対応：

- `/staff/session` → `/staff` にリダイレクト（削除されたため、ダッシュボードへ）
- `/staff/diagnosis` → **実際のページとして存在すべき**（統合診断ページのエントリーポイント、QR読み取り・セッションID入力）
- `/staff/analysis` → `/staff/diagnosis/demo#step=analysis` にリダイレクト（統合されたため）
- `/staff/report` → `/staff/diagnosis/demo#step=report` にリダイレクト（統合されたため）
- `/staff/review` → `/staff/diagnosis/demo#step=review` にリダイレクト（統合されたため）

### ⚠️ 重要な修正点

**`/staff/diagnosis` はリダイレクトではなく、実際の統合診断ページとして実装する必要があります。**

設計ドキュメントによると：
- セッションID未確定時: `/staff/diagnosis` でQR読み取り・セッションID入力ステップを表示
- セッションID確定後: `/staff/diagnosis/[id]` に遷移して全フローを完結

## 根本的な解決策（最終版）

### 問題の本質

404エラーの原因は、**ナビゲーションに存在するが、実際のページが存在しない**ことです。

### 解決策

**リダイレクトではなく、ナビゲーションから不要な項目を削除する**ことが根本的な解決策です。

1. ✅ ナビゲーションから不要な項目を削除
   - `/staff/session` - 削除（設計ドキュメントによると削除された）
   - `/staff/analysis` - 削除（統合診断ページに統合された）
   - `/staff/report` - 削除（統合診断ページに統合された）
   - `/staff/review` - 削除（統合診断ページに統合された）

2. ✅ ヘッダーのボタンを修正
   - `/staff/session/new` → `/staff/diagnosis` に変更

3. ✅ リダイレクトページを削除
   - 不要なリダイレクトページを削除（ナビゲーションから削除したため、アクセスする導線がない）

### 最終的なナビゲーション構成

```typescript
const navigation = [
  {
    href: '/staff',
    label: 'ダッシュボード',
    icon: '📊',
    description: '本日の状況と重要なアクション'
  },
  {
    href: '/staff/diagnosis',
    label: '診断開始',
    icon: '📝',
    description: 'QR読み取り・診断実施'
  },
  {
    href: '/staff/settings',
    label: '設定',
    icon: '⚙️',
    description: '診断テンプレートや通知の設定'
  }
]
```

### 完了した対応

1. ✅ ナビゲーションから不要な項目を削除
2. ✅ ヘッダーのボタンを修正
3. ✅ リダイレクトページを削除
4. ✅ 古いリンクを修正（`/staff/staff/page.tsx` のクイックアクションとセッション一覧のリンク）

### 残りのタスク

**⚠️ 注意**: 404エラー対応は完了しました。残りのタスク（統合診断ページの実装、コンポーネント分割）は以下のファイルを参照してください：

- **統合診断ページの実装**: `07-07-統合診断ページ実装-todo.md`
- **デモ実装タスク**: `07-00-デモ特化-完全実操作可能なUI実装.md` (Phase 3)

