# E2Eテストガイド: agent-browser + ローカルSupabase

**最終更新: 2026-01-12**

---

## 概要

このドキュメントでは、`agent-browser`（AIエージェント向けブラウザ自動化CLI）と**ローカルSupabase**を組み合わせて、本番環境に影響を与えずにE2Eテストを実行する方法を説明します。

---

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────────────┐
│                     ローカル開発環境                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────┐                                             │
│  │ agent-browser  │  CLIでブラウザ操作                          │
│  │ (Rust + Node)  │                                             │
│  └───────┬────────┘                                             │
│          │ http://localhost:3000                                │
│          ↓                                                      │
│  ┌────────────────┐                                             │
│  │   Next.js      │  アプリケーション                           │
│  │   (pnpm dev)   │                                             │
│  └───────┬────────┘                                             │
│          │ http://localhost:54321                               │
│          ↓                                                      │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              ローカルSupabase (Docker)                      │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │ │
│  │  │PostgreSQL│ │  Auth    │ │ Storage  │ │ Studio   │       │ │
│  │  │ :54322   │ │ :54321   │ │ :54321   │ │ :54323   │       │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                                                                 │
│  [本番 Supabase Cloud] ← 完全に分離、テストの影響なし           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## セットアップ

### 1. agent-browser のインストール

```bash
# グローバルインストール
npm install -g agent-browser

# Chromium のダウンロード
agent-browser install

# Linux の場合は依存関係も
agent-browser install --with-deps
```

### 2. ローカルSupabase の起動

```bash
cd /home/ykoha/cOralup

# Supabase CLI がなければインストール
# brew install supabase/tap/supabase  (Mac)
# または npx supabase

# ローカルSupabase起動
supabase start

# 出力例:
# API URL: http://localhost:54321
# DB URL: postgresql://postgres:postgres@localhost:54322
# Studio URL: http://localhost:54323
# Anon key: eyJhbGciOiJIUzI1NiIs...
# Service role key: eyJhbGciOiJIUzI1NiIs...
```

### 3. 環境変数の切り替え

テスト用の環境変数ファイルを作成：

```bash
# .env.test を作成
cp .env.local .env.test
```

`.env.test` を編集：

```bash
# ローカルSupabase用（supabase status で確認）
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
```

### 4. Next.js をローカルDBで起動

```bash
# テスト用環境変数でNext.jsを起動
set -a && source .env.test && set +a && pnpm dev

# または
dotenv -e .env.test pnpm dev
```

---

## テスト実行

### 基本的なagent-browser操作

```bash
# ページを開く
agent-browser open http://localhost:3000/admin

# スナップショット取得（要素一覧）
agent-browser snapshot -i

# 要素をクリック（@e1, @e2 は snapshot の ref）
agent-browser click @e2

# フォーム入力
agent-browser fill @e3 "テスト太郎"

# スクリーンショット
agent-browser screenshot ./screenshots/test.png

# ブラウザを閉じる
agent-browser close
```

### E2Eテストスクリプト例

`scripts/e2e-test.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'
import { execSync } from 'child_process'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ヘルパー関数
const browser = (cmd: string) => {
  console.log(`> agent-browser ${cmd}`)
  return execSync(`agent-browser ${cmd}`, { encoding: 'utf-8' })
}

async function testParentRegistration() {
  console.log('📝 保護者登録テスト開始')
  
  // 1. ブラウザ操作
  browser('open http://localhost:3000/parent/demo')
  browser('snapshot -i')
  browser('fill @e3 "E2Eテスト太郎"')
  browser('fill @e4 "000-0000-1234"')
  browser('click @e10')
  
  // 2. API処理待ち
  await new Promise(r => setTimeout(r, 2000))
  
  // 3. DB検証
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('display_name', 'E2Eテスト太郎')
    .single()
  
  if (error || !data) {
    throw new Error(`❌ プロファイル作成失敗: ${error?.message}`)
  }
  console.log('✅ プロファイル作成確認:', data.id)
  
  return data.id
}

async function cleanup() {
  console.log('🧹 テストデータクリーンアップ')
  await supabase
    .from('profiles')
    .delete()
    .like('display_name', 'E2Eテスト%')
}

async function main() {
  try {
    await cleanup()
    const profileId = await testParentRegistration()
    console.log('\n🎉 全テスト成功!')
  } catch (e) {
    console.error('\n💥 テスト失敗:', e)
    browser('screenshot ./screenshots/error.png')
    process.exit(1)
  } finally {
    await cleanup()
    browser('close')
  }
}

main()
```

