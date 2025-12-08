#!/bin/bash

# ngrokトンネルとNext.jsサーバーを停止するスクリプト

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}=== ngrokトンネル停止スクリプト ===${NC}"

# PIDファイルからプロセスを停止
for port in 3000 3001 3002; do
    pid_file="/tmp/nextjs-${port}.pid"
    if [ -f "$pid_file" ]; then
        pid=$(cat "$pid_file")
        if ps -p "$pid" > /dev/null 2>&1; then
            echo -e "${YELLOW}ポート${port}のNext.jsサーバーを停止中 (PID: $pid)...${NC}"
            kill "$pid" || true
            rm "$pid_file"
        fi
    fi
done

# ngrokプロセスを停止（1つのセッションで全トンネル）
ngrok_pid_file="/tmp/ngrok-all.pid"
if [ -f "$ngrok_pid_file" ]; then
    ngrok_pid=$(cat "$ngrok_pid_file")
    if ps -p "$ngrok_pid" > /dev/null 2>&1; then
        echo -e "${YELLOW}ngrokセッションを停止中 (PID: $ngrok_pid)...${NC}"
        kill "$ngrok_pid" || true
        rm "$ngrok_pid_file"
    fi
fi

# 残っているngrokプロセスを強制終了
pkill -f "ngrok" || true

# 残っているNext.jsプロセスを強制終了
pkill -f "next dev" || true

echo -e "${GREEN}すべてのプロセスを停止しました${NC}"

