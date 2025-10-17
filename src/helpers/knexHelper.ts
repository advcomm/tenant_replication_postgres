import { type Knex, knex } from 'knex';
import { config } from '@/config/configHolder';
import type { MtddMeta, SqlResult } from '@/types/mtdd';
import { dbLogger } from '@/utils/logger';
import {
	enableMtddRouting,
	getCustomMtddHandler,
	setCustomMtddHandler,
} from './mtdd';

// Create database connection using centralized configuration
function createDatabaseConnection(): Knex {
	if (!config.databaseEnabled) {
		throw new Error('Database is disabled');
	}

	const dbCfg = config.databaseConfig;

	// Connection settings based on useMtdd (not isDevelopment!)
	const connection = config.useMtdd
		? {
				// gRPC mode: Use dummy connection (won't be used)
				host: 'grpc-backend',
				port: 50051,
				user: 'grpc-user',
				password: 'not-used',
				database: 'grpc-routed',
				// Disable actual connection pooling
				pool: {
					min: 0,
					max: 0,
				},
			}
		: {
				// Local mode: Use real PostgreSQL connection
				host: dbCfg.host || 'localhost',
				port: dbCfg.port || 5432,
				user: dbCfg.user,
				password: dbCfg.password,
				database: dbCfg.database,
				pool: {
					min: 2,
					max: 10,
				},
			};

	// Use the simplest possible Knex configuration
	var result = knex({
		client: 'pg',
		connection: connection,
		debug: config.isDevelopment, // Debug based on isDevelopment
	});

	// Always enable MTDD routing - it handles both local and gRPC internally
	dbLogger.info(
		config.useMtdd
			? 'USE_MTDD=1 - Queries will route via gRPC'
			: 'USE_MTDD=0 - Queries will execute on local PostgreSQL',
	);
	enableMtddRouting(result);

	return result;
}

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

// Create the database instance
const db = createDatabaseConnection();

export {
	db,
	enableMtddRouting,
	createDatabaseConnection,
	setCustomMtddHandler,
	getCustomMtddHandler,
	type MtddMeta,
	type SqlResult,
};