実行:

```bash
# テスト用環境変数を読み込んで実行
set -a && source .env.test && set +a && npx tsx scripts/e2e-test.ts
```

---

## ローカルSupabase 操作コマンド

| コマンド | 説明 |
|---------|------|
| `supabase start` | ローカル起動（Dockerコンテナ群） |
| `supabase stop` | 停止（データは保持） |
| `supabase stop --no-backup` | 停止してデータも削除 |
| `supabase db reset` | DB初期化（マイグレーション再適用） |
| `supabase status` | 状態確認（URL・キー表示） |
| `supabase db diff` | 本番とのスキーマ差分を表示 |

### Studio（GUI）へのアクセス

```
http://localhost:54323
```

ここでテーブル内容を直接確認・編集できます。

---

## LIFFのテストについて

### 制約

LIFFはLINE WebView内でしか正常動作しないため、以下は**テスト不可**：

- `liff.init()` - SDK初期化
- `liff.getProfile()` - LINE プロフィール取得
- `liff.sendMessages()` - LINE トーク送信

### 解決策：Demo Mode

`/staff/diagnosis/demo` のように、LIFFを使わないデモページを用意する。

```typescript
// 例: /parent/demo/page.tsx
const mockProfile = {
  userId: 'demo-user-123',
  displayName: 'テスト保護者'
}

// 通常のフローと同じUIを描画（LIFF部分だけモック）
```

**→ フォーム → API → DB のフローは100%テスト可能**

---

## トラブルシューティング

### Docker が起動していない

```bash
docker info
# エラーの場合は Docker Desktop を起動
```

### ポートが使用中

```bash
# 使用中のポートを確認
lsof -i :54321
lsof -i :54322

# Supabase を強制停止
supabase stop --no-backup
```

### マイグレーションエラー

```bash
# マイグレーション状態確認
supabase db reset

# エラーがあれば該当ファイルを確認
ls -la supabase/migrations/
```

---

## cOralup E2Eテスト設計

### テスト対象フロー一覧

cOralupは以下の6フェーズで構成されています。各フェーズでテストが必要です。

