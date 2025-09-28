import createCoreRoutes from "./core/routes/router";
import  { Application } from "express";
import * as knexHelper from './core/helper/knexHelper';
import knex from 'knex';

// Export Firebase configuration interface and ActiveClients class for users of this library
export { FirebaseConfig } from './core/helper/activeClients';
export { default as ActiveClients } from './core/helper/activeClients';


export async function InitializeReplication(app: Application, dbConnection: knex.Knex<any, unknown[]>)
{
const coreRoutes = createCoreRoutes(dbConnection);
app.use('/mtdd', coreRoutes);

}

export default knexHelper;




