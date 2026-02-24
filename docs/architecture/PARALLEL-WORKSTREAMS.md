# cOralup 開発タスク全体整理 — 並列ワークストリーム

**作成日**: 2026-02-16
**目的**: 全開発タスクを依存関係に基づいて並列ワークストリームに整理し、開発効率を最大化する

---

## 🗓️ タイムライン概要

```
2026-02-16 (今日)
  │
  ├─ [URGENT] スタッフ説明会対応 (2回目・3回目)
  │    → docs/TODO/15-スタッフ説明会対応.md
  │
  ├─ [P0] データ消失バグ修正 (並列作業可)
  │    → docs/TODO/16-P0-データ消失バグ修正.md
  │
  ├─ [P0] Debounce レースコンディション修正 (並列作業可)
  │    → docs/TODO/16-P0-データ消失バグ修正.md (Task 2)
  │
  次回イベント前
  │
  ├─ [P1] カメラ安定化 (独立作業)
  │    → docs/TODO/17-P1-カメラ安定化.md
  │
  ├─ [P1] ステータス遷移整理 (独立作業)
  │    → docs/TODO/18-P1-ステータス遷移整理.md
  │
  ├─ [P2] ネットワークレジリエンス (独立作業)
  │    → docs/TODO/19-P2-ネットワークレジリエンス.md
  │
  中期 (次回イベント後)
  │
  ├─ [Phase 2] マルチイベント対応
  │    → docs/TODO/06-multitenant/
  │
  ├─ [Phase 2] テスト基盤構築
  │    → docs/architecture/FULL-STATUS-REPORT.md §5
  │
  └─ [Phase 2] 兄弟対応
       → docs/TODO/README.md §10-sibling
```

---

## 🔀 並列ワークストリーム マトリクス

### Stream A: データ整合性（P0 — 次回イベント前に必須）

| # | タスク | ファイル | 依存 | 工数 |
|---|--------|----------|------|------|
| A1 | `useDiagnosisStorage` に `flushToStorage` 追加 | `src/hooks/useDiagnosisStorage.ts` | なし | 2h |
| A2 | `completeDiagnosis` にDB最終保存追加 | `src/app/staff/diagnosis/[id]/page.tsx` | A1 | 1h |
| A3 | `runAnalysis` のDB保存失敗をブロッキングに | 同上 | なし | 0.5h |
| A4 | `beforeunload` イベントで `saveImmediately` | 同上 | A1 | 0.5h |
| A5 | 「次の診断へ」ボタンに保存確認追加 | 同上 | A1 | 0.5h |

**依存グラフ**:
```
A1 ──┬── A2
     ├── A4
     └── A5
A3 (独立)
```

### Stream B: カメラ安定化（P1 — 独立作業可）

| # | タスク | ファイル | 依存 | 工数 |
|---|--------|----------|------|------|
| B1 | `currentPhotoType` を `useRef` にも保存 | `src/app/staff/diagnosis/[id]/page.tsx` | なし | 1h |
| B2 | `handleFileCapture` で ref + state 両方チェック | 同上 | B1 | 0.5h |
| B3 | コンポーネントアンマウント時のストリームクリーンアップ | 同上 | なし | 0.5h |
| B4 | `savePreviewPhoto` 後の Blob URL 解放 | 同上 | なし | 0.5h |

**依存グラフ**:
```
B1 ── B2
B3 (独立)
B4 (独立)
```

### Stream C: ステータス遷移整理（P1 — 独立作業可）

| # | タスク | ファイル | 依存 | 工数 |
|---|--------|----------|------|------|
| C1 | `VisitStatus` 型定義と遷移マップ作成 | `src/types/visit-status.ts` (新規) | なし | 1h |
| C2 | `updateVisitStatus` ユーティリティ作成 | `src/lib/visit-status.ts` (新規) | C1 | 1h |
| C3 | `/api/diagnosis/complete` をC2に移行 | `src/app/api/diagnosis/complete/route.ts` | C2 | 1h |
| C4 | `/api/line/confirm-delivery` をC2に移行 | `src/app/api/line/confirm-delivery/route.ts` | C2 | 0.5h |
| C5 | `sendReportNotification` をC2に移行 | 該当ファイル | C2 | 0.5h |

**依存グラフ**:
```
C1 ── C2 ──┬── C3
           ├── C4
           └── C5
```

### Stream D: ネットワークレジリエンス（P2 — Stream A完了後推奨）

