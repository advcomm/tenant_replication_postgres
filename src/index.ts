import createCoreRoutes from "./core/routes/router";
import  { Application } from "express";
import * as knexHelper from './core/helper/knexHelper';
import knex from 'knex';


export async function InitializeReplication(app: Application, dbConnection: knex.Knex<any, unknown[]>)
{
const coreRoutes = createCoreRoutes(dbConnection);
app.use('/mtdd', coreRoutes);

}

export default knexHelper;




