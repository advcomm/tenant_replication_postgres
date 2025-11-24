# Project Context

## Purpose

`@advcomm/tenant_replication_postgres` is a multi-tenant database replication library that provides:

- **Client-Server Sync**: Bidirectional data synchronization with conflict resolution between client applications and server databases
- **Real-time Updates**: Server-Sent Events (SSE) for live database change notifications
- **MTDD Routing**: Optional tenant-aware query routing via gRPC to distributed database shards
- **Push Notifications**: Firebase Cloud Messaging integration for mobile/web client notifications
- **Tenant Isolation**: Automatic tenant-based data isolation and security

The library is designed as a reusable npm package that applications can integrate to enable multi-tenant database replication capabilities without implementing the complex sync logic themselves.

## Tech Stack

### Core Technologies

- **TypeScript 5.8+** - Primary language with strict type checking
- **Node.js 20+** - Runtime environment
- **Express.js** - HTTP server framework (provided by consuming application)
- **PostgreSQL** - Primary database system
- **Knex.js** - SQL query builder and database abstraction layer

### Key Dependencies

- **@grpc/grpc-js** - gRPC client for MTDD routing
- **google-protobuf** - Protocol buffer support
- **firebase-admin** - Firebase Cloud Messaging for push notifications
- **pino** - Structured, high-performance logging
- **zod** - Runtime type validation and schema validation
- **@advcomm/utils** - Internal utility library

### Development Tools

- **Biome** - Linting and code formatting (replaces ESLint/Prettier)
- **TypeScript** - Type checking and compilation
- **tsc-alias** - Path alias resolution for compiled output
- **semantic-release** - Automated versioning and publishing
- **husky** - Git hooks for pre-commit checks
- **lint-staged** - Run linters on staged files

## Project Conventions

### Code Style

**Formatting & Linting:**

- Uses **Biome** for all linting and formatting (no ESLint/Prettier)
- Single quotes for strings (`'string'`)
- Semicolons always required
- Type imports must use `import type` syntax (enforced by Biome rule `useImportType: error`)

**TypeScript Configuration:**

- Strict mode enabled (`strict: true`)
- Target: ES2016
- Module: Node16
- Path aliases: `@/*` maps to `src/*`
- Declaration files generated (`.d.ts`)
- No source maps in production

**File Organization:**

- Source code in `src/` directory
- Generated code in `src/generated/` (gRPC protobuf files)
- Compiled output in `dist/` directory
- Examples in `examples/` directory

**Naming Conventions:**

- Files: `camelCase.ts` for source files
- Classes: `PascalCase` (e.g., `SyncController`, `BaseError`)
- Functions/variables: `camelCase` (e.g., `syncChanges`, `tenantId`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `DEFAULT_PORT`)
- Interfaces/Types: `PascalCase` (e.g., `LibraryConfig`, `AuthenticatedRequest`)

**Code Quality:**

- All code must pass Biome linting (`npm run check`)
- Pre-commit hooks run `check:fix` on staged files
- Type safety is critical - avoid `any` types
- Use Zod schemas for runtime validation of external data

### Architecture Patterns

**Layered Architecture:**

- **Controllers** (`src/controllers/`) - Handle HTTP requests/responses, request validation
- **Services** (`src/services/`) - Business logic and orchestration
- **Helpers** (`src/helpers/`) - Utility functions, client wrappers, Knex extensions
- **Middleware** (`src/middleware/`) - Express middleware (error handling, logging, validation, auth)
- **Routes** (`src/routes/`) - Route definitions and mounting
- **Types** (`src/types/`) - TypeScript type definitions
- **Errors** (`src/errors/`) - Custom error classes

**Dependency Injection:**

- Services are injected into controllers via constructor
- Configuration is centralized in `config/configHolder.ts`
- Knex instance is created and patched by the library, returned to consumers

**Error Handling:**

- Custom error classes extend `BaseError` with status codes and context
- Error middleware catches and formats errors consistently
- Errors include correlation IDs for request tracing

**Logging:**

- Structured logging with Pino
- Domain-specific child loggers (`grpcLogger`, `mtddLogger`, `apiLogger`, etc.)
- Development mode: Pretty formatting, debug level
- Production mode: JSON output, info level
- Request correlation IDs for tracing

**Configuration:**

- Library configuration via `LibraryConfig` interface (preferred)
- Environment variables supported for backward compatibility (deprecated)
- Configuration validated and stored in config holder singleton

**Database Access:**

- Knex instance is created and owned by the library
- Knex is patched with custom `.mtdd()` method for tenant routing
- Direct PostgreSQL queries when `useMtdd: false`
- gRPC routing when `useMtdd: true`

### Testing Strategy

**Current State:**

- No test files found in the codebase (`*.test.ts`, `*.spec.ts` excluded from TypeScript compilation)
- Testing strategy not yet established

**Recommendations for Future:**

- Unit tests for services and helpers
- Integration tests for API endpoints
- Mock gRPC clients for MTDD routing tests
- Database transaction rollback for test isolation

