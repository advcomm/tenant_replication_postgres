/**
 * LoadData Controller
 *
 * Handles data loading requests
 */

import type { Request, Response } from 'express';
import type { Knex } from 'knex';
import { config } from '@/config/configHolder';
import { LoadDataService } from '@/services/loadDataService';
import type { AuthenticatedRequest } from '@/types/api';
import { apiLogger } from '@/utils/logger';

const isDevelopment =
	config.isDevelopment || process.env.NODE_ENV === 'development';

/**
 * LoadData Controller
 */
export class LoadDataController {
	private loadDataService: LoadDataService;

	constructor(db: Knex) {
		this.loadDataService = new LoadDataService(db);
	}

	/**
	 * Handle GET /Load request
	 */
	async loadData(req: AuthenticatedRequest, res: Response): Promise<void> {
		const requestId = (req as Request & { requestId?: string }).requestId;
		const TenantID = req.tid;
		const sub = req.sub;
		const roles = req.roles || [];

		// After validation, params/query are guaranteed to have the right shape
		const { tableName: tableNameParam } = req.params as { tableName: string };
		const { lastUpdated, deviceId } = req.query as unknown as {
			lastUpdated?: number;
			deviceId?: string;
		};
		// Legacy: tableName used to come from query string, fall back just in case
		const tableName =
			tableNameParam ??
			((req.query as Record<string, unknown>).tableName as string | undefined);

		if (!tableName) {
			apiLogger.warn(
				{
					requestId,
					tenantId: TenantID,
					path: req.path,
					query: req.query,
				},
				'Load data request missing table name',
			);
			res.status(400).json({ error: 'Table name is required' });
			return;
		}

		// Log operation start
		if (isDevelopment) {
			apiLogger.debug(
				{
					requestId,
					tenantId: TenantID,
					userId: sub,
					tableName,
					lastUpdated,
					deviceId,
				},
				'Loading table data',
			);
		} else {
			apiLogger.info(
				{
					requestId,
					tenantId: TenantID,
					tableName,
					lastUpdated: lastUpdated !== undefined,
				},
				'Load table data request',
			);
		}

		// Use the service to load data
		const result = await this.loadDataService.loadData({
			tableName: tableName ?? '',
			lastUpdated,
			tenantId: String(TenantID),
			userId: sub,
			roles,
			deviceId: deviceId || (req.headers?.deviceid as string),
		});

		// Log operation result
		const rowCount = result.rows?.length || 0;
		if (isDevelopment) {
			apiLogger.debug(
				{
					requestId,
					tenantId: TenantID,
					tableName,
					rowCount,
				},
				'Table data loaded',
			);
		} else if (rowCount > 100) {
			// Production: Log only if significant data returned
			apiLogger.info(
				{
					requestId,
					tenantId: TenantID,
					tableName,
					rowCount,
				},
				'Table data loaded',
			);
		}

		res.status(200).json(result.rows);
	}
}
