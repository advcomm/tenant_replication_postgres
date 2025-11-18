-- ============================================================================
-- Database Cleanup Script
-- ============================================================================
-- This script removes all test data and resets the database
-- ============================================================================

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_users_notify ON users;
DROP TRIGGER IF EXISTS trigger_products_notify ON products;

-- Drop functions
DROP FUNCTION IF EXISTS notify_table_change() CASCADE;
DROP FUNCTION IF EXISTS get_users(BIGINT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_products(BIGINT, TEXT) CASCADE;

-- Drop tables (CASCADE to drop dependent objects)
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop indexes if they exist independently
DROP INDEX IF EXISTS idx_users_tenant_id CASCADE;
DROP INDEX IF EXISTS idx_users_mtds_txid CASCADE;
DROP INDEX IF EXISTS idx_users_mtds_deleted CASCADE;
DROP INDEX IF EXISTS idx_products_tenant_id CASCADE;
DROP INDEX IF EXISTS idx_products_mtds_txid CASCADE;
DROP INDEX IF EXISTS idx_products_mtds_deleted CASCADE;

DO $$
BEGIN
    RAISE NOTICE '✅ Database cleanup complete!';
    RAISE NOTICE '   - All tables dropped';
    RAISE NOTICE '   - All functions dropped';
    RAISE NOTICE '   - All triggers dropped';
END $$;

