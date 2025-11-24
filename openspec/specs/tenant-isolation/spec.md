# Tenant Isolation Specification

## Requirement: Automatic Tenant Filtering

The system SHALL automatically filter all database queries by tenant ID to ensure data isolation.

#### Scenario: Query filtering with tenant ID

- **WHEN** any database query is executed through the library
- **AND** a tenant ID is available from the authenticated request (`req.tid`)
- **THEN** the system SHALL automatically add a WHERE clause filtering by the tenant column (default: `tenant_id`)
- **AND** the query SHALL only return rows belonging to the authenticated tenant

#### Scenario: Tenant column name from config

- **WHEN** `tenantColumnName` is configured in `PortalConfig` (e.g., 'entityid', 'TenantID')
- **THEN** the system SHALL use the configured column name for tenant filtering
- **WHEN** `tenantColumnName` is not configured
- **THEN** the system SHALL default to `'tenant_id'`

## Requirement: Tenant ID Injection in Sync Changes

The system SHALL automatically inject tenant ID into all sync changes to prevent cross-tenant data leakage.

#### Scenario: Insert operation tenant injection

- **WHEN** a client sends an insert change via `/mtdd/sync/changes`
- **AND** the change payload does not include `tenant_id` (or configured tenant column)
- **THEN** the system SHALL automatically inject the tenant ID from `req.tid` into the row data
- **AND** the inserted row SHALL be associated with the authenticated tenant

#### Scenario: Update operation tenant enforcement

- **WHEN** a client sends an update change via `/mtdd/sync/changes`
- **THEN** the system SHALL ensure the updated row belongs to the authenticated tenant
- **AND** the system SHALL reject updates to rows belonging to other tenants (implicitly via WHERE clause)

#### Scenario: Delete operation tenant verification

- **WHEN** a client sends a delete change via `/mtdd/sync/changes`
- **THEN** the system SHALL only delete rows that belong to the authenticated tenant
- **AND** the delete operation SHALL include a WHERE clause: `WHERE tenant_column = authenticated_tenant_id`
- **AND** the system SHALL perform a soft delete by setting `mtds_delete_ts`

## Requirement: Load Data Tenant Filtering

The system SHALL filter all loaded data by tenant ID.

#### Scenario: Table load with tenant filter

- **WHEN** data is loaded via GET `/mtdd/sync/tables/:tableName` or POST `/mtdd/sync/bulk-load`
- **AND** the request is authenticated with tenant ID
- **THEN** the system SHALL call stored procedures with tenant ID parameter: `get_<tableName>(lastUpdated, tenantId)`
- **AND** the stored procedure SHALL filter results by tenant ID
- **AND** only rows belonging to the authenticated tenant SHALL be returned

#### Scenario: Bulk load tenant isolation

- **WHEN** bulk load is requested for multiple tables
- **THEN** each table load SHALL be filtered by the authenticated tenant ID
- **AND** no data from other tenants SHALL be included in the response

## Requirement: Tenant ID Requirement

The system SHALL require tenant ID for all operations that access tenant data.

#### Scenario: Missing tenant ID in sync

- **WHEN** a sync change request is made without tenant ID in `req.tid`
- **THEN** the system SHALL reject the request or throw an error: "Tenant ID is required to apply sync changes"

#### Scenario: Missing tenant ID in load

- **WHEN** a load data request is made without tenant ID in `req.tid`
- **THEN** the system SHALL reject the request or throw an error: "Tenant ID is required to load tables"

## Requirement: Cross-Tenant Data Prevention

The system SHALL prevent any possibility of cross-tenant data access or modification.

#### Scenario: Client attempts to set different tenant ID

- **WHEN** a client includes `tenant_id` (or configured tenant column) in a sync change payload
- **THEN** the system SHALL override it with the authenticated tenant ID from `req.tid`
- **AND** the client-provided tenant ID SHALL be ignored

#### Scenario: Query without tenant context

- **WHEN** a database query is executed without tenant ID context
- **THEN** the system SHALL either reject the query or require explicit tenant ID specification
- **AND** the system SHALL NOT allow queries that could return data from multiple tenants

## Requirement: Tenant Isolation in Real-time Notifications

The system SHALL ensure real-time notifications only include changes for the authenticated tenant.

#### Scenario: SSE event filtering

- **WHEN** a database change notification is received via PostgreSQL NOTIFY
- **AND** the change includes tenant ID in the data
- **THEN** the system SHALL only send the event to SSE clients registered for that specific tenant
- **AND** the system SHALL NOT broadcast tenant-specific changes to other tenants' connections
