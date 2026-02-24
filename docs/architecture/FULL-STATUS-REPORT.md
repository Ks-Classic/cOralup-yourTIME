# cOralup 全体状況レポート & 次期開発計画

**作成日**: 2026-02-16
**対象**: 全体アーキテクチャ、DB状況、マルチイベント対応、テスト環境分離、自動テスト設計

---

## 📊 1. 現在のシステム全体像

### 1.1 アプリケーション構成

```
┌─────────────────────────────────────────────────────────┐
│                    cOralup Platform                      │
│              (Next.js 15 + Supabase + Vercel)            │
├──────────────┬──────────────┬──────────────┬─────────────┤
│  親御さん     │  スタッフ     │  管理者       │  レポート    │
│  LIFF問診     │  診断アプリ   │  ダッシュボード │  公開ページ  │
│  /parent/*    │  /staff/*     │  /admin/*      │  /report/*  │
├──────────────┴──────────────┴──────────────┴─────────────┤
│              Next.js API Routes (/api/*)                  │
│    parent/ | staff/ | admin/ | ai/ | line/ | photos/     │
├──────────────────────────────────────────────────────────┤
│     Supabase (PostgreSQL + Drizzle ORM + Storage)        │
├──────────────────────────────────────────────────────────┤
│     External: LINE Messaging API | LIFF | Google Gemini  │
└──────────────────────────────────────────────────────────┘
```

### 1.2 アプリごとの状況

#### 🟢 親御さん用LIFF問診アプリ (`/parent/*`)
- **状態**: Phase 1 完了 (2024/12/21 YourTIME本番で実施済み)
- **フロー**: LINE友だち追加 → LIFF起動 → 基本情報入力 → 問診回答 → QRコード表示
- **主要画面**:
  - `/parent/home` — マイページ
  - `/parent/questionnaire/liff` — LIFF問診ページ
  - `/parent/result` — 結果確認
- **API**:
  - `POST /api/parent/basic-info` — 保護者・お子様情報登録
  - `POST /api/parent/questionnaire` — 問診回答保存
  - `GET /api/parent/visit` — 既存Visit復元
- **認証**: LINE LIFF SDK (`liff.init()` → `liff.getProfile()`)
- **既知の課題**: 
  - 兄弟対応 (10.2, 10.4, 10.6) が未完了
  - LIFFの外部ブラウザ検出フォールバックはあり

#### 🟢 スタッフ用診断アプリ (`/staff/*`)
- **状態**: Phase 1 完了
- **フロー**: LINE LIFF認証 → QRスキャン → 問診確認 → 写真撮影 → 診断入力 → AI分析 → LINE送信
- **主要画面**:
  - `/staff/home` — スタッフホーム
  - `/staff/scan` — QRスキャン
  - `/staff/diagnosis/[id]` — 診断ワークステーション (6ビューパターン)
  - `/staff/history` — 対応履歴
  - `/staff/monitor` — リアルタイムモニター
- **API**:
  - `GET /api/staff/session` — セッション取得
  - `POST /api/diagnoses` — 診断回答保存
  - `POST /api/ai/generate-report` — AI分析レポート生成
  - `POST /api/line/send-report` — LINE送信
- **認証**: LINE LIFF → JWT (`staff-auth.ts`, Cookie `staff_session`)
- **既知の課題**:
  - 下部メニューとコンテンツの被り (pb-20未追加)

#### 🟡 管理者ダッシュボード (`/admin/*`)
- **状態**: 基本機能完了、拡張予定
- **主要画面**:
  - `/admin` — ダッシュボード
  - `/admin/visits` — 来場者管理
  - `/admin/schema-editor` — スキーマエディタ
- **認証**: PIN認証 (`ADMIN_PASSWORD`)
- **未実装**:
  - イベント一覧/作成/編集画面 (6.3-6.5)
  - テストデータ管理UI (13)

---

## 🗄️ 2. データベース設計・現状

### 2.1 テーブル一覧と関係

```
organizations (組織)
  └─ profiles (保護者・スタッフ) ← lineUserId, role, secondaryRole
       └─ children (お子様) ← parentProfileId
            └─ visits (来場セッション) ← childId, parentProfileId, staffProfileId, eventId
                 ├─ visit_photos (写真)
                 ├─ questionnaire_responses (問診回答) ← itemId
                 ├─ diagnosis_responses (診断回答) ← itemId
                 ├─ reports (AI分析レポート)
                 ├─ line_message_logs (LINE送信ログ)
                 └─ diagnoses (レガシー, JSONB)

events (イベント) ← visits.eventId
  ├─ event_id (文字列ID)
  ├─ name, description
  ├─ start_date, end_date
  ├─ venue, status

questionnaire_categories → questionnaire_items → questionnaire_responses
diagnosis_categories → diagnosis_items → diagnosis_responses
form_schemas → form_schema_versions
ai_analysis_logs, ai_prompts (AI設定)
```

