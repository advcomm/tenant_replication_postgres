import type { Application } from 'express';
import type knex from 'knex';
import { config, setConfig } from '@/config/configHolder';
import * as knexHelper from '@/helpers/knexHelper';
import { createPatchedKnex } from '@/helpers/knexHelper';
import { createMtddRoutes } from '@/routes';
import { RedisService } from '@/services/redisService';
import type { DatabaseConfig, LibraryConfig } from '@/types/config';

// Export Firebase configuration interface and ActiveClients class for users of this library
export { default as ActiveClients, FirebaseConfig } from '@/helpers/clients';
// Export Redis service
export { RedisService } from '@/services/redisService';
// Export API types for consumers
export type {
	AuthenticatedRequest,
	ServerSyncUpdate,
	SyncChangeRequest,
	SyncResponse,
} from '@/types/api';
// Export configuration types for consumers
export type {
	DatabaseConfig,
	LibraryConfig,
	MtddBackendConfig,
	PortalConfig,
	RedisConfig,
} from '@/types/config';

/**
 * Initialize the library by creating a Knex instance from provided DB configs.
 * Consumers do not need to install or provide Knex; the library owns the instance.
 * Returns the created and patched Knex instance for application use.
 *
 * Initialize tenant replication with MTDD support
 *
 * @param app - Express application instance
 * @param dbConnection - Knex database connection
 * @param config - Optional library configuration (recommended). Falls back to process.env if not provided (deprecated)
 *
 * @example
 * ```typescript
 * import { InitializeReplication } from '@advcomm/tenant_replication_postgres';
 *
 * await InitializeReplication(app, db, {
 *   mtdd: {
 *     useMtdd: process.env.USE_MTDD === '1',
 *     queryServers: ['query-server1:50051', 'query-server2:50051'],
 *     lookupServer: 'lookup:50054',
 *     isDevelopment: false
 *   },
 * });
 * ```
 */
// Global Redis service instance
let redisService: RedisService | null = null;

/**
 * Get the Redis service instance
 * Returns null if Redis is not configured or not initialized
 */
export function getRedisService(): RedisService | null {
	return redisService;
}

export async function InitializeReplicationWithDb(
	app: Application,
	dbConfig: DatabaseConfig,
	libraryConfig?: LibraryConfig,
): Promise<knex.Knex<Record<string, unknown>, unknown[]>> {
	if (libraryConfig) {
		setConfig(libraryConfig);
	}

	// Initialize Redis if configured
	const redisConfig = config.redisConfig;
	if (redisConfig) {
		redisService = new RedisService({
			host: redisConfig.host,
			port: redisConfig.port,
			password: redisConfig.password,
			db: redisConfig.db,
			keyPrefix: redisConfig.keyPrefix,
			ttl: redisConfig.ttl,
		});

		redisService.initialize({
			host: redisConfig.host,
			port: redisConfig.port,
			password: redisConfig.password,
			db: redisConfig.db,
			retryStrategy: redisConfig.retryStrategy,
			enableOfflineQueue: redisConfig.enableOfflineQueue,
			lazyConnect: redisConfig.lazyConnect,
		});
	}

	const db = createPatchedKnex(dbConfig);

	const mtddRoutes = createMtddRoutes(db as knex.Knex);

	app.use('/mtdd/sync', mtddRoutes);

	return db as knex.Knex;
}

export default knexHelper;
