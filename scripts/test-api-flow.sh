#!/bin/bash
# =============================================================================
# cOralup E2E APIテストスクリプト
# =============================================================================
# 使用方法:
#   ./scripts/test-api-flow.sh [BASE_URL]
#
# 例:
#   ./scripts/test-api-flow.sh http://localhost:3000
#   ./scripts/test-api-flow.sh https://coralup.vercel.app
# =============================================================================

set -e

BASE_URL="${1:-http://localhost:3000}"
TIMESTAMP=$(date +%s)
TEST_LINE_USER_ID="Utest_${TIMESTAMP}"

echo "=========================================="
echo "cOralup E2E APIテスト"
echo "=========================================="
echo "Base URL: $BASE_URL"
echo "Test LINE User ID: $TEST_LINE_USER_ID"
echo ""

# 色付き出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

success() { echo -e "${GREEN}✓ $1${NC}"; }
error() { echo -e "${RED}✗ $1${NC}"; }
info() { echo -e "${YELLOW}→ $1${NC}"; }

# =============================================================================
# Test 1: 親御さん基本情報保存
# =============================================================================
echo ""
echo "----------------------------------------"
echo "Test 1: 親御さん基本情報保存"
echo "----------------------------------------"

BASIC_INFO_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/parent/basic-info" \
  -H "Content-Type: application/json" \
  -d "{
    \"lineUserId\": \"${TEST_LINE_USER_ID}\",
    \"parentFirstName\": \"太郎\",
    \"parentLastName\": \"テスト\",
    \"parentPhone\": \"09012345678\",
    \"childFirstName\": \"花子\",
    \"childLastName\": \"テスト\",
    \"childBirthday\": \"2020-03-15\",
    \"childGender\": \"female\"
  }")

echo "Response: $BASIC_INFO_RESPONSE"

# レスポンス解析
if echo "$BASIC_INFO_RESPONSE" | grep -q '"success":true'; then
  success "基本情報保存成功"
  
  # visitId, sessionId を抽出
  VISIT_ID=$(echo "$BASIC_INFO_RESPONSE" | grep -o '"visitId":"[^"]*"' | cut -d'"' -f4)
  SESSION_ID=$(echo "$BASIC_INFO_RESPONSE" | grep -o '"sessionId":"[^"]*"' | cut -d'"' -f4)
  PROFILE_ID=$(echo "$BASIC_INFO_RESPONSE" | grep -o '"profileId":"[^"]*"' | cut -d'"' -f4)
  CHILD_ID=$(echo "$BASIC_INFO_RESPONSE" | grep -o '"childId":"[^"]*"' | cut -d'"' -f4)
  
  echo "  Visit ID: $VISIT_ID"
  echo "  Session ID: $SESSION_ID"
  echo "  Profile ID: $PROFILE_ID"
  echo "  Child ID: $CHILD_ID"
else
  error "基本情報保存失敗"
  exit 1
fi

# =============================================================================
# Test 2: 問診項目取得
# =============================================================================
echo ""
echo "----------------------------------------"
echo "Test 2: 問診項目取得"
echo "----------------------------------------"

QUESTIONNAIRE_ITEMS=$(curl -s "${BASE_URL}/api/questionnaire/items?target_age=preschool")

if echo "$QUESTIONNAIRE_ITEMS" | grep -q '"success":true'; then
  success "問診項目取得成功"
  
  # カテゴリ数をカウント
  CATEGORY_COUNT=$(echo "$QUESTIONNAIRE_ITEMS" | grep -o '"id":' | wc -l)
  echo "  カテゴリ/項目数: $CATEGORY_COUNT"
  
  # 最初の項目IDを取得
  FIRST_ITEM_ID=$(echo "$QUESTIONNAIRE_ITEMS" | grep -o '"id":"[^"]*"' | head -5 | tail -1 | cut -d'"' -f4)
  echo "  サンプル項目ID: $FIRST_ITEM_ID"
else
  error "問診項目取得失敗"
fi

# =============================================================================
# Test 3: 問診回答保存
# =============================================================================
echo ""
echo "----------------------------------------"
echo "Test 3: 問診回答保存"
echo "----------------------------------------"

if [ -n "$VISIT_ID" ] && [ -n "$FIRST_ITEM_ID" ]; then
  QUESTIONNAIRE_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/parent/questionnaire" \
    -H "Content-Type: application/json" \
    -d "{
      \"visitId\": \"${VISIT_ID}\",
      \"sessionId\": \"${SESSION_ID}\",
      \"answers\": {
        \"${FIRST_ITEM_ID}\": \"yes\"
      }
    }")
  
  echo "Response: $QUESTIONNAIRE_RESPONSE"
  
  if echo "$QUESTIONNAIRE_RESPONSE" | grep -q '"success":true'; then
    success "問診回答保存成功"
  else
    error "問診回答保存失敗"
  fi