### 2.2 イベント関連の現状

| テーブル | イベント関連カラム | 状態 |
|---------|------------------|------|
| `events` | `id`, `event_id`, `name`, `start_date`, `end_date`, `venue`, `status` | ✅ テーブル存在 |
| `visits` | `event_id` (FK → events.id) | ✅ カラム存在 |
| `profiles` | イベント紐付けなし | ⚠️ **スタッフがどのイベントか不明** |
| `children` | イベント紐付けなし | ⚠️ **どのイベントのお子さんか不明** |

### 2.3 重要フラグ
- `visits.is_test_data` (BOOLEAN, default: false) — ✅ 既存
- `children.is_test_data` (BOOLEAN, default: false) — ✅ 既存
- `profiles` にはテストフラグなし — ⚠️

### 2.4 マイグレーション状況
- **29個のマイグレーション**が `supabase/migrations/` に存在
- 最終: `20241219130000` (2024年12月)
- Drizzle ORM + PostgreSQL で管理
- 本番DB: Supabase (aws-ap-northeast-1)

---

## 🎪 3. マルチイベント対応 — 設計提案

### 3.1 現在の問題点

1. **イベント識別**: `events` テーブルはあるが、`visits.event_id` が設定されていないレコードが多い可能性
2. **スタッフの所属**: スタッフがどのイベントに参加しているか管理できていない
3. **親御さん/お子さんの所属**: 同じ親御さんが複数イベントに参加する場合、`visits` でのみ区別
4. **集計の混在**: テストデータと本番データ、異なるイベントの集計が混ざる

### 3.2 提案: マルチイベントDB拡張

#### A) `event_staffs` テーブル (新規)
```sql
CREATE TABLE event_staffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) NOT NULL,
    profile_id UUID REFERENCES profiles(id) NOT NULL,
    role VARCHAR(50) DEFAULT 'staff', -- staff, lead, admin
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, profile_id)
);
```

#### B) `visits.event_id` の必須化
```sql
-- 既存データにデフォルトイベント設定
UPDATE visits SET event_id = (SELECT id FROM events WHERE event_id = 'yourtime-2024-12-21')
WHERE event_id IS NULL;

-- 今後は必須
ALTER TABLE visits ALTER COLUMN event_id SET NOT NULL;
```

#### C) イベント切替機能
- 管理画面: 「現在のイベント」選択ドロップダウン
- スタッフアプリ: ログイン時にイベント選択
- 親御さんLIFF: LIFF URLにイベントIDをパラメータとして含める (例: `?event=yourtime-2025-03`)

### 3.3 データ分離の仕組み

```
イベント1 (YourTIME 2024/12/21)     イベント2 (次回イベント 2025/03)
  ├─ スタッフA, B, C                   ├─ スタッフB, D, E
  ├─ 親御さん1 → 子1, 子2              ├─ 親御さん3 → 子5
  ├─ visits (event_id = evt1)          ├─ visits (event_id = evt2)
  └─ 集計: evt1のvisitsのみ            └─ 集計: evt2のvisitsのみ
```

**同じ親御さんが複数イベント参加も可能** (profiles + children は共有、visits でイベント区別)

---

## 🧪 4. テスト環境分離 — 3つの方法

### 方法1: ✅ Supabase Local (推奨)

**概要**: `supabase start` で完全にローカルにSupabaseをDockerで起動。本番と同じスキーマ・API。

```bash
# 初回セットアップ (既に supabase/config.toml が存在)
supabase start

# 出力例:
#   API URL:    http://127.0.0.1:54321
#   DB URL:     postgresql://postgres:postgres@127.0.0.1:54322/postgres
#   Studio URL: http://127.0.0.1:54323
#   Anon Key:   eyJhbGciOiJS...
#   Service Key: eyJhbGciOiJS...
```

