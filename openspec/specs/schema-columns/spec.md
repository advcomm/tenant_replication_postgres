# Schema Columns Specification

## Purpose

Defines the required MTDS columns that must be present in all replicated tables for client-server synchronization compatibility. The server SDK SHALL use client SDK column names exclusively.

## Requirement: Required MTDS Columns

All replicated tables SHALL include the following MTDS columns for synchronization to work correctly.

Required columns SHALL include:

- `mtds_server_ts` (BIGINT, NOT NULL, default 0) - Server-generated authoritative transaction ID (nanoseconds since Unix epoch)
- `mtds_client_ts` (BIGINT, nullable) - Client-generated timestamp (milliseconds since client epoch, optional but recommended)
- `mtds_device_id` (BIGINT, NOT NULL, default 0) - 64-bit device identifier
- `mtds_delete_ts` (BIGINT, nullable) - Soft delete marker (server transaction ID when deleted, NULL = active)

#### Scenario: Server timestamp column
- **WHEN** a table is used for synchronization
- **THEN** the table SHALL include `mtds_server_ts` column (BIGINT, NOT NULL, default 0)
- **AND** the column SHALL store server-generated authoritative transaction ID (nanoseconds since Unix epoch)
- **AND** the column SHALL be updated on every insert, update, or soft delete operation

#### Scenario: Client timestamp column
- **WHEN** a table is used for synchronization
- **THEN** the table MAY include `mtds_client_ts` column (optional, for audit trail)
- **WHEN** `mtds_client_ts` is provided in sync change payload
- **THEN** the server SHALL store it in the `mtds_client_ts` column if it exists
- **WHEN** `mtds_client_ts` column does not exist
- **THEN** the server SHALL accept the value but not store it (no error)

#### Scenario: Device ID column
- **WHEN** a table is used for synchronization
- **THEN** the table SHALL include `mtds_device_id` column
- **AND** the column SHALL be BIGINT type, NOT NULL, with default 0
- **AND** the column SHALL store the 64-bit device identifier that created/modified the record

#### Scenario: Delete marker column
- **WHEN** a table is used for synchronization
- **THEN** the table SHALL include `mtds_delete_ts` column (BIGINT, nullable)
- **AND** NULL value SHALL indicate the record is active
- **AND** non-NULL value SHALL indicate the record is soft-deleted (server transaction ID when deleted)

## Requirement: Column Name Consistency

The server SHALL use client SDK column names exclusively in all operations.

#### Scenario: Consistent column names in responses
- **WHEN** data is returned to clients via load endpoints or SSE events
- **THEN** the server SHALL use `mtds_server_ts` column name (not `mtds_last_updated_txid`)
- **AND** the server SHALL use `mtds_delete_ts` column name (not `mtds_deleted_txid`)
- **AND** the server SHALL use `mtds_client_ts` column name if present
- **AND** the server SHALL use `mtds_device_id` column name

#### Scenario: Consistent column names in payloads
- **WHEN** a sync change payload includes `mtds_delete_ts`
- **THEN** the server SHALL use it directly for database operations
- **WHEN** a sync change payload includes `mtds_client_ts`
- **THEN** the server SHALL accept it and store it if `mtds_client_ts` column exists
- **WHEN** a sync change payload includes `mtds_server_ts`
- **THEN** the server SHALL ignore it (server generates authoritative timestamp)

## Requirement: Column Defaults and Constraints

The server SHALL enforce appropriate defaults and constraints for MTDS columns.

#### Scenario: Server timestamp defaults
- **WHEN** a record is inserted
- **THEN** `mtds_server_ts` SHALL be set to generated server transaction ID (never NULL, default 0)
- **AND** `mtds_client_ts` (if column exists) SHALL be set to client-provided value or NULL

#### Scenario: Device ID defaults
- **WHEN** a record is inserted or updated
- **THEN** `mtds_device_id` SHALL be set to the device ID from the sync change
- **AND** `mtds_device_id` SHALL never be NULL (default 0 if not provided)

#### Scenario: Delete marker defaults
- **WHEN** a record is active (not deleted)
- **THEN** `mtds_delete_ts` SHALL be NULL
- **WHEN** a record is soft deleted
- **THEN** `mtds_delete_ts` SHALL be set to server transaction ID (not NULL)

