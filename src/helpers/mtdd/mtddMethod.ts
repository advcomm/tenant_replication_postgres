/**
 * MTDD Method Factory
 *
 * Creates the .mtdd() method implementation for different Knex prototypes
 * This eliminates duplication between QueryBuilder and Raw query implementations
 */

import { MTDD_DEFAULTS } from '@/constants/mtdd';
import type { KnexQueryObject, MtddMeta } from '@/types';
import { setupChainEndDetection } from './patching/chainEndDetection';

/**
 * Creates MTDD metadata from method parameters
 * Handles both legacy object syntax and new parameter syntax
 */
export function createMtddMetadata(
	tenantIdOrMeta?: string | number | MtddMeta,
	tenantType?: number | string | null | undefined,
	methodType?: 'addTenantShard' | 'executeQuery' | 'auto',
	options: Partial<
		Omit<MtddMeta, 'tenantId' | 'tenantType' | 'methodType'>
	> = {},
): MtddMeta {
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

	return meta;
}

/**
 * Setup toSQL tracking for manual vs auto-appended calls
 */
export function setupToSQLTracking(queryObject: KnexQueryObject): void {
	if (!queryObject._toSQLPatched) {
		const originalToSQL = queryObject.toSQL;
		// biome-ignore lint/suspicious/noExplicitAny: Required to preserve toSQL method signature
		queryObject.toSQL = function (...args: any[]) {
			this._toSQLCalled = true;
			const result = originalToSQL.apply(this, args);

			// Mark as manually called by user
			if (result.options?.mtdd) {
				result.options.mtdd.toSQLAppended = false;
			}

			return result;
		};
		queryObject._toSQLPatched = true;
	}
}

/**
 * Factory function to create .mtdd() method for any prototype
 *
 * @param preserveIsReRun - Whether to preserve IsReRun flag (QueryBuilder only)
 *
 * Note: `any` types are required here for dynamic prototype patching
 * - `this: any` - allows binding to QueryBuilder or Raw prototype
 * - return `any` - maintains Knex's fluent interface
 */
export function createMtddMethod(preserveIsReRun = false) {
	// biome-ignore lint/suspicious/noExplicitAny: Required for dynamic prototype patching
	return function (
		this: any,
		tenantIdOrMeta?: string | number | MtddMeta,
		tenantType?: number | string | null | undefined,
		methodType?: 'addTenantShard' | 'executeQuery' | 'auto',
		options: Partial<
			Omit<MtddMeta, 'tenantId' | 'tenantType' | 'methodType'>
		> = {},
		// biome-ignore lint/suspicious/noExplicitAny: Required to maintain Knex fluent interface
	): any {
		// Preserve existing IsReRun=true if it was set by re-run methods (QueryBuilder only)
		const shouldPreserveIsReRun =
			preserveIsReRun && this._mtddMeta?.IsReRun === true;

		// Create metadata from parameters
		const meta = createMtddMetadata(
			tenantIdOrMeta,
			tenantType,
			methodType,
			options,
		);

		// Apply default values and merge with existing metadata
		this._mtddMeta = { ...this._mtddMeta, ...MTDD_DEFAULTS, ...meta };

		// If IsReRun was previously set to true by a re-run method, keep it true
		if (shouldPreserveIsReRun) {
			this._mtddMeta.IsReRun = true;
		}

		// Mark that toSQL hasn't been called yet
		this._toSQLCalled = false;

		// Setup toSQL tracking
		setupToSQLTracking(this);

		// Set up chain-end detection
		if (!this._chainEndSetup) {
			setupChainEndDetection(this);
			this._chainEndSetup = true;
		}

		return this;
	};
}