**.env.local.test (テスト用環境変数)**:
```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local_anon_key>
SUPABASE_SERVICE_ROLE_KEY=<local_service_key>
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

**メリット**:
- 本番DBに一切影響なし
- 同じマイグレーション/スキーマ
- `supabase db reset` で何度でもクリーン状態に復元
- Supabase Studio でローカルデータ確認可能
- CI/CDにも組み込める

**必要なもの**: Docker

### 方法2: 🟡 テストフラグ方式 (既存の `is_test_data`)

**概要**: 本番DBに `is_test_data = true` のデータを作成し、集計時にフィルタリング。

```sql
-- 集計時
SELECT COUNT(*) FROM visits WHERE event_id = '...' AND is_test_data = false;
```

**メリット**: 追加セットアップ不要
**デメリット**: 本番DBにゴミが残る、フィルタ漏れリスク

### 方法3: 🟡 Supabase別プロジェクト (Staging)

**概要**: Supabase上に `coralup-staging` プロジェクトを作成。

**メリット**: クラウド上で完全分離
**デメリット**: 無料枠の制限、管理が2倍

### 推奨戦略

```
                    ┌─ 開発・テスト ─── Supabase Local (方法1)
                    │                   - Docker + supabase start
                    │                   - 自動テスト実行
アプリケーション ───┤
                    │                   
                    └─ 本番運用 ──────── Supabase Cloud (現在の構成)
                                        - is_test_data でフィルタ (方法2併用)
                                        - イベント別集計
```

---

## 🔬 5. 自動テスト設計 — LIFF対応E2Eテスト

### 5.1 テスト階層

```
┌────────────────────────────────────────────────────┐
│ Layer 4: E2E (LIFF実機テスト)                       │
│   - 実際のLINEアプリ内LIFF起動テスト                 │
│   - 手動 + スクリーンショット比較                    │
├────────────────────────────────────────────────────┤
│ Layer 3: E2E (Playwright + LIFF Mock)              │
│   - ブラウザ自動テスト                              │
│   - LIFF SDKをモック化                              │
│   - 親問診フロー / スタッフ診断フロー               │
├────────────────────────────────────────────────────┤
│ Layer 2: API Integration Tests                      │
│   - test-api-flow.sh (既存) の拡張                  │
│   - Jest + supertest                                │
│   - ローカルSupabase接続                            │
├────────────────────────────────────────────────────┤
│ Layer 1: Unit Tests                                 │
│   - Jest + Testing Library                          │
│   - コンポーネント単体テスト                         │
│   - ユーティリティ関数テスト                         │
└────────────────────────────────────────────────────┘
```

### 5.2 LIFF テストの最適解: Playwright + LIFF Mock

**なぜPlaywrightか**:
- LINE LIFFアプリはWebアプリ → ブラウザテストが可能
- `@line/liff` SDKをモック化すれば、LINE外でもテスト可能
- モバイルエミュレーションでスマホUI確認可能
- スクリーンショット/動画記録が標準機能

**LIFF Mock ライブラリ**: `@line/liff-mock` (GitHub公式)

#### テスト構成案

```
tests/
├── e2e/
│   ├── playwright.config.ts
│   ├── setup/
│   │   ├── global-setup.ts      # Supabase Local起動確認
│   │   └── liff-mock.ts         # LIFF SDKモック設定
│   ├── parent/
│   │   ├── basic-info.spec.ts   # 基本情報入力テスト
│   │   ├── questionnaire.spec.ts # 問診入力→完了テスト
│   │   ├── qr-display.spec.ts   # QRコード表示テスト
│   │   └── sibling.spec.ts      # 兄弟追加テスト
│   ├── staff/
│   │   ├── login.spec.ts        # スタッフLIFFログイン
│   │   ├── scan.spec.ts         # QRスキャンテスト
│   │   ├── diagnosis.spec.ts    # 診断入力テスト
│   │   ├── photos.spec.ts       # 写真撮影テスト
│   │   ├── analysis.spec.ts     # AI分析テスト
│   │   └── report-send.spec.ts  # LINE送信テスト
│   ├── admin/
│   │   └── dashboard.spec.ts    # 管理画面テスト
│   └── report/
│       └── view.spec.ts         # レポート閲覧テスト
├── api/
│   ├── parent-flow.test.ts      # 親フローAPI統合テスト
│   ├── staff-flow.test.ts       # スタッフフローAPI統合テスト
│   └── admin-flow.test.ts       # 管理API統合テスト
├── unit/
│   ├── lib/
│   │   ├── name-normalize.test.ts
│   │   ├── age-calculate.test.ts
│   │   └── staff-auth.test.ts
│   └── components/
│       └── diagnosis.test.ts
└── fixtures/
    ├── test-profiles.ts
    ├── test-children.ts
    ├── test-visits.ts
    └── test-questionnaire-answers.ts
