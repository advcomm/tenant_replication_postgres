# Example Application

A complete working example demonstrating how to use the `@advcomm/tenant_replication_postgres` library.

## 🎯 Purpose

- **Reference Implementation** - Best practices for using the library
- **Starting Point** - Copy this to start your own application
- **Testing Ground** - Test library features in a real application context

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd examples/example-app
npm install
```

**Note:** Uses local library package (`file:../..`), so library changes are immediately reflected during development.

### 2. Setup Environment

```bash
cp .env.example .env
# Edit .env with your database credentials
```

**Required Environment Variables:**
- `DB_HOST` - Database host (default: localhost)
- `DB_PORT` - Database port (default: 5432)
- `DB_USER` - Database user (default: postgres)
- `DB_PASSWORD` - Database password (default: root)
- `DB_NAME` - Database name (default: mtdd_dev)
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)

### 3. Setup Database

**Automated Setup (Recommended):**
```bash
npm run setup:db
# Or: ./scripts/setup-database.sh
```

This script:
- Creates database if it doesn't exist
- Creates `users` and `products` tables
- Creates `get_users()` and `get_products()` stored procedures
- Sets up PostgreSQL NOTIFY triggers for SSE events
- Inserts test data (3 users, 3 products for 'test-tenant')

**Manual Setup:**
```bash
createdb mtdd_dev
psql -U postgres -d mtdd_dev -f scripts/setup-database.sql
```

### 4. Run the Application

```bash
# Development mode
npm run dev

# Or build and run
npm run build
npm start
```

Server starts on `http://localhost:3000`

## 📡 Available Endpoints

### Library Endpoints (Auto-mounted at `/mtdd/sync/*`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/mtdd/sync/changes` | POST | Receive and apply client changes |
| `/mtdd/sync/bulk-load` | POST | Bulk load multiple tables |
| `/mtdd/sync/tables/:tableName` | GET | Load single table data |
| `/mtdd/sync/events` | GET | Server-Sent Events for real-time updates |

### Utility Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/info` | GET | Application information |

### Test Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/test/direct` | GET | Direct query test (without .mtdd()) |
| `/test/mtdd/:tenant` | GET | Query with .mtdd() routing |
| `/test/insert` | POST | Insert test data |

## 🔐 Authentication

The example app includes a simple authentication middleware that extracts tenant and user IDs from headers:

```typescript
// Headers for testing:
tenant-id: test-tenant
user-id: test-user
```

**For Production:** Replace `src/middleware/auth.ts` with proper JWT validation that sets:
- `req.tid` - Tenant ID (string | number) - **REQUIRED**
- `req.sub` - User ID (string) - **REQUIRED**
- `req.roles` - User roles (string[]) - Optional

## 🧪 Testing

### 1. Health Check

```bash
curl http://localhost:3000/health
```

### 2. Load Table Data

```bash
# Load all users
curl "http://localhost:3000/mtdd/sync/tables/users?lastUpdated=0" \
  -H "tenant-id: test-tenant" \
  -H "user-id: test-user"

# Load incremental updates
curl "http://localhost:3000/mtdd/sync/tables/users?lastUpdated=14600000000000" \
  -H "tenant-id: test-tenant" \
  -H "user-id: test-user"
```

### 3. Bulk Load

```bash
curl -X POST http://localhost:3000/mtdd/sync/bulk-load \
  -H "Content-Type: application/json" \
  -H "tenant-id: test-tenant" \
  -H "user-id: test-user" \
  -d '{"tables": ["users", "products"]}'
```

### 4. Sync Changes

**Important:** Do NOT include `tenant_id` in the payload. The server automatically injects it from the authenticated request.

```bash
curl -X POST http://localhost:3000/mtdd/sync/changes \
  -H "Content-Type: application/json" \
  -H "tenant-id: test-tenant" \
  -H "user-id: test-user" \
  -d '{
    "changes": [{
      "clientTxid": 1,
      "table_name": "users",
      "record_pk": "101",
      "mtds_device_id": 123,
      "action": "insert",
      "payload": {
        "New": {
          "id": 101,
          "name": "Test User",
          "email": "test@example.com",
          "age": 30
        }
      }
    }]
  }'
```

**Response:**
```json
{
  "success": true,
  "processed": 1,
  "errors": 0,
  "updates": [{
    "clientTxid": 1,
    "serverTxid": 9876543210,
    "tableName": "users",
    "pk": "101"
  }],
  "failures": []
}
```