| # | タスク | ファイル | 依存 | 工数 |
|---|--------|----------|------|------|
| D1 | `fetchWithRetry` ユーティリティ作成 | `src/lib/fetch-with-retry.ts` (新規) | なし | 2h |
| D2 | 401エラー → ログインリダイレクト | `src/app/staff/diagnosis/[id]/page.tsx` | D1 | 1h |
| D3 | `online` イベントで自動再取得 | 同上 | なし | 1h |
| D4 | `maxDuration` 設定追加 | 各API route | なし | 0.5h |

### Stream E: スタッフ説明会対応（本日最優先）

| # | タスク | 依存 | 工数 |
|---|--------|------|------|
| E1 | Webhook URL設定確認 | なし | 5min |
| E2 | 環境変数設定確認 | なし | 3min |
| E3 | 自分のアカウントで友だち追加テスト | E1, E2 | 5min |
| E4 | LIFF ログインテスト | E3 | 5min |
| E5 | デモモード動作確認 | E4 | 5min |
| E6 | 説明会実施（2回目） | E5 | 20min |
| E7 | 説明会実施（3回目） | E5 | 20min |
| E8 | 登録状況確認（SQLクエリ） | E6, E7 | 5min |

---

## 🔀 並列実行計画

```
┌─────────────────────────────────────────────────────────────────────┐
│                        並列実行マトリクス                              │
├──────────┬──────────┬──────────┬──────────┬──────────────────────────┤
│  Time    │ Worker 1 │ Worker 2 │ Worker 3 │ Notes                   │
│          │ (高優先) │ (中優先) │ (低優先) │                          │
├──────────┼──────────┼──────────┼──────────┼──────────────────────────┤
│ 今日AM   │ E1-E5    │          │          │ 説明会準備               │
│          │ (確認)   │          │          │                          │
├──────────┼──────────┼──────────┼──────────┼──────────────────────────┤
│ 今日PM   │ E6, E7   │ A1       │          │ 説明会 + データ修正着手   │
│          │ (説明会) │ (flush)  │          │                          │
├──────────┼──────────┼──────────┼──────────┼──────────────────────────┤
│ 明日〜   │ A2-A5    │ B1-B2    │ C1-C2    │ 全Stream並列開始可       │
│          │ (DB保存) │ (カメラ) │ (status) │                          │
├──────────┼──────────┼──────────┼──────────┼──────────────────────────┤
│ Week 2   │ D1-D4    │ B3-B4    │ C3-C5    │ 残タスク完了             │
│          │ (retry)  │ (cleanup)│ (API移行)│                          │
└──────────┴──────────┴──────────┴──────────┴──────────────────────────┘
```

### 並列可能性の根拠

| Stream | ファイル重複 | 並列可能 | 理由 |
|--------|------------|----------|------|
| A + B  | ⚠️ `diagnosis/[id]/page.tsx` | △ 部分的 | 同じファイルだが編集箇所が異なる（A: 保存ロジック、B: カメラロジック） |
| A + C  | ❌ なし | ✅ 完全並列 | 異なるファイル群 |
| A + D  | ⚠️ `diagnosis/[id]/page.tsx` | △ 順次推奨 | D はA完了後の方が安全 |
| B + C  | ❌ なし | ✅ 完全並列 | 異なるファイル群 |
| B + D  | ⚠️ `diagnosis/[id]/page.tsx` | △ 部分的 | 編集箇所は異なるが順次がベター |
| C + D  | ❌ なし | ✅ 完全並列 | 異なるファイル群 |

---

## 📁 関連ドキュメント構成

```
docs/
├── TODO/
│   ├── 15-スタッフ説明会対応.md         ← 🆕 本日最優先
│   ├── 16-P0-データ消失バグ修正.md      ← 🆕 Stream A
│   ├── 17-P1-カメラ安定化.md            ← 🆕 Stream B
│   ├── 18-P1-ステータス遷移整理.md      ← 🆕 Stream C
│   ├── 19-P2-ネットワークレジリエンス.md ← 🆕 Stream D
│   └── README.md                        ← 更新: 新タスク追加
├── architecture/
│   ├── DEBUG-ANALYSIS-REPORT.md          ← 既存: 根本原因分析
│   ├── FULL-STATUS-REPORT.md            ← 既存: 全体状況
│   └── PARALLEL-WORKSTREAMS.md          ← 🆕 本ファイル
└── designe/
    └── (既存仕様書群)
```
