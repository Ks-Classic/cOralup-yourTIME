#!/bin/bash

# ngrokで3つのトンネルを自動起動するスクリプト
# 使用方法: ./scripts/start-ngrok-tunnels.sh

set -e

# カラー出力
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== ngrok トンネル自動起動スクリプト ===${NC}"

# ngrokがインストールされているか確認
if ! command -v ngrok &> /dev/null; then
    echo -e "${RED}エラー: ngrokがインストールされていません${NC}"
    echo "インストール方法: https://ngrok.com/download"
    exit 1
fi

# ngrok認証トークンが設定されているか確認
if [ -z "$NGROK_AUTH_TOKEN" ]; then
    echo -e "${YELLOW}警告: NGROK_AUTH_TOKEN環境変数が設定されていません${NC}"
    echo "ngrok.ymlのauthtokenを確認してください"
fi

# プロジェクトルートに移動
cd "$(dirname "$0")/.."

# 既存のngrokプロセスを終了
echo -e "${YELLOW}既存のngrokプロセスを終了中...${NC}"
pkill -f "ngrok" || true
sleep 2

# Next.jsサーバーを3つのポートで起動
echo -e "${GREEN}Next.jsサーバーを起動中...${NC}"

# ポート3000でサーバー起動（バックグラウンド）
PORT=3000 npm run dev > /tmp/nextjs-3000.log 2>&1 &
NEXTJS_PID1=$!
echo "ポート3000: PID $NEXTJS_PID1"

# ポート3001でサーバー起動（バックグラウンド）
PORT=3001 npm run dev > /tmp/nextjs-3001.log 2>&1 &
NEXTJS_PID2=$!
echo "ポート3001: PID $NEXTJS_PID2"

# ポート3002でサーバー起動（バックグラウンド）
PORT=3002 npm run dev > /tmp/nextjs-3002.log 2>&1 &
NEXTJS_PID3=$!
echo "ポート3002: PID $NEXTJS_PID3"

# サーバー起動を待機
echo -e "${YELLOW}サーバー起動を待機中（10秒）...${NC}"
sleep 10

# ngrokトンネルを起動（1つのセッションで複数トンネル）
echo -e "${GREEN}ngrokトンネルを起動中（無料プラン対応）...${NC}"

# 1つのngrokセッションで3つのトンネルを同時起動（無料プランでも可能）
if [ -f "ngrok.yml" ]; then
    # 設定ファイルを使用してすべてのトンネルを起動
    ngrok start --config=ngrok.yml --all --log=stdout > /tmp/ngrok-all.log 2>&1 &
    NGROK_PID=$!
    echo "ngrokセッション（全トンネル）: PID $NGROK_PID"
    echo "$NGROK_PID" > /tmp/ngrok-all.pid
else
    echo -e "${RED}エラー: ngrok.ymlが見つかりません${NC}"
    exit 1
fi

# ngrok APIからURLを取得（少し待機）
echo -e "${YELLOW}トンネルURLを取得中（5秒待機）...${NC}"
sleep 5

# URLを取得して表示
echo -e "\n${GREEN}=== トンネルURL一覧 ===${NC}"

# ngrok APIからすべてのトンネル情報を取得
tunnels_json=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null)

if [ -z "$tunnels_json" ]; then
    echo -e "${YELLOW}URL取得中... もう一度試してください: npm run ngrok:urls${NC}"
else
    # 各トンネルのURLを抽出
    echo "$tunnels_json" | grep -o '"public_url":"https://[^"]*"' | while read -r line; do
        url=$(echo "$line" | cut -d'"' -f4)
        name=$(echo "$tunnels_json" | grep -B5 "$url" | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)
        if [ -n "$name" ]; then
            echo -e "${GREEN}${name}: ${url}${NC}"
        else
            echo -e "${GREEN}${url}${NC}"
        fi
    done
fi

# PIDをファイルに保存（後で停止用）
echo "$NEXTJS_PID1" > /tmp/nextjs-3000.pid
echo "$NEXTJS_PID2" > /tmp/nextjs-3001.pid
echo "$NEXTJS_PID3" > /tmp/nextjs-3002.pid

echo -e "\n${GREEN}=== 起動完了 ===${NC}"
echo -e "${YELLOW}停止する場合は: ./scripts/stop-ngrok-tunnels.sh${NC}"
echo -e "${YELLOW}ログ確認: tail -f /tmp/ngrok-*.log${NC}"

# プロセスを待機
wait

