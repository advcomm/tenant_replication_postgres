# @advcomm/tenant_replication_postgres

> Multi-tenant database replication library with client-server sync, MTDD routing, and real-time notifications.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 Features

- **🔄 Client-Server Sync** - Bidirectional data synchronization with conflict resolution
- **⚡ Real-time Updates** - Server-Sent Events (SSE) for live database change notifications
- **🎯 MTDD Routing** - Optional tenant-aware query routing via gRPC (production mode)
- **📱 Push Notifications** - Firebase Cloud Messaging integration
- **✅ Type Safety** - Full TypeScript with runtime validation (Zod)
- **📊 Structured Logging** - Pino logger with environment-aware verbosity
- **🔐 Authentication** - JWT-based auth with tenant isolation

---

## 📦 Installation

```bash
npm install @advcomm/tenant_replication_postgres
```

**Requirements:**
- Node.js 20+
- Express.js (your app must provide Express)
- PostgreSQL database

---

## ⚡ Quick Start

### 1. Initialize the Library

```typescript
import express from 'express';
import { InitializeReplicationWithDb } from '@advcomm/tenant_replication_postgres';
import type { DatabaseConfig, LibraryConfig } from '@advcomm/tenant_replication_postgres';

const app = express();
app.use(express.json());

// Database configuration
const dbConfig: DatabaseConfig = {
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'mydb',
  },
};

// Library configuration
const libraryConfig: LibraryConfig = {
  mtdd: {
    useMtdd: false, // false = direct PostgreSQL, true = gRPC routing
    isDevelopment: process.env.NODE_ENV === 'development',
    // When useMtdd: true, provide:
    // queryServers: ['grpc-server1:50051', 'grpc-server2:50051'],
    // lookupServer: 'lookup-server:50054',
    grpcInsecure: false,
  },
  portal: {
    tenantColumnName: 'tenant_id', // Your tenant column name (default: 'tenant_id')
    portalId: 1,
    portalName: 'YourPortal',
  },
  firebase: {
    // Optional: Firebase config for push notifications
    type: 'service_account',
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
  },
};

// Initialize library (creates Knex instance and mounts routes)
const db = await InitializeReplicationWithDb(app, dbConfig, libraryConfig);

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

### 2. Add Authentication Middleware

**CRITICAL:** The library expects authenticated requests with tenant and user information. Add your auth middleware **before** library initialization:

```typescript
import { authMiddleware } from './middleware/auth'; // Your auth middleware

// Add auth middleware BEFORE InitializeReplicationWithDb
app.use('/mtdd/sync', authMiddleware);