```
┌─────────────────────────────────────────────────────────────────┐
│                      cOralup フロー全体図                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Phase 1] 保護者登録                                           │
│      ↓                                                          │
│  [Phase 2] 問診票入力                                           │
│      ↓                                                          │
│  [Phase 3] スタッフQRスキャン                                    │
│      ↓                                                          │
│  [Phase 4] 診断入力 + 写真撮影                                   │
│      ↓                                                          │
│  [Phase 5] AIレポート生成                                        │
│      ↓                                                          │
│  [Phase 6] LINE送信 + 完了確認                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### テストケース一覧

#### Phase 1-2: 保護者フロー

| ID | テストケース | 検証内容 | DB検証 |
|----|------------|---------|--------|
| P-01 | 保護者基本情報登録 | 名前・電話番号入力 → 送信 | `profiles` に登録されたか |
| P-02 | 子供情報登録 | 子供の名前・年齢・性別 | `children` に登録されたか |
| P-03 | 問診票完了 | 全問回答 → 送信 | `questionnaire_responses` 件数確認 |
| P-04 | QRコード生成 | 問診完了後にQR表示 | `visits.status = 'questionnaire_completed'` |

#### Phase 3-4: スタッフフロー

| ID | テストケース | 検証内容 | DB検証 |
|----|------------|---------|--------|
| S-01 | セッション開始 | QRスキャン or ID入力 | `visits.staff_profile_id` 設定 |
| S-02 | 診断項目入力 | 全カテゴリ入力 | `diagnosis_responses` 件数確認 |
| S-03 | 写真撮影（モック） | 3種類の写真登録 | `visit_photos` に3件登録 |
| S-04 | サンプルデータ一括入力 | ボタンクリックで自動入力 | 全項目に値が入る |

#### Phase 5: AI分析

| ID | テストケース | 検証内容 | DB検証 |
|----|------------|---------|--------|
| A-01 | レポート生成 | AI分析実行 → レポート表示 | `reports` に登録 |
| A-02 | レポート編集 | 生成後に手動編集 | `reports` 内容更新 |

#### Phase 6: 完了

| ID | テストケース | 検証内容 | DB検証 |
|----|------------|---------|--------|
| C-01 | LINE送信 | レポート送信ボタン | `line_message_logs` に登録 |
| C-02 | 配信確認 | 「受け取った」確認 | `visits.status = 'diagnosis_completed'` |

#### 管理画面

| ID | テストケース | 検証内容 | DB検証 |
|----|------------|---------|--------|
| M-01 | リアルタイムモニター | 進行中セッション表示 | - |
| M-02 | 来院履歴 | 完了済み一覧表示 | - |
| M-03 | AIプロンプト編集 | プロンプト保存 | `ai_prompts` 更新 |
| M-04 | 診断スキーマ編集 | 項目追加・削除 | `diagnosis_items` 更新 |

---

### テストスクリプト実装

#### 1. 保護者登録テスト (P-01〜P-04)

`scripts/e2e/test-parent-flow.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'
import { execSync } from 'child_process'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const browser = (cmd: string) => {
  console.log(`> npx agent-browser ${cmd}`)
  return execSync(`npx agent-browser ${cmd}`, { 
    encoding: 'utf-8',
    cwd: '/home/ykoha/cOralup'
  })
}

async function cleanup() {
  console.log('🧹 クリーンアップ')
  await supabase.from('profiles').delete().like('display_name', 'E2E_%')
}

async function testP01_BasicInfo() {
  console.log('\n📝 P-01: 保護者基本情報登録')
  
  browser('open http://localhost:3000/parent/demo')
  await new Promise(r => setTimeout(r, 2000))
  browser('snapshot -i')
  
  // フォーム入力（refは実際のスナップショットで確認）
  browser('fill "[data-testid=parent-name]" "E2E_テスト太郎"')
  browser('fill "[data-testid=phone]" "000-0000-1234"')
  browser('click "[data-testid=submit]"')
  
  await new Promise(r => setTimeout(r, 3000))
  
  // DB検証
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('display_name', 'E2E_テスト太郎')
    .single()
  
  if (error || !data) {
    throw new Error(`❌ P-01 失敗: プロファイル未作成`)
  }
  console.log('✅ P-01 成功: profiles.id =', data.id)
  return data.id
}

async function testP03_Questionnaire(profileId: string) {
  console.log('\n📋 P-03: 問診票完了')
  
  browser('open http://localhost:3000/parent/demo/questionnaire')
  await new Promise(r => setTimeout(r, 2000))
  
  // 問診項目に回答（サンプルボタンがあれば使う）
  browser('snapshot -i')
  // ... 回答操作 ...
  
  browser('click "[data-testid=submit-questionnaire]"')
  await new Promise(r => setTimeout(r, 3000))
  
  // DB検証
  const { count } = await supabase
    .from('questionnaire_responses')
    .select('*', { count: 'exact' })
    .eq('profile_id', profileId)
  
  if (!count || count < 3) {
    throw new Error(`❌ P-03 失敗: 問診回答 ${count} 件のみ`)
  }
  console.log(`✅ P-03 成功: ${count} 件の問診回答`)
}