else
  info "スキップ（visitId または itemId がありません）"
fi

# =============================================================================
# Test 4: スタッフセッション取得
# =============================================================================
echo ""
echo "----------------------------------------"
echo "Test 4: スタッフセッション取得"
echo "----------------------------------------"

if [ -n "$VISIT_ID" ]; then
  SESSION_RESPONSE=$(curl -s "${BASE_URL}/api/staff/session?visitId=${VISIT_ID}")
  
  echo "Response: $SESSION_RESPONSE"
  
  if echo "$SESSION_RESPONSE" | grep -q '"success":true'; then
    success "セッション取得成功"
    
    # 問診回答数を確認
    RESPONSE_COUNT=$(echo "$SESSION_RESPONSE" | grep -o '"questionnaire_responses":\[' | wc -l)
    echo "  問診回答あり: $([ $RESPONSE_COUNT -gt 0 ] && echo 'Yes' || echo 'No')"
  else
    error "セッション取得失敗"
  fi
else
  info "スキップ（visitId がありません）"
fi

# =============================================================================
# Test 5: 親御さんvisit復元
# =============================================================================
echo ""
echo "----------------------------------------"
echo "Test 5: 親御さんvisit復元"
echo "----------------------------------------"

VISIT_RESTORE=$(curl -s "${BASE_URL}/api/parent/visit?line_user_id=${TEST_LINE_USER_ID}")

echo "Response: $VISIT_RESTORE"

if echo "$VISIT_RESTORE" | grep -q '"success":true'; then
  success "visit復元成功"
  
  # 復元されたデータを確認
  HAS_PROFILE=$(echo "$VISIT_RESTORE" | grep -q '"profile":' && echo "Yes" || echo "No")
  HAS_CHILD=$(echo "$VISIT_RESTORE" | grep -q '"child":' && echo "Yes" || echo "No")
  HAS_VISIT=$(echo "$VISIT_RESTORE" | grep -q '"visit":' && echo "Yes" || echo "No")
  
  echo "  Profile: $HAS_PROFILE"
  echo "  Child: $HAS_CHILD"
  echo "  Visit: $HAS_VISIT"
else
  error "visit復元失敗"
fi

# =============================================================================
# Test 6: 診断項目取得
# =============================================================================
echo ""
echo "----------------------------------------"
echo "Test 6: 診断項目取得"
echo "----------------------------------------"

DIAGNOSIS_ITEMS=$(curl -s "${BASE_URL}/api/diagnosis-schema?input_type=staff")

if echo "$DIAGNOSIS_ITEMS" | grep -q '"success":true'; then
  success "診断項目取得成功"
else
  # 別のエンドポイントを試す
  DIAGNOSIS_ITEMS=$(curl -s "${BASE_URL}/api/admin/diagnosis-schema")
  if echo "$DIAGNOSIS_ITEMS" | grep -q '"categories"'; then
    success "診断項目取得成功（admin API）"
  else
    error "診断項目取得失敗"
  fi
fi

# =============================================================================
# Test 7: レポートページ（デモ）
# =============================================================================
echo ""
echo "----------------------------------------"
echo "Test 7: レポートページ（デモ）"
echo "----------------------------------------"

REPORT_DEMO=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/report/demo")

if [ "$REPORT_DEMO" = "200" ]; then
  success "レポートデモページアクセス成功"
else
  error "レポートデモページアクセス失敗 (HTTP $REPORT_DEMO)"
fi

# =============================================================================
# サマリー
# =============================================================================
echo ""
echo "=========================================="
echo "テスト完了"
echo "=========================================="
echo ""
echo "作成されたテストデータ:"
echo "  LINE User ID: $TEST_LINE_USER_ID"
echo "  Profile ID: $PROFILE_ID"
echo "  Child ID: $CHILD_ID"
echo "  Visit ID: $VISIT_ID"
echo "  Session ID: $SESSION_ID"
echo ""
echo "次のステップ:"
echo "  1. Supabaseダッシュボードで上記IDのレコードを確認"
echo "  2. 手動でLINE LIFF画面をテスト"
echo "  3. 診断完了→LINE通知をテスト"
echo ""
echo "テストデータ削除SQL:"
echo "  DELETE FROM visits WHERE id = '${VISIT_ID}';"
echo "  DELETE FROM children WHERE id = '${CHILD_ID}';"
echo "  DELETE FROM profiles WHERE id = '${PROFILE_ID}';"

