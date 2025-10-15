/**
 * Raw Query Patching
 *
 * Patches Knex Raw queries to support MTDD functionality
 */

import type { Knex } from 'knex';
import type { MtddMeta, SqlResult } from '@/types/mtdd';
import { mtddLogger } from '@/utils/logger';
import { setupChainEndDetection } from './chainEndDetection';

/**
 * Patch Raw query prototype with MTDD support
 * 
 * @param knexInstance - Knex instance to get Raw constructor from
 */
export function patchRawQueries(knexInstance: Knex): void {
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
}

