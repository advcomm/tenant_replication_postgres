/**
 * Events Controller
 *
 * Handles Server-Sent Events (SSE) for real-time notifications
 */

import type { Response } from 'express';
import type { Knex } from 'knex';
import type { AuthenticatedRequest } from '@/types/api';
import ActiveClients from '@/helpers/clients';
import { notificationLogger } from '@/utils/logger';
import { NotificationService } from '@/services/notificationService';

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
		const deviceId = (req.query?.deviceId || req.headers?.deviceid) as string;

		// Setup SSE headers
		res.setHeader('Content-Type', 'text/event-stream');
		res.setHeader('Cache-Control', 'no-cache');
		res.setHeader('Connection', 'keep-alive');
		res.write('data: Connected\n\n');

		// Register device for events
		ActiveClients.AddWebDeviceEvent(deviceId, 'events', res);

		notificationLogger.info(
			{ deviceId, user: req.sub, tenantId: req.tid },
			'Device registered for events',
		);

		// Handle disconnection
		req.on('close', () => {
			ActiveClients.DeleteWebDevice(deviceId);
			notificationLogger.info(
				{ deviceId, user: req.sub },
				'Device disconnected from events',
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

