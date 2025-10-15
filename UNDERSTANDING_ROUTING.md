# Understanding routing.ts - The MTDD Magic Explained

## 🎯 **What routing.ts Does**

**Short answer**: It performs **"Monkey Patching"** on Knex.js to intercept database queries and route them through gRPC instead of PostgreSQL.

**Long answer**: It modifies Knex's internal classes at runtime to add `.mtdd()` support to every query method.

---

## 🐒 **What is Monkey Patching?**

**Monkey Patching** = Modifying existing classes/objects at runtime to change their behavior.

### **Simple Example:**

```javascript
// Before patching:
const user = { name: 'John' };
user.greet(); // ❌ Error: greet is not a function

// Monkey patch: Add method at runtime
user.greet = function() { 
  return `Hello, ${this.name}!`; 
};

// After patching:
user.greet(); // ✅ "Hello, John!"
```

### **What routing.ts Does:**

```typescript
// Knex's QueryBuilder class (internal, not exposed)
const QueryBuilder = require('knex/lib/query/querybuilder');

// Before patching:
QueryBuilder.prototype.mtdd; // undefined ❌

// Monkey patch: Add .mtdd() method
QueryBuilder.prototype.mtdd = function(tenantId) {
  this._mtddMeta = { tenantId };
  return this;
};

// After patching:
db('users').mtdd('tenant-abc'); // ✅ Works!
```

---

## 🔍 **The Complete Flow**

### **Step 1: User Writes Normal Knex Code**

```typescript
const users = await db('users')
  .where('id', 123)
  .select('name', 'email')
  .mtdd('tenant-abc');  // ← Only addition needed
```

### **Step 2: routing.ts Intercepts**

Here's what **actually happens** behind the scenes:

```typescript
// 1. db('users') creates a QueryBuilder instance
const query = knex.queryBuilder();

// 2. .where('id', 123) - PATCHED by routing.ts
query.where = function(column, value) {
  const result = originalWhere.call(this, column, value);
  // Check if MTDD metadata exists, preserve it
  if (this._mtddMeta) {
    result._mtddMeta = this._mtddMeta;
  }
  return result; // Enable chaining
};

// 3. .select('name', 'email') - PATCHED by routing.ts
query.select = function(...columns) {
  const result = originalSelect.call(this, ...columns);
  // Check if MTDD metadata exists, preserve it
  if (this._mtddMeta) {
    result._mtddMeta = this._mtddMeta;
  }
  return result;
};

// 4. .mtdd('tenant-abc') - ADDED by routing.ts
query.mtdd = function(tenantId) {
  this._mtddMeta = { 
    tenantId: 'tenant-abc',
    tenantType: 1,
    methodType: 'auto'
  };
  
  // Setup chain-end detection
  setupChainEndDetection(this);
  
  return this;
};

// 5. await (triggers .then()) - INTERCEPTED by routing.ts
query.then = function(onSuccess, onError) {
  if (this._mtddMeta && !this._toSQLCalled) {
    // AUTO-EXECUTE VIA gRPC!
    
    // Get SQL from Knex
    const sql = this.toSQL();
    // sql = { sql: 'SELECT name, email FROM users WHERE id = $1', bindings: [123] }
    
    // Route to gRPC server for tenant-abc
    const result = await grpcMtddHandler(this._mtddMeta, this, sql);
    
    // Return result to user
    return onSuccess(result);
  }
  
  // Normal Knex behavior if no MTDD
  return originalThen.apply(this, arguments);
};
```

---

## 🤯 **Why Is This So Complex?**

### **1. Patching 50+ Methods**

routing.ts must patch **every Knex method** to preserve MTDD metadata:

```typescript
// These ALL must work with .mtdd():
.select()    .where()      .join()       .groupBy()
.having()    .limit()      .offset()     .orderBy()
.insert()    .update()     .delete()     .returning()
.leftJoin()  .rightJoin()  .whereIn()    .whereBetween()
.distinct()  .count()      .sum()        .avg()
// ... and 30+ more!
```

**Each method needs a wrapper** to:
1. Call the original Knex method
2. Preserve MTDD metadata
3. Return `this` for chaining
4. Set up chain-end detection

---

### **2. Handling Multiple Call Positions**

