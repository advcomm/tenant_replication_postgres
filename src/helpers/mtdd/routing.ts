/**
 * MTDD Routing Module
 *
 * Comprehensive PostgreSQL client method patching for MTDD support
 */

import type { Knex } from 'knex';
import type { MtddMeta, SqlResult } from '../../types/mtdd';
import {
	createMtddMethodWrapper,
	createReRunMethodWrapper,
} from './methodWrappers';
import { grpcMtddHandler } from './grpcHandler';
import { mtddLogger } from '../../utils/logger';

// Global custom MTDD handler - can be set by users
let customMtddHandler:
	| ((meta: MtddMeta, queryObject: unknown, sqlResult: SqlResult) => void)
	| null = null;

/**
 * Enhanced MTDD Routing with comprehensive PostgreSQL client method patching
 * Supports transparent .mtdd() chaining with all Knex QueryBuilder methods
 */
export function enableMtddRouting(knexInstance: Knex): void {
	// Single server deployment detection
	const serverList = process.env.BACKEND_SERVERS?.split(',') || [
		'192.168.0.87',
		'192.168.0.2',
	];
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
		// Helper function to perform special MTDD actions when toSQL() is auto-appended
		// Note: queryObject typed as 'any' to access dynamic Knex query builder properties
		const performMtddAutoActions = async (
			queryObject: any,
			sqlResult: SqlResult,
		): Promise<unknown> => {
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

			// Execute query via gRPC backend
			try {
				mtddLogger.debug('Executing query via gRPC backend');
				const result = await grpcMtddHandler(mtddMeta, queryObject, sqlResult);

				// Call custom handler if provided (after gRPC execution)
				if (typeof customMtddHandler === 'function') {
					try {
						mtddLogger.debug('Calling additional custom MTDD handler');
						customMtddHandler(mtddMeta, queryObject, sqlResult);
					} catch (error) {
						mtddLogger.error({ error }, 'Error in custom MTDD handler');
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
		};

		// Helper function to set up chain-end detection
		const setupChainEndDetection = (queryObject: any) => {
			// any required for dynamic method patching
			const chainEndMethods = ['then', 'catch', 'finally', 'stream', 'pipe'];

			chainEndMethods.forEach((endMethod) => {
				if (
					queryObject[endMethod] &&
					typeof queryObject[endMethod] === 'function'
				) {
					const originalEndMethod = queryObject[endMethod];

					queryObject[endMethod] = function (...endArgs: any[]) {
						// Chain is ending - auto-append toSQL() if not already called
						if (queryObject._mtddMeta && !queryObject._toSQLCalled) {
							const sqlResult = queryObject.toSQL();

							// Mark that we auto-appended toSQL()
							if (sqlResult.options?.mtdd) {
								sqlResult.options.mtdd.toSQLAppended = true;

								// Perform special MTDD actions and execute via gRPC
								const executeViaGrpc = async () => {
									try {
										const result = await performMtddAutoActions(
											queryObject,
											sqlResult,
										);
										return result;
									} catch (error) {
										mtddLogger.error(
											{ error: (error as Error).message },
											'Query execution failed',
										);
										throw error;
									}
								};

								queryObject._toSQLCalled = true;

								if (endMethod === 'then') {
									// For .then(), execute via gRPC and return the actual result
									return executeViaGrpc()
										.then((result) => {
											if (endArgs[0] && typeof endArgs[0] === 'function') {
												try {
													return endArgs[0](result);
												} catch (error) {
													return Promise.reject(error);
												}
											}
											return result;
										})
										.catch((error) => {
											if (endArgs[1] && typeof endArgs[1] === 'function') {
												return endArgs[1](error);
											}
											throw error;
										});
								} else if (endMethod === 'catch') {
									// For .catch(), execute via gRPC first, then handle catch
									return executeViaGrpc()
										.then((result) => result)
										.catch((error) => {
											if (endArgs[0] && typeof endArgs[0] === 'function') {
												return endArgs[0](error);
											}
											throw error;
										});
								} else if (endMethod === 'finally') {
									// For .finally(), execute via gRPC and then run finally callback
									return executeViaGrpc().finally(() => {
										if (endArgs[0] && typeof endArgs[0] === 'function') {
											try {
												endArgs[0]();
											} catch (error) {
												mtddLogger.warn({ error }, 'Error in finally callback');
											}
										}
									});
								} else if (endMethod === 'stream' || endMethod === 'pipe') {
									// For stream operations, execute via gRPC and create a readable stream
									const { Readable } = require('stream');
									const readable = new Readable({ objectMode: true });

									executeViaGrpc()
										.then((result) => {
											if (Array.isArray(result)) {
												result.forEach((row) => readable.push(row));
											} else {
												readable.push(result);
											}
											readable.push(null); // End the stream
										})
										.catch((error) => {
											readable.emit('error', error);
										});

									return readable;
								}

								// Default: execute via gRPC and return promise
								return executeViaGrpc();
							}

							// Fallback if no MTDD metadata options
							queryObject._toSQLCalled = true;
							return Promise.resolve([]);
						}

						// If no MTDD metadata or toSQL already called, but still has MTDD metadata
						if (queryObject._mtddMeta) {
							mtddLogger.debug(
								'MTDD query without auto-append detected - returning empty result',
							);

							if (
								endMethod === 'then' &&
								endArgs[0] &&
								typeof endArgs[0] === 'function'
							) {
								try {
									return Promise.resolve(endArgs[0]([]));
								} catch (error) {
									return Promise.reject(error);
								}
							}
							return Promise.resolve([]);
						}

						// If no MTDD metadata at all, allow normal Knex behavior
						return originalEndMethod.apply(this, endArgs);
					};
				}
			});
		};

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
				const defaults: Partial<MtddMeta> = {
					operationType: 'read',
					timeout: 5000,
					cacheTTL: 300,
					auditLog: false,
					skipCache: false,
					maxRetries: 3,
					readPreference: 'primary',
				};

				this._mtddMeta = { ...this._mtddMeta, ...defaults, ...meta };

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

			// Define PostgreSQL client methods to be patched
			const pgClientMethods = {
				// SELECT operations
				select: 'SELECT - Column selection with optional aliasing',
				distinct: 'DISTINCT - Remove duplicate rows from result set',

				// INSERT operations
				insert: 'INSERT - Insert new records into table',

				// UPDATE operations
				update: 'UPDATE - Modify existing records in table',

				// WHERE clause operations
				where: 'WHERE - Basic conditional filtering',
				whereIn: 'WHERE IN - Filter by values in array',
				whereNotIn: 'WHERE NOT IN - Filter by values not in array',
				whereNull: 'WHERE NULL - Filter by null values',
				whereNotNull: 'WHERE NOT NULL - Filter by non-null values',
				whereBetween: 'WHERE BETWEEN - Filter by value range',
				whereNotBetween: 'WHERE NOT BETWEEN - Filter by values outside range',
				andWhere: 'AND WHERE - Additional AND condition',
				orWhere: 'OR WHERE - Alternative OR condition',
				whereExists: 'WHERE EXISTS - Filter by subquery existence',
				whereNotExists: 'WHERE NOT EXISTS - Filter by subquery non-existence',
				whereRaw: 'WHERE RAW - Raw SQL where clause',

				// ORDER BY operations
				orderBy: 'ORDER BY - Sort results by column(s)',
				orderByRaw: 'ORDER BY RAW - Raw SQL ordering',

				// JOIN operations
				join: 'JOIN - Inner join tables',
				leftJoin: 'LEFT JOIN - Left outer join tables',
				rightJoin: 'RIGHT JOIN - Right outer join tables',
				innerJoin: 'INNER JOIN - Explicit inner join tables',
				fullOuterJoin: 'FULL OUTER JOIN - Full outer join tables',
				crossJoin: 'CROSS JOIN - Cartesian product join',
				joinRaw: 'JOIN RAW - Raw SQL join',

				// GROUP BY and aggregation
				groupBy: 'GROUP BY - Group results by column(s)',
				groupByRaw: 'GROUP BY RAW - Raw SQL grouping',
				having: 'HAVING - Filter grouped results',
				havingIn: 'HAVING IN - Group filter by array values',
				havingNotIn: 'HAVING NOT IN - Group filter excluding array values',
				havingNull: 'HAVING NULL - Group filter by null values',
				havingNotNull: 'HAVING NOT NULL - Group filter by non-null values',
				havingBetween: 'HAVING BETWEEN - Group filter by value range',
				havingNotBetween: 'HAVING NOT BETWEEN - Group filter excluding range',
				havingRaw: 'HAVING RAW - Raw SQL having clause',

				// LIMIT and pagination
				limit: 'LIMIT - Restrict number of returned rows',
				offset: 'OFFSET - Skip number of rows for pagination',

				// DELETE operations
				delete: 'DELETE - Remove records from table',
				del: 'DELETE - Alias for delete operation',

				// TABLE operations
				from: 'FROM - Specify source table(s)',
				table: 'TABLE - Set target table',

				// Advanced operations
				union: 'UNION - Combine result sets',
				unionAll: 'UNION ALL - Combine result sets with duplicates',
				intersect: 'INTERSECT - Get intersection of result sets',
				except: 'EXCEPT - Get difference of result sets',

				// Window functions and analytics
				count: 'COUNT - Count number of rows',
				countDistinct: 'COUNT DISTINCT - Count unique values',
				min: 'MIN - Get minimum value',
				max: 'MAX - Get maximum value',
				sum: 'SUM - Calculate sum of values',
				sumDistinct: 'SUM DISTINCT - Sum of unique values',
				avg: 'AVG - Calculate average value',
				avgDistinct: 'AVG DISTINCT - Average of unique values',

				// Additional utility methods
				clone: 'CLONE - Create copy of query builder',
				timeout: 'TIMEOUT - Set query timeout',
				connection: 'CONNECTION - Use specific connection',
				options: 'OPTIONS - Set query options',
				returning:
					'RETURNING - Specify returned columns for INSERT/UPDATE/DELETE',
				onConflict: 'ON CONFLICT - Handle constraint conflicts (PostgreSQL)',
				ignore: 'IGNORE - Ignore constraint violations (MySQL)',
				merge: 'MERGE - Upsert operation',

				// Conditional operations
				when: 'WHEN - Conditional query building',
				unless: 'UNLESS - Negative conditional query building',
			};

			// Define methods that should trigger IsReRun=true
			const reRunMethods = new Set([
				'distinct',
				'having',
				'havingIn',
				'havingNotIn',
				'havingNull',
				'havingNotNull',
				'havingBetween',
				'havingNotBetween',
				'havingRaw',
				'limit',
				'groupBy',
				'groupByRaw',
				'orderBy',
				'orderByRaw',
			]);

			// Apply monkey patching to all defined PostgreSQL client methods
			Object.keys(pgClientMethods).forEach((methodName) => {
				if (qbProto[methodName]) {
					const originalMethod = qbProto[methodName];

					// Use the chain-end wrapper for all methods
					const isReRunMethod = reRunMethods.has(methodName);
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
				const defaults: Partial<MtddMeta> = {
					operationType: 'read',
					timeout: 5000,
					cacheTTL: 300,
					auditLog: false,
					skipCache: false,
					maxRetries: 3,
					readPreference: 'primary',
				};

				this._mtddMeta = { ...this._mtddMeta, ...defaults, ...meta };

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
				{ methodCount: Object.keys(pgClientMethods).length },
				'QueryBuilder methods patched for MTDD routing',
			);
			mtddLogger.debug(
				{ reRunMethods: Array.from(reRunMethods).join(', ') },
				'Re-run methods configured',
			);
		}

		// PATCH Raw queries for comprehensive MTDD support
		const Raw = require('knex/lib/raw');
		const rawProto = Raw.prototype;

		if (!rawProto.mtdd) {
			const originalToSQL_Raw = rawProto.toSQL;

			// Core MTDD method for Raw queries
			rawProto.mtdd = function (
				tenantIdOrMeta?: string | number | MtddMeta,
				tenantType?: number | string | null | undefined,
				methodType?: 'addTenantShard' | 'executeQuery' | 'auto',
				options: Partial<
					Omit<MtddMeta, 'tenantId' | 'tenantType' | 'methodType'>
				> = {},
			): any {
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
				const defaults: Partial<MtddMeta> = {
					operationType: 'read',
					timeout: 5000,
					cacheTTL: 300,
					auditLog: false,
					skipCache: false,
					maxRetries: 3,
					readPreference: 'primary',
				};

				this._mtddMeta = { ...this._mtddMeta, ...defaults, ...meta };
				this._toSQLCalled = false;

				// Override the manual toSQL call to track it for raw queries
				if (!this._toSQLPatched) {
					const originalToSQL = this.toSQL;
					this.toSQL = function (...args: any[]) {
						this._toSQLCalled = true;
						const result = originalToSQL.apply(this, args);

						// Mark as manually called by user and preserve normal Knex behavior
						if (result.options?.mtdd) {
							result.options.mtdd.toSQLAppended = false;
							mtddLogger.debug(
								{ operation: this._mtddMeta?.operation || 'unknown' },
								'Manual toSQL() call detected for RAW query',
							);
							mtddLogger.debug(
								'Preserving normal Knex behavior - no special MTDD actions, no database execution',
							);
						}

						return result;
					};
					this._toSQLPatched = true;
				}

				// Set up chain-end detection for raw queries (reuse the main function)
				if (!this._chainEndSetup) {
					setupChainEndDetection(this);
					this._chainEndSetup = true;
				}

				return this;
			};

			// Override toSQL to include MTDD metadata in raw query options
			rawProto.toSQL = function (...args: any[]): SqlResult {
				const result: SqlResult = originalToSQL_Raw.apply(this, args);
				if (this._mtddMeta) {
					result.options = {
						...result.options,
						mtdd: {
							...this._mtddMeta,
							toSQLAppended: false, // Default for manual calls
						},
					};

					// Only perform special MTDD actions if toSQL was manually called by user
					// When manually called, we preserve normal Knex behavior
					if (!this._mtddMeta.toSQLAppended) {
						mtddLogger.debug(
							{ operation: this._mtddMeta?.operation || 'unknown' },
							'Manual toSQL() call detected for RAW query',
						);
						mtddLogger.debug(
							'Preserving normal Knex behavior - no special MTDD actions, no database execution',
						);
					}
				}
				return result;
			};

			mtddLogger.info('Raw queries patched for MTDD routing');
		}

		mtddLogger.info(
			'MTDD routing enabled successfully - All PostgreSQL client methods are now MTDD-aware',
		);
	} catch (error) {
		mtddLogger.error({ error }, 'Error enabling MTDD routing');
		throw error;
	}
}

/**
 * Set a custom MTDD handler that will be called only when toSQL() is auto-appended
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
