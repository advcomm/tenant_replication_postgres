/**
 * MTDD Error Class
 *
 * Error class for MTDD routing failures
 */

import { BaseError } from './BaseError';

export class MtddError extends BaseError {
	constructor(message: string, context?: Record<string, unknown>) {
		super(message, 'MTDD_ERROR', 500, context);
	}
}

export class TenantNotFoundError extends BaseError {
	constructor(tenantId: string | number, context?: Record<string, unknown>) {
		super(`Tenant not found: ${tenantId}`, 'TENANT_NOT_FOUND', 404, {
			tenantId,
			...context,
		});
	}
}

export class ShardNotFoundError extends BaseError {
	constructor(shardId: number, context?: Record<string, unknown>) {
		super(`Shard not found: ${shardId}`, 'SHARD_NOT_FOUND', 404, {
			shardId,
			...context,
		});
	}
}
