# レポートWebページ仕様書

## 概要
PDF出力からUUID形式のWebページに変更。スピードと確実性を重視。

## URL形式
```
/report/{uuid}
例: /report/550e8400-e29b-41d4-a716-446655440000
```

## ページ構成

### 1. ヘッダー
- 診断日・イベント名
- タイトル「分析シート」
- お子様の年齢・お名前

### 2. 写真セクション（3枚横並び）
| 横向き姿勢 | 正面姿勢 | 口腔内 |
|-----------|---------|--------|
| 3:4比率 | 3:4比率 | 3:4比率 |

### 3. 分析できること
- AI分析サマリー
- 姿勢と口腔の相関説明

### 4. 評価セクション（2カラム）
- 姿勢評価: スコア/10 + 指摘事項
- 口腔評価: スコア/10 + 指摘事項

### 5. 月齢考慮コメント
- 年齢に応じた専門的アドバイス

### 6. フッター
- cOral upブランド
- 有効期限（90日）

## 技術仕様

### フロントエンド
- Next.js App Router
- Framer Motion（アニメーション）
- Tailwind CSS
- 印刷/PDF保存対応（@media print）

### API
```
GET /api/report/{id}
POST /api/report/create
```

### データ型
```typescript
interface ReportData {
  id: string
  childName: string
  childAge: number
  childAgeMonths?: number
  parentName: string
  eventName: string
  diagnosisDate: string
  photos: {
    postureSide?: string
    postureFront?: string
    oralFront?: string
  }
  aiAnalysis: {
    summary: string
    ageConsideration?: string
  }
  postureAnalysis?: {
    overallScore: number
    issues: string[]
  }
  oralAnalysis?: {
    overallScore: number
    issues: string[]
  }
}
```

## 実装ファイル
- `src/app/report/[id]/page.tsx` - レポート表示ページ
- `src/app/api/report/[id]/route.ts` - レポート取得API
- `src/app/api/report/create/route.ts` - レポート作成API

## ステータス
- [x] 基本実装完了
- [x] 分析シート形式UI
- [x] 写真アップロード連携
- [x] LINE通知連携

## 診断デモページの分析フロー

### 入力チェックブロック
1. **写真チェック**（必須3枚）
   - 正面姿勢
   - 横向き姿勢
   - 口腔内（正面）
   
2. **診断項目チェック**（スタッフ入力の必須項目すべて）
   - 未入力項目は赤色表示
   - タップで該当入力画面に遷移

3. **分析ボタン**
   - 全項目完了で有効化
   - 未完了時は非活性＋未入力数を表示

### 分析結果表示
1. レポートプレビュー（分析シート形式）
2. 分析コメント編集（テキストエリア）
3. 「レポートを確定」ボタン
4. 確定後「LINE送信」ボタン表示

