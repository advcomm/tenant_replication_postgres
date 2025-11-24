/**
 * API Request/Response Type Definitions
 *
 * Types for API endpoints and request/response payloads
 */

import type { Request } from 'express';

export type JsonMap = Record<string, unknown>;

/**
 * Enum representing allowed sync change actions.
 */
export enum SyncChangeAction {
	Insert = 'insert',
	Update = 'update',
	Delete = 'delete',
}

/**
 * Enum representing server event types emitted over SSE.
 */
export enum ServerEventType {
	Connected = 'connected',
	Heartbeat = 'heartbeat',
	Insert = 'insert',
	Update = 'update',
	Delete = 'delete',
	Unknown = 'unknown',
}

/**
 * Load Data Query Parameters
 */
export interface LoadDataQuery {
	tableName: string;
	lastUpdated?: string | number;
	deviceId?: string;
}

/**
 * Channel Message from PostgreSQL LISTEN/NOTIFY
 */
export interface ChannelMessage {
	payload: string;
	channel?: string;
	timestamp?: string;
}

/**
 * Table Change Notification
 */
export interface TableChangeNotification {
	table: string;
	action: SyncChangeAction | string;
	data: JsonMap;
}

/**
 * Error Response
 */
export interface ErrorResponse {
	error?: string;
	message?: string;
	details?: unknown;
}

/**
 * Success Response
 */
export interface SuccessResponse<T = unknown> {
	success: boolean;
	data?: T;
	message?: string;
}

/**
 * Express request augmented with authentication metadata
 */
export interface AuthenticatedRequest extends Request {
	tid?: string | number;
	sub?: string;
	roles?: string[];
	token?: string;
}

/**
 * Raw change object received from the MTDS client.
 */
export interface SyncChangeRequest {
	clientTxid: number | string;
	table_name: string;
	record_pk: string | number | null;
	mtds_device_id: number | string;
	action?: number | string | null;
	payload?: string | SyncChangePayload;
}

export interface SyncChangePayload {
	New?: JsonMap;
	old?: JsonMap;
}

/**
 * Normalized change used internally by the sync service.
 */
export interface NormalizedSyncChange {
	clientTxid: number;
	tableName: string;
	deviceId: number;
	action: SyncChangeAction;
	pkValue: string | number | null;
	payload?: SyncChangePayload;
}

/**
 * Request body for /sync endpoint.
 */
export interface SyncChangesBody {
	changes: SyncChangeRequest[];
}

/**
 * Parameters provided to the sync service for processing changes.
 */
export interface ProcessSyncChangesParams {
	changes: SyncChangeRequest[];
	tenantId?: string | number;
	userId?: string;
	roles?: string[];
}

/**
 * Response structure returned to MTDS clients after sync.
 */
export interface SyncResponse {
	success: boolean;
	processed: number;
	errors: number;
	updates: ServerSyncUpdate[];
	failures: Array<{
		change: {
			clientTxid: number;
			tableName: string;
			action: SyncChangeAction;
			pkValue: string | number | null;
		};
		message: string;
	}>;
}

/**
 * Update metadata sent back to clients so they can reconcile timestamps.
 */
export interface ServerSyncUpdate {
	clientTxid: number;
	serverTxid: number;
	tableName: string;
	pk: string | number | null;
}

/**
 * Request payload for /sync/data endpoint.
 */
export interface SyncLoadRequest {
	tables: string[];
	lastUpdated?: number;
	tenantId?: string | number;
	deviceId?: string;
}

/**
 * Additional context passed from controllers to the load service.
 */
export interface TableLoadContext {
	authenticatedTenantId?: string | number;
	userId?: string;
	roles?: string[];
}

/**
 * Payload sent to SSE clients.
 */
export interface ServerEventPayload {
	type: ServerEventType;
	action: SyncChangeAction;
	table?: string;
	pkColumn?: string;
	pkValue?: string | number | null;
	data?: JsonMap;
	timestamp: string;
}
