#!/bin/bash

# ngrokトンネルのURLを取得するスクリプト

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== ngrokトンネルURL一覧 ===${NC}\n"

# ngrok APIからURLを取得（1つのセッションで全トンネル）
tunnels_json=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null)

if [ -z "$tunnels_json" ]; then
    echo -e "${YELLOW}ngrokが起動していないか、APIにアクセスできません${NC}"
    exit 1
fi

echo -e "${GREEN}=== ngrokトンネルURL一覧 ===${NC}\n"

# 各トンネルの情報を抽出して表示
echo "$tunnels_json" | grep -o '"name":"[^"]*"' | sort -u | while read -r name_line; do
    name=$(echo "$name_line" | cut -d'"' -f4)
    # トンネル名に対応するURLを取得
    url=$(echo "$tunnels_json" | grep -A10 "\"name\":\"$name\"" | grep -o '"public_url":"https://[^"]*"' | head -1 | cut -d'"' -f4)
    if [ -n "$url" ]; then
        echo -e "${GREEN}${name}: ${url}${NC}"
    fi
done

# ポート番号も表示
echo ""
echo -e "${YELLOW}対応ポート:${NC}"
echo "$tunnels_json" | grep -o '"addr":"[^"]*"' | while read -r addr_line; do
    addr=$(echo "$addr_line" | cut -d'"' -f4)
    echo "  - $addr"
done

echo ""

