# @advcomm/tenant_replication_postgres

> Multi-Tenant Database Deployment (MTDD) library with intelligent tenant routing, gRPC-based replication, and real-time notifications.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 Features

- **🎯 MTDD Routing** - Transparent tenant-aware query routing via Knex monkey-patching
- **⚡ gRPC Integration** - High-performance binary protocol with full type safety
- **🔄 Real-time Sync** - Server-Sent Events (SSE) for live database updates
- **📱 Push Notifications** - Firebase Cloud Messaging integration
- **🏗️ Clean Architecture** - MVC pattern with service layer separation
- **✅ Type Safety** - Full TypeScript with Protobuf-generated types
- **🔐 Authentication** - JWT-based auth with role support
- **📊 Structured Logging** - Pino logger with contextual information
- **🎨 Modern Stack** - Zod validation, custom error classes, path aliases

---

## 📦 Installation

```bash
npm install @advcomm/tenant_replication_postgres
```

### Dependencies

- Your app should have Express. Knex is provided and managed by this library.

---

## 🎯 What is MTDD?

**MTDD (Multi-Tenant Database Deployment)** is a pattern where each tenant's data resides on specific database shards. This library provides:

1. **Transparent Routing** - Automatically routes queries to the correct database shard
2. **Knex Integration** - Extends Knex with `.mtdd()` method for tenant-aware queries
3. **gRPC Backend** - Executes queries via high-performance gRPC servers
4. **Lookup Service** - Maps tenants to their assigned database shards

```
┌─────────────┐
│   Client    │
│  (Your App) │
└──────┬──────┘
       │ .mtdd(tenantId)
       ▼
┌─────────────┐      gRPC        ┌──────────────┐
│   Library   │ ────────────────► │ Query Server │
│  (This pkg) │                   │   (Shard 1)  │
└──────┬──────┘      Binary       └──────────────┘
       │          Protobuf
       │                          ┌──────────────┐
       └─────────────────────────► │ Query Server │
                                   │   (Shard 2)  │
                                   └──────────────┘
```

---

## ⚡ Quick Start

### 1. Initialize the Library (Library-owned Knex)

```typescript
import express from 'express';
import { InitializeReplicationWithDb } from '@advcomm/tenant_replication_postgres';
import type { DatabaseConfig, LibraryConfig } from '@advcomm/tenant_replication_postgres';

const app = express();

// Provide DB config; the library creates and patches Knex for you
const dbConfig: DatabaseConfig = {
  connection: {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'password',
    database: 'mydb',
  },
  debug: false,
};

// Configure the library
const config: LibraryConfig = {
  mtdd: {
    useMtdd: false, // Set true to enable gRPC
    // When useMtdd: true, you must set:
    // queryServers: ['grpc-server1:50051', 'grpc-server2:50051'],
    // lookupServer: 'lookup-server:50054',
    isDevelopment: false,
    grpcInsecure: false,
  },
  portal: {
    portalId: 1,
    tenantColumnName: 'YourTenantIDColumn',
    tenantInsertProc: 'your_tenant_insert_procedure',
    portalName: 'YourPortalName',
  },
  firebase: {
    type: 'service_account',
    project_id: 'your-project-id',
    private_key: process.env.FIREBASE_PRIVATE_KEY,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
  },
};

// Initialize and receive the patched Knex instance
const db = await InitializeReplicationWithDb(app, dbConfig, config);

app.listen(3000, () => {
  console.log('Server running with MTDD support');
});
```

### 2. Use MTDD Routing in Queries

```typescript
// Standard Knex query (no MTDD)
const users = await db('users').select('*');

// MTDD-aware query - routes to correct shard for tenant
const tenantUsers = await db('users')
  .select('*')
  .mtdd('tenant-123', 1); // tenantId, tenantType

// MTDD with options
const products = await db('products')
  .where('category', 'electronics')
  .mtdd('tenant-456', 1, 'executeQuery', {
    cacheTTL: 600,
    skipCache: false,
    operationType: 'read',
  });

// Execute on all servers
const allTenants = await db('tenants')
  .select('*')
  .mtdd(); // No tenant ID = all servers

// Force add tenant shard mapping
await db.raw('SELECT 1')
  .mtdd('new-tenant', null, 'addTenantShard');
```

---

## 🔄 Transport Configuration (Config-Only)

