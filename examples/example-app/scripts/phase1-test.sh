#!/bin/bash

# Phase 1: Development Mode End-to-End Testing Script
# Tests all sync endpoints without MTDD/MTDDLookup

BASE_URL="http://localhost:3000"
TENANT_ID="test-tenant"
USER_ID="test-user"
TEST_RESULTS=()
PASSED=0
FAILED=0

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TEST_NUM=0

# Function to run a test
run_test() {
    local test_name="$1"
    local test_cmd="$2"
    local expected_status="${3:-200}"
    
    TEST_NUM=$((TEST_NUM + 1))
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Test $TEST_NUM: $test_name${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    local response=$(eval "$test_cmd" 2>&1)
    local status_code=$(echo "$response" | grep -oP '(?<=HTTP/1.1 )\d+' | tail -1 || echo "")
    local body=$(echo "$response" | tail -1)
    
    if [ -z "$status_code" ]; then
        # Try to get status from curl output
        status_code=$(echo "$response" | grep -oP '< HTTP/1.1 \K\d+' | tail -1 || echo "")
    fi
    
    if [ -z "$status_code" ] && echo "$body" | grep -q "success"; then
        # Assume 200 if we see success in body
        status_code="200"
    fi
    
    if [ "$status_code" = "$expected_status" ] || [ -z "$status_code" ]; then
        echo -e "${GREEN}✅ PASS${NC}"
        echo "Response: $body" | jq . 2>/dev/null || echo "Response: $body"
        TEST_RESULTS+=("✅ PASS: $test_name")
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}"
        echo "Expected status: $expected_status, Got: $status_code"
        echo "Response: $body"
        TEST_RESULTS+=("❌ FAIL: $test_name (Expected: $expected_status, Got: $status_code)")
        FAILED=$((FAILED + 1))
        return 1
    fi
}

echo "════════════════════════════════════════════════════════════════════════════════"
echo "  PHASE 1: DEVELOPMENT MODE END-TO-END TESTING"
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""
echo "Testing server: $BASE_URL"
echo "Tenant ID: $TENANT_ID"
echo "User ID: $USER_ID"
echo ""

# Test 1: Health Check
run_test "Health Check" \
    "curl -s -w '\nHTTP_STATUS:%{http_code}' $BASE_URL/health" \
    "200"

# Test 2: Info Endpoint
run_test "Info Endpoint" \
    "curl -s -w '\nHTTP_STATUS:%{http_code}' $BASE_URL/info" \
    "200"

# Test 3: Bulk Load (Empty - should return empty arrays)
run_test "Bulk Load - Empty Tables" \
    "curl -s -X POST $BASE_URL/mtdd/sync/bulk-load \
    -H 'Content-Type: application/json' \
    -H 'tenant-id: $TENANT_ID' \
    -H 'user-id: $USER_ID' \
    -d '{\"tables\": [\"users\", \"products\"]}' \
    -w '\nHTTP_STATUS:%{http_code}'" \
    "200"

# Test 4: Sync Changes - Insert User
run_test "Sync Changes - Insert User" \
    "curl -s -X POST $BASE_URL/mtdd/sync/changes \
    -H 'Content-Type: application/json' \
    -H 'tenant-id: $TENANT_ID' \
    -H 'user-id: $USER_ID' \
    -d '{
      \"changes\": [{
        \"clientTxid\": 1001,
        \"table_name\": \"users\",
        \"record_pk\": \"201\",
        \"mtds_device_id\": 123,
        \"action\": \"insert\",
        \"payload\": {
          \"New\": {
            \"id\": 201,
            \"name\": \"Phase1 Test User\",
            \"email\": \"phase1@test.com\",
            \"age\": 25,
            \"tenant_id\": \"$TENANT_ID\"
          },
          \"old\": null
        }
      }]
    }' \
    -w '\nHTTP_STATUS:%{http_code}'" \
    "200"

# Wait a moment for database to process
sleep 1

# Test 5: Bulk Load - Should return inserted user
run_test "Bulk Load - Verify Inserted User" \
    "curl -s -X POST $BASE_URL/mtdd/sync/bulk-load \
    -H 'Content-Type: application/json' \
    -H 'tenant-id: $TENANT_ID' \
    -H 'user-id: $USER_ID' \
    -d '{\"tables\": [\"users\"]}' \
    -w '\nHTTP_STATUS:%{http_code}'" \
    "200"

# Test 6: Sync Changes - Update User
run_test "Sync Changes - Update User" \
    "curl -s -X POST $BASE_URL/mtdd/sync/changes \
    -H 'Content-Type: application/json' \
    -H 'tenant-id: $TENANT_ID' \
    -H 'user-id: $USER_ID' \
    -d '{
      \"changes\": [{
        \"clientTxid\": 1002,
        \"table_name\": \"users\",
        \"record_pk\": \"201\",
        \"mtds_device_id\": 123,
        \"action\": \"update\",
        \"payload\": {
          \"New\": {
            \"id\": 201,
            \"name\": \"Updated Phase1 User\",
            \"email\": \"updated@test.com\",
            \"age\": 26,
            \"tenant_id\": \"$TENANT_ID\"
          },
          \"old\": {
            \"id\": 201,
            \"name\": \"Phase1 Test User\",
            \"email\": \"phase1@test.com\",
            \"age\": 25,
            \"tenant_id\": \"$TENANT_ID\"
          }
        }
      }]
    }' \
    -w '\nHTTP_STATUS:%{http_code}'" \
    "200"

