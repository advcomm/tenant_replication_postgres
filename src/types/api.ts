/**
 * API Request/Response Type Definitions
 *
 * Types for API endpoints and request/response payloads
 */

import type { Request } from 'express';

/**
 * Authenticated Request (extends Express Request with auth fields)
 */
export interface AuthenticatedRequest extends Request {
	tid?: string | number; // Tenant ID from token
	sub?: string; // Subject (user ID) from token
	roles?: string[]; // User roles from token
	token?: string; // JWT token
}

/**
 * Update Payload for database sync
 */
export interface UpdatePayload {
	New: {
		CategoryID: number;
		CategoryName: string;
		VendorID: number;
		LastUpdatedTXID: number;
		LastUpdated: number | null;
		DeletedTXID: number | null;
	};
	old: {
		CategoryID: number;
		CategoryName: string;
		VendorID: number;
		LastUpdatedTXID: number;
		LastUpdated: number | null;
		DeletedTXID: number | null;
	} | null;
}

/**
 * Update Request for database sync
 */
export interface UpdateRequest {
	TXID: number;
	TableName: string;
	PK: number;
	Action: number | null;
	PayLoad: UpdatePayload;
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
	action: string;
	data: Record<string, unknown>;
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
