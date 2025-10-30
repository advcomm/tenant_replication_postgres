/**
 * LoadData Service
 *
 * Business logic for loading tenant data from database functions
 */

import type { Knex } from 'knex';
import { apiLogger } from '@/utils/logger';

/**
 * Parameters for loading data
 */
export interface LoadDataParams {
	tableName: string;
	lastUpdated?: string | number;
	tenantId: string | number;
	userId?: string;
	roles?: string[];
	deviceId?: string;
}

/**
 * Result from loading data
 */
export interface LoadDataResult {
	rows: unknown[];
}

/**
 * LoadData Service
 * Handles fetching data from database get_* functions
 */
export class LoadDataService {
	constructor(private db: Knex) {}

	/**
	 * Load data for a tenant from a database function
	 *
	 * @param params - Load data parameters
	 * @returns Query result with rows
	 */
	async loadData(params: LoadDataParams): Promise<LoadDataResult> {
		// Log the request
		apiLogger.info(
			{
				tableName: params.tableName,
				user: params.userId,
				tenantId: params.tenantId,
				roles: params.roles,
				lastUpdated: params.lastUpdated,
			},
			'LoadData request',
		);

		// Default lastUpdated to current timestamp if not provided
		const lastUpdatedParam = params.lastUpdated || Date.now() * 1000;

		// Execute the database query using authenticated tenant ID
		// Note: We call get_<tableName> function with (lastUpdated, tenantId)
		const result = await this.db
			.raw(`SELECT * FROM get_${params.tableName}($1::bigint, $2::text)`, [
				lastUpdatedParam,
				params.tenantId,
			])
			.mtdd();

		apiLogger.debug({ rowCount: result.rows?.length }, 'LoadData result');

		return {
			rows: result.rows || [],
		};
	}
}