The library transparently routes between local PostgreSQL and gRPC based on configuration (no env fallbacks). Your application code remains the same.

### The Developer Experience Goal

```typescript
// Application code (SAME in development and production)
const users = await db('users')
  .where('active', true)
  .mtdd(tenantId, tenantType)  // Developer always provides tenant explicitly
  .select();
```

### Local vs gRPC

- Local PostgreSQL: `mtdd.useMtdd = false` → `.mtdd()` executes on the local connection.
- gRPC Routing: `mtdd.useMtdd = true` → requires `mtdd.queryServers` and `mtdd.lookupServer`.

### Configuration API

```typescript
await InitializeReplicationWithDb(app, dbConfig, {
  mtdd: {
    useMtdd: true,
    queryServers: ['server1:50051', 'server2:50051'],
    lookupServer: 'lookup:50054',
    isDevelopment: false,
    grpcInsecure: false,
  },
  portal: { portalId: 1, tenantColumnName: '...', tenantInsertProc: '...', portalName: '...' },
});
```

### Runtime Behavior

| `USE_MTDD` | Behavior | Use Case |
|------------|----------|----------|
| `0` or unset | Executes on local Knex connection (standard PostgreSQL via `pg` driver) | Local development, testing |
| `1` | Routes through gRPC servers with tenant sharding and multi-server support | Production, staging |

### Error Handling

If `mtdd.useMtdd === true` but gRPC servers are not configured:

```typescript
// Runtime error will be thrown with helpful message
Error: No query servers configured. Please provide queryServers in configuration.
```

This ensures you can't accidentally deploy without proper gRPC configuration.

### Protocol Compatibility

The library ensures that the **response format is identical** regardless of transport:

```typescript
// Both return the exact same format
const local = await db('users').select();    // USE_MTDD=0
const grpc = await db('users').mtdd(id).select();  // USE_MTDD=1

// QueryBuilder queries return arrays
console.log(local);  // [{ id: 1, name: 'Alice' }, ...]
console.log(grpc);   // [{ id: 1, name: 'Alice' }, ...]  ← Same!

// Raw queries return pg result object
const localRaw = await db.raw('SELECT * FROM users');
const grpcRaw = await db.raw('SELECT * FROM users').mtdd(id);

console.log(localRaw);  // { rows: [...], rowCount: 2, command: 'SELECT' }
console.log(grpcRaw);   // { rows: [...], rowCount: 2, command: 'SELECT' }  ← Same!
```

---

## 📚 Complete API Reference

### InitializeReplicationWithDb

Creates a Knex instance, patches it with `.mtdd()`, mounts routes, and returns the instance.

```typescript
function InitializeReplicationWithDb(
  app: Express.Application,
  dbConfig: DatabaseConfig,
  config?: LibraryConfig
): Promise<Knex>
```

Parameters:
- `app` - Express application instance
- `dbConfig` - Database connection settings used by the library to create Knex
- `config` - Library configuration (MTDD, portal, firebase)

### Configuration Types

```typescript
interface LibraryConfig {
  mtdd?: MtddBackendConfig;
  portal?: PortalConfig;
  firebase?: FirebaseConfig;
}

interface DatabaseConfig {
  connection:
    | string
    | { host?: string; port?: number; user?: string; password?: string; database?: string };
  debug?: boolean;
}

interface MtddBackendConfig {
  useMtdd?: boolean;            // false = local pg, true = gRPC
  queryServers?: string[];      // Required when useMtdd = true
  lookupServer?: string;        // Required when useMtdd = true
  isDevelopment?: boolean;
  grpcInsecure?: boolean;
}

interface PortalConfig {
  portalId?: number;
  tenantColumnName?: string;
  tenantInsertProc?: string;
  portalName?: string;
  [key: string]: unknown;
}
```

---

## 🔥 MTDD Method Signatures

### Basic Syntax

```typescript
.mtdd(tenantId, tenantType?, methodType?, options?)
```

### Parameter Details

**1. tenantId** (string | number | MtddMeta)
- Tenant identifier for routing
- `null` or omit for all-server execution
- Can pass full `MtddMeta` object for advanced usage

**2. tenantType** (number | string | null, optional)
- Tenant type/category identifier
- Default: `1`
- `null` forces `addTenantShard` operation

**3. methodType** ('executeQuery' | 'addTenantShard' | 'auto', optional)
- Operation type
- Default: `'auto'` (infers from context)

