# Sync Operations Specification

## Requirement: Change Normalization

The system SHALL normalize incoming sync changes to a consistent internal format.

#### Scenario: Normalize client transaction ID
- **WHEN** a sync change is received with `clientTxid` as string or number
- **THEN** the system SHALL convert it to a number
- **AND** if conversion fails, the system SHALL throw an error: "Invalid clientTxid or mtds_device_id"

#### Scenario: Normalize device ID
- **WHEN** a sync change is received with `mtds_device_id` as string or number
- **THEN** the system SHALL convert it to a number
- **AND** if conversion fails, the system SHALL throw an error: "Invalid clientTxid or mtds_device_id"

#### Scenario: Normalize action
- **WHEN** a sync change is received with `action` as number (0=insert, 1=update, null=delete)
- **THEN** the system SHALL convert to `SyncChangeAction` enum (Insert, Update, Delete)
- **WHEN** a sync change is received with `action` as string ("insert", "update", "delete")
- **THEN** the system SHALL normalize to lowercase and convert to `SyncChangeAction` enum
- **WHEN** `action` is null or missing
- **THEN** the system SHALL default to `SyncChangeAction.Delete`

#### Scenario: Normalize payload
- **WHEN** a sync change is received with `payload` as JSON string
- **THEN** the system SHALL parse the JSON string to an object
- **WHEN** a sync change is received with `payload` as object
- **THEN** the system SHALL use the object directly
- **WHEN** `payload` is missing
- **THEN** the system SHALL set payload to `undefined`

#### Scenario: Handle client column names in payload
- **WHEN** a sync change payload includes `mtds_delete_ts`
- **THEN** the system SHALL use it directly for database operations
- **WHEN** a sync change payload includes `mtds_client_ts`
- **THEN** the system SHALL accept and store it if `mtds_client_ts` column exists
- **WHEN** a sync change payload includes `mtds_server_ts`
- **THEN** the system SHALL ignore it (server generates authoritative timestamp)

## Requirement: Change Processing Order

The system SHALL process sync changes in order by client transaction ID.

#### Scenario: Ordered processing
- **WHEN** multiple sync changes are received in a batch
- **THEN** the system SHALL sort changes by `clientTxid` in ascending order
- **AND** the system SHALL process changes sequentially in sorted order

## Requirement: Insert Operation

The system SHALL handle insert operations by creating new rows in the database.

#### Scenario: Successful insert
- **WHEN** a sync change with action `insert` is processed
- **AND** the change includes valid `payload.New` with row data
- **THEN** the system SHALL insert the row into the specified table
- **AND** the system SHALL set `tenant_id` (or configured tenant column) from authenticated request
- **AND** the system SHALL set `mtds_server_ts` to generated server transaction ID
- **AND** the system SHALL set `mtds_client_ts` (if column exists) to client-provided value from payload
- **AND** the system SHALL set `mtds_device_id` to the device ID from the change
- **AND** the system SHALL use `onConflict().merge()` to handle primary key conflicts (upsert behavior)

#### Scenario: Insert with missing payload
- **WHEN** a sync change with action `insert` is processed
- **AND** the change does not include `payload.New`
- **THEN** the system SHALL throw an error: "Change payload missing New values"
- **AND** the change SHALL be recorded as a failure in the response

## Requirement: Update Operation

The system SHALL handle update operations by modifying existing rows.

#### Scenario: Successful update
- **WHEN** a sync change with action `update` is processed
- **AND** the change includes valid `payload.New` with row data
- **THEN** the system SHALL update the row in the specified table using primary key
- **AND** the system SHALL ensure `tenant_id` matches authenticated tenant (via WHERE clause)
- **AND** the system SHALL set `mtds_server_ts` to generated server transaction ID
- **AND** the system SHALL set `mtds_client_ts` (if column exists) to client-provided value from payload
- **AND** the system SHALL set `mtds_device_id` to the device ID from the change
- **AND** the system SHALL use `onConflict().merge()` for upsert behavior

## Requirement: Delete Operation

The system SHALL handle delete operations using soft deletes.

#### Scenario: Successful soft delete
- **WHEN** a sync change with action `delete` is processed
- **AND** the change includes valid primary key value
- **THEN** the system SHALL perform a soft delete by setting `mtds_delete_ts` to generated server transaction ID
- **AND** the system SHALL set `mtds_server_ts` to generated server transaction ID
- **AND** the system SHALL only delete rows belonging to the authenticated tenant (WHERE clause includes tenant filter)
- **AND** the row SHALL remain in the database but marked as deleted

#### Scenario: Delete non-existent row
- **WHEN** a sync change with action `delete` is processed
- **AND** no row exists with the specified primary key and tenant ID
- **THEN** the system SHALL treat this as success (idempotent delete)
- **AND** the system SHALL NOT throw an error

## Requirement: Server Transaction ID Generation

The system SHALL generate unique server transaction IDs for each processed change.

#### Scenario: Server transaction ID format
- **WHEN** a sync change is processed
- **THEN** the system SHALL generate a unique server transaction ID (number, nanoseconds since Unix epoch)
- **AND** the server transaction ID SHALL be stored in `mtds_server_ts` column
- **AND** the server transaction ID SHALL be returned to the client in the `updates` array as `serverTxid`

#### Scenario: Transaction ID tracking
- **WHEN** multiple changes are processed in a batch
- **THEN** each change SHALL receive a unique server transaction ID
- **AND** server transaction IDs SHALL be monotonically increasing or unique

## Requirement: Primary Key Resolution

The system SHALL resolve primary key column names for each table.

#### Scenario: Primary key caching
- **WHEN** a sync change is processed for a table
- **THEN** the system SHALL resolve the primary key column name for that table
- **AND** the system SHALL cache the primary key column name to avoid repeated database queries
- **WHEN** the same table is processed again
- **THEN** the system SHALL use the cached primary key column name

#### Scenario: Primary key normalization
- **WHEN** a sync change includes `record_pk` value
- **THEN** the system SHALL normalize the primary key value (handle string/number conversion)
- **AND** the system SHALL use the normalized value for database operations

## Requirement: Error Handling in Batch Processing

The system SHALL continue processing changes even when individual changes fail.

#### Scenario: Partial batch success
- **WHEN** a batch of sync changes is processed
- **AND** some changes fail while others succeed
- **THEN** the system SHALL process all valid changes successfully
- **AND** the system SHALL record failed changes in the `failures` array
- **AND** the system SHALL return HTTP 207 (Multi-Status) with `success: false`
- **AND** the response SHALL include both `updates` (successful) and `failures` (failed) arrays

#### Scenario: Error details in failures
- **WHEN** a sync change fails to process
- **THEN** the system SHALL record the failure with: `change` object (clientTxid, tableName, action, pkValue) and `message` (error message)
- **AND** the system SHALL log the error with full context

## Requirement: Response Format

The system SHALL return a standardized response format for sync operations.

#### Scenario: Success response structure
- **WHEN** sync changes are processed successfully
- **THEN** the response SHALL include: `success: boolean`, `processed: number`, `errors: number`, `updates: ServerSyncUpdate[]`, `failures: Failure[]`
- **AND** each `ServerSyncUpdate` SHALL include: `clientTxid`, `serverTxid`, `tableName`, `pk`

#### Scenario: Failure response structure
- **WHEN** sync changes fail
- **THEN** each failure in `failures` array SHALL include: `change` object and `message` string
- **AND** the `change` object SHALL include: `clientTxid`, `tableName`, `action`, `pkValue`

