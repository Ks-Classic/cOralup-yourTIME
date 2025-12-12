# ngrokテストガイド

## 1. ngrok起動

```bash
# ローカルサーバー起動（別ターミナル）
pnpm dev

# ngrok起動
ngrok http 3000
```

ngrok URLをメモ: `https://xxxx-xxx-xxx.ngrok-free.app`

---

## 2. 環境変数更新

`.env.local` の `NEXT_PUBLIC_APP_URL` を一時的に変更:

```env
# 本番用（コメントアウト）
# NEXT_PUBLIC_APP_URL=https://coralup.vercel.app

# ngrokテスト用
NEXT_PUBLIC_APP_URL=https://xxxx-xxx-xxx.ngrok-free.app
```

**重要**: サーバー再起動が必要

---

## 3. LINE Webhook URL更新

### 親御さん用チャネル
LINE Developers Console > 親御さん用Messaging APIチャネル > Webhook設定:
```
https://xxxx-xxx-xxx.ngrok-free.app/api/line/webhook
```

### スタッフ用チャネル
LINE Developers Console > スタッフ用Messaging APIチャネル > Webhook設定:
```
https://xxxx-xxx-xxx.ngrok-free.app/api/line/staff-webhook
```

---

## 4. LIFF設定更新（重要）

### 親御さん用LIFF
LINE Developers Console > LINE Loginチャネル > LIFFアプリ:
- **エンドポイントURL**: `https://xxxx-xxx-xxx.ngrok-free.app/parent/questionnaire/liff`

### スタッフ用LIFF
LINE Developers Console > LINE Loginチャネル > LIFFアプリ:
- **エンドポイントURL**: `https://xxxx-xxx-xxx.ngrok-free.app/staff/liff-login`

---

## 5. テスト実行

### LIFF不要テスト（すぐ可能）

1. **Webhook テスト**
   - LINE友だち追加 → DB登録確認

2. **スタッフ診断テスト（デモモード）**
   - `https://xxxx-xxx-xxx.ngrok-free.app/staff/diagnosis/demo`
   - 認証不要で診断フロー確認

3. **レポートテスト**
   - `https://xxxx-xxx-xxx.ngrok-free.app/report/demo`

### LIFF必要テスト（設定変更後）

1. **親御さんLIFF問診**
   - LINE内で「問診を開始」タップ

2. **スタッフLIFF認証**
   - LINE内でLIFF URL開く

---

## 6. ngrok無料版の制限

| 制限 | 内容 | 対策 |
|------|------|------|
| セッション時間 | 2時間で切断 | 再起動（URLが変わる） |
| URL固定 | 毎回変わる | 有料版で固定可能 |
| 帯域制限 | あり | 通常使用なら問題なし |

---

## 7. LIFF設定変更なしでテストする方法

LIFFエンドポイント変更が面倒な場合、以下の代替手段:

### 方法A: デモページでテスト
```
/parent/questionnaire/demo  → 親御さん問診（モック）
/staff/diagnosis/demo       → スタッフ診断（モック）
```

### 方法B: 直接URLアクセス（認証バイパス）
スタッフ診断は認証なしでも動作確認可能:
```
https://xxxx-xxx-xxx.ngrok-free.app/staff/scan
https://xxxx-xxx-xxx.ngrok-free.app/staff/diagnosis/{visitId}
```
※ 一部機能（履歴等）は認証必要

### 方法C: APIテストスクリプト
```bash
./scripts/test-api-flow.sh https://xxxx-xxx-xxx.ngrok-free.app
```

---

## 8. 本番（Vercel）移行時

テスト完了後、以下を元に戻す:

1. `.env.local` の `NEXT_PUBLIC_APP_URL` を本番URLに
2. LINE Webhook URLを本番URLに
3. LIFFエンドポイントURLを本番URLに

---

## 9. スタッフさんへの案内テンプレート

```
【cOralup テスト協力のお願い】

テスト用URLをお送りします。
以下の手順でお試しください。

1. スタッフ用LINE公式アカウントを友だち追加
   [QRコード or リンク]

2. LINEアプリ内でログイン
   → ホーム画面が表示されます

3. 「QRスキャン」をタップ
   → テスト用QRコードをスキャン

4. 診断項目を入力
   → 写真撮影もお試しください

5. 「レポート作成」→「LINE送信」
   → テスト用親御さんアカウントに通知が届きます

ご不明点があればお知らせください！
```

---

## 10. トラブルシューティング

### ngrok接続エラー
```bash
# ngrok再起動
pkill ngrok
ngrok http 3000
```

### Webhook検証失敗
- LINE Developers ConsoleでWebhook URLが正しいか確認
- ngrok URLが変わっていないか確認

### LIFF起動エラー
- LIFFエンドポイントURLがngrok URLになっているか確認
- ブラウザキャッシュをクリア