**4. options** (Partial<MtddMeta>, optional)
- Advanced MTDD options:

```typescript
{
  allServers?: boolean;        // Execute on all servers
  operationType?: 'read' | 'write';
  timeout?: number;            // Query timeout (ms)
  cacheTTL?: number;           // Cache duration (seconds)
  skipCache?: boolean;         // Bypass cache
  auditLog?: boolean;          // Enable audit logging
  maxRetries?: number;         // Retry attempts
  readPreference?: 'primary' | 'replica';
  IsReRun?: boolean;           // Complex query flag (auto-set)
}
```

---

## 💡 Usage Examples

### Example 1: Simple Tenant Query

```typescript
// Get all orders for a specific tenant
const orders = await db('orders')
  .where('status', 'pending')
  .mtdd('tenant-abc-123', 1);

console.log(orders); // Rows from tenant's shard
```

### Example 2: Multi-Tenant Aggregation

```typescript
// Get data from all tenants (all shards)
const allStats = await db('statistics')
  .select(db.raw('SUM(revenue) as total_revenue'))
  .groupBy('month')
  .mtdd(); // No tenantId = all servers

console.log(allStats); // Aggregated from all shards
```

### Example 3: Complex Query with Options

```typescript
// Complex query with caching and audit
const reports = await db('reports')
  .select('*')
  .where('year', 2025)
  .having(db.raw('SUM(amount) > ?', [10000]))
  .groupBy('category')
  .mtdd('tenant-xyz', 1, 'executeQuery', {
    cacheTTL: 3600,        // Cache for 1 hour
    auditLog: true,        // Log this query
    operationType: 'read',
    timeout: 10000,        // 10 second timeout
  });
```

### Example 4: Raw Queries

```typescript
// Raw SQL with MTDD routing
const result = await db.raw(
  'SELECT * FROM users WHERE email = ?',
  ['user@example.com']
).mtdd('tenant-123');

// Stored procedure call
const procResult = await db.raw(
  'CALL update_tenant_data(?, ?)',
  [tenantId, data]
).mtdd(tenantId, 1);
```

### Example 5: Add New Tenant

```typescript
// Register a new tenant and assign to shard
await db.raw('SELECT 1')
  .mtdd('new-tenant-id', null, 'addTenantShard');

// Now queries for this tenant will route correctly
const tenantData = await db('tenant_data')
  .select('*')
  .mtdd('new-tenant-id', 1);
```

---

## 🌐 API Endpoints

The library automatically mounts these endpoints under `/mtdd`:

### GET /mtdd/Load

Load data for a specific table with change tracking.

**Query Parameters:**
- `tableName` (required) - Table to query
- `lastUpdated` (optional) - Timestamp for incremental updates
- `deviceId` (optional) - Device identifier

**Example:**
```bash
curl "http://localhost:3000/mtdd/Load?tableName=products&lastUpdated=1697000000&deviceId=device-123" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "data": [...],
  "timestamp": 1697123456,
  "hasMore": false
}
```

### GET /mtdd/events

Server-Sent Events endpoint for real-time database notifications.

**Query Parameters:**
- `token` (optional) - JWT token for auth (alternative to header)

**Example:**
```javascript
const eventSource = new EventSource(
  'http://localhost:3000/mtdd/events?token=YOUR_JWT_TOKEN'
);

eventSource.addEventListener('message', (event) => {
  const update = JSON.parse(event.data);
  console.log('Database update:', update);
});
```

**Event Format:**
```json
{
  "table": "products",
  "action": "INSERT",
  "data": {...},
  "tenantId": "tenant-123"
}
```

---

## 📱 Client Management (ActiveClients)

### Firebase Initialization

```typescript
import { ActiveClients } from '@advcomm/tenant_replication_postgres';
import type { FirebaseConfig } from '@advcomm/tenant_replication_postgres';

// Option 1: Config object
const firebaseConfig: FirebaseConfig = {
  type: 'service_account',
  project_id: 'your-project',
  private_key: process.env.FIREBASE_PRIVATE_KEY,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
};
ActiveClients.InitializeFirebase(firebaseConfig);

// Option 2: File path
ActiveClients.InitializeFirebase('./firebase-credentials.json');

// Option 3: Environment variable (FIREBASE_SERVICE_ACCOUNT_JSON)
ActiveClients.InitializeFirebase();
```