### 5. Automated Testing

```bash
# Run automated test script
npm run test:endpoints
# Or: ./scripts/test-endpoints.sh
```

### 6. Clean Database

```bash
# Remove all test data
psql -U postgres -d mtdd_dev -f scripts/clean-database.sql
```

## 📱 Flutter Client Integration

### Testing with Flutter Client

1. **Start the server:**
   ```bash
   npm run dev
   ```

2. **Configure Flutter client:**
   ```dart
   final sdk = MTDS_SDK(
     serverUrl: 'http://localhost:3000',
     // ... other config
   );
   ```

3. **Flutter client endpoints:**
   - `POST http://localhost:3000/mtdd/sync/changes` - Sync changes
   - `POST http://localhost:3000/mtdd/sync/bulk-load` - Bulk load
   - `GET http://localhost:3000/mtdd/sync/tables/:tableName` - Load table
   - `GET http://localhost:3000/mtdd/sync/events` - SSE events

## 🏗️ Project Structure

```
example-app/
├── src/
│   ├── config/          # Configuration management
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Express middleware (CORS, auth, errors)
│   ├── routes/          # Route definitions
│   ├── utils/           # Utilities (logger)
│   └── index.ts         # Main application entry point
├── scripts/             # Database and testing scripts
│   ├── setup-database.sql    # Database schema
│   ├── setup-database.sh     # Automated setup
│   ├── clean-database.sql    # Cleanup script
│   ├── test-endpoints.sh     # Testing script
│   └── README.md             # Script documentation
├── .env.example         # Environment variables template
├── package.json         # Dependencies and scripts
└── tsconfig.json        # TypeScript configuration
```

## 🔑 Key Implementation Details

### Library Initialization

```typescript
import { InitializeReplicationWithDb } from '@advcomm/tenant_replication_postgres';

// Add auth middleware BEFORE library initialization
app.use('/mtdd/sync', authMiddleware);

// Initialize library (creates Knex and mounts routes)
const db = await InitializeReplicationWithDb(
  app,
  dbConfig,
  libraryConfig
);
```

This automatically:
- Creates Knex connection
- Mounts routes at `/mtdd/sync/*`
- Sets up notification listeners for SSE events

### Authentication Middleware

**Critical:** Auth middleware must be added BEFORE library initialization:

```typescript
// src/middleware/auth.ts
export function authMiddleware(req, res, next) {
  // Extract from headers (example app) or JWT (production)
  (req as any).tid = req.headers['tenant-id'];  // REQUIRED
  (req as any).sub = req.headers['user-id'];    // REQUIRED
  (req as any).roles = [];                      // Optional
  next();
}
```

### Tenant ID Handling

**Important:** The server automatically injects `tenant_id` from the authenticated request (`req.tid`) into all sync changes. Clients should **NOT** include `tenant_id` in payloads.

## 🐛 Troubleshooting

### Database Connection Failed

```bash
# Check PostgreSQL is running
pg_isready

# Create database manually
createdb mtdd_dev

# Or use setup script
npm run setup:db
```

### Database Setup Issues

If you see "Primary key not found" or "function get_* does not exist":

```bash
# Re-run database setup
npm run setup:db
```

### Library Routes Not Working

- Ensure auth middleware is added **BEFORE** library initialization
- Verify `req.tid` and `req.sub` are set in auth middleware
- Check routes are mounted at `/mtdd/sync/*`

### Sync Changes Failing

- **Error: "null value in column tenant_id"** - Ensure auth middleware sets `req.tid`
- **Error: "Tenant ID is required"** - Check authentication headers are sent
- Do NOT include `tenant_id` in payload - server injects it automatically

### Flutter Client Can't Connect

- Check CORS is enabled (middleware is included)
- Verify server is running on correct port
- Check Flutter client uses correct endpoint URLs (`/mtdd/sync/*`)

## 📚 Scripts Reference

| Script | Description |
|--------|-------------|
| `setup-database.sh` | Automated database setup (creates DB, tables, functions, triggers, test data) |
| `setup-database.sql` | SQL schema definitions and stored procedures |
| `clean-database.sql` | Cleanup script to remove all tables and functions |
| `test-endpoints.sh` | Automated endpoint testing script |

See `scripts/README.md` for detailed documentation.

## 📖 Further Reading

- [Library README](../../README.md) - Main library documentation
- [Scripts Documentation](./scripts/README.md) - Detailed script documentation

## 📄 License

MIT - Same as the main library
