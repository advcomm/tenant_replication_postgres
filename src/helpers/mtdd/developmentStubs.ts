/**
 * MTDD Development Stubs
 *
 * No-op implementation for development environment
 * This allows .mtdd() calls to work without any actual MTDD routing logic
 */

import type { Knex } from 'knex';
import type { MtddMeta } from '../../types/mtdd';

/**
 * Development MTDD Stubs - No-op implementation for development environment
 * This allows .mtdd() calls to work without any actual MTDD routing logic
 */
export function enableDevelopmentMtddStubs(knexInstance: Knex): void {
  console.log('🛠️ [DEVELOPMENT] Setting up MTDD no-op stubs for development environment');
  console.log('🛠️ [DEVELOPMENT] NODE_ENV:', process.env.NODE_ENV);

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
        options: Partial<Omit<MtddMeta, 'tenantId' | 'tenantType' | 'methodType'>> = {},
      ): any {
        // Store minimal metadata for compatibility but don't use it
        this._mtddMeta = {
          tenantId: typeof tenantIdOrMeta === 'object' ? tenantIdOrMeta?.tenantId : tenantIdOrMeta,
          tenantType: tenantType,
          methodType: methodType || 'auto',
          isDevelopmentStub: true,
        };

        console.log(
          `🛠️ [DEV-STUB] QueryBuilder.mtdd() called with tenantId: ${this._mtddMeta.tenantId} - no-op in development`,
        );

        // Return this for chaining - no special logic
        return this;
      };

      console.log('✅ [DEVELOPMENT] QueryBuilder.mtdd() stub enabled');
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
        options: Partial<Omit<MtddMeta, 'tenantId' | 'tenantType' | 'methodType'>> = {},
      ): any {
        // Store minimal metadata for compatibility but don't use it
        this._mtddMeta = {
          tenantId: typeof tenantIdOrMeta === 'object' ? tenantIdOrMeta?.tenantId : tenantIdOrMeta,
          tenantType: tenantType,
          methodType: methodType || 'auto',
          isDevelopmentStub: true,
        };

        console.log(
          `🛠️ [DEV-STUB] Raw.mtdd() called with tenantId: ${this._mtddMeta.tenantId} - no-op in development`,
        );

        // Return this for chaining - no special logic
        return this;
      };

      console.log('✅ [DEVELOPMENT] Raw.mtdd() stub enabled');
    }

    console.log('✅ [DEVELOPMENT] MTDD development stubs enabled successfully');
    console.log('🔄 [DEVELOPMENT] All .mtdd() calls will be no-ops and use standard Knex behavior');
  } catch (error) {
    console.error('❌ [DEVELOPMENT] Error enabling MTDD development stubs:', error);
    throw error;
  }
}
