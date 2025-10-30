import { type Knex, knex } from 'knex';
import type { DatabaseConfig } from '@/types/config';
import type { MtddMeta, SqlResult } from '@/types/mtdd';
import { dbLogger } from '@/utils/logger';
import {
	enableMtddRouting,
	getCustomMtddHandler,
	setCustomMtddHandler,
} from './mtdd';

// Extend Knex types to include our enhanced MTDD methods
declare module 'knex' {
	namespace Knex {
		interface QueryBuilder {
			/**
			 * Add MTDD (Multi-Tenant Database Deployment) routing metadata to the query.
			 * This method can be chained anywhere in the query builder chain.
			 *
			 * @param tenantId - Optional tenant identifier. If not provided, executes on all servers using chain end
			 * @param tenantType - Optional tenant type. If null, triggers addTenantShard. If undefined, defaults to 1
			 * @param methodType - Optional method type control
			 * @param options - Optional MTDD metadata for routing, caching, auditing, and performance optimization
			 * @returns The query builder instance for method chaining
			 *
			 * @example
			 * ```typescript
			 * // Execute on all servers (chain end)
			 * db.select('*').from('users').mtdd()
			 *
			 * // Minimal usage - just tenant ID
			 * db.select('*').from('users').mtdd('tenant-123')
			 *
			 * // With tenant type
			 * db.select('*').from('users').mtdd('tenant-123', 1)
			 *
			 * // Force add tenant shard
			 * db.insert(tenantData).into('tenants').mtdd('new-tenant', null, 'addTenantShard')
			 *
			 * // With full options
			 * db.select('*').from('users').mtdd('tenant-123', 1, 'auto', {
			 *   operation: 'get-users',
			 *   cacheKey: 'users:tenant-123',
			 *   timeout: 5000
			 * })
			 *
			 * // Legacy object syntax (still supported)
			 * db.select('*').from('users').mtdd({ tenantId: 'tenant-123', operation: 'get-users' })
			 * ```
			 */
			mtdd(
				tenantIdOrMeta?: string | number | MtddMeta,
				tenantType?: number | string | null | undefined,
				methodType?: 'addTenantShard' | 'executeQuery' | 'auto',
				options?: Partial<
					Omit<MtddMeta, 'tenantId' | 'tenantType' | 'methodType'>
				>,
			): this;
			_mtddMeta?: MtddMeta;
		}

		interface Raw {
			/**
			 * Add MTDD routing metadata to raw SQL queries.
			 *
			 * @param tenantIdOrMeta - Optional tenant ID or complete MTDD metadata object. If not provided, executes on all servers
			 * @param tenantType - Optional tenant type. If null, triggers addTenantShard. If undefined, defaults to 1
			 * @param methodType - Optional method type control
			 * @param options - Optional MTDD metadata for routing and optimization
			 * @returns The raw query instance for method chaining
			 *
			 * @example
			 * ```typescript
			 * // Execute on all servers
			 * db.raw('SELECT COUNT(*) FROM users').mtdd()
			 *
			 * // Minimal usage
			 * db.raw('SELECT * FROM users WHERE tenant_id = ?', [tenantId]).mtdd(tenantId)
			 *
			 * // With options
			 * db.raw('SELECT * FROM users WHERE tenant_id = ?', [tenantId])
			 *   .mtdd(tenantId, 1, 'auto', { operation: 'get-users', timeout: 5000 })
			 * ```
			 */
			mtdd(
				tenantIdOrMeta?: string | number | MtddMeta,
				tenantType?: number | string | null | undefined,
				methodType?: 'addTenantShard' | 'executeQuery' | 'auto',
				options?: Partial<
					Omit<MtddMeta, 'tenantId' | 'tenantType' | 'methodType'>
				>,
			): this;
			_mtddMeta?: MtddMeta;
		}
	}
}

// Internal runtime compatibility guard
function ensureKnexCompatible(db: unknown): boolean {
	try {
		const maybeDb = db as {
			queryBuilder?: () => unknown;
			raw?: (sql: string) => unknown;
		};
		const qb = maybeDb.queryBuilder?.();
		const raw = maybeDb.raw?.('select 1');
		const qbProto = qb && Object.getPrototypeOf(qb);
		const rawProto = raw && Object.getPrototypeOf(raw);
		return (
			!!qbProto &&
			!!rawProto &&
			typeof qbProto.where === 'function' &&
			typeof rawProto.toSQL === 'function'
		);
	} catch {
		return false;
	}
}

/**
 * Create a Knex instance owned by this library and patch it with MTDD.
 * Consumers can avoid installing Knex and use the returned instance directly.
 */
export function createPatchedKnex(options: DatabaseConfig): Knex {
	const db = knex({
		client: 'pg',
		...options,
	});

	if (!ensureKnexCompatible(db)) {
		dbLogger.error(
			'Incompatible Knex instance detected. Skipping MTDD patching. Ensure a supported Knex version is used.',
		);

		return db;
	}

	dbLogger.info('Enabling MTDD routing on Knex instance');

	enableMtddRouting(db);

	return db;
}

export {
	enableMtddRouting,
	setCustomMtddHandler,
	getCustomMtddHandler,
	type MtddMeta,
	type SqlResult,
};
