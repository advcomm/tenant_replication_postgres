/**
 * Events Controller
 *
 * Handles Server-Sent Events (SSE) for real-time notifications
 */

import type { Request, Response } from 'express';
import type { Knex } from 'knex';
import { config } from '@/config/configHolder';
import ActiveClients from '@/helpers/clients';
import { getRedisService } from '@/index';
import { NotificationService } from '@/services/notificationService';
import type { AuthenticatedRequest } from '@/types/api';
import { notificationLogger } from '@/utils/logger';

const isDevelopment =
	config.isDevelopment || process.env.NODE_ENV === 'development';

/**
 * Events Controller for SSE endpoints
 */
export class EventsController {
	private notificationService: NotificationService;

	constructor(db: Knex, notificationService?: NotificationService) {
		// Allow injection of NotificationService for testing or if already created
		this.notificationService =
			notificationService ?? new NotificationService(db, getRedisService());
	}

	/**
	 * Handle GET /events request (Server-Sent Events)
	 * Note: Authentication is handled by sseAuth middleware
	 */
	async handleEvents(req: AuthenticatedRequest, res: Response): Promise<void> {
		const requestId = (req as Request & { requestId?: string }).requestId;
		const deviceId = (req.query?.deviceId || req.headers?.deviceid) as string;
		const tenantId = req.tid;

		// Validate tenant ID is present
		if (!tenantId) {
			notificationLogger.warn(
				{ requestId, deviceId, userId: req.sub },
				'SSE connection rejected: missing tenant ID',
			);
			res.status(400).json({ error: 'Tenant ID is required' });
			return;
		}

		// Log SSE connection attempt
		if (isDevelopment) {
			notificationLogger.debug(
				{
					requestId,
					deviceId,
					userId: req.sub,
					tenantId,
					ip: req.ip || req.socket.remoteAddress,
				},
				'SSE connection attempt',
			);
		} else {
			notificationLogger.info(
				{
					requestId,
					deviceId,
					userId: req.sub,
					tenantId,
				},
				'SSE connection attempt',
			);
		}

		// Setup SSE headers
		res.setHeader('Content-Type', 'text/event-stream');
		res.setHeader('Cache-Control', 'no-cache');
		res.setHeader('Connection', 'keep-alive');
		res.write('data: Connected\n\n');

		// Register device for events (tenant-based)
		ActiveClients.AddWebDeviceEvent(tenantId, deviceId, res);

		// Log successful registration
		notificationLogger.info(
			{
				requestId,
				deviceId,
				userId: req.sub,
				tenantId,
				tenantDeviceCount: ActiveClients.GetTenantDevices(tenantId)?.size ?? 0,
			},
			'Device registered for SSE events',
		);

		// Setup keep-alive mechanism
		const redisService = getRedisService();

		const keepAliveInterval = setInterval(() => {
			try {
				// Send keep-alive heartbeat
				res.write(': keep-alive\n\n');

				// Refresh Redis TTL for tenant
				if (redisService) {
					redisService.refreshTenantTTL(tenantId).catch((error) => {
						notificationLogger.error(
							{ error, tenantId },
							'Failed to refresh Redis TTL on keep-alive',
						);
					});
				}
			} catch (error) {
				notificationLogger.error(
					{ error, tenantId, deviceId },
					'Error sending keep-alive',
				);
			}
		}, 30000); // 30 seconds

		// Handle disconnection
		req.on('close', () => {
			clearInterval(keepAliveInterval);
			ActiveClients.DeleteWebDevice(tenantId, deviceId);
			notificationLogger.info(
				{
					requestId,
					deviceId,
					userId: req.sub,
					tenantId,
					tenantDeviceCount:
						ActiveClients.GetTenantDevices(tenantId)?.size ?? 0,
				},
				'Device disconnected from SSE events',
			);
		});

		// Handle errors
		req.on('error', (error) => {
			clearInterval(keepAliveInterval);
			notificationLogger.error(
				{
					requestId,
					deviceId,
					userId: req.sub,
					tenantId,
					error: error.message,
				},
				'SSE connection error',
			);
		});
	}

	/**
	 * Setup channel listeners for notifications
	 */
	setupChannelListeners(): void {
		this.notificationService.setupChannelListeners();
	}
}