// Then initialize library
const db = await InitializeReplicationWithDb(app, dbConfig, libraryConfig);
```

Your auth middleware must populate:
- `req.tid` - Tenant ID (string | number) - **REQUIRED**
- `req.sub` - User ID (string) - **REQUIRED**
- `req.roles` - User roles (string[]) - Optional

---

## 🌐 API Endpoints

The library automatically mounts these endpoints at `/mtdd/sync/*`:

### POST `/mtdd/sync/changes`

Receive and apply client changes (insert, update, delete).

**Request:**
```json
{
  "changes": [
    {
      "clientTxid": 1234567890,
      "table_name": "users",
      "record_pk": "550e8400-e29b-41d4-a716-446655440000",  // Client-generated primary key
      "mtds_device_id": "device-123",
      "action": "insert",
      "payload": {
        "New": {
          "id": "550e8400-e29b-41d4-a716-446655440000",  // Must match record_pk
          "name": "John Doe",
          "email": "john@example.com"
        }
      }
    }
  ]
}
```

**Note:** The `record_pk` and the primary key value in `payload.New` must match. Primary keys are generated on the client side and used as-is for syncing across devices.

**Response:**
```json
{
  "success": true,
  "processed": 1,
  "errors": 0,
  "updates": [
    {
      "clientTxid": 1234567890,
      "serverTxid": 9876543210,
      "tableName": "users",
      "pk": "550e8400-e29b-41d4-a716-446655440000"
    }
  ],
  "failures": []
}
```

**Important:** The server automatically injects `tenant_id` from the authenticated request. Clients should **not** include `tenant_id` in payloads.

### POST `/mtdd/sync/bulk-load`

Bulk load multiple tables for client synchronization.

**Request:**
```json
{
  "tables": ["users", "products"],
  "lastUpdated": 1697000000,
  "deviceId": "device-123"
}
```

**Response:**
```json
{
  "users": [...],
  "products": [...]
}
```

### GET `/mtdd/sync/tables/:tableName`

Load data from a specific table.

**Query Parameters:**
- `lastUpdated` (optional) - Timestamp for incremental sync
- `deviceId` (optional) - Device identifier

**Example:**
```bash
GET /mtdd/sync/tables/users?lastUpdated=1697000000&deviceId=device-123
```

### GET `/mtdd/sync/events`

Server-Sent Events endpoint for real-time database change notifications.

**Query Parameters:**
- `deviceId` (required) - Device identifier

**Client Example:**
```javascript
const eventSource = new EventSource(
  'http://localhost:3000/mtdd/sync/events?deviceId=device-123',
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);

eventSource.addEventListener('message', (event) => {
  const update = JSON.parse(event.data);
  console.log('Database update:', update);
  // update.type: 'insert' | 'update' | 'delete'
  // update.table: table name
  // update.data: row data
  // update.pkColumn: primary key column name
  // update.pkValue: primary key value
});
```

**Event Format:**
```json
{
  "type": "insert",
  "action": "insert",
  "table": "users",
  "pkColumn": "id",
  "pkValue": 1,
  "data": { "id": 1, "name": "John", "tenant_id": "tenant-123" },
  "timestamp": "2025-01-18T12:00:00.000Z"
}
```

---

## 🔧 Configuration

### DatabaseConfig

```typescript
interface DatabaseConfig {
  connection: {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
  };
  debug?: boolean;
}
```

### LibraryConfig

```typescript
interface LibraryConfig {
  mtdd?: {
    useMtdd?: boolean;           // false = direct PostgreSQL, true = gRPC
    queryServers?: string[];     // Required when useMtdd = true
    lookupServer?: string;       // Required when useMtdd = true
    isDevelopment?: boolean;     // Enables dev logging and local PostgreSQL
    grpcInsecure?: boolean;      // Use SSL in production (false)
  };
  portal?: {
    tenantColumnName?: string;   // Default: 'tenant_id'
    portalId?: number;
    portalName?: string;
    tenantInsertProc?: string;
  };
  firebase?: FirebaseConfig;     // Optional: Push notifications
}
```

---

## 🔐 Authentication Requirements

All sync endpoints require authentication. Your middleware must set:

```typescript
interface AuthenticatedRequest extends Request {
  tid: string | number;    // Tenant ID - REQUIRED
  sub: string;             // User ID - REQUIRED
  roles?: string[];        // User roles - Optional
}
```

**Example Auth Middleware:**
```typescript
import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from './auth'; // Your JWT verification

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const decoded = verifyToken(token);
    (req as any).tid = decoded.tenantId;  // Set tenant ID
    (req as any).sub = decoded.userId;    // Set user ID
    (req as any).roles = decoded.roles || [];
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

---

## 📊 Database Schema Requirements

**Important:** The SDK does **NOT** create tables or primary key columns. You must create your tables with primary keys that are **client-generated** (e.g., UUID, BIGINT, or TEXT). The SDK uses these primary keys as-is for syncing data between devices of the same tenant.

Your tables must include these columns for sync functionality:

```sql
CREATE TABLE users (
  id BIGINT PRIMARY KEY,              -- Client-generated primary key (NOT SERIAL/AUTO_INCREMENT)
  tenant_id TEXT NOT NULL,              -- Tenant isolation column
  name TEXT,
  email TEXT,
  -- Your business columns...
  
  -- Sync tracking columns (required)
  mtds_server_ts BIGINT NOT NULL DEFAULT 0,  -- Server transaction ID (nanoseconds since Unix epoch)
  mtds_client_ts BIGINT,                      -- Client timestamp (optional, milliseconds since client epoch)
  mtds_device_id BIGINT NOT NULL DEFAULT 0,  -- Device that made the change (64-bit)
  mtds_delete_ts BIGINT                      -- Soft delete marker (NULL = active, non-NULL = deleted)
);

-- Indexes for performance
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_mtds_server_ts ON users(mtds_server_ts);
CREATE INDEX idx_users_mtds_deleted ON users(mtds_delete_ts) WHERE mtds_delete_ts IS NULL;
```

**Stored Procedures (for bulk load):**

```sql
CREATE OR REPLACE FUNCTION get_users(
  last_updated_txid BIGINT,
  tenant_id_param TEXT
) RETURNS TABLE (
  -- Return all columns from users table
) AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM users
  WHERE tenant_id = tenant_id_param
    AND (mtds_server_ts > last_updated_txid OR last_updated_txid = 0)
    AND mtds_delete_ts IS NULL;
END;
$$ LANGUAGE plpgsql;
```

**PostgreSQL NOTIFY Triggers (for real-time updates):**

```sql
CREATE OR REPLACE FUNCTION notify_table_change()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'table_changes',
    json_build_object(
      'table', TG_TABLE_NAME,
      'action', TG_OP,
      'data', row_to_json(NEW)
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_notify
AFTER INSERT OR UPDATE OR DELETE ON users
FOR EACH ROW EXECUTE FUNCTION notify_table_change();
```

---

## 🎯 MTDD Routing (Optional)

When `useMtdd: true`, queries can be routed to specific database shards via gRPC:

```typescript
// Standard query (direct PostgreSQL)
const users = await db('users').select('*').where('tenant_id', tenantId);

// MTDD query (gRPC routing to tenant's shard)
const users = await db('users')
  .select('*')
  .mtdd(tenantId, 1); // tenantId, tenantType
```

**Configuration:**
```typescript
const libraryConfig: LibraryConfig = {
  mtdd: {
    useMtdd: true,
    queryServers: ['grpc-server1:50051', 'grpc-server2:50051'],
    lookupServer: 'lookup-server:50054',
    isDevelopment: false,
    grpcInsecure: false, // Use SSL in production
  },
};
```

---

## 📊 Logging

The library uses Pino for structured logging with environment-aware verbosity:

- **Development:** Comprehensive logging with request/response bodies
- **Production:** Minimal logging (method, path, status, duration, errors only)

Logs include:
- Request correlation IDs
- Tenant and user context
- Performance metrics
- Error details

---

## 🛠️ Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Development mode
npm run dev

# Lint
npm run lint:fix

# Format
npm run format:fix
```

---

## 📚 Example Application

See `examples/example-app/` for a complete working example including:
- Authentication middleware setup
- Database schema setup scripts
- Test endpoints
- Configuration examples

---

## 🔒 Security Best Practices

1. **Always validate JWT tokens** in your auth middleware
2. **Never use `grpcInsecure: true` in production**
3. **Use SSL/TLS for gRPC** connections in production
4. **Sanitize tenant IDs** to prevent injection attacks
5. **Rate limit API endpoints** to prevent abuse
6. **Monitor logs** for suspicious activity

---

## 📄 License

MIT © AdvComm

---

## 📧 Support

- GitHub Issues: https://github.com/advcomm/tenant_replication_postgres/issues
- Email: dev2@advcomm.ca