### Git Workflow

**Branching Strategy:**

- Feature branches: `feature/*` (e.g., `feature/server-sync-endpoints`)
- Main branch: `main` (triggers releases)
- Semantic versioning via automated releases

**Commit Conventions:**

- Follows [Conventional Commits](https://www.conventionalcommits.org/) specification
- Format: `<type>(<scope>): <subject>`
- Types: `feat`, `fix`, `perf`, `docs`, `style`, `refactor`, `test`, `chore`
- Scopes (optional): `mtdd`, `grpc`, `api`, `config`, etc.
- Breaking changes: Use `feat!:` or `BREAKING CHANGE:` footer

**Version Bumping:**

- `feat` → Minor version bump (1.0.0 → 1.1.0)
- `fix`, `perf` → Patch version bump (1.0.0 → 1.0.1)
- `BREAKING CHANGE` or `feat!` → Major version bump (1.0.0 → 2.0.0)
- `docs`, `style`, `refactor`, `test`, `chore` → No release

**Release Process:**

- Automated via semantic-release on push to `main`
- Generates CHANGELOG.md automatically
- Creates git tags
- Publishes to npm
- Creates GitHub releases

**Pre-commit Hooks:**

- Husky runs lint-staged
- Biome check and fix on staged files
- Prevents commits with linting errors

## Domain Context

**Multi-Tenant Database Replication:**

- Each tenant's data is isolated via a `tenant_id` column (configurable name)
- All database operations automatically filter by tenant ID
- Clients must authenticate and provide tenant context via `req.tid`

**Sync Operations:**

- Clients send changes (insert/update/delete) to server via `/mtdd/sync/changes`
- Server applies changes with automatic tenant ID injection
- Server tracks changes with transaction IDs (`mtds_server_ts`)
- Soft deletes tracked via `mtds_delete_ts` column
- Device tracking via `mtds_device_id` column

**MTDD (Multi-Tenant Database Deployment):**

- Optional gRPC-based query routing to distributed database shards
- Lookup server determines which query server handles a tenant
- Query servers execute SQL on tenant-specific database shards
- Development mode can bypass gRPC and use direct PostgreSQL connection

**Real-time Notifications:**

- PostgreSQL NOTIFY/LISTEN for database change events
- Server-Sent Events (SSE) endpoint for client subscriptions
- Firebase Cloud Messaging for push notifications to mobile/web clients
- Device registration and management

**Authentication Requirements:**

- All sync endpoints require authentication middleware
- Middleware must set `req.tid` (tenant ID) and `req.sub` (user ID)
- Optional `req.roles` for role-based access control
- Library does not implement authentication - consumers provide it

**Database Schema Requirements:**

- Tables must include: `tenant_id`, `mtds_server_ts`, `mtds_device_id`, `mtds_delete_ts` (and optionally `mtds_client_ts`)
- Stored procedures for bulk loading (optional but recommended)
- PostgreSQL triggers for NOTIFY events (optional but recommended for real-time updates)
- Indexes on tenant_id and transaction ID columns for performance

## Important Constraints

**Technical Constraints:**

- Node.js 20+ required (uses modern Node.js features)
- Express.js must be provided by consuming application
- PostgreSQL database required
- All tables must have tenant isolation column
- Authentication middleware must be added before library initialization
- gRPC servers required when `useMtdd: true`

**Security Constraints:**

- Never use `grpcInsecure: true` in production
- Always validate JWT tokens in auth middleware
- Tenant IDs must be sanitized to prevent injection
- SSL/TLS required for gRPC in production
- Rate limiting recommended for API endpoints

**Architecture Constraints:**

- Library owns the Knex instance - consumers should not create their own
- Configuration should be provided via `LibraryConfig` interface (not env vars)
- Generated protobuf files in `src/generated/` should not be edited manually
- Path aliases (`@/*`) must be resolved via `tsc-alias` after TypeScript compilation

**Business Constraints:**

- Library is published as npm package `@advcomm/tenant_replication_postgres`
- Breaking changes require major version bump and migration guide
- Backward compatibility maintained within major versions

## External Dependencies

**Services & APIs:**

- **PostgreSQL Database** - Primary data store, must support NOTIFY/LISTEN for real-time features
- **gRPC Servers** (optional) - Query servers and lookup server for MTDD routing
- **Firebase Cloud Messaging** (optional) - Push notification service
- **npm Registry** - Package publishing and distribution

**Infrastructure:**

- **GitHub** - Source code repository, CI/CD via GitHub Actions
- **npm** - Package registry for publishing

**Key External Libraries:**

- `@advcomm/utils` - Internal utility library (version ^1.10.0)
- `@grpc/grpc-js` - gRPC client library
- `knex` - SQL query builder
- `pg` - PostgreSQL client driver
- `express` - HTTP framework (peer dependency)
- `firebase-admin` - Firebase Admin SDK
- `pino` - Logging framework
- `zod` - Schema validation
