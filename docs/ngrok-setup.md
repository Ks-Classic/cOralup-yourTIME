# ngrok 3トンネル自動起動ガイド

## 概要

このプロジェクトでは、ngrokを使用して3つのトンネルを自動起動し、負荷分散を実現します。

## 前提条件

1. **ngrokのインストール**
   ```bash
   # WSL環境でのインストール例
   curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
   echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
   sudo apt update && sudo apt install ngrok
   ```

2. **ngrok認証トークンの設定**
   ```bash
   # ngrokアカウントで取得したトークンを設定
   export NGROK_AUTH_TOKEN=your_token_here
   
   # または ngrok.yml を編集
   # authtoken: your_token_here
   ```

## 使用方法

### 1. 3つのトンネルを起動

```bash
npm run ngrok:start
```

このコマンドで以下が実行されます：
- Next.jsサーバーをポート3000, 3001, 3002で起動
- 各ポートにngrokトンネルを設定
- トンネルURLを表示

### 2. トンネルURLを確認

```bash
npm run ngrok:urls
```

### 3. すべてのトンネルを停止

```bash
npm run ngrok:stop
```

## 無料プランでの使用方法

✅ **ngrokの無料プランでも3つのトンネルを同時起動可能です！**

ngrokの無料プランでは：
- **1つのセッション内で複数のトンネルを同時起動可能**
- 設定ファイル（`ngrok.yml`）に3つのトンネルを定義
- `ngrok start --all`で1つのセッションとして起動

これにより、無料プランでも3つのトンネルを同時に使用できます。

### 制限事項

- 同時に起動できるセッションは1つだけ（複数のngrokプロセスは不可）
- トンネルURLは毎回ランダムに生成される（固定ドメインは有料プランのみ）
- データ転送量や同時接続数に制限あり

## ファイル構成

```
scripts/
├── start-ngrok-tunnels.sh  # 3つのトンネルを起動
├── stop-ngrok-tunnels.sh   # トンネルを停止
├── get-ngrok-urls.sh       # URL一覧を取得
└── start-dev-servers.sh    # Next.jsサーバーのみ起動（ngrokなし）

ngrok.yml                    # ngrok設定ファイル
```

## トラブルシューティング

### ポートが既に使用されている場合

```bash
# 使用中のポートを確認
lsof -i :3000
lsof -i :3001
lsof -i :3002

# プロセスを終了
pkill -f "next dev"
pkill -f "ngrok"
```

### ngrokが起動しない場合

1. 認証トークンが正しく設定されているか確認
2. ngrokがインストールされているか確認: `which ngrok`
3. ログを確認: `tail -f /tmp/ngrok-*.log`

