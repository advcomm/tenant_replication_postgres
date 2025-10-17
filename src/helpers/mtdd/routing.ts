/**
 * MTDD Routing Module
 *
 * Comprehensive PostgreSQL client method patching for MTDD support
 */

import type { Knex } from 'knex';
import { config } from '@/config/configHolder';
import {
	MTDD_DEFAULTS,
	PG_CLIENT_METHODS,
	RE_RUN_METHODS,
} from '@/constants/mtdd';
import { type MtddMeta, MtddMetaSchema, type SqlResult } from '@/types/mtdd';
import { mtddLogger } from '@/utils/logger';
import {
	createMtddMethodWrapper,
	createReRunMethodWrapper,
} from './methodWrappers';
import { createMtddMethod } from './mtddMethod';
import { setupChainEndDetection } from './patching/chainEndDetection';
import { patchRawQueries } from './patching/rawQueryPatch';

/**
 * Global Knex instance storage for fallback execution
 * Set by enableMtddRouting, used by performMtddAutoActions for local query execution
 */
let knexInstance: Knex | null = null;

/**
 * Get the stored Knex instance for local query execution
 * Used when USE_MTDD=0 to fallback to standard Knex/pg
 *
 * @returns The Knex instance or null if not set
 */
export function getKnexInstance(): Knex | null {
	return knexInstance;
}

/**
 * Enhanced MTDD Routing with comprehensive PostgreSQL client method patching
 * Supports transparent .mtdd() chaining with all Knex QueryBuilder methods
 */