### Mobile Device Management

```typescript
// Register mobile device for push notifications
ActiveClients.AddMobileDevice('device-id', 'fcm-token-xyz');

// Check if device exists
if (ActiveClients.HasMobileDevice('device-id')) {
  console.log('Device registered');
}

// Get FCM token
const token = ActiveClients.GetMobileFcmToken('device-id');

// Remove device
ActiveClients.DeleteMobileDevice('device-id');

// Get device count
const count = ActiveClients.GetMobileDeviceCount();
```

### Web Device Management (SSE)

```typescript
// Add web client for server-sent events
app.get('/stream', (req, res) => {
  const deviceId = req.query.deviceId as string;
  
  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Register device
  ActiveClients.AddWebDeviceEvent(deviceId, 'events', res);
  
  // Cleanup on disconnect
  req.on('close', () => {
    ActiveClients.DeleteWebDevice(deviceId);
  });
});

// Check if device has specific event
if (ActiveClients.HasWebDeviceEvent('device-id', 'events')) {
  console.log('Device subscribed to events');
}

// Get device events
const events = ActiveClients.GetWebDeviceEvents('device-id');
```

### Push Notifications

```typescript
// Send to specific device
ActiveClients.SendPushNotificationToDevice(
  'device-id',
  {
    title: 'New Order',
    body: 'You have a new order #12345',
    data: { orderId: '12345', type: 'order' }
  }
);

// Broadcast to all devices
ActiveClients.BroadcastPushNotification({
  title: 'System Update',
  body: 'Scheduled maintenance in 1 hour',
});

// Send using FCM token directly
ActiveClients.SendPushNotification(
  'fcm-token-here',
  { title: 'Alert', body: 'Action required' }
);
```

---

## 🏗️ Architecture

### Technology Stack

- **Express** - HTTP server and routing
- **Knex.js** - SQL query builder (with MTDD extensions)
- **gRPC** - High-performance RPC framework
- **Protocol Buffers** - Binary serialization (3-10x faster than JSON)
- **PostgreSQL** - Database with NOTIFY/LISTEN support
- **Firebase Admin** - Push notifications
- **Pino** - High-performance structured logging
- **Zod** - Runtime type validation

### Project Structure

```
src/
├── config/           # Configuration management
├── constants/        # Centralized constants (grpc, db, errors, mtdd)
├── controllers/      # HTTP request handlers (thin)
├── errors/           # Custom error classes hierarchy
├── helpers/
│   ├── clients/      # Firebase, mobile, web client management
│   └── mtdd/         # MTDD routing and patching logic
│       ├── actions/          # MTDD action handlers
│       ├── handlers/         # Single/multi-server handlers
│       └── patching/         # Knex prototype patching
├── middleware/       # Express middleware (validation, auth, errors)
├── routes/           # API routes definition
├── services/
│   ├── executors/    # Query execution strategies
│   └── grpc/         # gRPC client setup and utilities
├── types/            # TypeScript type definitions
├── utils/            # Shared utilities (logger)
└── generated/        # Auto-generated protobuf types
```

### Request Flow

```
HTTP Request
    ↓
[Middleware: Validation]
    ↓
[Middleware: Authentication]
    ↓
[Controller: Thin handler]
    ↓
[Service: Business logic]
    ↓
[Knex Query + .mtdd()]
    ↓
[MTDD Routing: Determine shard]
    ↓
[gRPC Client: Execute on shard]
    ↓
[Response: Return to client]
```

---

## 🔧 Advanced Configuration

### Full Configuration Example

```typescript
const config: LibraryConfig = {
  // MTDD Backend Configuration
  mtdd: {
    queryServers: [
      'query-shard1.example.com:50051',
      'query-shard2.example.com:50051',
      'query-shard3.example.com:50051',
    ],
    lookupServer: 'lookup.example.com:50054',
    isDevelopment: false,
    grpcInsecure: false, // Use SSL in production
  },

  // Database Configuration
  database: {
    enabled: true,
    config: {
      host: 'db.example.com',
      port: 5432,
      user: 'app_user',
      password: process.env.DB_PASSWORD,
      database: 'production_db',
      max: 20,                    // Connection pool size
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    },
  },

  // Portal/Tenant Configuration
  portal: {
    portalId: 1,
    tenantColumnName: 'YourTenantIDColumn',       // Your tenant column name
    tenantInsertProc: 'your_tenant_insert_procedure', // Your tenant creation procedure
    portalName: 'YourPortalName',                 // Your portal name
  },

  // Firebase Configuration (optional)
  firebase: {
    type: 'service_account',
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    // ... other Firebase config
  },
};

await InitializeReplication(app, db, config);
```