```

### 5.3 Playwright LIFF Mock 実装パターン

```typescript
// tests/e2e/setup/liff-mock.ts
import { Page } from '@playwright/test';

export async function mockLiffSDK(page: Page, options: {
  lineUserId: string;
  displayName: string;
  pictureUrl?: string;
}) {
  await page.addInitScript((opts) => {
    // window.liff をモック化
    (window as any).liff = {
      init: async () => Promise.resolve(),
      isLoggedIn: () => true,
      isInClient: () => true, // LINE内ブラウザとして振る舞う
      getOS: () => 'ios',
      getLanguage: () => 'ja',
      getVersion: () => '2.27.3',
      getProfile: async () => ({
        userId: opts.lineUserId,
        displayName: opts.displayName,
        pictureUrl: opts.pictureUrl || 'https://example.com/avatar.png',
        statusMessage: '',
      }),
      getDecodedIDToken: () => ({
        sub: opts.lineUserId,
        name: opts.displayName,
        picture: opts.pictureUrl || 'https://example.com/avatar.png',
      }),
      getAccessToken: () => 'mock-access-token',
      getIDToken: () => 'mock-id-token',
      login: () => {},
      logout: () => {},
      closeWindow: () => {},
      sendMessages: async () => Promise.resolve(),
      openWindow: ({ url }: { url: string }) => {
        window.open(url);
      },
      ready: Promise.resolve(),
    };
  }, options);
}

// tests/e2e/parent/basic-info.spec.ts
import { test, expect } from '@playwright/test';
import { mockLiffSDK } from '../setup/liff-mock';

test.describe('親御さん基本情報入力', () => {
  test.beforeEach(async ({ page }) => {
    await mockLiffSDK(page, {
      lineUserId: 'Utest_playwright_001',
      displayName: 'テスト太郎',
    });
  });

  test('基本情報を正常に入力して次へ進む', async ({ page }) => {
    await page.goto('/parent/questionnaire/liff');
    
    // 基本情報入力
    await page.fill('[name="parentLastName"]', 'テスト');
    await page.fill('[name="parentFirstName"]', '太郎');
    await page.fill('[name="parentPhone"]', '09012345678');
    await page.fill('[name="childLastName"]', 'テスト');
    await page.fill('[name="childFirstName"]', '花子');
    await page.fill('[name="childBirthday"]', '2020-03-15');
    await page.click('text=女の子');
    
    // 次へ
    await page.click('text=次へ');
    
    // 問診画面に遷移
    await expect(page).toHaveURL(/questionnaire/);
  });
});
```

### 5.4 User-Agent MCP vs Playwright

| 観点 | Playwright | User-Agent MCP |
|------|-----------|---------------|
| **LIFF対応** | ✅ Mock化で完全対応 | ⚠️ ブラウザ制御は可能だがLIFF認証が複雑 |
| **自動テスト** | ✅ CI/CD統合が標準 | ⚠️ 対話的な用途向き |
| **モバイルエミュレーション** | ✅ 標準機能 | ⚠️ 限定的 |
| **スクリーンショット/動画** | ✅ 標準機能 | ✅ 可能 |
| **デバッグ** | ✅ Trace Viewer | ⚠️ ログのみ |
| **並列実行** | ✅ Worker対応 | ❌ |
| **保守性** | ✅ POMパターン確立 | ⚠️ スクリプト管理が必要 |

**結論**: **Playwright + LIFF Mock** が最適解。User-Agent MCPは探索的テストには使えるが、自動テスト基盤としてはPlaywrightが圧倒的に優れている。

---

## 🐛 6. 第1回イベント (YourTIME 2024/12/21) の既知エラー一覧

### 推定エラー一覧 (docs/TODO, KI, scriptsから抽出)

| # | エラー | 詳細 | 状態 | 関連スクリプト |
|---|--------|------|------|---------------|
| 1 | **LINE送信失敗 (月間上限)** | LINE Messaging APIの月間無料枠超過でレポート送信失敗 | ✅ 手動リカバリ済み | `resend_line_reports.ts` |
| 2 | **sentToLineフラグ不整合** | 送信成功だが `reports.sent_to_line = false` のまま (53%不整合) | ✅ スクリプト修正済み | `update_line_sent_status.ts` |
| 3 | **parentProfileId NULL** | Visit作成時にparent紐付けが失敗 (Kawachi Case) | ✅ チェーン検索で対応済み | `analyze_kawachi_records.ts` |
| 4 | **重複プロファイル** | Email回復とLINE登録で二重profiles (Minami Jousuke Case) | ✅ 手動マージ済み | `find_minami_jousuke.ts` |
| 5 | **写真なしAI分析** | 写真未アップロードのままAI分析が走りエラー | ✅ Zero-Photo Resilience実装済み | - |
| 6 | **性別誤り** | Paper Recovery時のCSVパースで性別が間違い | ✅ 修正スクリプト実行済み | `fix-child-gender.ts` |
| 7 | **年齢計算ミス** | Paper Recovery時に「今日の日付」で計算してしまった | ✅ Reference Date Pattern実装済み | `fix-paper-age.ts` |
| 8 | **staff-sessionモジュール不在** | import パスの誤り | ✅ 修正済み | - |
| 9 | **LINE通知エラー** | 環境変数名が間違っていた | ✅ 修正済み | - |
| 10 | **レポートページ404** | Visit IDではなくReport IDを使用していた | ✅ API修正済み | - |
| 11 | **下部メニュー被り** | pb-20 未追加 | ⬜ 未修正 | - |
| 12 | **incomplete visits** | 診断途中離脱 (Shadow Session) | ✅ Gap Analysis実装済み | `check_incomplete_visits.ts` |
| 13 | **LINE非連携ユーザー** | メールのみ登録でLINE送信不可 | ⚠️ Email Fallback未実装 | - |

### 自動テストでカバーすべきエラーパターン

```
✅ = 自動テストで検出可能、⚡ = APIテストで検出可能

