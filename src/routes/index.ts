/**
 * MTDD Routes
 *
 * API route definitions for Multi-Tenant Database Deployment
 */

import { Router } from 'express';
import type { Knex } from 'knex';
import { LoadDataController } from '@/controllers/loadDataController';
import { EventsController } from '@/controllers/eventsController';
import { validateQuery, schemas } from '@/middleware/validation';
import { asyncHandler } from '@/middleware/errorHandler';
import { authenticateSSE } from '@/middleware/sseAuth';
import { apiLogger } from '@/utils/logger';
import { db as knexHelperDb } from '@/helpers/knexHelper';

/**
 * Create and configure MTDD routes
 *
 * @param dbConnection - Knex database connection
 * @returns Configured Express router
 */
export function createMtddRoutes(dbConnection: Knex): Router {
	// Validate database connection
	const db =
		dbConnection === knexHelperDb
			? dbConnection
			: (() => {
					apiLogger.warn(
						'Provided dbConnection is not the same as knexHelper db instance. MTDD functionality may not be available.',
					);
					apiLogger.warn(
						'Tip: Use the db instance from knexHelper to ensure MTDD functionality works correctly.',
					);
					return dbConnection;
				})();

	// Initialize controllers
	const loadDataController = new LoadDataController(db);
	const eventsController = new EventsController(db);

	// Create router
	const router = Router();

	// ============================================================================
	// Routes
	// ============================================================================

	/**
	 * GET /Load
	 * Load data from database for a specific table and tenant
	 */
	router.get(
		'/Load',
		validateQuery(schemas.loadData),
		asyncHandler((req, res) => loadDataController.loadData(req, res)),
	);

	/**
	 * GET /events
	 * Server-Sent Events endpoint for real-time notifications
	 */
	router.get(
		'/events',
		authenticateSSE,
		asyncHandler((req, res) => eventsController.handleEvents(req, res)),
	);

	// ============================================================================
	// Setup channel listeners for notifications
	// ============================================================================
	eventsController.setupChannelListeners();

	return router;
}

// Export for backward compatibility
export default createMtddRoutes;
