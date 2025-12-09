#!/bin/bash

# 複数のNext.jsサーバーを起動するスクリプト（ngrokなし）

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== Next.jsサーバー起動（複数ポート） ===${NC}"

cd "$(dirname "$0")/.."

# 既存のNext.jsプロセスを停止
pkill -f "next dev" || true
sleep 2

# 3つのポートでサーバー起動
PORT=3000 npm run dev > /tmp/nextjs-3000.log 2>&1 &
echo -e "${GREEN}ポート3000で起動中...${NC}"

PORT=3001 npm run dev > /tmp/nextjs-3001.log 2>&1 &
echo -e "${GREEN}ポート3001で起動中...${NC}"

PORT=3002 npm run dev > /tmp/nextjs-3002.log 2>&1 &
echo -e "${GREEN}ポート3002で起動中...${NC}"

echo -e "\n${YELLOW}サーバー起動中... ログは /tmp/nextjs-*.log で確認できます${NC}"
echo -e "${YELLOW}停止する場合は: pkill -f 'next dev'${NC}"

wait