1. LINE送信失敗      → ⚡ APIモック + エラーハンドリング確認
2. フラグ不整合       → ⚡ APIテスト (送信後のDB状態確認)
3. parentProfileId    → ⚡ 基本情報→Visit作成時のFK整合性テスト
4. 重複プロファイル    → ⚡ 同一lineUserIdの重複登録テスト
5. 写真なしAI分析     → ✅ Playwrightで写真スキップ→分析テスト
6. 性別誤り           → ⚡ API入力バリデーションテスト
7. 年齢計算           → ✅ ユニットテスト (calculateAgeInMonths)
8-10. パスエラー      → ✅ Playwright全画面遷移テスト
11. レイアウト被り    → ✅ Playwrightスクリーンショット比較
12. incomplete visits → ⚡ 途中離脱シナリオテスト
13. LINE非連携       → ⚡ lineUserId=null時のFallbackテスト
```

---

## 🗓️ 7. 実装ロードマップ

### Phase A: テスト基盤構築 (優先度: 最高)

```
Week 1:
  □ Supabase Local セットアップ & .env.local.test 分離
  □ Playwright インストール & playwright.config.ts 設定
  □ LIFF Mock ヘルパー作成
  □ API統合テスト: 親フロー全通し (basic-info → questionnaire → visit)
  □ API統合テスト: スタッフフロー全通し (session → diagnosis → report)

Week 2:
  □ Playwright E2E: 親御さん問診フロー
  □ Playwright E2E: スタッフ診断フロー
  □ Playwright E2E: レポートページ表示
  □ CI/CD: GitHub Actions でのテスト実行
  □ テスト結果レポート自動生成
```

### Phase B: マルチイベント対応 (優先度: 高)

```
Week 3:
  □ event_staffs テーブル追加 (マイグレーション)
  □ visits.event_id 必須化 + 既存データ修正
  □ スタッフアプリ: イベント選択UI
  □ 管理画面: イベント管理CRUD (6.3-6.5)
  □ LIFF: イベントパラメータ対応

Week 4:
  □ 集計: イベント別フィルタリング
  □ ダッシュボード: イベント切替
  □ 全体テスト (マルチイベントE2E)
```

---

## 📎 8. 参考: 重要設定情報

### LINE チャネル構成

| 用途 | Channel ID | LIFF ID |
|------|-----------|---------|
| 親御さん (Messaging) | 2008600624 | - |
| 親御さん (Login/LIFF) | 2008683611 | 2008683611-3afle6Vj |
| スタッフ (Messaging) | 2008662626 | - |
| スタッフ (Login/LIFF) | 2008667323 | 2008667323-S9w73N30 |

### Supabase

| 項目 | 値 |
|------|-----|
| プロジェクト | dnofyacfnaesqksmypab |
| リージョン | ap-northeast-1 |
| DB Pooler Port | 6543 |
| DB Direct Port | 5432 |
| ローカル設定済み | ✅ (`supabase/config.toml`) |
| ローカル DB Port | 54322 |
| ローカル Studio Port | 54323 |

### Vercel デプロイ先
- **URL**: `coralup-yourtime.vercel.app`
- **プロジェクト名**: cOralup (推定)
