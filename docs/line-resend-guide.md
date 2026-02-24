# LINE未送信レポート 再送信ガイド

**作成日**: 2026-01-15

## ⚠️ 実行前の重要確認事項

**絶対に本番実行する前に、以下を確認してください:**

1. **LINE API制限の確認**
   - 現在の月次送信制限を確認
   - 制限に達していないか確認
   - 必要に応じてプラン変更

2. **テスト送信**
   - 自分のLINEアカウントでテスト
   - メッセージ内容の確認
   - URLの動作確認

3. **送信対象の確認**
   - `unsent_reports.csv` の内容を確認
   - 送信対象が正しいか確認

---

## 📊 現在の未送信状況

### 統計（2026-01-15時点）

- **完成済みレポート総数**: 47件
- **送信済み**: 25件 (53.2%)
- **未送信**: **14件** (29.8%)

### 未送信の内訳

- **月次制限エラー**: 13件 ⚠️
- **送信未試行**: 1件

### 送信対象リスト

1. 木幡 美奈子（18歳） - 未試行
2. 冨永 結仁（11歳） - 月次制限
3. 亀石 茉叶（6歳） - 月次制限
4. 岩井 蒼太（5歳） - 月次制限
5. 南 瑛斗（6歳） - 月次制限
6. 谷川 奈優（5歳） - 月次制限
7. 齋藤 伍希（6歳） - 月次制限
8. 酒井 絵未（2歳） - 月次制限
9. 谷川 竣祐（3歳） - 月次制限
10. 上田 創介（3歳） - 月次制限
11. 南 伶旺（12歳） - 月次制限
12. **河内 佑友（8歳）** - 月次制限 ⭐
13. 冨永 絢仁（6歳） - 月次制限
14. 中尾 浩都（5歳） - 月次制限

---

## 📝 送信されるメッセージ

```
12/21の大阪YourTIME cOral upブースへのご来場ありがとうございました。
当日の診断レポートが遅くなり、大変申し訳ありません。
以下URLよりご確認いただければと思います。
何か気になる点や追加サポートご希望の場合はお気軽にご連絡ください。

[レポートURL]
```

---

## 🚀 実行手順

### 1. 事前準備

#### 1-1. 環境変数の確認

`.env.local` に以下が設定されているか確認：

```bash
LINE_MESSAGING_CHANNEL_ACCESS_TOKEN=BFqEUucu5QnnhP+Zp158N4n1YBUxQPDftD7iRlADxhAmNg1VmRVcL7pa7Cy9aU+FJ+HiVNfcSNfX4ZpqRRkUgTxJ4dZ2wOLklY8HFkxt65pqJVjFvjUljuL6oW7Yw2n7bmukGl3cNdt8v1WWaAPowwdB04t89/1O/w1cDnyilFU=
```

#### 1-2. 未送信レポートの抽出（既に完了）

```bash
# すでに実行済み
npx tsx scripts/extract_unsent_reports.ts
```

生成ファイル:
- ✅ `unsent_reports.csv`
- ✅ `unsent_reports.md`
- ✅ `line_sending_stats.md`

---

### 2. テスト送信（必須）

**本番実行前に、必ず自分のアカウントでテストしてください！**

#### 2-1. テスト用スクリプトの作成

`scripts/test_line_message.ts` を作成：

```typescript
import { config } from 'dotenv'
config({ path: '.env.local' })

const LINE_TOKEN = process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN
const TEST_LINE_USER_ID = 'YOUR_LINE_USER_ID' // 自分のLINE IDに変更
const TEST_REPORT_URL = 'https://coralup-yourtime.vercel.app/report/6d855cbe-bc8f-4a2b-8095-cf676b39b20e'

async function testSend() {
    const messages = [{
        type: 'text',
        text: `12/21の大阪YourTIME cOral upブースへのご来場ありがとうございました。\n当日の診断レポートが遅くなり、大変申し訳ありません。\n以下URLよりご確認いただければと思います。\n何か気になる点や追加サポートご希望の場合はお気軽にご連絡ください。\n\n${TEST_REPORT_URL}`
    }]

    const response = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${LINE_TOKEN}`
        },
        body: JSON.stringify({
            to: TEST_LINE_USER_ID,
            messages
        })
    })

    const data = await response.json().catch(() => ({}))
    console.log('Response:', response.status, data)
}

