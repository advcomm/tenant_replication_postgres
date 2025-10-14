import type { Application } from 'express';
import type knex from 'knex';
import * as knexHelper from './helpers/knexHelper';
import createCoreRoutes from './routes/router';

// Export Firebase configuration interface and ActiveClients class for users of this library
export { default as ActiveClients, FirebaseConfig } from './helpers/activeClients';

export async function InitializeReplication(
  app: Application,
  dbConnection: knex.Knex<any, unknown[]>,
) {
  const coreRoutes = createCoreRoutes(dbConnection);
  app.use('/mtdd', coreRoutes);
}

export default knexHelper;
