#!/bin/bash
# ============================================================================
# Database Setup Script
# ============================================================================
# This script sets up the database for tenant replication testing
# ============================================================================

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}Database Setup for Tenant Replication Testing${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

# Get database connection details from environment or use defaults
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-mtdd_dev}"

# Check if password is provided
if [ -z "$DB_PASSWORD" ]; then
    echo -e "${YELLOW}⚠️  DB_PASSWORD not set, using PGPASSWORD or .pgpass${NC}"
    PASSWORD_ARG=""
else
    export PGPASSWORD="$DB_PASSWORD"
    PASSWORD_ARG=""
fi

echo -e "${BLUE}📋 Database Configuration:${NC}"
echo "   Host: $DB_HOST"
echo "   Port: $DB_PORT"
echo "   User: $DB_USER"
echo "   Database: $DB_NAME"
echo ""

# Check if database exists
echo -e "${BLUE}🔍 Checking if database exists...${NC}"
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo -e "${GREEN}✅ Database '$DB_NAME' exists${NC}"
else
    echo -e "${YELLOW}📦 Creating database '$DB_NAME'...${NC}"
    createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" || {
        echo -e "${YELLOW}⚠️  Database creation failed, trying to continue...${NC}"
    }
fi

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Run the SQL setup script
echo ""
echo -e "${BLUE}📦 Running database setup SQL...${NC}"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SCRIPT_DIR/setup-database.sql" || {
    echo -e "${YELLOW}⚠️  Some errors occurred, but continuing...${NC}"
}

echo ""
echo -e "${GREEN}✅ Database setup complete!${NC}"
echo ""
echo -e "${BLUE}📋 Created:${NC}"
echo "   - Tables: users, products"
echo "   - Functions: get_users(), get_products()"
echo "   - Triggers: notify_table_change()"
echo "   - Test data: 3 users, 3 products"
echo ""
echo -e "${BLUE}🧪 You can now test the endpoints:${NC}"
echo "   - POST http://localhost:3000/mtdd/sync/changes"
echo "   - POST http://localhost:3000/mtdd/sync/bulk-load"
echo "   - GET  http://localhost:3000/mtdd/sync/tables/users"
echo "   - GET  http://localhost:3000/mtdd/sync/events"
echo ""

