# ngrok セットアップガイド

## 概要

このプロジェクトでは、ngrokを使用して3つのトンネルを自動起動し、ローカル開発環境を外部（LINE Webhookなど）からアクセス可能にします。

---

## 1. ngrokのインストール

### WSL/Linux環境

```bash
# ngrokをAPTリポジトリから取得
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc > /dev/null
echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
sudo apt update && sudo apt install ngrok
```

### Mac

```bash
brew install ngrok
```

---

## 2. authtokenの取得と設定

### アカウント作成

1. **ngrok公式サイト**にアクセス: https://ngrok.com/
2. **Sign up** をクリック（無料アカウント）
3. メールアドレスまたはGitHub/Googleで登録

### authtokenを取得

1. ダッシュボードにログイン: https://dashboard.ngrok.com/
2. 「Your Authtoken」セクションを確認
3. トークンは `2xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` のような形式

### authtokenを設定

```bash
# 方法1: コマンドラインで設定（推奨）
ngrok config add-authtoken YOUR_AUTH_TOKEN_HERE

# 設定確認
ngrok config check
```

---

## 3. 使用方法

### 3つのトンネルを起動

```bash
npm run ngrok:start
```

このコマンドで以下が実行されます：
- Next.jsサーバーをポート3000, 3001, 3002で起動
- 各ポートにngrokトンネルを設定
- トンネルURLを表示

### トンネルURLを確認

```bash
npm run ngrok:urls
```

### すべてのトンネルを停止

```bash
npm run ngrok:stop
```

---

## 4. 無料プランでの使用

✅ **ngrokの無料プランでも3つのトンネルを同時起動可能！**

- **1つのセッション内で複数のトンネルを同時起動可能**
- `ngrok.yml` に3つのトンネルを定義
- `ngrok start --all` で1つのセッションとして起動

### 制限事項

- 同時に起動できるセッションは1つだけ（複数のngrokプロセスは不可）
- トンネルURLは毎回ランダムに生成（固定ドメインは有料プランのみ）
- データ転送量や同時接続数に制限あり

---

## 5. 設定ファイル（ngrok.yml）

`ngrok.yml` ファイルの設定例：

```yaml
version: "2"
authtoken: YOUR_AUTH_TOKEN_HERE  # ここに取得したトークンを貼り付け

tunnels:
  tunnel1:
    proto: http
    addr: 3000
    bind_tls: true
    
  tunnel2:
    proto: http
    addr: 3001
    bind_tls: true
    
  tunnel3:
    proto: http
    addr: 3002
    bind_tls: true
```

設定ファイルの場所は通常:
- Linux: `~/.ngrok2/ngrok.yml` または `~/.config/ngrok/ngrok.yml`
- Mac: `~/Library/Application Support/ngrok/ngrok.yml`

---

## 6. ファイル構成

```
scripts/
├── start-ngrok-tunnels.sh  # 3つのトンネルを起動
├── stop-ngrok-tunnels.sh   # トンネルを停止
├── get-ngrok-urls.sh       # URL一覧を取得
└── start-dev-servers.sh    # Next.jsサーバーのみ起動（ngrokなし）

ngrok.yml                    # ngrok設定ファイル
```

---

## 7. トラブルシューティング

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

1. 認証トークンが正しく設定されているか確認: `ngrok config check`
2. ngrokがインストールされているか確認: `which ngrok`
3. ログを確認: `tail -f /tmp/ngrok-*.log`

### authtokenが見つからない場合

- ダッシュボードの「Getting Started」セクションを確認
- または「Settings」→「Authtoken」を確認

### 設定が反映されない場合

```bash
# 設定ファイルの場所を確認
ngrok config check

# 手動で設定ファイルを編集
cat ~/.ngrok2/ngrok.yml
# または
cat ~/.config/ngrok/ngrok.yml
```
