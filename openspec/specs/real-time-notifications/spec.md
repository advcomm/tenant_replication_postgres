# Real-time Notifications Specification

## Requirement: Server-Sent Events (SSE) Connection

The system SHALL provide Server-Sent Events endpoint for real-time database change notifications.

#### Scenario: SSE connection establishment
- **WHEN** a client connects to GET `/mtdd/sync/events` with `deviceId` parameter
- **THEN** the server SHALL establish an SSE connection
- **AND** the server SHALL set appropriate SSE headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`
- **AND** the server SHALL send initial "Connected" event
- **AND** the server SHALL register the device in `ActiveClients.web` collection

#### Scenario: Device registration
- **WHEN** a device connects to SSE endpoint
- **THEN** the system SHALL register the device ID with the response object
- **AND** the device SHALL be stored in `ActiveClients.web` map with key `deviceId` and value containing event type and response object
- **AND** the system SHALL log the device registration

## Requirement: PostgreSQL LISTEN/NOTIFY Integration

The system SHALL listen to PostgreSQL NOTIFY events for database changes.

#### Scenario: Channel listener setup
- **WHEN** the EventsController is initialized
- **AND** `setupChannelListeners()` is called
- **THEN** the system SHALL establish a PostgreSQL LISTEN connection on the `table_changes` channel (or configured channel)
- **AND** the system SHALL process NOTIFY messages as they arrive

#### Scenario: Database change notification
- **WHEN** a database trigger fires a NOTIFY event (e.g., after INSERT, UPDATE, DELETE)
- **THEN** PostgreSQL SHALL send a NOTIFY message on the configured channel
- **AND** the system SHALL receive the notification via LISTEN connection
- **AND** the system SHALL parse the notification payload (JSON)

## Requirement: Event Broadcasting

The system SHALL broadcast database change events to registered SSE clients.

#### Scenario: Broadcast to registered devices
- **WHEN** a database change notification is received via PostgreSQL NOTIFY
- **AND** the notification includes table name, action, and data
- **THEN** the system SHALL format the event as `ServerEventPayload`
- **AND** the system SHALL broadcast the event to all registered SSE clients
- **AND** the event SHALL be sent in SSE format: `data: <JSON>\n\n`

#### Scenario: Event payload structure
- **WHEN** a database change event is broadcast
- **THEN** the payload SHALL include: `type` (ServerEventType), `action` (SyncChangeAction), `table` (table name), `pkColumn`, `pkValue`, `data` (row data), `timestamp` (ISO string)
- **AND** the `data` object SHALL include `mtds_server_ts` (server transaction ID)
- **AND** the `data` object SHALL include `mtds_delete_ts` (soft delete marker, NULL if active)
- **AND** the `data` object SHALL include `mtds_client_ts` if available
- **AND** the `data` object SHALL include `mtds_device_id`

#### Scenario: Tenant filtering in events
- **WHEN** a database change notification is received
- **AND** the notification data includes tenant ID
- **THEN** the system SHALL only broadcast to SSE clients registered for that specific tenant
- **AND** the system SHALL NOT broadcast tenant-specific changes to other tenants

## Requirement: Connection Lifecycle Management

The system SHALL manage SSE connection lifecycle including disconnection and cleanup.

#### Scenario: Client disconnection detection
- **WHEN** an SSE client disconnects (closes connection, network error)
- **THEN** the system SHALL detect disconnection via `req.on('close')` event
- **AND** the system SHALL unregister the device from `ActiveClients.web`
- **AND** the system SHALL log the disconnection

#### Scenario: Connection error handling
- **WHEN** an error occurs on an SSE connection
- **THEN** the system SHALL detect the error via `req.on('error')` event
- **AND** the system SHALL log the error with device ID and tenant context
- **AND** the system SHALL clean up the connection

#### Scenario: Active connection tracking
- **WHEN** devices connect and disconnect
- **THEN** the system SHALL maintain accurate count of active connections
- **AND** the system SHALL log connection counts in registration/disconnection logs

## Requirement: Push Notifications (Firebase)

The system SHALL support Firebase Cloud Messaging for push notifications to mobile/web clients.

#### Scenario: Firebase initialization
- **WHEN** Firebase configuration is provided in `LibraryConfig`
- **AND** valid service account credentials are provided
- **THEN** the system SHALL initialize Firebase Admin SDK
- **AND** the system SHALL enable push notification capabilities

#### Scenario: Push notification on database change
- **WHEN** a database change notification is received
- **AND** Firebase is configured
- **AND** mobile/web clients are registered for the affected tenant
- **THEN** the system SHALL send push notifications via Firebase Cloud Messaging
- **AND** the notification SHALL include change details (table, action, data)

#### Scenario: Firebase disabled
- **WHEN** Firebase configuration is not provided
- **THEN** the system SHALL operate without push notification capabilities
- **AND** real-time notifications SHALL only be available via Server-Sent Events

## Requirement: Device Management

The system SHALL track and manage registered devices for notifications.

#### Scenario: Web device registration
- **WHEN** a device connects to SSE endpoint
- **THEN** the device SHALL be registered in `ActiveClients.web` collection
- **AND** the registration SHALL include device ID, event type, and response object

#### Scenario: Mobile device registration
- **WHEN** a mobile device registers for push notifications
- **THEN** the device SHALL be registered in `ActiveClients.mobile` collection (if implemented)
- **AND** the registration SHALL include device ID and FCM token

#### Scenario: Device unregistration
- **WHEN** a device disconnects or is unregistered
- **THEN** the device SHALL be removed from active clients collections
- **AND** the system SHALL stop sending notifications to that device

## Requirement: Event Type Mapping

The system SHALL map database operations to appropriate event types.

#### Scenario: Insert event mapping
- **WHEN** a database INSERT operation triggers a notification
- **THEN** the event type SHALL be `ServerEventType.Insert`
- **AND** the action SHALL be `SyncChangeAction.Insert`

#### Scenario: Update event mapping
- **WHEN** a database UPDATE operation triggers a notification
- **THEN** the event type SHALL be `ServerEventType.Update`
- **AND** the action SHALL be `SyncChangeAction.Update`

#### Scenario: Delete event mapping
- **WHEN** a database DELETE operation triggers a notification
- **THEN** the event type SHALL be `ServerEventType.Delete`
- **AND** the action SHALL be `SyncChangeAction.Delete`

#### Scenario: Unknown event handling
- **WHEN** a database notification is received with unknown action type
- **THEN** the event type SHALL be `ServerEventType.Unknown`
- **AND** the system SHALL still broadcast the event with available data

