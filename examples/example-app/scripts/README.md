# Database Setup Scripts

Scripts for setting up the database for tenant replication testing.

## 📋 Scripts

### `setup-database.sql`
Main SQL script that creates:
- Tables: `users`, `products` (matching Flutter client schema)
- Stored procedures: `get_users()`, `get_products()`
- Triggers: PostgreSQL NOTIFY for SSE events
- Indexes: For performance
- Test data: Sample users and products

### `setup-database.sh`
Shell script that:
- Checks if database exists
- Creates database if needed
- Runs the SQL setup script
- Provides colored output and error handling

### `clean-database.sql`
Cleanup script that removes all tables, functions, and triggers.

### `test-endpoints.sh`
Automated testing script for all endpoints.

## 🚀 Usage

### Setup Database

```bash
# Option 1: Use the shell script (recommended)
./scripts/setup-database.sh

# Option 2: Run SQL directly
psql -U postgres -d mtdd_dev -f scripts/setup-database.sql

# Option 3: With environment variables
DB_HOST=localhost DB_PORT=5432 DB_USER=postgres DB_NAME=mtdd_dev ./scripts/setup-database.sh
```

### Clean Database

```bash
psql -U postgres -d mtdd_dev -f scripts/clean-database.sql
```

### Test Endpoints

```bash
# Run all endpoint tests
./scripts/test-endpoints.sh

# With custom base URL
BASE_URL=http://localhost:3000 ./scripts/test-endpoints.sh
```

## 📊 Database Schema

### Users Table
```sql
-- NOTE: Primary keys are client-generated, NOT auto-incrementing
-- The SDK does NOT create tables or primary key columns
CREATE TABLE users (
    id BIGINT PRIMARY KEY,  -- Client-generated primary key (NOT SERIAL)
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    age INTEGER,
    tenant_id TEXT NOT NULL,
    mtds_server_ts BIGINT NOT NULL DEFAULT 0,
    mtds_client_ts BIGINT,
    mtds_device_id BIGINT NOT NULL DEFAULT 0,
    mtds_delete_ts BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Products Table
```sql
-- NOTE: Primary keys are client-generated, NOT auto-incrementing
CREATE TABLE products (
    id BIGINT PRIMARY KEY,  -- Client-generated primary key (NOT SERIAL)
    name TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    description TEXT,
    tenant_id TEXT NOT NULL,
    mtds_server_ts BIGINT NOT NULL DEFAULT 0,
    mtds_client_ts BIGINT,
    mtds_device_id BIGINT NOT NULL DEFAULT 0,
    mtds_delete_ts BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔧 Stored Procedures

### `get_users(last_updated_txid BIGINT, tenant_id_param TEXT)`
Returns all users for a tenant that have been updated since `last_updated_txid`.

### `get_products(last_updated_txid BIGINT, tenant_id_param TEXT)`
Returns all products for a tenant that have been updated since `last_updated_txid`.

## 🔔 PostgreSQL NOTIFY

The setup creates triggers that send NOTIFY events on the `table_changes` channel whenever data changes. This is used for Server-Sent Events (SSE).

## 🧪 Test Data

The script inserts:
- 3 test users for `test-tenant`
- 3 test products for `test-tenant`

You can modify the test data in `setup-database.sql` as needed.