testSend()
```

#### 2-2. 自分のLINE User IDを取得

1. LINE Developers Consoleにログイン
2. Messaging API設定 > Webhookテスト
3. または、Webhook URLにテストメッセージを送信してログから確認

#### 2-3. テスト実行

```bash
npx tsx scripts/test_line_message.ts
```

**確認項目:**
- [ ] メッセージが届く
- [ ] 内容が正しい
- [ ] URLが正しく動作する
- [ ] リンクをタップしてレポートが表示される

---

### 3. 本番実行

#### ⚠️ 最終確認チェックリスト

- [ ] LINE API月次制限を確認済み
- [ ] テスト送信で問題なし
- [ ] `unsent_reports.csv` の内容を確認済み
- [ ] 送信対象者（14名）が正しい
- [ ] メッセージ内容を確認済み
- [ ] バックアップを取得済み

#### 実行コマンド

```bash
npx tsx scripts/resend_line_reports.ts
```

#### 実行フロー

1. スクリプト起動
2. 未送信レポート14件を読み込み
3. 送信内容のプレビュー表示
4. **確認プロンプト**: `実行してよろしいですか？ (yes/no):`
5. `yes` を入力して実行
6. 1件ずつ順次送信（1秒間隔）
7. 結果を `resend_results.md` に保存

---

## 📊 実行中の表示例

```
🔄 LINE未送信レポートの再送信スクリプト

====================================================================================================
📋 未送信レポート: 14件

✅ 送信可能: 14件

====================================================================================================

📨 以下のメッセージで 14件のレポートを送信します:

────────────────────────────────────────────────────────────────────────────────
12/21の大阪YourTIME cOral upブースへのご来場ありがとうございました。
当日の診断レポートが遅くなり、大変申し訳ありません。
以下URLよりご確認いただければと思います。
何か気になる点や追加サポートご希望の場合はお気軽にご連絡ください。

[レポートURL]
────────────────────────────────────────────────────────────────────────────────

実行してよろしいですか？ (yes/no): yes

====================================================================================================
🚀 送信開始...

[1/14] 木幡 美奈子さん（親御さん: 不明）
   LINE ID: Uxxx...
   URL: https://coralup-yourtime.vercel.app/report/...
   ✅ 送信成功

[2/14] 冨永 結仁さん（親御さん: 冨永ゆかり）
   LINE ID: Uxxx...
   URL: https://coralup-yourtime.vercel.app/report/...
   ✅ 送信成功

...

====================================================================================================

📊 送信結果:
   ✅ 成功: 14件
   ❌ 失敗: 0件
   合計: 14件

💾 結果を保存しました: ./resend_results.md
====================================================================================================
```

---

## 🔧 トラブルシューティング

### エラー: "You have reached your monthly limit."

**原因**: LINE Messaging APIの月次送信制限に達している

**対処法**:
1. LINE Developers Consoleでプランを確認
2. 上位プランへのアップグレードを検討
3. または翌月まで待機

### エラー: "Invalid access token"

**原因**: アクセストークンが間違っているか期限切れ

**対処法**:
1. `.env.local` の `LINE_MESSAGING_CHANNEL_ACCESS_TOKEN` を確認
2. LINE Developers Consoleで新しいトークンを発行
3. `.env.local` を更新して再実行

### 一部のユーザーのみ失敗

**原因**: そのユーザーがブロックしているか、LINE IDが無効

**対処法**:
1. `resend_results.md` で失敗したユーザーを確認
2. 別の方法（メール等）で連絡

---

## 📂 関連ファイル

### 生成済み

- `unsent_reports.csv` - 未送信レポート一覧（CSV）
- `unsent_reports.md` - 未送信レポート一覧（Markdown）
- `line_sending_stats.md` - 送信状況統計

### 実行後に生成

- `resend_results.md` - 再送信結果レポート

### スクリプト

- `scripts/extract_unsent_reports.ts` - 未送信レポート抽出
- `scripts/resend_line_reports.ts` - 再送信実行
- `scripts/test_line_message.ts` - テスト送信（要作成）

---

## 💡 補足情報

### メッセージのカスタマイズ

スクリプト内の以下の部分を編集：

```typescript
const messages = [
    {
        type: 'text',
        text: `12/21の大阪YourTIME cOral upブースへのご来場ありがとうございました。\n当日の診断レポートが遅くなり、大変申し訳ありません。\n以下URLよりご確認いただければと思います。\n何か気になる点や追加サポートご希望の場合はお気軽にご連絡ください。\n\n${report.reportUrl}`
    }
]
```

### レート制限対策

スクリプトは各送信の間に1秒待機します：

```typescript
await new Promise(resolve => setTimeout(resolve, 1000))
```

必要に応じて調整可能です。

---

## ⚠️ 重要な注意事項

1. **一度送信したメッセージは取り消せません**
2. **必ずテスト送信を行ってください**
3. **送信前に対象者を確認してください**
4. **LINE API制限に注意してください**
5. **実行結果は必ず保存してください**