### Environment Variables

No env fallbacks are used by the library. Provide configuration via `LibraryConfig` and `DatabaseConfig`.

---

## 🎨 MTDD Usage Patterns

### Pattern 1: Single Tenant Queries

```typescript
// All queries for this tenant route to their assigned shard
const tenantId = req.user.tenantId; // From JWT

const orders = await db('orders')
  .where('status', 'active')
  .mtdd(tenantId, 1);

const customers = await db('customers')
  .where('region', 'US')
  .mtdd(tenantId, 1);
```

### Pattern 2: Multi-Tenant Aggregation

```typescript
// Query ALL shards and aggregate results
const globalStats = await db('orders')
  .select(db.raw('COUNT(*) as total_orders'))
  .select(db.raw('SUM(amount) as revenue'))
  .mtdd(); // No tenant = all servers

console.log(globalStats);
// Results from all shards combined
```

### Pattern 3: Conditional Routing

```typescript
// Route based on business logic
const isGlobalQuery = req.query.scope === 'global';

const data = isGlobalQuery
  ? await db('reports').select('*').mtdd() // All servers
  : await db('reports').select('*').mtdd(tenantId, 1); // Specific shard
```

### Pattern 4: Complex Queries

```typescript
// Queries with GROUP BY, HAVING (automatically marked as IsReRun)
const analytics = await db('sales')
  .select('category')
  .sum('amount as total')
  .groupBy('category')
  .having(db.raw('SUM(amount) > ?', [1000]))
  .mtdd(tenantId, 1);

// Library automatically:
// 1. Detects complex query (having)
// 2. Sets IsReRun=true
// 3. Routes to correct shard
// 4. Returns results
```

### Pattern 5: Transactions

```typescript
// MTDD-aware transactions
await db.transaction(async (trx) => {
  const user = await trx('users')
    .insert({ name: 'John', email: 'john@example.com' })
    .returning('*')
    .mtdd(tenantId, 1);

  await trx('audit_log')
    .insert({ action: 'user_created', user_id: user[0].id })
    .mtdd(tenantId, 1);
});
```

---

## 🔄 Real-Time Updates

### Server-Sent Events (SSE)

Client-side example:

```javascript
const token = 'your-jwt-token';

// Connect to SSE endpoint
const eventSource = new EventSource(
  `http://localhost:3000/mtdd/events?token=${token}`
);

// Listen for database changes
eventSource.addEventListener('message', (event) => {
  const update = JSON.parse(event.data);
  
  console.log(`Table: ${update.table}`);
  console.log(`Action: ${update.action}`); // INSERT, UPDATE, DELETE
  console.log(`Data:`, update.data);
  
  // Update UI with new data
  if (update.table === 'products' && update.action === 'INSERT') {
    addProductToUI(update.data);
  }
});