`.mtdd()` can be called **anywhere** in the chain:

```typescript
// At the start
db('users').mtdd('tenant-abc').where('id', 123).select('*');

// In the middle  
db('users').where('id', 123).mtdd('tenant-abc').select('*');

// At the end
db('users').where('id', 123).select('*').mtdd('tenant-abc');

// All three MUST produce the same SQL and route to the same tenant!
```

---

### **3. Intercepting Promise Chain Endings**

Must detect when the query is **actually executed**:

```typescript
// These all end the chain:
.then(callback)       // Promise resolution
.catch(callback)      // Promise rejection
.finally(callback)    // Promise completion
.stream()             // Readable stream
.pipe(destination)    // Stream piping

// routing.ts intercepts ALL of these!
```

**Each ending type requires different handling**:

```typescript
// .then() - Execute and pass result
query.then(result => console.log(result));
// → Execute via gRPC, pass result to callback

// .catch() - Execute and handle errors
query.catch(error => console.error(error));
// → Execute via gRPC, pass any error to callback

// .stream() - Execute and return stream
query.stream();
// → Execute via gRPC, convert result to Node.js Readable stream
```

---

### **4. Preserving Normal Knex Behavior**

**Critical**: MTDD must **not break** existing Knex functionality!

```typescript
// Queries WITHOUT .mtdd() must work normally
db('users').where('id', 123).select('*'); 
// → Goes to PostgreSQL (not gRPC)

// Queries WITH .mtdd() go through gRPC
db('users').where('id', 123).select('*').mtdd('tenant-abc');
// → Goes to gRPC server for tenant-abc
```

**routing.ts must check** on every method call:
```typescript
if (this._mtddMeta) {
  // MTDD query - special handling
} else {
  // Normal Knex query - don't interfere
}
```

---

### **5. Handling Edge Cases**

**Complex scenarios:**

```typescript
// Case 1: Manual .toSQL() call
const sql = db('users').mtdd('tenant-abc').toSQL();
// → Return SQL object, don't execute (user wants SQL, not results)

// Case 2: Clone operation
const query1 = db('users').mtdd('tenant-abc');
const query2 = query1.clone().where('status', 'active');
// → query2 must inherit MTDD metadata!

// Case 3: Subqueries
db('users')
  .whereIn('id', db('orders').select('user_id').mtdd('tenant-abc'))
  .mtdd('tenant-abc');
// → Both queries must route correctly!
```

---

## 📋 **The Complete Patching Strategy**

### **What Gets Patched:**

1. **QueryBuilder.prototype.mtdd** (NEW METHOD)
   - Stores tenant metadata
   - Sets up chain-end detection
   - Returns `this` for chaining

2. **QueryBuilder.prototype.toSQL** (OVERRIDE)
   - Includes MTDD metadata in SQL result
   - Detects manual vs auto calls

3. **50+ QueryBuilder methods** (WRAP)
   - `select`, `where`, `join`, `groupBy`, etc.
   - Preserve MTDD metadata
   - Trigger chain-end detection

4. **5 Promise chain-ending methods** (INTERCEPT)
   - `.then()` - Execute and resolve
   - `.catch()` - Execute and handle errors
   - `.finally()` - Execute and run cleanup
   - `.stream()` - Execute and stream results
   - `.pipe()` - Execute and pipe to destination

5. **Raw.prototype.mtdd** (NEW METHOD)
   - Same as QueryBuilder but for raw queries

6. **Raw.prototype.toSQL** (OVERRIDE)
   - Same as QueryBuilder but for raw queries

---

## 💡 **Why Can't This Be Simpler?**

### **Option 1: Make Users Change Their Code** ❌
```typescript
// Instead of:
db('users').where('id', 123).select('*').mtdd('tenant-abc');

// Force them to do:
await executeMtddQuery('SELECT * FROM users WHERE id = $1', [123], 'tenant-abc');
```
**Problem**: Loses Knex's query builder benefits!

### **Option 2: Create a Wrapper Class** ❌
```typescript
class MtddQueryBuilder extends Knex.QueryBuilder {
  mtdd(tenantId) { /* ... */ }
}
```
**Problem**: 
- Can't extend Knex classes (they're internal)
- Would need to reimplement ALL Knex methods
- Breaks existing code

