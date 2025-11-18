#!/bin/bash
# ============================================================================
# Endpoint Testing Script
# ============================================================================
# Tests all server-side endpoints for tenant replication
# ============================================================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

BASE_URL="${BASE_URL:-http://localhost:3000}"
TENANT_ID="${TENANT_ID:-test-tenant}"
USER_ID="${USER_ID:-test-user}"

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}Testing Tenant Replication Endpoints${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""
echo "Base URL: $BASE_URL"
echo "Tenant ID: $TENANT_ID"
echo "User ID: $USER_ID"
echo ""

# Test counter
PASSED=0
FAILED=0

test_endpoint() {
    local name="$1"
    local method="$2"
    local url="$3"
    local data="$4"
    local expected_status="${5:-200}"
    
    echo -e "${BLUE}Testing: $name${NC}"
    echo "  $method $url"
    
    if [ -n "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" \
            -H "Content-Type: application/json" \
            -H "tenant-id: $TENANT_ID" \
            -H "user-id: $USER_ID" \
            -d "$data" 2>&1)
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" \
            -H "tenant-id: $TENANT_ID" \
            -H "user-id: $USER_ID" 2>&1)
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}  ✅ PASSED (HTTP $http_code)${NC}"
        echo "$body" | jq . 2>/dev/null || echo "$body" | head -5
        ((PASSED++))
    else
        echo -e "${RED}  ❌ FAILED (Expected $expected_status, got $http_code)${NC}"
        echo "$body" | head -10
        ((FAILED++))
    fi
    echo ""
}

# ============================================================================
# Health Endpoints
# ============================================================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Health Endpoints${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test_endpoint "Health Check" "GET" "$BASE_URL/health" "" 200
test_endpoint "Info Endpoint" "GET" "$BASE_URL/info" "" 200

# ============================================================================
# Sync Endpoints
# ============================================================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Sync Endpoints${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Test POST /mtdd/sync/changes (insert)
test_endpoint "Sync Changes (Insert)" "POST" "$BASE_URL/mtdd/sync/changes" '{
  "changes": [
    {
      "clientTxid": 1,
      "table_name": "users",
      "record_pk": "100",
      "mtds_device_id": 123,
      "action": "insert",
      "payload": {
        "New": {
          "id": 100,
          "name": "Test User",
          "email": "test@example.com",
          "age": 28,
          "tenant_id": "test-tenant"
        },
        "old": null
      }
    }
  ]
}' 200

# Test POST /mtdd/sync/changes (update)
test_endpoint "Sync Changes (Update)" "POST" "$BASE_URL/mtdd/sync/changes" '{
  "changes": [
    {
      "clientTxid": 2,
      "table_name": "users",
      "record_pk": "100",
      "mtds_device_id": 123,
      "action": "update",
      "payload": {
        "New": {
          "id": 100,
          "name": "Updated User",
          "email": "updated@example.com",
          "age": 29,
          "tenant_id": "test-tenant"
        },
        "old": {
          "id": 100,
          "name": "Test User",
          "email": "test@example.com",
          "age": 28,
          "tenant_id": "test-tenant"
        }
      }
    }
  ]
}' 200

# Test POST /mtdd/sync/bulk-load
test_endpoint "Bulk Load (users)" "POST" "$BASE_URL/mtdd/sync/bulk-load" '{
  "tables": ["users"]
}' 200

test_endpoint "Bulk Load (multiple tables)" "POST" "$BASE_URL/mtdd/sync/bulk-load" '{
  "tables": ["users", "products"]
}' 200

# Test GET /mtdd/sync/tables/:tableName
test_endpoint "Load Table (users)" "GET" "$BASE_URL/mtdd/sync/tables/users?lastUpdated=0" "" 200

test_endpoint "Load Table (products)" "GET" "$BASE_URL/mtdd/sync/tables/products?lastUpdated=0" "" 200

# ============================================================================
# Summary
# ============================================================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
TOTAL=$((PASSED + FAILED))
echo -e "Total Tests: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
if [ $FAILED -gt 0 ]; then
    echo -e "${RED}Failed: $FAILED${NC}"
else
    echo -e "${GREEN}Failed: $FAILED${NC}"
fi
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi

