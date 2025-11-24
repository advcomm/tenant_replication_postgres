# Configuration Specification

## Requirement: Library Initialization

The system SHALL provide an initialization function that sets up the library and mounts routes on an Express application.

#### Scenario: Successful initialization
- **WHEN** `InitializeReplicationWithDb()` is called with valid Express app, database config, and library config
- **THEN** the system SHALL create a Knex database connection from the provided database config
- **AND** the system SHALL patch the Knex instance with MTDD routing capabilities
- **AND** the system SHALL mount routes at `/mtdd/sync/*` on the Express app
- **AND** the system SHALL return the configured Knex instance for application use

#### Scenario: Configuration storage
- **WHEN** `InitializeReplicationWithDb()` is called with a `LibraryConfig` object
- **THEN** the system SHALL store the configuration in a config holder singleton
- **AND** the configuration SHALL be accessible throughout the library via `config` import

## Requirement: Database Configuration

The system SHALL accept database connection configuration via `DatabaseConfig` interface.

#### Scenario: Database config structure
- **WHEN** database configuration is provided
- **THEN** the config SHALL include connection details: `host`, `port`, `user`, `password`, `database`
- **AND** the config SHALL extend Knex.Config but omit the `client` field (library sets `client: 'pg'` internally)
- **AND** optional `debug` flag SHALL be supported for Knex debug logging

## Requirement: MTDD Configuration

The system SHALL support configuration for Multi-Tenant Database Deployment (MTDD) routing via gRPC.

#### Scenario: MTDD disabled (direct PostgreSQL)
- **WHEN** `useMtdd: false` or not provided in `MtddBackendConfig`
- **THEN** all database queries SHALL execute directly on the local PostgreSQL connection
- **AND** no gRPC clients SHALL be initialized

#### Scenario: MTDD enabled
- **WHEN** `useMtdd: true` is set in `MtddBackendConfig`
- **THEN** the system SHALL require `queryServers` array (list of gRPC query server addresses)
- **AND** the system SHALL require `lookupServer` (gRPC lookup server address)
- **AND** the system SHALL initialize gRPC clients for query routing
- **AND** queries using `.mtdd()` method SHALL route through gRPC servers

#### Scenario: Development mode
- **WHEN** `isDevelopment: true` is set in `MtddBackendConfig`
- **THEN** the system SHALL enable debug logging
- **AND** the system SHALL use pretty log formatting
- **AND** the system SHALL allow `grpcInsecure: true` for local development

#### Scenario: Production mode
- **WHEN** `isDevelopment: false` or not set in `MtddBackendConfig`
- **THEN** the system SHALL use JSON log formatting
- **AND** the system SHALL require `grpcInsecure: false` (SSL/TLS required)
- **AND** the system SHALL log at info level by default

## Requirement: Portal Configuration

The system SHALL support portal-specific configuration for tenant isolation.

#### Scenario: Tenant column name configuration
- **WHEN** `tenantColumnName` is provided in `PortalConfig`
- **THEN** the system SHALL use the specified column name for tenant isolation (e.g., 'entityid', 'TenantID', 'VendorID')
- **WHEN** `tenantColumnName` is not provided
- **THEN** the system SHALL default to `'tenant_id'`

#### Scenario: Portal metadata
- **WHEN** `portalId` and `portalName` are provided in `PortalConfig`
- **THEN** the system SHALL store these values for portal identification
- **AND** these values SHALL be available for use in stored procedures or business logic

#### Scenario: Tenant insert procedure
- **WHEN** `tenantInsertProc` is provided in `PortalConfig`
- **THEN** the system SHALL store the stored procedure name for tenant creation
- **AND** this procedure name SHALL be available for tenant management operations

## Requirement: Firebase Configuration

The system SHALL support optional Firebase configuration for push notifications.

#### Scenario: Firebase enabled
- **WHEN** `firebase` configuration is provided in `LibraryConfig` with valid service account credentials
- **THEN** the system SHALL initialize Firebase Admin SDK
- **AND** the system SHALL enable push notification capabilities for mobile/web clients

#### Scenario: Firebase disabled
- **WHEN** `firebase` configuration is not provided in `LibraryConfig`
- **THEN** the system SHALL operate without push notification capabilities
- **AND** the system SHALL NOT initialize Firebase Admin SDK
- **AND** real-time notifications SHALL only be available via Server-Sent Events

## Requirement: Configuration Validation

The system SHALL validate configuration at initialization time.

#### Scenario: Required MTDD config when enabled
- **WHEN** `useMtdd: true` is set
- **AND** `queryServers` or `lookupServer` is missing
- **THEN** the system SHALL throw an error or fail initialization with a clear error message

#### Scenario: Invalid database config
- **WHEN** database configuration is missing required connection fields
- **THEN** the system SHALL fail initialization with a clear error message
- **AND** Knex SHALL throw connection errors if connection details are invalid

