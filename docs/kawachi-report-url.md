# 河内 佑友くん - レポート詳細情報

**調査日時**: 2026-01-15  
**お子さん**: 河内 佑友（かわうち ゆうと）くん - 8歳  
**親御さん**: 河内 香織（かわうち かおり）さん

---

## 🌐 レポートURL（正しいアクセス方法）

### ✅ 正しいURL（visitIdを使用）

```
https://coralup-yourtime.vercel.app/report/6d855cbe-bc8f-4a2b-8095-cf676b39b20e
```

**ローカル環境**:
```
http://localhost:3000/report/6d855cbe-bc8f-4a2b-8095-cf676b39b20e
```

### ❌ 間違ったURL（reportIdを使用）

```
https://coralup-yourtime.vercel.app/report/f69130ea-abfe-48eb-a5aa-74d63382bf47
→ 404エラーになります
```

---

## 📊 重要なID情報

| 種別 | ID |
|-----|-----|
| **Visit ID** ⭐ | `6d855cbe-bc8f-4a2b-8095-cf676b39b20e` |
| **Report ID** | `f69130ea-abfe-48eb-a5aa-74d63382bf47` |
| **Session ID** | `SMJF5QMX1WT5Z` |
| **Child ID** | `089b183f-29a3-4096-875e-c588e2ebabe3` |
| **Parent Profile ID** | `def28b90-746e-45d4-97d3-32c26d607d61` |

**メモ**: レポートURLは常に **Visit ID** を使用します。

---

## 📝 レポート内容サマリー

### 診断結果（抜粋）

お子様の口腔の状況についてご説明させていただきます。

**口腔面の主な所見**:
- 舌を前に出す癖
- 過蓋咬合（深い噛み合わせ）
- 口呼吸の癖

**姿勢面の主な所見**:
- 頭部前方位（ストレートネック傾向）
- 体軸の左右差
- X脚
- 骨盤前傾

**推奨アクション**:
1. 鼻呼吸を意識する練習
2. あいうべ体操
3. トレーナーへの相談

---

## 📸 写真データ

すべての写真が正常にアップロードされています：

1. **正面姿勢**: [表示](https://dnofyacfnaesqksmypab.supabase.co/storage/v1/object/public/diagnosis-photos/general/6d855cbe-bc8f-4a2b-8095-cf676b39b20e/posture_front_1766292914632.jpg)
2. **側面姿勢**: [表示](https://dnofyacfnaesqksmypab.supabase.co/storage/v1/object/public/diagnosis-photos/general/6d855cbe-bc8f-4a2b-8095-cf676b39b20e/posture_side_1766292927566.jpg)
3. **口腔正面**: [表示](https://dnofyacfnaesqksmypab.supabase.co/storage/v1/object/public/diagnosis-photos/general/6d855cbe-bc8f-4a2b-8095-cf676b39b20e/oral_front_1766292939672.jpg)

---

## ⚠️ LINE送信エラー

**エラー内容**: `"You have reached your monthly limit."`

**原因**: LINE Messaging APIの月次送信制限に到達

**送信試行日時**: 2025-12-21 14:01

**影響**: 親御さんにレポートがLINEで届いていない

---

## 🔧 技術メモ

### URLルーティングの仕組み

レポートページは `/app/report/[id]/page.tsx` で実装されており、以下のフローで動作します：

1. **フロントエンド**: `/report/[id]` の `[id]` = **visitId**
2. **APIエンドポイント**: `/api/report/[id]` の `[id]` = **visitId**
3. **データベースクエリ**: `WHERE reports.visitId = [id]`

つまり、すべてのレポートURLは **visitId** を使用する設計になっています。

### なぜreportIdではダメなのか？

- `reports` テーブルには `visitId` カラムはありますが、直接 `reportId` でルーティングする設計になっていない
- APIルートが `eq(reports.visitId, id)` でクエリしているため、reportIdを渡すと該当レコードが見つからない

---

## 📂 関連ファイル

- **レポート詳細分析**: `docs/kawachi-analysis-report.md`
- **データ検索スクリプト**: `scripts/check_kawachi_data.ts`
- **詳細分析スクリプト**: `scripts/analyze_kawachi_records.ts`
- **URL取得スクリプト**: `scripts/get_kawachi_report_url.ts`
- **このドキュメント**: `docs/kawachi-report-url.md`
