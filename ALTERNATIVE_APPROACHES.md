# Alternative Approaches to MTDD Implementation

## 📌 Current Approach: Monkey Patching

**What we do**: Modify Knex's prototype at runtime to add `.mtdd()` support

**File**: `src/helpers/mtdd/routing.ts` (466 lines)

**Pros**:
- ✅ Works with existing Knex code
- ✅ Transparent to users (just add `.mtdd()`)
- ✅ No breaking changes

**Cons**:
- ❌ Complex implementation (monkey patching)
- ❌ Fragile (depends on Knex internals)
- ❌ Hard to maintain (466 lines of patching)

---

## 🏭 Industry Standard Alternatives

### 1️⃣ **Proxy Pattern** ⭐ (Recommended for refactor)

**How it works**: Use JavaScript Proxies to intercept method calls

```typescript
export function createMtddKnex(config: Knex.Config): Knex {
  const knex = Knex(config);
  
  return new Proxy(knex, {
    apply(target, thisArg, args) {
      const queryBuilder = target.apply(thisArg, args);
      return wrapWithMtddProxy(queryBuilder);
    }
  });
}

function wrapWithMtddProxy(queryBuilder: any) {
  return new Proxy(queryBuilder, {
    get(target, prop) {
      if (prop === 'mtdd') {
        return function(tenantId: string) {
          this._mtddMeta = { tenantId };
          return this;
        };
      }
      
      const value = target[prop];
      if (typeof value === 'function') {
        return function(...args: any[]) {
          const result = value.apply(target, args);
          if (this._mtddMeta) result._mtddMeta = this._mtddMeta;
          return result;
        };
      }
      return value;
    }
  });
}
```

**Benefits**:
- ✅ No modification of Knex prototype
- ✅ More maintainable (ES6 standard)
- ✅ Can disable/enable per instance
- ✅ Same user API
- ✅ ~200 lines vs 466

**Migration effort**: Medium (2-3 days)

**Examples**: Vue 3 reactivity, MobX observables

---

### 2️⃣ **Custom Query Builder** (Prisma/Drizzle approach)

**How it works**: Build your own type-safe query builder

```typescript
class MtddQuery<T> {
  private _table: string;
  private _where: Array<[string, any]> = [];
  private _select: string[] = [];
  private _tenantId?: string;

  constructor(table: string) {
    this._table = table;
  }

  where(column: string, value: any): this {
    this._where.push([column, value]);
    return this;
  }

  select(...columns: string[]): this {
    this._select = columns;
    return this;
  }

  mtdd(tenantId: string): this {
    this._tenantId = tenantId;
    return this;
  }

  async execute(): Promise<T[]> {
    const sql = this.buildSQL();
    return executeViaGrpc(sql, this._tenantId);
  }

  private buildSQL(): { sql: string; bindings: any[] } {
    // Build SQL from components
    // ...
  }
}

// Usage:
const users = await query<User>('users')
  .where('id', 123)
  .select('name', 'email')
  .mtdd('tenant-abc')
  .execute();
```

**Benefits**:
- ✅ Full type safety
- ✅ No dependency on Knex internals
- ✅ Complete control
- ✅ Can optimize for gRPC

**Cons**:
- ❌ **Huge effort** (1000+ lines)
- ❌ Must implement all SQL features
- ❌ Breaking change for users
- ❌ Loses Knex ecosystem

**Migration effort**: Very High (weeks/months)

**Examples**: Prisma, Drizzle, Kysely

---

### 3️⃣ **AsyncLocalStorage Context** (Modern Node.js)

**How it works**: Store tenant in async context, intercept at connection level

```typescript
import { AsyncLocalStorage } from 'async_hooks';

const tenantContext = new AsyncLocalStorage<{ tenantId?: string }>();

// Express middleware
app.use((req, res, next) => {
  const tenantId = req.headers['x-tenant-id'];
  tenantContext.run({ tenantId }, next);
});

// Custom PostgreSQL client
class MtddPgClient extends Client_PG {
  async _query(connection, obj) {
    const context = tenantContext.getStore();
    
    if (context?.tenantId) {
      // Route to gRPC
      return executeViaGrpc(obj.sql, obj.bindings, context.tenantId);
    }
    
    // Normal PostgreSQL
    return super._query(connection, obj);
  }
}

// Knex config
const db = knex({
  client: MtddPgClient,
  connection: { ... }
});

// Usage (NO .mtdd() needed - tenant is in context!)
const users = await db('users').where('id', 123).select('*');
// ✅ Automatically routed to correct tenant!
```

**Benefits**:
- ✅ No `.mtdd()` calls needed
- ✅ Tenant from HTTP context (automatic)
- ✅ Works with existing code
- ✅ ~100 lines of code

**Cons**:
- ❌ Can't override tenant per query
- ❌ Requires middleware setup
- ❌ AsyncLocalStorage has small performance cost

**Migration effort**: Low-Medium (1-2 days)

**Examples**: Used by many enterprise apps for correlation IDs, tracing

---

