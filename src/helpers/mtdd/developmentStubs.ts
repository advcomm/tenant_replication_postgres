/**
 * MTDD Development Stubs
 *
 * No-op implementation for development environment
 * This allows .mtdd() calls to work without any actual MTDD routing logic
 */

import type { Knex } from 'knex';
import type { MtddMeta } from '@/types/mtdd';
import { mtddLogger } from '@/utils/logger';
import { config } from '@/config/configHolder';

/**
 * Development MTDD Stubs - No-op implementation for development environment
 * This allows .mtdd() calls to work without any actual MTDD routing logic
 */
export function enableDevelopmentMtddStubs(knexInstance: Knex): void {
	mtddLogger.info(
		{ isDevelopment: config.isDevelopment },
		'Setting up MTDD no-op stubs for development environment',
	);

	try {
		// PATCH QueryBuilder for development - using the knex instance to get the right prototypes
		const QueryBuilder = knexInstance.queryBuilder().constructor;
		const qbProto = QueryBuilder.prototype;

		if (!qbProto.mtdd) {
			// Simple no-op implementation for QueryBuilder
			qbProto.mtdd = function (
				tenantIdOrMeta?: string | number | MtddMeta,
				tenantType?: number | string | null | undefined,
				methodType?: 'addTenantShard' | 'executeQuery' | 'auto',
				options: Partial<
					Omit<MtddMeta, 'tenantId' | 'tenantType' | 'methodType'>
				> = {},
			): any {
				// Store minimal metadata for compatibility but don't use it
				this._mtddMeta = {
					tenantId:
						typeof tenantIdOrMeta === 'object'
							? tenantIdOrMeta?.tenantId
							: tenantIdOrMeta,
					tenantType: tenantType,
					methodType: methodType || 'auto',
					isDevelopmentStub: true,
				};

				mtddLogger.debug(
					{ tenantId: this._mtddMeta.tenantId },
					'QueryBuilder.mtdd() stub called - no-op in development',
				);

				// Return this for chaining - no special logic
				return this;
			};

			mtddLogger.debug('QueryBuilder.mtdd() stub enabled');
		}

		// PATCH Raw queries for development - using the knex instance to get the right Raw constructor
		const Raw = knexInstance.raw('SELECT 1').constructor;
		const rawProto = Raw.prototype;

		if (!rawProto.mtdd) {
			// Simple no-op implementation for Raw queries
			rawProto.mtdd = function (
				tenantIdOrMeta?: string | number | MtddMeta,
				tenantType?: number | string | null | undefined,
				methodType?: 'addTenantShard' | 'executeQuery' | 'auto',
				options: Partial<
					Omit<MtddMeta, 'tenantId' | 'tenantType' | 'methodType'>
				> = {},
			): any {
				// Store minimal metadata for compatibility but don't use it
				this._mtddMeta = {
					tenantId:
						typeof tenantIdOrMeta === 'object'
							? tenantIdOrMeta?.tenantId
							: tenantIdOrMeta,
					tenantType: tenantType,
					methodType: methodType || 'auto',
					isDevelopmentStub: true,
				};

				mtddLogger.debug(
					{ tenantId: this._mtddMeta.tenantId },
					'Raw.mtdd() stub called - no-op in development',
				);

				// Return this for chaining - no special logic
				return this;
			};

			mtddLogger.debug('Raw.mtdd() stub enabled');
		}

		mtddLogger.info(
			'MTDD development stubs enabled successfully - all .mtdd() calls will be no-ops',
		);
	} catch (error) {
		mtddLogger.error({ error }, 'Error enabling MTDD development stubs');
		throw error;
	}
}
