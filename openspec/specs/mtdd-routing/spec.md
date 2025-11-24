# MTDD Routing Specification

## Requirement: Knex Extension with MTDD Method

The system SHALL extend Knex QueryBuilder with a `.mtdd()` method for tenant-aware query routing.

#### Scenario: MTDD method on query builder
- **WHEN** a Knex query is built (e.g., `db.select('*').from('users')`)
- **THEN** the query builder SHALL have an `.mtdd()` method available
- **AND** the `.mtdd()` method SHALL accept optional parameters: `tenantId`, `tenantType`, `methodType`, `options`

#### Scenario: MTDD method on raw queries
- **WHEN** a raw SQL query is built (e.g., `db.raw('SELECT * FROM users')`)
- **THEN** the raw query builder SHALL have an `.mtdd()` method available
- **AND** the `.mtdd()` method SHALL accept the same parameters as QueryBuilder

## Requirement: Direct PostgreSQL Mode

The system SHALL support direct PostgreSQL queries when MTDD routing is disabled.

#### Scenario: Direct query execution
- **WHEN** `useMtdd: false` in configuration
- **AND** a query is executed with or without `.mtdd()` call
- **THEN** the query SHALL execute directly on the local PostgreSQL connection
- **AND** no gRPC routing SHALL occur
- **AND** the query SHALL use standard Knex query execution

#### Scenario: MTDD method in direct mode
- **WHEN** `useMtdd: false` in configuration
- **AND** `.mtdd()` is called on a query
- **THEN** the method SHALL be a no-op (no routing metadata applied)
- **AND** the query SHALL execute normally on local PostgreSQL

## Requirement: gRPC Routing Mode

The system SHALL route queries through gRPC servers when MTDD routing is enabled.

#### Scenario: gRPC query routing
- **WHEN** `useMtdd: true` in configuration
- **AND** a query is executed with `.mtdd(tenantId)` call
- **THEN** the system SHALL look up the tenant's shard via lookup server
- **AND** the system SHALL route the query to the appropriate query server
- **AND** the query SHALL execute on the tenant's database shard
- **AND** results SHALL be returned to the application

#### Scenario: Lookup server query
- **WHEN** a query with tenant ID is executed in MTDD mode
- **THEN** the system SHALL query the lookup server to determine which query server handles the tenant
- **AND** the lookup SHALL return the query server address for the tenant's shard

#### Scenario: Query server selection
- **WHEN** multiple query servers are configured
- **AND** a tenant's shard is determined
- **THEN** the system SHALL select the appropriate query server from the `queryServers` array
- **AND** the system SHALL use hash-based routing if multiple servers handle the same shard

## Requirement: Tenant Type Support

The system SHALL support tenant type parameter for routing decisions.

#### Scenario: Tenant type routing
- **WHEN** `.mtdd(tenantId, tenantType)` is called with tenant type
- **THEN** the system SHALL use both tenant ID and tenant type for routing decisions
- **AND** the tenant type SHALL be passed to the lookup server if needed

#### Scenario: Default tenant type
- **WHEN** `.mtdd(tenantId)` is called without tenant type
- **THEN** the system SHALL default tenant type to `1`
- **AND** routing SHALL proceed with default tenant type

#### Scenario: Add tenant shard operation
- **WHEN** `.mtdd(tenantId, null, 'addTenantShard')` is called with `null` tenant type
- **THEN** the system SHALL trigger add tenant shard operation instead of query execution
- **AND** this SHALL be used for tenant creation/initialization

## Requirement: Query Metadata

The system SHALL attach metadata to queries for routing, caching, and auditing.

#### Scenario: Operation metadata
- **WHEN** `.mtdd()` is called with options object
- **THEN** the system SHALL attach metadata including: `operation` name, `cacheKey`, `timeout`, etc.
- **AND** the metadata SHALL be available for gRPC routing decisions

#### Scenario: Metadata in direct mode
- **WHEN** `useMtdd: false` and `.mtdd()` is called with options
- **THEN** the metadata SHALL be stored but not used for routing
- **AND** the query SHALL execute normally

## Requirement: gRPC Connection Management

The system SHALL manage gRPC client connections efficiently.

#### Scenario: gRPC client initialization
- **WHEN** `useMtdd: true` and configuration includes `queryServers` and `lookupServer`
- **THEN** the system SHALL initialize gRPC clients for all query servers
- **AND** the system SHALL initialize a gRPC client for the lookup server
- **AND** connections SHALL be reused across queries

#### Scenario: Insecure connections in development
- **WHEN** `grpcInsecure: true` and `isDevelopment: true`
- **THEN** the system SHALL allow gRPC connections without SSL/TLS
- **AND** this SHALL only be allowed in development mode

#### Scenario: Secure connections in production
- **WHEN** `grpcInsecure: false` or production mode
- **THEN** the system SHALL require SSL/TLS for all gRPC connections
- **AND** the system SHALL validate SSL certificates

## Requirement: Error Handling in gRPC Routing

The system SHALL handle gRPC routing errors gracefully.

#### Scenario: Lookup server failure
- **WHEN** the lookup server is unavailable or returns an error
- **THEN** the system SHALL handle the error appropriately
- **AND** the system SHALL log the error with context
- **AND** the query SHALL fail with a clear error message

#### Scenario: Query server failure
- **WHEN** a query server is unavailable or returns an error
- **THEN** the system SHALL handle the error appropriately
- **AND** the system SHALL log the error with context
- **AND** the query SHALL fail with a clear error message

#### Scenario: Fallback behavior
- **WHEN** gRPC routing fails
- **THEN** the system SHALL NOT fall back to direct PostgreSQL (would break tenant isolation)
- **AND** the system SHALL return an error to the application