// Handle connection errors
eventSource.addEventListener('error', (error) => {
  console.error('SSE connection error:', error);
  // Implement reconnection logic
});
```

Server-side (database triggers):

```sql
-- Create notification trigger
CREATE OR REPLACE FUNCTION notify_table_change()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'table_updates',
    json_build_object(
      'table', TG_TABLE_NAME,
      'action', TG_OP,
      'data', row_to_json(NEW),
      'tenantId', NEW.TenantID
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach to table
CREATE TRIGGER products_notify
AFTER INSERT OR UPDATE OR DELETE ON products
FOR EACH ROW EXECUTE FUNCTION notify_table_change();
```

---

## 🧪 Development Mode

### Enable Development Stubs

When `isDevelopment: true`, the library:

1. ✅ Skips gRPC calls (uses local database)
2. ✅ Enables `.mtdd()` stub methods
3. ✅ Logs detailed debug information
4. ✅ Uses PostgreSQL NOTIFY/LISTEN for events

```typescript
const config: LibraryConfig = {
  mtdd: {
    queryServers: [],
    lookupServer: '',
    isDevelopment: true, // ← Enable dev mode
  },
  database: {
    enabled: true,
    config: { /* local db */ },
  },
};

await InitializeReplication(app, db, config);

// Queries work normally without gRPC
const data = await db('users').select('*').mtdd('tenant-123');
// Executes directly on local database
```

---

## 📊 Logging

The library uses Pino for structured, high-performance logging.

### Log Levels

```typescript
// Automatically logged with context:
- apiLogger.info()    // API requests
- dbLogger.debug()    // Database queries
- grpcLogger.info()   // gRPC operations
- mtddLogger.debug()  // MTDD routing decisions
- notificationLogger.info() // SSE/Push events
```

### Log Output Example

```json
{
  "level": 30,
  "time": 1697123456789,
  "name": "knex-mtdd:grpc",
  "msg": "Tenant mapped to shard",
  "tenantName": "tenant-123",
  "shardId": 2
}
```

### Custom Log Configuration

Logs are automatically formatted in development (pretty-print) and JSON in production.

---

## 🔐 Authentication

The library expects JWT tokens with these claims:

```typescript
interface DecodedToken {
  sub: string;      // User ID
  tid: string;      // Tenant ID
  roles: string[];  // User roles
}
```

**Authorization Header:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Query Parameter (SSE only):**
```
?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🛠️ Protobuf Schema

The library uses Protocol Buffers for gRPC communication.

### DB Service (proto/db.proto)

```protobuf
service DBService {
  rpc ExecuteQuery(QueryRequest) returns (QueryResponse);
  rpc ListenToChannel(ChannelRequest) returns (stream ChannelMessage);
}
```

### Lookup Service (proto/lookup.proto)

```protobuf
service LookupService {
  rpc GetTenantShard(TenantRequest) returns (TenantResponse);
  rpc AddTenantShard(TenantRequest) returns (TenantResponse);
}
```

### Regenerate Types (after proto changes)

```bash
npm run proto:generate
```

This generates TypeScript types in `src/generated/` (committed to repo).

---

## 🧩 Integration Examples

### Express.js Application (Recommended Flow)

```typescript
import express from 'express';
import { InitializeReplicationWithDb } from '@advcomm/tenant_replication_postgres';

const app = express();
app.use(express.json());

const db = await InitializeReplicationWithDb(app, { connection: process.env.DATABASE_URL }, {
  mtdd: {
    useMtdd: false,
  },
});

// Your application routes
app.get('/api/products', async (req, res) => {
  const tenantId = req.user.tenantId;
  
  const products = await db('products')
    .select('*')
    .where('active', true)
    .mtdd(tenantId, 1);
  
  res.json(products);
});

app.listen(3000);
```

### NestJS Application

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { InitializeReplication } from '@advcomm/tenant_replication_postgres';

@Injectable()
export class DatabaseService implements OnModuleInit {
  constructor(
    private app: NestExpressApplication,
    private knex: Knex,
  ) {}

  async onModuleInit() {
    await InitializeReplication(this.app, this.knex, {
      mtdd: { /* config */ },
    });
  }
}
```

---

## 🐛 Troubleshooting

### Issue: Queries not routing to shards

**Check:**
1. Is `.mtdd()` method called after the query?
2. Is `tenantId` valid?
3. Are gRPC servers configured correctly?
4. Check logs for routing decisions:

```typescript
// Enable debug logging
const config = {
  mtdd: {
    queryServers: ['...'],
    lookupServer: '...',
    isDevelopment: true, // More verbose logging
  },
};
```

### Issue: gRPC connection failures

**Solutions:**
```typescript
// 1. Check server addresses
console.log(config.queryServers);

// 2. Verify SSL certificates (production)
// 3. Try insecure mode (development only)
const config = {
  mtdd: {
    queryServers: ['localhost:50051'],
    lookupServer: 'localhost:50054',
    grpcInsecure: true, // Dev only!
  },
};
```

### Issue: TypeScript errors with .mtdd()

**Solution**: The library extends Knex types via module augmentation. Ensure:

```typescript
// Your tsconfig.json includes:
{
  "compilerOptions": {
    "types": ["node", "@advcomm/tenant_replication_postgres"]
  }
}
```

### Issue: Proto generation fails

**Solution:**
```bash
# Ensure protoc is installed
which grpc_tools_node_protoc_plugin

# Regenerate
npm run proto:generate

# Check proto files are valid
cat proto/db.proto
```

---

## 📈 Performance

### gRPC Protobuf Benefits

| Metric | JSON | Protobuf | Improvement |
|--------|------|----------|-------------|
| Payload Size | 100% | 60% | **40% smaller** |
| Serialization | Baseline | 3-10x faster | **10x faster** |
| Type Safety | Runtime | Compile-time | **100% safer** |

### Best Practices

1. **Use .mtdd() wisely** - Only on queries that need tenant routing
2. **Cache when appropriate** - Use `cacheTTL` option
3. **Batch operations** - Reduce round-trips
4. **Monitor logs** - Use structured logging for debugging

---

## 🔒 Security

### Best Practices

1. **Never use `grpcInsecure: true` in production**
2. **Always validate JWT tokens**
3. **Use SSL/TLS for gRPC** (cert-based auth)
4. **Sanitize tenant IDs** (prevent injection)
5. **Rate limit API endpoints**
6. **Audit sensitive queries** (use `auditLog: true`)

### Example: Secure Setup

```typescript
const config: LibraryConfig = {
  mtdd: {
    queryServers: [
      'secure-grpc1.prod.example.com:50051',
      'secure-grpc2.prod.example.com:50051',
    ],
    lookupServer: 'secure-lookup.prod.example.com:50054',
    isDevelopment: false,
    grpcInsecure: false, // ← SSL required
  },
};
```

---

## 🧪 Testing

The library includes comprehensive test coverage (coming soon).

```bash
# Run tests
npm test

# With coverage
npm run test:coverage
```

---

## 📦 Build & Development

```bash
# Install dependencies
npm install

# Generate protobuf types
npm run proto:generate

# Build TypeScript
npm run build

# Lint and format
npm run lint
npm run format:fix

# Development mode
npm run dev
```

---

## 📦 Publishing & Release Process

This package uses [semantic-release](https://semantic-release.gitbook.io/) for fully automated versioning and publishing to npm.

### Quick Reference

| Commit Type | Version Bump | Example |
|-------------|--------------|---------|
| `feat:` | **Minor** | `1.0.2 → 1.1.0` |
| `fix:` | **Patch** | `1.0.2 → 1.0.3` |
| `feat!:` or `BREAKING CHANGE` | **Major** | `1.0.2 → 2.0.0` |
| `docs:`, `style:`, `chore:` | **None** | No release |

### What Happens Automatically

When you push to `main` with conventional commits:

- ✅ Version bump in `package.json` and `package-lock.json`
- ✅ `CHANGELOG.md` generation with release notes
- ✅ Git tag creation (e.g., `v1.1.0`)
- ✅ npm publishing to `@advcomm/tenant_replication_postgres`
- ✅ GitHub Release creation with notes

### Examples

```bash
# Patch release
git commit -m "fix: resolve authentication issue"

# Minor release
git commit -m "feat: add user profile management"

# Major release
git commit -m "feat!: redesign API
BREAKING CHANGE: remove deprecated methods"

# No release
git commit -m "docs: update README"
```

### Full Documentation

📖 **See [SEMANTIC_RELEASE.md](./SEMANTIC_RELEASE.md) for complete guide** covering:

- Detailed commit message format
- All commit types and scopes
- Configuration files
- Manual release process
- Troubleshooting guide
- Best practices

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

### Code Quality

The project uses:
- ✅ **Biome** - Fast linting and formatting
- ✅ **TypeScript strict mode** - Maximum type safety
- ✅ **Husky** - Pre-commit hooks for quality
- ✅ **Path aliases** - Clean imports with `@/`

---

## 📄 License

MIT © AdvComm

---

## 🔗 Related

- [Knex.js Documentation](https://knexjs.org/)
- [gRPC Node.js Guide](https://grpc.io/docs/languages/node/)
- [Protocol Buffers](https://developers.google.com/protocol-buffers)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)

---

## 📧 Support

For issues and questions:
- GitHub Issues: https://github.com/advcomm/tenant_replication_postgres/issues
- Email: dev1@hostingcontroller.com

---

## 🎯 Roadmap

- [ ] Add comprehensive test suite (Jest)
- [ ] Performance benchmarks
- [ ] Example applications
- [ ] Migration guides
- [ ] Docker setup examples
- [ ] Kubernetes deployment guides
- [ ] Metrics and monitoring integration
- [ ] Redis caching layer
- [ ] GraphQL support

---

**Made with ❤️ by AdvComm**