export function enableMtddRouting(_knexInstance: Knex): void {
	// Store Knex instance for fallback execution when USE_MTDD=0
	knexInstance = _knexInstance;

	// Log MTDD routing configuration
	if (!config.useMtdd) {
		mtddLogger.warn(
			'USE_MTDD=0 - MTDD gRPC routing disabled. All queries will execute on local Knex connection.',
		);
		mtddLogger.info(
			'To enable gRPC routing, set USE_MTDD=1 in environment or config',
		);
		mtddLogger.info(
			'.mtdd() method is still available but will execute queries locally',
		);
		// Still patch the methods so .mtdd() is available, but it will fallback to local execution
	} else {
		mtddLogger.info('USE_MTDD=1 - MTDD gRPC routing enabled');
	}

	// Single server deployment detection
	const serverList = config.queryServers;
	const isSingleServer = serverList.length === 1;

	if (config.useMtdd && isSingleServer) {
		mtddLogger.info(
			{ server: serverList[0] },
			'Single server deployment detected - simplified gRPC routing enabled',
		);
		mtddLogger.debug(
			'All queries will route through gRPC to single server without complex MTDD overhead',
		);
		mtddLogger.debug(
			'IsReRun flags, chain-end detection, and shard routing are simplified',
		);

		// Set flag to use simplified gRPC routing in the MTDD handler
		process.env.MTDD_SINGLE_SERVER_MODE = 'true';
		process.env.MTDD_SINGLE_SERVER_TARGET = serverList[0];

		mtddLogger.info({ server: serverList[0] }, 'Single-server mode enabled');
		// Continue with normal MTDD setup but the grpcMtddHandler will use simplified routing
	}

	// Multi-server MTDD routing (existing complex logic)
	if (config.useMtdd && !isSingleServer) {
		mtddLogger.info(
			{ serverCount: serverList.length },
			'Multi-server deployment detected - full MTDD routing enabled',
		);
	}

	try {
		// Note: performMtddAutoActions and setupChainEndDetection are now imported from separate modules

		// PATCH QueryBuilder - Access it through the knex client
		const QueryBuilder = require('knex/lib/query/querybuilder');
		const qbProto = QueryBuilder.prototype;

		if (!qbProto.mtdd) {
			const originalToSQL_QB = qbProto.toSQL;

			// Core MTDD method for QueryBuilder with flexible parameter handling
			qbProto.mtdd = function (
				tenantIdOrMeta?: string | number | MtddMeta,
				tenantType?: number | string | null | undefined,
				methodType?: 'addTenantShard' | 'executeQuery' | 'auto',
				options: Partial<
					Omit<MtddMeta, 'tenantId' | 'tenantType' | 'methodType'>
				> = {},
			): any {
				// Preserve existing IsReRun=true if it was set by re-run methods
				const preserveIsReRun = this._mtddMeta?.IsReRun === true;

				let meta: MtddMeta;

				// Handle different parameter signatures
				// Use Zod to validate if it's an MtddMeta object
				const parsedMeta = MtddMetaSchema.safeParse(tenantIdOrMeta);

				if (parsedMeta.success) {
					// Legacy object syntax: .mtdd({ tenantId: '...', ... })
					meta = parsedMeta.data as MtddMeta;
				} else if (tenantIdOrMeta === undefined) {
					// No tenant ID provided - execute on all servers (chain end)
					meta = {
						tenantId: null, // Special marker for all servers
						allServers: true, // Flag for chain end execution
						methodType: methodType || 'executeQuery',
						...options,
					};

					// Handle tenantType parameter when no tenantId
					if (tenantType !== undefined) {
						meta.tenantType = tenantType;
					} else {
						meta.tenantType = 1; // Default when executing on all servers
					}
				} else {
					// New parameter syntax: .mtdd(tenantId, tenantType, methodType, options)
					// tenantIdOrMeta is string | number at this point
					meta = {
						tenantId: tenantIdOrMeta as MtddMeta['tenantId'],
						...options,
					};

					// Handle tenantType parameter
					if (tenantType !== undefined) {
						if (tenantType === null) {
							// null means force addTenantShard
							meta.tenantType = null;
							meta.methodType = methodType || 'addTenantShard';
						} else {
							// Valid value provided
							meta.tenantType = tenantType;
							meta.methodType = methodType || 'auto';
						}
					} else {
						// undefined means use default value 1
						meta.tenantType = 1;
						meta.methodType = methodType || 'auto';
					}
				}

				// Apply default values for missing options
				this._mtddMeta = { ...this._mtddMeta, ...MTDD_DEFAULTS, ...meta };

				// If IsReRun was previously set to true by a re-run method, keep it true
				if (preserveIsReRun) {
					this._mtddMeta.IsReRun = true;
				}

				return this;
			};

			// Override toSQL to include MTDD metadata in query options
			// biome-ignore lint/suspicious/noExplicitAny: Required to preserve toSQL method signature
			qbProto.toSQL = function (...args: any[]): SqlResult {
				const result: SqlResult = originalToSQL_QB.apply(this, args);
				if (this._mtddMeta) {
					result.options = {
						...result.options,
						mtdd: {
							...this._mtddMeta,
							toSQLAppended: false, // User called toSQL() manually
						},
					};

					// Only perform special MTDD actions if toSQL was manually called by user
					// When manually called, we preserve normal Knex behavior
					if (!this._mtddMeta.toSQLAppended) {
						mtddLogger.debug(
							{ operation: this._mtddMeta?.operation || 'unknown' },
							'Manual toSQL() call detected',
						);
						mtddLogger.debug(
							'Preserving normal Knex behavior - no special MTDD actions, no database execution',
						);
					}
				}
				return result;
			};

			// Auto-append toSQL() when query chain ends
			const createChainEndWrapper = (
				originalMethod: Function,
				methodName: string,
				isReRunMethod: boolean = false,
			) => {
				// biome-ignore lint/suspicious/noExplicitAny: Required for dynamic prototype patching
				return function (this: any, ...args: any[]): any {
					const result = isReRunMethod
						? createReRunMethodWrapper(originalMethod, methodName).apply(
								this,
								args,
							)
						: createMtddMethodWrapper(originalMethod).apply(this, args);

					// If this query has MTDD metadata, set up chain-end detection immediately
					if (result?._mtddMeta && !result._chainEndSetup) {
						setupChainEndDetection(result);
						result._chainEndSetup = true;
					}

					return result;
				};
			};

			// Import method definitions from constants

			// Apply monkey patching to all defined PostgreSQL client methods
			Object.keys(PG_CLIENT_METHODS).forEach((methodName) => {
				if (qbProto[methodName]) {
					const originalMethod = qbProto[methodName];

					// Use the chain-end wrapper for all methods
					const isReRunMethod = RE_RUN_METHODS.has(methodName);
					qbProto[methodName] = createChainEndWrapper(
						originalMethod,
						methodName,
						isReRunMethod,
					);
				}
			});

			// Patch the mtdd method using the factory (with IsReRun preservation)
			qbProto.mtdd = createMtddMethod(true);

			mtddLogger.info(
				{ methodCount: Object.keys(PG_CLIENT_METHODS).length },
				'QueryBuilder methods patched for MTDD routing',
			);
			mtddLogger.debug(
				{ reRunMethods: Array.from(RE_RUN_METHODS).join(', ') },
				'Re-run methods configured',
			);
		}

		// PATCH Raw queries for comprehensive MTDD support
		patchRawQueries();

		mtddLogger.info(
			'MTDD routing enabled successfully - All PostgreSQL client methods are now MTDD-aware',
		);
	} catch (error) {
		mtddLogger.error({ error }, 'Error enabling MTDD routing');
		throw error;
	}
}
