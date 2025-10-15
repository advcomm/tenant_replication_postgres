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
	tableName?: string;
	lastUpdated?: string | number;
	tenantId?: string | number;
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
 * Validation error when parameters are missing or invalid
 */
export class LoadDataValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'LoadDataValidationError';
	}
}

/**
 * LoadData Service
 * Handles fetching data from database get_* functions
 */
export class LoadDataService {
	constructor(private db: Knex) {}

	/**
	 * Validate load data parameters
	 */
	private validateParams(params: LoadDataParams): void {
		if (!params.tableName) {
			throw new LoadDataValidationError('Missing required parameter: tableName');
		}

		if (!params.tenantId) {
			throw new LoadDataValidationError('Missing required parameter: tenantId');
		}
	}

	/**
	 * Load data for a tenant from a database function
	 *
	 * @param params - Load data parameters
	 * @returns Query result with rows
	 */
	async loadData(params: LoadDataParams): Promise<LoadDataResult> {
		// Validate parameters
		this.validateParams(params);

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
			.raw(`SELECT * FROM get_${params.tableName}(?, ?)`, [
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

