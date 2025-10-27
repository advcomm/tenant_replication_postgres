/**
 * Knex Type Augmentation
 *
 * Extends Knex types to include MTDD functionality
 */

import type { MtddMeta } from './mtdd';

declare module 'knex' {
	namespace Knex {
		/**
		 * MTDD method parameters
		 */
		interface MtddMethodParams {
			tenantId?: string | number | null;
			tenantType?: number | string | null;
			methodType?: 'addTenantShard' | 'executeQuery' | 'auto';
			options?: Partial<
				Omit<MtddMeta, 'tenantId' | 'tenantType' | 'methodType'>
			>;
		}

		/**
		 * Augment QueryBuilder with MTDD functionality
		 */
		interface QueryBuilder {
			/**
			 * Enable MTDD (Multi-Tenant Database Deployment) routing for this query
			 *
			 * @param tenantIdOrMeta - Tenant ID (string/number) or full MtddMeta object
			 * @param tenantType - Tenant type identifier (optional)
			 * @param methodType - Method type: 'addTenantShard' | 'executeQuery' | 'auto' (optional)
			 * @param options - Additional MTDD options (optional)
			 * @returns QueryBuilder for chaining
			 */
			mtdd(
				tenantIdOrMeta?: string | number | MtddMeta,
				tenantType?: number | string | null,
				methodType?: 'addTenantShard' | 'executeQuery' | 'auto',
				options?: Partial<
					Omit<MtddMeta, 'tenantId' | 'tenantType' | 'methodType'>
				>,
			): this;

			// Internal MTDD tracking properties
			_mtddMeta?: MtddMeta;
			_toSQLCalled?: boolean;
			_toSQLPatched?: boolean;
			_chainEndSetup?: boolean;

			// Allow dynamic property access for promise chain methods
			[key: string]: any;
		}

		/**
		 * Augment Raw with MTDD functionality
		 */
		interface Raw {
			/**
			 * Enable MTDD routing for this raw query
			 *
			 * @param tenantIdOrMeta - Tenant ID (string/number) or full MtddMeta object
			 * @param tenantType - Tenant type identifier (optional)
			 * @param methodType - Method type: 'addTenantShard' | 'executeQuery' | 'auto' (optional)
			 * @param options - Additional MTDD options (optional)
			 * @returns Raw for chaining
			 */
			mtdd(
				tenantIdOrMeta?: string | number | MtddMeta,
				tenantType?: number | string | null,
				methodType?: 'addTenantShard' | 'executeQuery' | 'auto',
				options?: Partial<
					Omit<MtddMeta, 'tenantId' | 'tenantType' | 'methodType'>
				>,
			): this;

			// Internal MTDD tracking properties
			_mtddMeta?: MtddMeta;
			_toSQLCalled?: boolean;
			_toSQLPatched?: boolean;
			_chainEndSetup?: boolean;

			// Allow dynamic property access for promise chain methods
			[key: string]: any;
		}
	}
}
