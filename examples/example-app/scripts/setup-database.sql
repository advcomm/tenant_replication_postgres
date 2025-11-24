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
-- NOTE: Primary keys are client-generated, NOT auto-incrementing
-- The SDK does NOT create tables or primary key columns
CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY,  -- Client-generated primary key (NOT SERIAL)
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    age INTEGER,
    tenant_id TEXT NOT NULL,  -- Tenant column for multi-tenant support
    -- MTDS required columns
    mtds_server_ts BIGINT NOT NULL DEFAULT 0,
    mtds_client_ts BIGINT,
    mtds_device_id BIGINT NOT NULL DEFAULT 0,
    mtds_delete_ts BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 2. Create Products Table (matches Flutter client schema)
-- ============================================================================
-- NOTE: Primary keys are client-generated, NOT auto-incrementing
CREATE TABLE IF NOT EXISTS products (
    id BIGINT PRIMARY KEY,  -- Client-generated primary key (NOT SERIAL)
    name TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    description TEXT,
    tenant_id TEXT NOT NULL,  -- Tenant column for multi-tenant support
    -- MTDS required columns
    mtds_server_ts BIGINT NOT NULL DEFAULT 0,
    mtds_client_ts BIGINT,
    mtds_device_id BIGINT NOT NULL DEFAULT 0,
    mtds_delete_ts BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 3. Create Indexes for Performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_mtds_server_ts ON users(mtds_server_ts);
CREATE INDEX IF NOT EXISTS idx_users_mtds_deleted ON users(mtds_delete_ts) WHERE mtds_delete_ts IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_mtds_server_ts ON products(mtds_server_ts);
CREATE INDEX IF NOT EXISTS idx_products_mtds_deleted ON products(mtds_delete_ts) WHERE mtds_delete_ts IS NOT NULL;

-- ============================================================================
-- 4. Create Stored Procedures for Data Loading
-- ============================================================================

-- Function to get users for a tenant
CREATE OR REPLACE FUNCTION get_users(
    last_updated_txid BIGINT,
    tenant_id_param TEXT
)
RETURNS TABLE (
    id BIGINT,
    name TEXT,
    email TEXT,
    age INTEGER,
    tenant_id TEXT,
    mtds_server_ts BIGINT,
    mtds_client_ts BIGINT,
    mtds_device_id BIGINT,
    mtds_delete_ts BIGINT,
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
        u.mtds_server_ts,
        u.mtds_client_ts,
        u.mtds_device_id,
        u.mtds_delete_ts,
        u.created_at,
        u.updated_at
    FROM users u
    WHERE u.tenant_id = tenant_id_param
      AND (u.mtds_delete_ts IS NULL OR u.mtds_delete_ts = 0)
      AND u.mtds_server_ts > last_updated_txid
    ORDER BY u.mtds_server_ts ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to get products for a tenant
CREATE OR REPLACE FUNCTION get_products(
    last_updated_txid BIGINT,
    tenant_id_param TEXT
)
RETURNS TABLE (
    id BIGINT,
    name TEXT,
    price DECIMAL(10, 2),
    description TEXT,
    tenant_id TEXT,
    mtds_server_ts BIGINT,
    mtds_client_ts BIGINT,
    mtds_device_id BIGINT,
    mtds_delete_ts BIGINT,
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
        p.mtds_server_ts,
        p.mtds_client_ts,
        p.mtds_device_id,
        p.mtds_delete_ts,
        p.created_at,
        p.updated_at
    FROM products p
    WHERE p.tenant_id = tenant_id_param
      AND (p.mtds_delete_ts IS NULL OR p.mtds_delete_ts = 0)
      AND p.mtds_server_ts > last_updated_txid
    ORDER BY p.mtds_server_ts ASC;
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

-- Insert test users (with client-generated primary keys)
INSERT INTO users (id, name, email, age, tenant_id, mtds_server_ts, mtds_device_id)
VALUES 
    (1001, 'John Doe', 'john@example.com', 30, 'test-tenant', 1000, 1),
    (1002, 'Jane Smith', 'jane@example.com', 25, 'test-tenant', 1001, 1),
    (1003, 'Bob Johnson', 'bob@example.com', 35, 'test-tenant', 1002, 1)
ON CONFLICT (id) DO NOTHING;

-- Insert test products (with client-generated primary keys)
INSERT INTO products (id, name, price, description, tenant_id, mtds_server_ts, mtds_device_id)
VALUES 
    (2001, 'Laptop', 999.99, 'High-performance laptop', 'test-tenant', 2000, 1),
    (2002, 'Mouse', 29.99, 'Wireless mouse', 'test-tenant', 2001, 1),
    (2003, 'Keyboard', 79.99, 'Mechanical keyboard', 'test-tenant', 2002, 1)
ON CONFLICT (id) DO NOTHING;

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