async function main() {
  try {
    await cleanup()
    
    const profileId = await testP01_BasicInfo()
    await testP03_Questionnaire(profileId)
    
    console.log('\n🎉 保護者フローテスト完了!')
  } catch (e) {
    console.error('\n💥 テスト失敗:', e)
    browser('screenshot ./screenshots/error-parent.png')
    process.exit(1)
  } finally {
    await cleanup()
    browser('close')
  }
}

main()
```

#### 2. スタッフ診断テスト (S-01〜S-04)

`scripts/e2e/test-staff-flow.ts`:

```typescript
async function testS02_DiagnosisInput(sessionId: string) {
  console.log('\n🦷 S-02: 診断項目入力')
  
  browser(`open http://localhost:3000/staff/diagnosis/${sessionId}`)
  await new Promise(r => setTimeout(r, 2000))
  
  // サンプルデータボタンをクリック
  browser('snapshot -i')
  browser('click "[data-testid=fill-sample]"')
  
  await new Promise(r => setTimeout(r, 1000))
  
  // 確認画面へ
  browser('click "[data-testid=next-step]"')
  
  // レポート生成
  browser('click "[data-testid=generate-report]"')
  await new Promise(r => setTimeout(r, 5000)) // AI待ち
  
  // DB検証
  const { data } = await supabase
    .from('reports')
    .select('*')
    .eq('session_id', sessionId)
    .single()
  
  if (!data) {
    throw new Error('❌ S-02 失敗: レポート未生成')
  }
  console.log('✅ S-02 成功: reports.id =', data.id)
}
```

#### 3. 管理画面テスト (M-01〜M-04)

`scripts/e2e/test-admin.ts`:

```typescript
async function testM03_PromptEdit() {
  console.log('\n⚙️ M-03: AIプロンプト編集')
  
  browser('open http://localhost:3000/admin/ai-test')
  await new Promise(r => setTimeout(r, 2000))
  browser('snapshot -i')
  
  // プロンプトエディタに入力
  browser('fill "[data-testid=prompt-editor]" "テスト用プロンプト {{診断結果}}"')
  browser('fill "[data-testid=prompt-label]" "E2E_テストプロンプト"')
  browser('click "[data-testid=save-prompt]"')
  
  await new Promise(r => setTimeout(r, 2000))
  
  // DB検証
  const { data } = await supabase
    .from('ai_prompts')
    .select('*')
    .eq('label', 'E2E_テストプロンプト')
    .single()
  
  if (!data) {
    throw new Error('❌ M-03 失敗: プロンプト未保存')
  }
  console.log('✅ M-03 成功: ai_prompts.id =', data.id)
  
  // クリーンアップ
  await supabase.from('ai_prompts').delete().eq('label', 'E2E_テストプロンプト')
}
```

---

### 実行方法

```bash
# 1. ローカルSupabase起動
supabase start

# 2. Next.js をローカルDBで起動
set -a && source .env.test && set +a && pnpm dev

# 3. 別ターミナルでテスト実行
set -a && source .env.test && set +a
npx tsx scripts/e2e/test-parent-flow.ts
npx tsx scripts/e2e/test-staff-flow.ts
npx tsx scripts/e2e/test-admin.ts

# または全テスト一括
npx tsx scripts/e2e/run-all.ts
```

---

### 注意事項

1. **data-testid の追加が必要**
   - テスト対象のUI要素に `data-testid` 属性を追加する必要があります
   - 例: `<Button data-testid="submit">送信</Button>`

2. **Demo Mode の実装**
   - `/parent/demo` ページが必要（LIFFをバイパス）
   - まだない場合は作成が必要

3. **スナップショットで ref を確認**
   - `agent-browser snapshot -i` で要素一覧を取得
   - `@e1`, `@e2` などの ref でも操作可能

---

## 関連ドキュメント

- [agent-browser 公式](https://github.com/vercel-labs/agent-browser)
- [Supabase CLI ドキュメント](https://supabase.com/docs/reference/cli)
