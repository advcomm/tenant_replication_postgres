import type { Application } from 'express';
import type knex from 'knex';
import { setConfig } from '@/config/configHolder';
import * as knexHelper from '@/helpers/knexHelper';
import { createPatchedKnex } from '@/helpers/knexHelper';
import { createMtddRoutes } from '@/routes';
import type { DatabaseConfig, LibraryConfig } from '@/types/config';

// Export Firebase configuration interface and ActiveClients class for users of this library
export {
	default as ActiveClients,
	FirebaseConfig,
} from '@/helpers/clients';

// Export configuration types for consumers
export type {
	DatabaseConfig,
	LibraryConfig,
	MtddBackendConfig,
	PortalConfig,
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
export async function InitializeReplicationWithDb(
	app: Application,
	dbConfig: DatabaseConfig,
	config?: LibraryConfig,
): Promise<knex.Knex<Record<string, unknown>, unknown[]>> {
	if (config) {
		setConfig(config);
	}

	const db = createPatchedKnex(dbConfig);

	const mtddRoutes = createMtddRoutes(db as knex.Knex);

	app.use('/mtdd', mtddRoutes);

	return db as knex.Knex;
}

export default knexHelper;
