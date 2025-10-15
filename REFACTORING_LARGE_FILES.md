# Large Files Refactoring Plan

## 🔴 Critical Files (Immediate Action Required)

### 1. `helpers/mtdd/routing.ts` - 899 lines
**Problem**: Monolithic function with mixed responsibilities

**Breakdown Strategy**:
```
helpers/mtdd/
├── routing.ts (main orchestrator - 100 lines)
├── actions/
│   ├── performMtddActions.ts (MTDD auto-actions logic)
│   ├── cacheHandler.ts (caching logic)
│   └── auditHandler.ts (audit logging)
├── patching/
│   ├── queryBuilderPatch.ts (QueryBuilder method patching)
│   ├── rawQueryPatch.ts (Raw query patching)
│   └── utilityPatch.ts (Utility method patching)
└── config/
    └── deploymentConfig.ts (single/multi server setup)
```

**Benefits**:
- Each file has single responsibility
- Easier to test individual pieces
- Reduced from 899 lines to ~7 files of 100-150 lines each

---

### 2. `services/grpcClient.ts` - 383 lines
**Problem**: Main client class with too many methods

**Breakdown Strategy**:
```
services/grpc/
├── client.ts (main BackendClient class - 150 lines)
├── executors/
│   ├── queryExecutor.ts (executeQuery methods)
│   ├── tenantExecutor.ts (tenant shard operations)
│   └── rawExecutor.ts (raw SQL execution)
└── validators/
    └── queryValidator.ts (query validation logic)
```

**Benefits**:
- Separates execution logic from client setup
- Each executor focuses on one type of operation
- Easier to add new execution strategies

---

### 3. `helpers/activeClients.ts` - 254 lines
**Problem**: Mixed Firebase, web, and mobile client management

**Breakdown Strategy**:
```
helpers/clients/
├── index.ts (main exports)
├── firebaseClient.ts (Firebase initialization & config)
├── webClients.ts (Web/SSE client management)
├── mobileClients.ts (Mobile/FCM client management)
└── pushNotifications.ts (Push notification logic)
```

**Benefits**:
- Clear separation of Firebase, web, and mobile concerns
- Easier to maintain each client type independently
- Better testability

---

## 🟠 Should Refactor (Next Priority)

### 4. `helpers/mtdd/grpcHandler.ts` - 189 lines
**Refactor Strategy**:
- Extract single-server logic to `singleServerHandler.ts`
- Extract multi-server logic to `multiServerHandler.ts`
- Keep main handler as orchestrator

### 5. `controllers/eventsController.ts` - 181 lines
**Refactor Strategy**:
- Extract authentication logic to middleware/auth
- Move channel listening to services/channelService.ts
- Keep controller thin (HTTP handling only)

### 6. `services/grpc/serverCalls.ts` - 176 lines
**Refactor Strategy**:
- Split into `raceStrategy.ts`, `anyStrategy.ts`, `allStrategy.ts`
- Each strategy in its own file
- Main file as strategy selector

---

## 📋 Refactoring Order (Recommended)

1. **Phase 1**: Fix `helpers/mtdd/routing.ts` (biggest impact)
   - Extract performMtddActions
   - Extract QueryBuilder patching
   - Extract Raw query patching

2. **Phase 2**: Refactor `services/grpcClient.ts`
   - Extract executors
   - Extract validators

3. **Phase 3**: Split `helpers/activeClients.ts`
   - Separate Firebase logic
   - Separate client types

4. **Phase 4**: Clean up remaining files
   - Controllers (thin them down)
   - Middleware (split complex logic)

---

## 🎯 Target Metrics

**Current State**:
- Largest file: 899 lines
- Files >200 lines: 3
- Average complexity: High

**Target State**:
- Largest file: <200 lines
- Files >200 lines: 0
- Average complexity: Low
- Each file: Single responsibility

---

## 🛠️ Implementation Notes

### General Principles:
1. **Single Responsibility**: Each file does ONE thing well
2. **Max 150-200 lines**: Keep files digestible
3. **Clear Naming**: File names describe exact purpose
4. **Logical Grouping**: Related files in subdirectories
5. **Maintain Exports**: Preserve public API through index files

### Testing Strategy:
- Write tests for each extracted module
- Ensure no regression in functionality
- Test edge cases for each piece independently

### Migration Path:
1. Create new structure alongside old
2. Move functionality piece by piece
3. Update imports incrementally
4. Delete old file when empty
5. Run tests after each step

---

## 🚀 Expected Benefits

1. **Maintainability**: Easier to understand and modify
2. **Testability**: Each piece can be tested in isolation
3. **Collaboration**: Multiple devs can work on different pieces
4. **Debugging**: Smaller files = easier to debug
5. **Performance**: Better tree-shaking and code splitting
6. **Onboarding**: New devs can understand code faster

---

## ⚠️ Risks & Mitigation

**Risk**: Breaking existing functionality
- **Mitigation**: Comprehensive test suite, incremental changes

**Risk**: Import complexity increases
- **Mitigation**: Use path aliases (@/), clear index files

**Risk**: Too many small files
- **Mitigation**: Group related files in subdirectories

---

## 📊 Progress Tracking

- [ ] helpers/mtdd/routing.ts (899 → ~7 files of 100-150 lines)
- [ ] services/grpcClient.ts (383 → ~4 files of 100-150 lines)
- [ ] helpers/activeClients.ts (254 → ~5 files of 50-100 lines)
- [ ] helpers/mtdd/grpcHandler.ts (189 → ~3 files of 60-80 lines)
- [ ] controllers/eventsController.ts (181 → ~3 files of 60-80 lines)
- [ ] services/grpc/serverCalls.ts (176 → ~4 files of 40-50 lines)

