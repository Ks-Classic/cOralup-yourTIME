# Drizzle ORM 移行タスク

**ステータス**: 🟡 途中（スキーマ定義完了、クエリ移行未着手）
**優先度**: 中
**作成日**: 2025-12-20
**最終更新**: 2025-12-20

---

## 概要

Supabaseクエリビルダーから型安全なDrizzle ORMへの移行。

## 完了済み ✅

- [x] Drizzle ORM パッケージインストール (`drizzle-orm`, `drizzle-kit`, `postgres`)
- [x] スキーマ定義 (`src/db/schema/*.ts`) - 13テーブル
- [x] DBクライアントセットアップ (`src/db/index.ts`)
- [x] drizzle.config.ts 設定
- [x] DATABASE_URL 環境変数設定（.env.local）
- [x] ドキュメント更新（README.md, REFACTORING.md, 技術仕様書）

## 🚀 次のステップ（再開ポイント）

### APIのDrizzle移行

**対象ファイル**: 40個のAPI Route

```
src/app/api/
├── admin/
│   ├── ai-prompts/route.ts
│   ├── data-list/route.ts
│   ├── diagnosis-schema/route.ts
│   ├── schemas/[schemaId]/route.ts
│   ├── schemas/route.ts
│   ├── test-data/reset-visit/route.ts
│   ├── test-data/route.ts
│   └── visits/route.ts
├── ai/generate-report/route.ts
├── analysis/route.ts
├── auth/
│   ├── pin-login/route.ts
│   └── staff-session/route.ts
├── diagnoses/route.ts
├── diagnosis-schema/route.ts
├── diagnosis/complete/route.ts
├── line/
│   ├── confirm-delivery/route.ts
│   ├── send-report/route.ts
│   ├── staff-webhook/route.ts
│   └── webhook/route.ts
├── parent/
│   ├── basic-info/route.ts
│   ├── questionnaire/[id]/route.ts
│   ├── questionnaire/autosave/route.ts
│   ├── questionnaire/route.ts
│   └── visit/route.ts
├── photos/upload/route.ts
├── questionnaire/items/route.ts
├── questionnaires/route.ts
├── report/
│   ├── [id]/create/route.ts
│   ├── [id]/route.ts
│   └── create/route.ts
├── sessions/route.ts
├── staff/
│   ├── analysis-data/route.ts
│   ├── auth/route.ts
│   ├── history/route.ts
│   ├── list/route.ts
│   ├── report/route.ts
│   ├── session/assign/route.ts
│   └── session/route.ts
└── visits/
    ├── record-error/route.ts
    └── update-step/route.ts
```

### 移行手順

1. **コア機能から着手**（優先）
   - [ ] `/api/staff/session/route.ts` - 診断セッション取得
   - [ ] `/api/parent/visit/route.ts` - 来場データ取得
   - [ ] `/api/diagnosis/complete/route.ts` - 診断完了処理

2. **問診・診断関連**
   - [ ] `/api/parent/questionnaire/*.ts`
   - [ ] `/api/diagnoses/route.ts`
   - [ ] `/api/questionnaire/items/route.ts`

3. **AI・レポート関連**
   - [ ] `/api/ai/generate-report/route.ts`
   - [ ] `/api/analysis/route.ts`
   - [ ] `/api/report/*.ts`

4. **管理画面関連**
   - [ ] `/api/admin/*.ts`

5. **その他**
   - [ ] 残りすべて

### 移行パターン

**Before (Supabase):**
```typescript
const supabase = createServiceSupabaseClient()
const { data, error } = await supabase
  .from('visits')
  .select('*')
  .eq('id', visitId)
  .single()
```

**After (Drizzle):**
```typescript
import { db, visits, eq } from '@/db'
const data = await db
  .select()
  .from(visits)
  .where(eq(visits.id, visitId))
  .limit(1)
  .then(rows => rows[0])
```

### 注意点

- Supabaseのリレーション記法（`children (*)`）は `leftJoin()` に書き換え必要
- エラーハンドリングのパターンが変わる（try-catch使用）
- モックモードのロジックは維持

---

## リスク評価

| リスク | レベル | 対策 |
|--------|--------|------|
| 既存機能が壊れる | 中 | 1ファイルずつ変更＆テスト |
| JOIN記法の変換ミス | 中 | クエリ結果を比較検証 |
| 型エラー | 低 | TypeScriptが検出 |
| パフォーマンス劣化 | 低 | 同じSQLなので変わらない |

---

## Vercel環境変数（移行完了後に追加）

移行を本番反映する際に追加が必要：

```
DATABASE_URL=postgresql://postgres.xxx:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres
```
