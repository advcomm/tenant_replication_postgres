-- ============================================================================
-- Database Setup Script for Tenant Replication Testing
-- ============================================================================
-- This script creates the necessary tables, stored procedures, and test data
-- to match the Flutter client SDK schema for end-to-end testing.
--
-- Usage:
--   psql -U postgres -d mtdd_dev -f scripts/setup-database.sql
-- ============================================================================

-- ============================================================================
-- 1. Create Users Table (matches Flutter client schema)
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    age INTEGER,
    tenant_id TEXT NOT NULL,  -- Tenant column for multi-tenant support
    -- MTDS required columns
    mtds_last_updated_txid BIGINT NOT NULL DEFAULT 0,
    mtds_device_id INTEGER NOT NULL DEFAULT 0,
    mtds_deleted_txid BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 2. Create Products Table (matches Flutter client schema)
-- ============================================================================
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    description TEXT,
    tenant_id TEXT NOT NULL,  -- Tenant column for multi-tenant support
    -- MTDS required columns
    mtds_last_updated_txid BIGINT NOT NULL DEFAULT 0,
    mtds_device_id INTEGER NOT NULL DEFAULT 0,
    mtds_deleted_txid BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 3. Create Indexes for Performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_mtds_txid ON users(mtds_last_updated_txid);
CREATE INDEX IF NOT EXISTS idx_users_mtds_deleted ON users(mtds_deleted_txid) WHERE mtds_deleted_txid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_mtds_txid ON products(mtds_last_updated_txid);
CREATE INDEX IF NOT EXISTS idx_products_mtds_deleted ON products(mtds_deleted_txid) WHERE mtds_deleted_txid IS NOT NULL;

-- ============================================================================
-- 4. Create Stored Procedures for Data Loading
-- ============================================================================

-- Function to get users for a tenant
CREATE OR REPLACE FUNCTION get_users(
    last_updated_txid BIGINT,
    tenant_id_param TEXT
)
RETURNS TABLE (
    id INTEGER,
    name TEXT,
    email TEXT,
    age INTEGER,
    tenant_id TEXT,
    mtds_last_updated_txid BIGINT,
    mtds_device_id INTEGER,
    mtds_deleted_txid BIGINT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.name,
        u.email,
        u.age,
        u.tenant_id,
        u.mtds_last_updated_txid,
        u.mtds_device_id,
        u.mtds_deleted_txid,
        u.created_at,
        u.updated_at
    FROM users u
    WHERE u.tenant_id = tenant_id_param
      AND (u.mtds_deleted_txid IS NULL OR u.mtds_deleted_txid = 0)
      AND u.mtds_last_updated_txid > last_updated_txid
    ORDER BY u.mtds_last_updated_txid ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to get products for a tenant
CREATE OR REPLACE FUNCTION get_products(
    last_updated_txid BIGINT,
    tenant_id_param TEXT
)
RETURNS TABLE (
    id INTEGER,
    name TEXT,
    price DECIMAL(10, 2),
    description TEXT,
    tenant_id TEXT,
    mtds_last_updated_txid BIGINT,
    mtds_device_id INTEGER,
    mtds_deleted_txid BIGINT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.price,
        p.description,
        p.tenant_id,
        p.mtds_last_updated_txid,
        p.mtds_device_id,
        p.mtds_deleted_txid,
        p.created_at,
        p.updated_at
    FROM products p
    WHERE p.tenant_id = tenant_id_param
      AND (p.mtds_deleted_txid IS NULL OR p.mtds_deleted_txid = 0)
      AND p.mtds_last_updated_txid > last_updated_txid
    ORDER BY p.mtds_last_updated_txid ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. Create Triggers for PostgreSQL NOTIFY (for SSE events)
-- ============================================================================

-- Function to notify on table changes
CREATE OR REPLACE FUNCTION notify_table_change()
RETURNS TRIGGER AS $$
DECLARE
    payload JSONB;
    table_name TEXT;
    action_type TEXT;
BEGIN
    table_name := TG_TABLE_NAME;
    
    -- Determine action type
    IF TG_OP = 'INSERT' THEN
        action_type := 'insert';
        payload := jsonb_build_object(
            'table', table_name,
            'action', action_type,
            'data', to_jsonb(NEW)
        );
    ELSIF TG_OP = 'UPDATE' THEN
        action_type := 'update';
        payload := jsonb_build_object(
            'table', table_name,
            'action', action_type,
            'data', to_jsonb(NEW)
        );
    ELSIF TG_OP = 'DELETE' THEN
        action_type := 'delete';
        payload := jsonb_build_object(
            'table', table_name,
            'action', action_type,
            'data', to_jsonb(OLD)
        );
    END IF;
    
    -- Notify on the table_changes channel
    PERFORM pg_notify('table_changes', payload::text);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for users table
DROP TRIGGER IF EXISTS trigger_users_notify ON users;
CREATE TRIGGER trigger_users_notify
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION notify_table_change();

-- Create triggers for products table
DROP TRIGGER IF EXISTS trigger_products_notify ON products;
CREATE TRIGGER trigger_products_notify
    AFTER INSERT OR UPDATE OR DELETE ON products
    FOR EACH ROW
    EXECUTE FUNCTION notify_table_change();

-- ============================================================================
-- 6. Insert Test Data
-- ============================================================================

-- Insert test users
INSERT INTO users (name, email, age, tenant_id, mtds_last_updated_txid, mtds_device_id)
VALUES 
    ('John Doe', 'john@example.com', 30, 'test-tenant', 1000, 1),
    ('Jane Smith', 'jane@example.com', 25, 'test-tenant', 1001, 1),
    ('Bob Johnson', 'bob@example.com', 35, 'test-tenant', 1002, 1)
ON CONFLICT DO NOTHING;

-- Insert test products
INSERT INTO products (name, price, description, tenant_id, mtds_last_updated_txid, mtds_device_id)
VALUES 
    ('Laptop', 999.99, 'High-performance laptop', 'test-tenant', 2000, 1),
    ('Mouse', 29.99, 'Wireless mouse', 'test-tenant', 2001, 1),
    ('Keyboard', 79.99, 'Mechanical keyboard', 'test-tenant', 2002, 1)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 7. Grant Permissions (if needed)
-- ============================================================================
-- GRANT SELECT, INSERT, UPDATE, DELETE ON users TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON products TO your_app_user;
-- GRANT EXECUTE ON FUNCTION get_users(BIGINT, TEXT) TO your_app_user;
-- GRANT EXECUTE ON FUNCTION get_products(BIGINT, TEXT) TO your_app_user;

-- ============================================================================
-- 8. Verify Setup
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Database setup complete!';
    RAISE NOTICE '   - Tables: users, products';
    RAISE NOTICE '   - Functions: get_users(), get_products()';
    RAISE NOTICE '   - Triggers: notify_table_change()';
    RAISE NOTICE '   - Test data inserted';
END $$;

