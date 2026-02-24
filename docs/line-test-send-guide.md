# LINEメッセージのテスト送信ガイド

**目的**: 実際に送信する前に、自分のLINEアカウントでメッセージの見た目を確認する

---

## 🎯 テスト送信の流れ

1. **自分のLINE User IDを取得**
2. **テストスクリプトにIDを設定**
3. **テスト送信実行**
4. **LINEアプリで確認**

---

## 📱 STEP 1: 自分のLINE User IDを取得する

### 方法A: LINE公式アカウントにメッセージを送る（簡単）

1. **LINE公式アカウントを友だち追加**
   - QRコードまたは友だち追加リンクから追加

2. **何かメッセージを送信**
   - 「テスト」などと送る

3. **Webhookログから確認**（開発者向け）
   ```
   POST /api/line/webhook からのリクエスト
   {
     "events": [
       {
         "source": {
           "userId": "Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"  ← これ
         }
       }
     ]
   }
   ```

### 方法B: LINE Developers コンソールから取得

1. [LINE Developers Console](https://developers.line.biz/console/) にアクセス
2. 該当のプロバイダー/チャネルを選択
3. **Messaging API設定** タブを開く
4. **Your user ID** の欄を確認
   - 自分で公式アカウントを友だち追加していれば表示される

### 方法C: プロフィールAPI経由（上級者向け）

```bash
curl -X GET \
  'https://api.line.me/v2/bot/profile/YOUR_USER_ID' \
  -H 'Authorization: Bearer YOUR_CHANNEL_ACCESS_TOKEN'
```

---

## 🔧 STEP 2: テストスクリプトに設定

`scripts/test_line_message.ts` を編集：

```typescript
// ⚠️ ここに自分のLINE User IDを入れてください
const TEST_LINE_USER_ID = 'Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'  // ← 変更
```

**注意**: LINE User IDは `U` で始まる33文字の文字列です。

---

## 🚀 STEP 3: テスト送信を実行

```bash
npx tsx scripts/test_line_message.ts
```

### 実行内容

スクリプトは以下の2パターンを順番に送信します：

#### パターン1: お子さん1名の場合
```
12/21の大阪YourTIME cOral upブースへのご来場ありがとうございました。
当日の診断レポートが遅くなり、大変申し訳ありません。

【佑友くんの診断レポート】
https://coralup-yourtime.vercel.app/report/6d855cbe-bc8f-4a2b-8095-cf676b39b20e

上記URLよりご確認いただければと思います。
何か気になる点や追加サポートご希望の場合はお気軽にご連絡ください。
```

#### パターン2: お子さん2名の場合
```
12/21の大阪YourTIME cOral upブースへのご来場ありがとうございました。
当日の診断レポートが遅くなり、大変申し訳ありません。

【結仁くんの診断レポート】
https://coralup-yourtime.vercel.app/report/e29126b1-f8fb-4ca3-be1f-544ca66f2b5a

【絢仁くんの診断レポート】
https://coralup-yourtime.vercel.app/report/12fc43b8-f9d4-4db6-834d-7789532b0fd5

上記URLよりご確認いただければと思います。
何か気になる点や追加サポートご希望の場合はお気軽にご連絡ください。
```

---

## 📱 STEP 4: LINEアプリで確認

### 確認ポイント

✅ **メッセージの見た目**
- 改行が正しいか
- 文章が読みやすいか
- 絵文字が必要か

✅ **URLの動作**
- URLがクリック可能か
- リンクをタップするとレポートページが開くか
- 正しいレポートが表示されるか

✅ **全体の印象**
- 長すぎないか
- 分かりやすいか
- 丁寧な印象か

---

## 🔄 修正が必要な場合

### メッセージ内容の変更

`scripts/test_line_message.ts` の以下の部分を編集：

```typescript
const message1 = `12/21の大阪YourTIME cOral upブースへのご来場ありがとうございました。
当日の診断レポートが遅くなり、大変申し訳ありません。

【${testCases[0].childName}の診断レポート】
${testCases[0].reportUrl}

上記URLよりご確認いただければと思います。
何か気になる点や追加サポートご希望の場合はお気軽にご連絡ください。`
```

修正後、再度実行して確認できます。

---

## ⚠️ トラブルシューティング

### エラー: "Invalid reply token"

**原因**: テスト送信ではPush Message APIを使用するため、このエラーは出ません。

### エラー: "Invalid user ID"

**原因**: LINE User IDが間違っている

**対処法**:
- User IDが `U` で始まる33文字か確認
- コピペミスがないか確認
- 友だち追加済みか確認

### エラー: "You have reached your monthly limit."

**原因**: 月次送信制限に達している

**対処法**:
- LINE Developers Consoleでプラン確認
- 翌月まで待機、または上位プランへ変更

### メッセージが届かない

**確認事項**:
- 公式アカウントをブロックしていないか
- LINE User IDが正しいか
- アクセストークンが有効か

---

## ✅ テスト完了後

メッセージの内容と見た目に問題がなければ、本番送信の準備完了です！

次のステップ:
1. `scripts/resend_line_reports.ts` で本番送信
2. または、手動で1件ずつ送信

---

## 💡 Tips

### メッセージの長さ

LINEのテキストメッセージは最大5000文字まで送信可能です。
現在のメッセージは約200文字程度なので問題ありません。

### URLの自動リンク化

LINEアプリはURL（`https://`で始まる文字列）を自動的にリンクに変換します。
特別な処理は不要です。

### Rich Messageとの比較

現在はシンプルなテキストメッセージを使用していますが、
よりリッチな表現が必要な場合は Flex Message も検討できます。
