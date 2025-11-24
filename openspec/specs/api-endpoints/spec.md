# API Endpoints Specification

## Requirement: Sync Changes Endpoint

The system SHALL provide a POST endpoint at `/mtdd/sync/changes` that accepts client change batches and applies them to the server database.

#### Scenario: Successful sync with multiple changes
- **WHEN** a POST request is made to `/mtdd/sync/changes` with a valid request body containing an array of changes
- **AND** the request is authenticated with valid tenant ID (`req.tid`) and user ID (`req.sub`)
- **AND** all changes are valid
- **THEN** the server SHALL apply all changes to the database
- **AND** the server SHALL return HTTP 200 with a response containing `success: true`, `processed` count, `errors: 0`, and an array of `updates` with `clientTxid`, `serverTxid`, `tableName`, and `pk` for each successfully processed change

#### Scenario: Partial failure in sync batch
- **WHEN** a POST request is made to `/mtdd/sync/changes` with a batch containing some invalid changes
- **AND** the request is authenticated
- **THEN** the server SHALL process valid changes successfully
- **AND** the server SHALL return HTTP 207 (Multi-Status) with `success: false`, `errors` count > 0, and a `failures` array containing details of failed changes

#### Scenario: Empty changes array
- **WHEN** a POST request is made to `/mtdd/sync/changes` with an empty `changes` array
- **AND** the request is authenticated
- **THEN** the server SHALL return HTTP 200 with `success: true`, `processed: 0`, `errors: 0`, and empty `updates` array

#### Scenario: Validation failure
- **WHEN** a POST request is made to `/mtdd/sync/changes` with invalid request body (missing required fields, invalid types)
- **THEN** the server SHALL return HTTP 400 with validation error details
- **AND** no changes SHALL be applied to the database

## Requirement: Bulk Load Endpoint

The system SHALL provide a POST endpoint at `/mtdd/sync/bulk-load` that loads data from multiple tables for client synchronization.

#### Scenario: Successful bulk load
- **WHEN** a POST request is made to `/mtdd/sync/bulk-load` with a valid request body containing `tables` array, optional `lastUpdated` timestamp, and optional `deviceId`
- **AND** the request is authenticated with valid tenant ID
- **THEN** the server SHALL load data from all specified tables filtered by tenant ID
- **AND** the server SHALL return HTTP 200 with a JSON object where keys are table names and values are arrays of row data

#### Scenario: Bulk load with lastUpdated filter
- **WHEN** a POST request is made to `/mtdd/sync/bulk-load` with `lastUpdated` timestamp provided
- **AND** the request is authenticated
- **THEN** the server SHALL return only rows where `mtds_server_ts > lastUpdated` or `lastUpdated = 0`
- **AND** the server SHALL exclude rows where `mtds_delete_ts IS NOT NULL`

#### Scenario: Bulk load with table failure
- **WHEN** a POST request is made to `/mtdd/sync/bulk-load` with multiple tables where one table fails to load
- **AND** the request is authenticated
- **THEN** the server SHALL return successful tables with data
- **AND** the server SHALL return failed tables with empty arrays
- **AND** the server SHALL return HTTP 200 (partial success is acceptable)

## Requirement: Load Table Endpoint

The system SHALL provide a GET endpoint at `/mtdd/sync/tables/:tableName` that loads data from a specific table.

#### Scenario: Successful table load
- **WHEN** a GET request is made to `/mtdd/sync/tables/:tableName` with valid table name in path parameter
- **AND** optional query parameters `lastUpdated` (number) and `deviceId` (string)
- **AND** the request is authenticated with valid tenant ID
- **THEN** the server SHALL return HTTP 200 with an array of row data from the specified table filtered by tenant ID

#### Scenario: Table load with lastUpdated filter
- **WHEN** a GET request is made to `/mtdd/sync/tables/:tableName` with `lastUpdated` query parameter
- **AND** the request is authenticated
- **THEN** the server SHALL call the stored procedure `get_<tableName>(lastUpdated, tenantId)`
- **AND** the server SHALL return only rows updated after the `lastUpdated` timestamp
- **AND** the server SHALL use `mtds_server_ts` column name in response rows
- **AND** the server SHALL use `mtds_delete_ts` column name in response rows

#### Scenario: Missing table name
- **WHEN** a GET request is made to `/mtdd/sync/tables/:tableName` without a table name in the path
- **THEN** the server SHALL return HTTP 400 with error message "Table name is required"

## Requirement: Server-Sent Events Endpoint

The system SHALL provide a GET endpoint at `/mtdd/sync/events` that establishes a Server-Sent Events (SSE) connection for real-time database change notifications.

#### Scenario: Successful SSE connection
- **WHEN** a GET request is made to `/mtdd/sync/events` with `deviceId` query parameter or `deviceid` header
- **AND** the request is authenticated (optional, currently commented out)
- **THEN** the server SHALL establish an SSE connection
- **AND** the server SHALL set headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`
- **AND** the server SHALL send initial "Connected" event
- **AND** the server SHALL register the device for real-time notifications

#### Scenario: SSE disconnection handling
- **WHEN** an SSE client disconnects from `/mtdd/sync/events`
- **THEN** the server SHALL detect the disconnection via `req.on('close')`
- **AND** the server SHALL unregister the device from active connections
- **AND** the server SHALL log the disconnection

#### Scenario: SSE error handling
- **WHEN** an error occurs on an SSE connection
- **THEN** the server SHALL detect the error via `req.on('error')`
- **AND** the server SHALL log the error with device ID and tenant context
- **AND** the server SHALL clean up the connection

## Requirement: Request Validation

The system SHALL validate all incoming requests using Zod schemas before processing.

#### Scenario: Body validation
- **WHEN** a request is made with invalid body structure (missing required fields, wrong types)
- **THEN** the validation middleware SHALL return HTTP 400
- **AND** the response SHALL include `error: "Validation failed"` and a `details` array with field-specific error messages
- **AND** the request SHALL NOT reach the controller

#### Scenario: Query parameter validation
- **WHEN** a request is made with invalid query parameters
- **THEN** the validation middleware SHALL return HTTP 400 with validation error details
- **AND** the request SHALL NOT reach the controller

#### Scenario: Path parameter validation
- **WHEN** a request is made with invalid path parameters (e.g., empty table name)
- **THEN** the validation middleware SHALL return HTTP 400 with validation error details
- **AND** the request SHALL NOT reach the controller

## Requirement: Request Logging

The system SHALL log all API requests with structured logging.

#### Scenario: Development logging
- **WHEN** the system is in development mode (`NODE_ENV=development`)
- **AND** a request is made to any endpoint
- **THEN** the system SHALL log at debug level with full request/response details including request body, query parameters, and response data

#### Scenario: Production logging
- **WHEN** the system is in production mode
- **AND** a request is made to any endpoint
- **THEN** the system SHALL log at info level with summary information (method, path, status, duration, tenant ID, user ID)
- **AND** the system SHALL NOT log request/response bodies unless errors occur

#### Scenario: Error logging
- **WHEN** an error occurs processing a request
- **THEN** the system SHALL log the error at warn or error level with full context including request ID, tenant ID, user ID, and error details

