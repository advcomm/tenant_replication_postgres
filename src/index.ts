import type { Application } from 'express';
import type knex from 'knex';
import * as knexHelper from './helpers/knexHelper';
import { createMtddRoutes } from './routes';
import type { LibraryConfig } from './types/config';
import { setConfig } from './config/configHolder';

// Export Firebase configuration interface and ActiveClients class for users of this library
export {
	default as ActiveClients,
	FirebaseConfig,
} from './helpers/activeClients';

// Export configuration types for consumers
export type { LibraryConfig, DatabaseConfig, MtddBackendConfig, PortalConfig } from './types/config';

/**
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
 *     backendServers: ['server1:50051', 'server2:50051'],
 *     lookupServer: 'lookup:50054',
 *     isDevelopment: false
 *   },
 *   database: {
 *     enabled: true,
 *     config: { host: 'localhost', port: 5432, ... }
 *   }
 * });
 * ```
 */
export async function InitializeReplication(
	app: Application,
	dbConnection: knex.Knex<any, unknown[]>,
	config?: LibraryConfig,
) {
	// Store configuration for use throughout the library
	if (config) {
		setConfig(config);
	}

	const mtddRoutes = createMtddRoutes(dbConnection);
	app.use('/mtdd', mtddRoutes);
}

export default knexHelper;
