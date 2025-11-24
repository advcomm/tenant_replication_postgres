import type { Request, Response } from 'express';
import { config } from '@/config/configHolder';
import type { SyncService } from '@/services/syncService';
import type { AuthenticatedRequest, SyncLoadRequest } from '@/types/api';
import { apiLogger } from '@/utils/logger';

const isDevelopment =
	config.isDevelopment || process.env.NODE_ENV === 'development';

/**
 * Controller handling MTDS sync endpoints.
 */
export class SyncController {
	constructor(private readonly syncService: SyncService) {}

	async syncChanges(req: AuthenticatedRequest, res: Response): Promise<void> {
		const requestId = (req as Request & { requestId?: string }).requestId;
		const changeCount = Array.isArray(req.body.changes)
			? req.body.changes.length
			: 0;

		// Log operation start
		if (isDevelopment) {
			apiLogger.debug(
				{
					requestId,
					tenantId: req.tid,
					userId: req.sub,
					changeCount,
					changes: req.body.changes,
				},
				'Processing sync changes',
			);
		} else {
			apiLogger.info(
				{
					requestId,
					tenantId: req.tid,
					userId: req.sub,
					changeCount,
				},
				'Sync changes request',
			);
		}

		const result = await this.syncService.applyChanges({
			changes: req.body.changes,
			tenantId: req.tid,
			userId: req.sub,
			roles: req.roles ?? [],
		});

		// Log operation result
		if (isDevelopment) {
			apiLogger.debug(
				{
					requestId,
					tenantId: req.tid,
					success: result.success,
					processed: result.processed,
					errors: result.errors,
					updates: result.updates,
					failures: result.failures,
				},
				'Sync changes completed',
			);
		} else if (!result.success || result.errors > 0) {
			// Production: Only log failures or partial failures
			apiLogger.warn(
				{
					requestId,
					tenantId: req.tid,
					processed: result.processed,
					errors: result.errors,
					failures: result.failures,
				},
				'Sync changes completed with errors',
			);
		}

		res.status(result.success ? 200 : 207).json(result);
	}

	async loadTables(req: AuthenticatedRequest, res: Response): Promise<void> {
		const requestId = (req as Request & { requestId?: string }).requestId;
		const body = req.body as SyncLoadRequest;
		const tableCount = Array.isArray(body.tables) ? body.tables.length : 0;

		// Log operation start
		if (isDevelopment) {
			apiLogger.debug(
				{
					requestId,
					tenantId: req.tid,
					userId: req.sub,
					tableCount,
					tables: body.tables,
					lastUpdated: body.lastUpdated,
				},
				'Processing bulk load request',
			);
		} else {
			apiLogger.info(
				{
					requestId,
					tenantId: req.tid,
					userId: req.sub,
					tableCount,
				},
				'Bulk load request',
			);
		}

		const result = await this.syncService.loadTables({
			...body,
			authenticatedTenantId: req.tid,
			userId: req.sub,
			roles: req.roles ?? [],
		});

		// Log operation result
		if (isDevelopment) {
			apiLogger.debug(
				{
					requestId,
					tenantId: req.tid,
					tableCount: Object.keys(result).length,
					tables: Object.keys(result),
				},
				'Bulk load completed',
			);
		} else {
			// Production: Log summary
			apiLogger.info(
				{
					requestId,
					tenantId: req.tid,
					tableCount: Object.keys(result).length,
				},
				'Bulk load completed',
			);
		}

		res.status(200).json(result);
	}
}
