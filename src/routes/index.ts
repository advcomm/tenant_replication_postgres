/**
 * MTDD Routes
 *
 * API route definitions for Multi-Tenant Database Deployment
 */

import { Router } from 'express';
import type { Knex } from 'knex';
import { EventsController } from '@/controllers/eventsController';
import { LoadDataController } from '@/controllers/loadDataController';
import { SyncController } from '@/controllers/syncController';
import { getRedisService } from '@/index';
import { asyncHandler } from '@/middleware/errorHandler';
import { requestLogger } from '@/middleware/requestLogger';
import { authenticateSSE } from '@/middleware/sseAuth';
import {
	schemas,
	validateBody,
	validateParams,
	validateQuery,
} from '@/middleware/validation';
import { NotificationService } from '@/services/notificationService';
import { SyncService } from '@/services/syncService';
import type { AuthenticatedRequest } from '@/types/api';

/**
 * Create and configure MTDD routes
 *
 * @param dbConnection - Knex database connection
 * @returns Configured Express router
 */
export function createMtddRoutes(dbConnection: Knex): Router {
	// Validate database connection
	const db = dbConnection;

	// Initialize services
	const redisService = getRedisService();
	const notificationService = new NotificationService(db, redisService);

	// Initialize controllers
	const loadDataController = new LoadDataController(db);
	const eventsController = new EventsController(db, notificationService);
	const syncController = new SyncController(new SyncService(db));

	// Create router
	const router = Router();

	// ============================================================================
	// Middleware
	// ============================================================================
	// Apply request logging middleware to all routes
	router.use(requestLogger);

	// ============================================================================
	// Routes
	// ============================================================================

	/**
	 * GET /Load
	 * Load data from database for a specific table and tenant
	 */
	router.get(
		'/tables/:tableName',
		validateParams(schemas.tableNameParam),
		validateQuery(schemas.loadData),
		asyncHandler((req, res) => loadDataController.loadData(req, res)),
	); // Legacy: previously GET /load

	/**
	 * POST /sync/changes
	 * Receive client change log batches and persist to server
	 */
	router.post(
		'/changes',
		validateBody(schemas.syncChanges),
		asyncHandler((req, res) =>
			syncController.syncChanges(req as AuthenticatedRequest, res),
		),
	);
	// Legacy: previously POST /sync

	/**
	 * POST /sync/bulk-load
	 * Bulk load tables for MTDS clients
	 */
	router.post(
		'/bulk-load',
		validateBody(schemas.syncLoad),
		asyncHandler((req, res) =>
			syncController.loadTables(req as AuthenticatedRequest, res),
		),
	);
	// Legacy: previously POST /sync/data

	/**
	 * GET /sync/events
	 * Server-Sent Events endpoint for real-time notifications
	 */
	router.get(
		'/events',
		// authenticateSSE,
		asyncHandler((req, res) => eventsController.handleEvents(req, res)),
	); // Legacy: previously GET /events

	// ============================================================================
	// Setup channel listeners for notifications
	// ============================================================================
	notificationService.setupChannelListeners();

	return router;
}

// Export for backward compatibility
export default createMtddRoutes;
