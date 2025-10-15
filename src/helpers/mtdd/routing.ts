/**
 * MTDD Routing Module
 *
 * Comprehensive PostgreSQL client method patching for MTDD support
 */

import type { Knex } from 'knex';
import type { MtddMeta, SqlResult } from '@/types/mtdd';
import {
	createMtddMethodWrapper,
	createReRunMethodWrapper,
} from './methodWrappers';
import { mtddLogger } from '@/utils/logger';
import { config } from '@/config/configHolder';
import {
	performMtddAutoActions,
	setCustomMtddHandler,
	getCustomMtddHandler,
} from './actions/performMtddActions';
import { setupChainEndDetection } from './patching/chainEndDetection';
import { patchRawQueries } from './patching/rawQueryPatch';
import { MTDD_DEFAULTS, PG_CLIENT_METHODS, RE_RUN_METHODS } from '@/constants/mtdd';

/**
 * Enhanced MTDD Routing with comprehensive PostgreSQL client method patching
 * Supports transparent .mtdd() chaining with all Knex QueryBuilder methods
 */
export function enableMtddRouting(knexInstance: Knex): void {
	// Single server deployment detection
	const serverList = config.queryServers;
	const isSingleServer = serverList.length === 1;

	if (isSingleServer) {
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
	mtddLogger.info(
		{ serverCount: serverList.length },
		'Multi-server deployment detected - full MTDD routing enabled',
	);

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

				// Type guard for MtddMeta object
				const isMtddMeta = (obj: any): obj is MtddMeta => {
					return (
						typeof obj === 'object' &&
						obj !== null &&
						(typeof obj.tenantId === 'string' ||
							typeof obj.tenantId === 'number' ||
							obj.tenantId === null ||
							obj.tenantId === undefined)
					);
				};

				// Handle different parameter signatures
				if (isMtddMeta(tenantIdOrMeta)) {
					// Legacy object syntax: .mtdd({ tenantId: '...', ... })
					meta = { ...tenantIdOrMeta };
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
					meta = {
						tenantId: tenantIdOrMeta,
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
				return function (this: any, ...args: any[]): any {
					const result = isReRunMethod
						? createReRunMethodWrapper(originalMethod, methodName).apply(
								this,
								args,
							)
						: createMtddMethodWrapper(originalMethod, methodName).apply(
								this,
								args,
							);

					// If this query has MTDD metadata, set up chain-end detection immediately
					if (result && result._mtddMeta && !result._chainEndSetup) {
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

			// Patch the mtdd method to track manual vs auto toSQL calls
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
				if (typeof tenantIdOrMeta === 'object' && tenantIdOrMeta !== null) {
					// Legacy object syntax: .mtdd({ tenantId: '...', ... })
					meta = { ...tenantIdOrMeta };
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
					meta = {
						tenantId: tenantIdOrMeta,
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

				// Mark that toSQL hasn't been called yet
				this._toSQLCalled = false;

				// Override the manual toSQL call to track it
				if (!this._toSQLPatched) {
					const originalToSQL = this.toSQL;
					this.toSQL = function (...args: any[]) {
						this._toSQLCalled = true;
						const result = originalToSQL.apply(this, args);

						// Mark as manually called by user
						if (result.options?.mtdd) {
							result.options.mtdd.toSQLAppended = false;
						}

						return result;
					};
					this._toSQLPatched = true;
				}

				// Set up chain-end detection immediately after mtdd() is called
				if (!this._chainEndSetup) {
					setupChainEndDetection(this);
					this._chainEndSetup = true;
				}

				return this;
			};

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
		patchRawQueries(knexInstance);

		mtddLogger.info(
			'MTDD routing enabled successfully - All PostgreSQL client methods are now MTDD-aware',
		);
	} catch (error) {
		mtddLogger.error({ error }, 'Error enabling MTDD routing');
		throw error;
	}
}