### 4️⃣ **Database Proxy/Sidecar** (Infrastructure)

**How it works**: Proxy server intercepts PostgreSQL protocol

```
┌──────────────┐
│  Application │
│  (uses Knex) │
└──────┬───────┘
       │ PostgreSQL Wire Protocol
       │ port 5432
┌──────▼───────────┐
│  MTDD Proxy      │ ← Parse SQL, extract tenant, route
│  (Go/Rust)       │
└──────┬───────────┘
       │ gRPC
       │
   ┌───┴────┬────────┬────────┐
   │        │        │        │
┌──▼───┐ ┌─▼───┐ ┌──▼───┐ ┌──▼───┐
│Shard1│ │Shard2│ │Shard3│ │Shard4│
└──────┘ └─────┘ └──────┘ └──────┘
```

```typescript
// Application code (ZERO changes!)
const users = await db('users').where('tenant_id', 'abc').select('*');

// Proxy intercepts, sees tenant_id='abc', routes to Shard2
```

**Benefits**:
- ✅ **ZERO application code changes**
- ✅ Works with ANY language/ORM
- ✅ Can route based on SQL analysis
- ✅ Infrastructure-level solution

**Cons**:
- ❌ Very complex to build (PostgreSQL protocol parsing)
- ❌ Another service to run/maintain
- ❌ Network latency (extra hop)
- ❌ Need to extract tenant from SQL

**Migration effort**: Very High (months)

**Examples**: Vitess, Citus, PgBouncer, ProxySQL

---

### 5️⃣ **ORM-Level Sharding** (Sequelize/TypeORM approach)

**How it works**: Use ORM's built-in multi-database support

```typescript
// Define tenant-aware model
@Entity()
class User {
  @Column()
  id: number;
  
  @Column()
  tenantId: string;
}

// TypeORM with multiple connections
const tenantConnections = {
  'tenant-abc': createConnection({ name: 'abc', ... }),
  'tenant-xyz': createConnection({ name: 'xyz', ... }),
};

// Helper to get tenant connection
function getConnection(tenantId: string) {
  return tenantConnections[tenantId] || defaultConnection;
}

// Usage:
const conn = getConnection('tenant-abc');
const users = await conn.getRepository(User).find({ where: { id: 123 } });
```

**Benefits**:
- ✅ ORM-native approach
- ✅ Type-safe
- ✅ Well-tested pattern

**Cons**:
- ❌ Requires switching to ORM (Sequelize/TypeORM)
- ❌ Breaking change
- ❌ Different query API

**Migration effort**: Very High (complete rewrite)

---

## 🎖️ **Production-Grade Examples**

### **Shopify** (Multi-tenant SaaS)
- Uses **database sharding** with tenant routing
- Custom Rails middleware for tenant context
- Connection pool per tenant shard

### **Slack** (Multi-tenant at scale)
- **Vitess** for MySQL sharding
- Infrastructure-level routing
- Zero application code awareness

### **GitHub** (Sharded MySQL)
- Custom sharding proxy
- Application includes shard routing hints
- Hybrid approach

### **Stripe** (Multi-tenant PostgreSQL)
- Connection pooling with tenant context
- AsyncLocalStorage for request context
- Query analysis for routing

---

## 💡 **Pragmatic Recommendation**

### **For Your Current Codebase:**

**Phase 1: Keep Monkey Patching** (Current - DONE ✅)
- Already implemented
- Works well
- 466 lines is acceptable

**Phase 2: Consider Proxy Pattern** (Future enhancement)
- Modern ES6 approach
- More maintainable
- ~200 lines vs 466
- Same user API

**Phase 3: Long-term (if scaling issues)**
- Database proxy (Vitess-style)
- or AsyncLocalStorage + custom client
- or Custom query builder

---

## 📊 **Decision Matrix**

| Approach | Effort | Maintainability | User Impact | Performance |
|----------|--------|-----------------|-------------|-------------|
| **Current (Monkey Patch)** | ✅ Done | 🟡 Medium | ✅ Zero | ✅ Good |
| **Proxy Pattern** | 🟡 Medium | ✅ High | ✅ Zero | ✅ Good |
| **AsyncLocalStorage** | ✅ Low | ✅ High | 🟡 Minimal | 🟡 Slight overhead |
| **Custom Builder** | 🔴 Very High | ✅ High | 🔴 High | ✅ Excellent |
| **Database Proxy** | 🔴 Very High | 🟡 Medium | ✅ Zero | 🟡 Network hop |

---

## ✅ **Conclusion**

**Current approach (Monkey Patching) is acceptable for now**:
- It works
- Users love the API
- Proven in production

**Best migration path**:
1. Keep current for stability
2. Prototype Proxy pattern as experiment
3. Benchmark both approaches
4. Migrate when confident

**You're using an uncommon but valid pattern.** Most libraries avoid monkey patching, but for your specific requirement (transparent Knex extension), it's a reasonable choice!

The fact that we reduced it from **899 → 466 lines** makes it much more maintainable! 🎯

