/**
 * MTDD Actions Handler
 *
 * Performs special MTDD actions when toSQL() is auto-appended
 */

import type { MtddMeta, SqlResult, KnexQueryObject } from '@/types';
import { mtddLogger } from '@/utils/logger';
import { grpcMtddHandler } from '../grpcHandler';

/**
 * Perform special MTDD actions when toSQL() is auto-appended at chain end
 * Handles caching, auditing, routing, and other MTDD features
 *
 * @param queryObject - Knex query object
 * @param sqlResult - SQL result with MTDD metadata
 * @returns Query result from gRPC execution
 */
export async function performMtddAutoActions(
	queryObject: KnexQueryObject,
	sqlResult: SqlResult,
): Promise<unknown> {
	const mtddMeta = sqlResult.options?.mtdd;

	if (!mtddMeta) return [];

	// Only perform actions if toSQL was auto-appended (not manually called)
	if (!mtddMeta.toSQLAppended) {
		mtddLogger.debug('Skipping MTDD actions - toSQL() was manually called');
		return [];
	}

	const queryType = queryObject.sql ? 'RAW query' : 'operation';
	mtddLogger.debug(
		{ queryType, operation: mtddMeta?.operation || 'unknown' },
		'Auto-appending toSQL() at chain end',
	);
	mtddLogger.debug({ mtddMeta }, 'MTDD Metadata');

	// Perform special MTDD actions based on metadata
	if (mtddMeta.IsReRun) {
		mtddLogger.debug(
			'Re-run detected - applying special handling for complex query',
		);

		// Handle having conditions if present
		if (mtddMeta.havingConditions && mtddMeta.havingConditions.length > 0) {
			mtddLogger.debug(
				{
					count: mtddMeta.havingConditions.length,
					conditions: mtddMeta.havingConditions
						.map((c) => `${c.method}(${c.args.join(', ')})`)
						.join(', '),
					complexity: mtddMeta.havingSummary?.complexity || 'unknown',
				},
				'Having conditions detected',
			);
		}
	}

	// Handle caching logic - ONLY when auto-appended
	if (mtddMeta.cacheKey && !mtddMeta.skipCache) {
		mtddLogger.debug(
			{ cacheKey: mtddMeta.cacheKey, ttl: mtddMeta.cacheTTL || 'default' },
			'Cache configuration',
		);
		// Your custom caching logic here
	}

	// Handle tenant routing - ONLY when auto-appended
	if (mtddMeta.tenantId) {
		mtddLogger.debug(
			{
				tenantId: mtddMeta.tenantId,
				operationType: mtddMeta.operationType || 'unknown',
			},
			'Tenant routing',
		);
		// Your custom tenant routing logic here
	}

	// Handle audit logging - ONLY when auto-appended
	if (mtddMeta.auditLog) {
		mtddLogger.debug(
			{
				userId: mtddMeta.userId || 'unknown',
				sessionId: mtddMeta.sessionId || 'none',
			},
			'Audit logging enabled',
		);
		// Your custom audit logging logic here
	}

	// Handle performance optimizations - ONLY when auto-appended
	if (mtddMeta.useIndex) {
		const indexes = Array.isArray(mtddMeta.useIndex)
			? mtddMeta.useIndex.join(', ')
			: mtddMeta.useIndex;
		mtddLogger.debug({ indexes }, 'Performance hint - use indexes');
		// Your custom index optimization logic here
	}

	if (mtddMeta.timeout) {
		mtddLogger.debug({ timeout: mtddMeta.timeout }, 'Query timeout set');
		// Your custom timeout handling logic here
	}

	// Handle connection pooling - ONLY when auto-appended
	if (mtddMeta.connectionPool) {
		mtddLogger.debug(
			{ connectionPool: mtddMeta.connectionPool },
			'Using connection pool',
		);
		// Your custom connection pool routing logic here
	}

	// Handle transaction management - ONLY when auto-appended
	if (mtddMeta.transactionId) {
		mtddLogger.debug(
			{ transactionId: mtddMeta.transactionId },
			'Transaction context',
		);
		if (mtddMeta.isolationLevel) {
			mtddLogger.debug(
				{ isolationLevel: mtddMeta.isolationLevel },
				'Isolation level',
			);
		}
		// Your custom transaction handling logic here
	}

	// Execute query via gRPC
	try {
		mtddLogger.debug('Executing query via gRPC query servers');
		const result = await grpcMtddHandler(mtddMeta, queryObject, sqlResult);

		// Call custom handler if provided (after gRPC execution)
		const customHandler = getCustomMtddHandler();
		if (customHandler) {
			try {
				mtddLogger.debug('Calling custom MTDD handler');
				customHandler(mtddMeta, queryObject, sqlResult);
			} catch (handlerError) {
				mtddLogger.error(
					{ error: (handlerError as Error).message },
					'Error in custom MTDD handler - continuing with result',
				);
				// Don't throw - allow result to be returned even if custom handler fails
			}
		}

		mtddLogger.debug('MTDD actions completed - query executed via gRPC');
		return result;
	} catch (error) {
		mtddLogger.error(
			{ error: (error as Error).message },
			'Error in gRPC execution',
		);
		throw error;
	}
}

/**
 * Custom MTDD handler storage
 */
let customMtddHandler:
	| ((meta: MtddMeta, queryObject: unknown, sqlResult: SqlResult) => void)
	| null = null;

/**
 * Set a custom handler to intercept MTDD metadata
 *
 * This allows you to implement your own business logic for auto-appended queries
 *
 * @param handler - Function to handle MTDD metadata when toSQL() is auto-appended
 */
export function setCustomMtddHandler(
	handler:
		| ((meta: MtddMeta, queryObject: unknown, sqlResult: SqlResult) => void)
		| null,
): void {
	customMtddHandler = handler;
}

/**
 * Get the current custom MTDD handler
 */
export function getCustomMtddHandler():
	| ((meta: MtddMeta, queryObject: unknown, sqlResult: SqlResult) => void)
	| null {
	return customMtddHandler;
}
