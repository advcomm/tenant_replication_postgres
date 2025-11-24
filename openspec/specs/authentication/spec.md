# Authentication Specification

## Requirement: Authentication Middleware Integration

The system SHALL require authentication middleware to be provided by the consuming application.

#### Scenario: Middleware placement
- **WHEN** the library is initialized
- **THEN** authentication middleware SHALL be added to Express app BEFORE `InitializeReplicationWithDb()` is called
- **AND** the middleware SHALL be applied to `/mtdd/sync/*` routes
- **AND** the library SHALL NOT implement authentication itself

#### Scenario: Required request properties
- **WHEN** a request reaches library endpoints
- **THEN** the request object SHALL have `req.tid` (tenant ID) set by authentication middleware
- **AND** the request object SHALL have `req.sub` (user ID) set by authentication middleware
- **AND** the request object MAY have `req.roles` (user roles array) set by authentication middleware

## Requirement: Tenant ID Requirement

The system SHALL require tenant ID for all data operations.

#### Scenario: Tenant ID in authenticated request
- **WHEN** any endpoint that accesses tenant data is called
- **THEN** `req.tid` SHALL be present and non-empty
- **AND** `req.tid` SHALL be a string or number
- **WHEN** `req.tid` is missing
- **THEN** the operation SHALL fail with error: "Tenant ID is required"

#### Scenario: Tenant ID usage
- **WHEN** tenant ID is available in `req.tid`
- **THEN** the system SHALL use it for all tenant filtering and data isolation
- **AND** the system SHALL NOT trust tenant ID from request body or query parameters
- **AND** the system SHALL always use the authenticated tenant ID from `req.tid`

## Requirement: User ID Requirement

The system SHALL require user ID for audit and logging purposes.

#### Scenario: User ID in authenticated request
- **WHEN** any endpoint is called
- **THEN** `req.sub` SHALL be present and non-empty
- **AND** `req.sub` SHALL be a string
- **WHEN** `req.sub` is missing
- **THEN** the operation MAY proceed but SHALL log a warning

#### Scenario: User ID in logs
- **WHEN** operations are logged
- **THEN** the logs SHALL include `userId: req.sub` for audit purposes
- **AND** user ID SHALL be included in structured log context

## Requirement: Role-Based Access Control (Optional)

The system SHALL support optional role-based access control via request roles.

#### Scenario: Roles in authenticated request
- **WHEN** authentication middleware sets `req.roles` as an array of strings
- **THEN** the system SHALL make roles available to services
- **AND** services MAY use roles for authorization decisions
- **WHEN** `req.roles` is not provided
- **THEN** the system SHALL default to empty array `[]`

#### Scenario: Roles in service context
- **WHEN** sync operations are performed
- **THEN** roles SHALL be passed to services as part of operation context
- **AND** services MAY check roles for permission validation

## Requirement: SSE Authentication (Optional)

The system SHALL support optional authentication for Server-Sent Events endpoint.

#### Scenario: SSE auth middleware
- **WHEN** SSE endpoint `/mtdd/sync/events` is accessed
- **THEN** authentication middleware MAY be applied (currently commented out in implementation)
- **AND** if applied, the middleware SHALL set `req.tid` and `req.sub` as with other endpoints
- **WHEN** authentication is not applied
- **THEN** the endpoint SHALL still function but without tenant/user context

## Requirement: Token Validation

The system SHALL expect authentication middleware to validate tokens.

#### Scenario: JWT token validation
- **WHEN** authentication middleware is implemented by consuming application
- **THEN** the middleware SHALL validate JWT tokens from `Authorization: Bearer <token>` header
- **AND** the middleware SHALL extract tenant ID and user ID from validated token
- **AND** the middleware SHALL set `req.tid` and `req.sub` before calling `next()`

#### Scenario: Invalid token handling
- **WHEN** an invalid or expired token is provided
- **THEN** authentication middleware SHALL return HTTP 401 Unauthorized
- **AND** the request SHALL NOT reach library endpoints
- **AND** the library SHALL NOT handle authentication errors

## Requirement: Authentication Context in Logs

The system SHALL include authentication context in all logs.

#### Scenario: Tenant ID in logs
- **WHEN** any operation is logged
- **THEN** logs SHALL include `tenantId: req.tid` in structured log context
- **AND** tenant ID SHALL be available for log filtering and analysis

#### Scenario: User ID in logs
- **WHEN** any operation is logged
- **THEN** logs SHALL include `userId: req.sub` in structured log context
- **AND** user ID SHALL be available for audit trails

#### Scenario: Roles in logs (optional)
- **WHEN** roles are available in `req.roles`
- **THEN** logs MAY include roles in structured log context
- **AND** roles SHALL be included when relevant for authorization decisions

