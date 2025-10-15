/**
 * LoadData Controller
 *
 * Handles data loading requests
 */

import type { Response } from 'express';
import type { Knex } from 'knex';
import type { AuthenticatedRequest } from '@/types/api';
import { LoadDataService } from '@/services/loadDataService';

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
		const TenantID = req.tid;
		const sub = req.sub;
		const roles = req.roles || [];

		// After validation, query is guaranteed to have the right shape
		const { tableName, lastUpdated, deviceId } = req.query as unknown as {
			tableName: string;
			lastUpdated?: number;
			deviceId?: string;
		};

		// Use the service to load data
		const result = await this.loadDataService.loadData({
			tableName,
			lastUpdated,
			tenantId: TenantID,
			userId: sub,
			roles,
			deviceId: deviceId || (req.headers?.deviceid as string),
		});

		res.status(200).json(result.rows);
	}
}