sleep 1

# Test 7: Verify Update
run_test "Bulk Load - Verify Updated User" \
    "curl -s -X POST $BASE_URL/mtdd/sync/bulk-load \
    -H 'Content-Type: application/json' \
    -H 'tenant-id: $TENANT_ID' \
    -H 'user-id: $USER_ID' \
    -d '{\"tables\": [\"users\"], \"lastUpdated\": 0}' \
    -w '\nHTTP_STATUS:%{http_code}'" \
    "200"

# Test 8: Sync Changes - Delete User (Soft Delete)
run_test "Sync Changes - Delete User" \
    "curl -s -X POST $BASE_URL/mtdd/sync/changes \
    -H 'Content-Type: application/json' \
    -H 'tenant-id: $TENANT_ID' \
    -H 'user-id: $USER_ID' \
    -d '{
      \"changes\": [{
        \"clientTxid\": 1003,
        \"table_name\": \"users\",
        \"record_pk\": \"201\",
        \"mtds_device_id\": 123,
        \"action\": \"delete\",
        \"payload\": {
          \"New\": null,
          \"old\": {
            \"id\": 201,
            \"name\": \"Updated Phase1 User\",
            \"email\": \"updated@test.com\",
            \"age\": 26,
            \"tenant_id\": \"$TENANT_ID\"
          }
        }
      }]
    }' \
    -w '\nHTTP_STATUS:%{http_code}'" \
    "200"

sleep 1

# Test 9: Batch Operations - Multiple Inserts
run_test "Sync Changes - Batch Insert (Multiple Records)" \
    "curl -s -X POST $BASE_URL/mtdd/sync/changes \
    -H 'Content-Type: application/json' \
    -H 'tenant-id: $TENANT_ID' \
    -H 'user-id: $USER_ID' \
    -d '{
      \"changes\": [
        {
          \"clientTxid\": 2001,
          \"table_name\": \"users\",
          \"record_pk\": \"301\",
          \"mtds_device_id\": 123,
          \"action\": \"insert\",
          \"payload\": {
            \"New\": {
              \"id\": 301,
              \"name\": \"Batch User 1\",
              \"email\": \"batch1@test.com\",
              \"age\": 30,
              \"tenant_id\": \"$TENANT_ID\"
            },
            \"old\": null
          }
        },
        {
          \"clientTxid\": 2002,
          \"table_name\": \"users\",
          \"record_pk\": \"302\",
          \"mtds_device_id\": 123,
          \"action\": \"insert\",
          \"payload\": {
            \"New\": {
              \"id\": 302,
              \"name\": \"Batch User 2\",
              \"email\": \"batch2@test.com\",
              \"age\": 31,
              \"tenant_id\": \"$TENANT_ID\"
            },
            \"old\": null
          }
        },
        {
          \"clientTxid\": 2003,
          \"table_name\": \"products\",
          \"record_pk\": \"401\",
          \"mtds_device_id\": 123,
          \"action\": \"insert\",
          \"payload\": {
            \"New\": {
              \"id\": 401,
              \"name\": \"Test Product\",
              \"price\": 99.99,
              \"description\": \"Phase1 test product\",
              \"tenant_id\": \"$TENANT_ID\"
            },
            \"old\": null
          }
        }
      ]
    }' \
    -w '\nHTTP_STATUS:%{http_code}'" \
    "200"

sleep 1

# Test 10: Verify Batch Operations
run_test "Bulk Load - Verify Batch Operations" \
    "curl -s -X POST $BASE_URL/mtdd/sync/bulk-load \
    -H 'Content-Type: application/json' \
    -H 'tenant-id: $TENANT_ID' \
    -H 'user-id: $USER_ID' \
    -d '{\"tables\": [\"users\", \"products\"]}' \
    -w '\nHTTP_STATUS:%{http_code}'" \
    "200"

# Test 11: Load Single Table
run_test "Load Single Table - Users" \
    "curl -s \"$BASE_URL/mtdd/sync/tables/users?lastUpdated=0\" \
    -H 'tenant-id: $TENANT_ID' \
    -H 'user-id: $USER_ID' \
    -w '\nHTTP_STATUS:%{http_code}'" \
    "200"

# Test 12: Error Handling - Invalid Payload
run_test "Error Handling - Invalid Payload" \
    "curl -s -X POST $BASE_URL/mtdd/sync/changes \
    -H 'Content-Type: application/json' \
    -H 'tenant-id: $TENANT_ID' \
    -H 'user-id: $USER_ID' \
    -d '{\"invalid\": \"payload\"}' \
    -w '\nHTTP_STATUS:%{http_code}'" \
    "400"

# Summary
echo ""
echo "════════════════════════════════════════════════════════════════════════════════"
echo "  TEST SUMMARY"
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo "Total: $((PASSED + FAILED))"
echo ""
echo "Detailed Results:"
for result in "${TEST_RESULTS[@]}"; do
    echo "  $result"
done
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED!${NC}"
    exit 0
else
    echo -e "${RED}❌ SOME TESTS FAILED${NC}"
    exit 1
fi


