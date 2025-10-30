/**
 * MTDD Actions Handler
 *
 * Performs special MTDD actions when toSQL() is auto-appended
 */

import { config } from '@/config/configHolder';
import type { KnexQueryObject, MtddMeta, SqlResult } from '@/types';
import { mtddLogger } from '@/utils/logger';
import { grpcMtddHandler } from '../grpcHandler';
import { getKnexInstance } from '../routing';

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

	// Detect query type to determine expected return format
	// Raw queries have 'sql' property on the queryObject
	const isRawQuery = queryObject.sql !== undefined;

	// Check if MTDD gRPC routing is enabled
	if (!config.useMtdd) {
		// Fallback to local Knex execution (standard pg)
		mtddLogger.debug(
			'USE_MTDD=0 - Executing query on local Knex connection (standard pg)',
		);
		mtddLogger.debug(
			{ tenantId: mtddMeta.tenantId, sql: sqlResult.sql },
			'Local execution with tenant metadata',
		);

		const knex = getKnexInstance();

		if (!knex) {
			throw new Error(
				'Knex instance not available for local execution. ' +
					'Ensure the library has been initialized (e.g., InitializeReplicationWithDb) before issuing queries.',
			);
		}

		try {
			// Execute using local Knex connection (same as standard pg)
			const result = await knex.raw(sqlResult.sql, sqlResult.bindings || []);

			// Call custom handler if provided (for local execution too)
			const customHandler = getCustomMtddHandler();

			if (customHandler) {
				try {
					mtddLogger.debug('Calling custom MTDD handler (local execution)');
					customHandler(mtddMeta, queryObject, sqlResult);
				} catch (handlerError) {
					mtddLogger.error(
						{ error: (handlerError as Error).message },
						'Error in custom MTDD handler - continuing with result',
					);
				}
			}

			mtddLogger.debug('Local query execution completed successfully');

			// CRITICAL: Normalize return format to match Knex behavior
			// QueryBuilder queries return arrays, Raw queries return full result object
			if (isRawQuery) {
				// Raw queries expect full result object with rows, command, etc.
				return result;
			}
			// QueryBuilder queries expect just the rows array
			return result.rows || [];
		} catch (error) {
			mtddLogger.error(
				{ error: (error as Error).message },
				'Error in local query execution',
			);
			throw error;
		}
	}

	// Execute query via gRPC (USE_MTDD=1)
	try {
		mtddLogger.debug('USE_MTDD=1 - Executing query via gRPC query servers');
		const result = await grpcMtddHandler(mtddMeta, queryObject, sqlResult);

		// Call custom handler if provided (after gRPC execution)
		const customHandler = getCustomMtddHandler();
		if (customHandler) {
			try {
				mtddLogger.debug('Calling custom MTDD handler (gRPC execution)');
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

		// CRITICAL: Normalize gRPC response to match Knex behavior
		// gRPC returns { rows, rowCount, command, oid } from protoConverters
		// But QueryBuilder expects just the rows array
		if (isRawQuery) {
			// Raw queries expect full result object with rows, command, etc.
			return result;
		}
		// QueryBuilder queries expect just the rows array
		if (result && typeof result === 'object' && 'rows' in result) {
			// biome-ignore lint/suspicious/noExplicitAny: Result type varies - extracting rows from gRPC response
			return (result as any).rows;
		}
		// Fallback if format is unexpected
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
