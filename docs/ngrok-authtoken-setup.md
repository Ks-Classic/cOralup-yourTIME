# ngrok authtoken 取得・設定ガイド

## 1. ngrokアカウント作成

1. **ngrok公式サイトにアクセス**
   - https://ngrok.com/ にアクセス

2. **アカウント作成（無料）**
   - 「Sign up」をクリック
   - メールアドレスまたはGitHub/Googleアカウントで登録

## 2. authtokenを取得

1. **ダッシュボードにログイン**
   - https://dashboard.ngrok.com/ にアクセス

2. **authtokenを確認**
   - ダッシュボードの「Your Authtoken」セクションを開く
   - または「Getting Started」→「Your Authtoken」を確認
   - トークンは `2xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` のような形式

## 3. authtokenを設定

### 方法1: コマンドラインで設定（推奨）

```bash
# ngrokにauthtokenを設定
ngrok config add-authtoken YOUR_AUTH_TOKEN_HERE
```

### 方法2: 設定ファイルに直接記述

`ngrok.yml`ファイルを編集：

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

## 4. 設定確認

```bash
# 設定が正しく反映されているか確認
ngrok config check
```

## トラブルシューティング

### authtokenが見つからない場合

- ダッシュボードの「Getting Started」セクションを確認
- または「Settings」→「Authtoken」を確認

### 設定が反映されない場合

```bash
# 設定ファイルの場所を確認
ngrok config check

# 手動で設定ファイルを編集
# 通常は ~/.ngrok2/ngrok.yml または ~/.config/ngrok/ngrok.yml
```


