/**
 * Events Controller
 *
 * Handles Server-Sent Events (SSE) for real-time notifications
 */

import type { Request, Response } from 'express';
import type { Knex } from 'knex';
import { config } from '@/config/configHolder';
import ActiveClients from '@/helpers/clients';
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

	constructor(db: Knex) {
		this.notificationService = new NotificationService(db);
	}

	/**
	 * Handle GET /events request (Server-Sent Events)
	 * Note: Authentication is handled by sseAuth middleware
	 */
	async handleEvents(req: AuthenticatedRequest, res: Response): Promise<void> {
		const requestId = (req as Request & { requestId?: string }).requestId;
		const deviceId = (req.query?.deviceId || req.headers?.deviceid) as string;

		// Log SSE connection attempt
		if (isDevelopment) {
			notificationLogger.debug(
				{
					requestId,
					deviceId,
					userId: req.sub,
					tenantId: req.tid,
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
					tenantId: req.tid,
				},
				'SSE connection attempt',
			);
		}

		// Setup SSE headers
		res.setHeader('Content-Type', 'text/event-stream');
		res.setHeader('Cache-Control', 'no-cache');
		res.setHeader('Connection', 'keep-alive');
		res.write('data: Connected\n\n');

		// Register device for events
		ActiveClients.AddWebDeviceEvent(deviceId, 'events', res);

		// Log successful registration
		notificationLogger.info(
			{
				requestId,
				deviceId,
				userId: req.sub,
				tenantId: req.tid,
				activeConnections: ActiveClients.web.size,
			},
			'Device registered for SSE events',
		);

		// Handle disconnection
		req.on('close', () => {
			ActiveClients.DeleteWebDevice(deviceId);
			notificationLogger.info(
				{
					requestId,
					deviceId,
					userId: req.sub,
					tenantId: req.tid,
					activeConnections: ActiveClients.web.size,
				},
				'Device disconnected from SSE events',
			);
		});

		// Handle errors
		req.on('error', (error) => {
			notificationLogger.error(
				{
					requestId,
					deviceId,
					userId: req.sub,
					tenantId: req.tid,
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