### **Option 3: Monkey Patching** ✅ (Current approach)
```typescript
// Patch Knex at runtime
QueryBuilder.prototype.mtdd = function() { /* ... */ };
```
**Benefits**:
- ✅ Works with existing Knex code
- ✅ Transparent to users
- ✅ Preserves all Knex functionality
- ✅ Just add `.mtdd()` to existing queries

**Drawbacks**:
- ❌ Complex implementation
- ❌ Fragile (depends on Knex internals)
- ❌ Hard to maintain

---

## 🎭 **The Illusion**

From the user's perspective, it's simple:

```typescript
// Just add .mtdd()!
db('users').where('active', true).mtdd('tenant-123');
```

But behind the scenes, routing.ts is:
1. ✅ Patching 50+ Knex methods
2. ✅ Intercepting promise chain endings
3. ✅ Auto-calling `.toSQL()`
4. ✅ Routing through gRPC
5. ✅ Returning results seamlessly
6. ✅ Preserving normal Knex behavior for non-MTDD queries

**It's complex because it's doing MAGIC!** ✨

---

## 📊 **Complexity Breakdown**

| Task | Lines | Complexity |
|------|-------|------------|
| Add `.mtdd()` method | ~90 | Medium (parameter handling) |
| Override `.toSQL()` | ~25 | Low (metadata injection) |
| Wrap 50+ methods | ~130 | High (repetitive patching) |
| Chain-end detection | ~150 | Very High (promise interception) |
| Handle edge cases | ~70 | High (cloning, subqueries, etc.) |

**Total**: 466 lines of specialized runtime patching

---

## 🎯 **Could We Reduce It More?**

### **Possible Extractions:**

1. **Extract method list** (~100 lines)
   ```typescript
   // Move to: patching/methodDefinitions.ts
   export const pgClientMethods = { select: '...', where: '...', ... };
   export const reRunMethods = new Set(['distinct', 'having', ...]);
   ```

2. **Extract .mtdd() implementation** (~90 lines)
   ```typescript
   // Move to: patching/mtddMethodImpl.ts
   export function createMtddMethod() { return function(...) { ... }; }
   ```

3. **Extract createChainEndWrapper** (~30 lines)
   ```typescript
   // Move to: patching/chainWrapper.ts
   export function createChainEndWrapper(...) { ... }
   ```

**Potential**: Could reduce to ~250 lines main orchestrator

---

## ✅ **Current Decision: Keep It Together**

**Rationale:**
1. It's **one cohesive task**: "Patch Knex QueryBuilder for MTDD"
2. Breaking it up more might **hurt readability**
3. **466 lines** is acceptable for a specialized module
4. Already achieved **48% reduction** from original 899
5. Further extraction has **diminishing returns**

**The patching logic is tightly coupled** - splitting it could make it harder to understand as a whole.

---

## 🏆 **Success Criteria - ACHIEVED**

✅ **Primary goal**: Reduce massive files (899 → 466)  
✅ **Secondary goal**: Extract reusable pieces (actions, chain-end, raw)  
✅ **Tertiary goal**: Maintain readability and functionality

**routing.ts is now at an acceptable size for its complexity!** 🎯

---

## 📚 **Key Takeaways**

1. **Monkey patching is powerful but complex**
   - Allows transparent API extensions
   - But requires deep understanding of target system

2. **Not all code should be micro-modules**
   - Specialized, tightly-coupled code can stay together
   - 466 lines is fine for complex patching logic

3. **Know when to stop refactoring**
   - We achieved 48% reduction
   - Further splits would hurt comprehension
   - This is the sweet spot!

---

## 🎨 **The Art of Refactoring**

**Good refactoring** balances:
- ✅ Modularity (separate concerns)
- ✅ Cohesion (keep related code together)
- ✅ Readability (easy to understand)
- ✅ Maintainability (easy to modify)

**routing.ts now achieves this balance!**

We extracted:
- ✅ Actions logic (independent concern)
- ✅ Chain-end detection (reusable utility)
- ✅ Raw query patching (separate class)

We kept together:
- ✅ QueryBuilder method list (tightly coupled)
- ✅ Method patching loop (cohesive unit)
- ✅ .mtdd() implementation (core logic)

**Perfect!** 🎯

