/**
 * Events Controller
 *
 * Handles Server-Sent Events (SSE) for real-time notifications
 */

import type { Response } from 'express';
import type { Knex } from 'knex';
import { decodeAccessToken } from '@advcomm/utils/dist/helper/authenticationHelper';
import type { AuthenticatedRequest, ChannelMessage } from '@/types/api';
import ActiveClients from '@/helpers/clients';
import { GrpcQueryClient } from '@/services/grpcClient';
import { apiLogger, notificationLogger } from '@/utils/logger';
import { config } from '@/config/configHolder';

/**
 * Events Controller for SSE endpoints
 */
export class EventsController {
	private db: Knex;
	private PortalInfo: Record<string, unknown>;

	constructor(db: Knex) {
		this.db = db;
		this.PortalInfo = config.portalInfo;
	}

	/**
	 * Handle GET /events request (Server-Sent Events)
	 */
	async handleEvents(req: AuthenticatedRequest, res: Response): Promise<void> {
		// Handle authorization within this endpoint
		try {
			let authToken = req.headers['authorization'];

			// Check if authorization is provided in query parameters
			if (!authToken && req.query.token) {
				// Create authorization header from query parameter
				authToken = `Bearer ${req.query.token}`;

				// Add authorization to headers for processing
				req.headers['authorization'] = authToken;
				apiLogger.debug(
					'Using authorization from query parameter for events endpoint',
				);
			}

			// Validate authorization
			if (!authToken || !authToken.startsWith('Bearer ')) {
				res.status(422).json({
					message: 'Authorization required for events endpoint',
				});
				return;
			}

			// Extract and decode token
			req.token = authToken.split(' ')[1];
			const decoded = (await decodeAccessToken(req)) as {
				IsSuccess: boolean;
				payload: { sub: string; tid: string; roles: string[] };
			};

			if (!decoded.IsSuccess) {
				res.status(401).json({
					message: 'Invalid token for events endpoint',
				});
				return;
			}

			// Extract auth values like in main middleware
			const { sub, tid, roles } = decoded.payload;
			req.sub = sub;
			req.tid = tid;
			req.roles = roles;

			apiLogger.info(
				{ user: sub, tenantId: tid, roles },
				'Events endpoint authorized',
			);
		} catch (authError: unknown) {
			const errorMessage =
				authError instanceof Error ? authError.message : 'Unknown error';
			apiLogger.error(
				{ error: errorMessage },
				'Events endpoint authentication failed',
			);
			res.status(401).json({
				message: 'Authentication failed for events endpoint',
			});
			return;
		}

		// Continue with existing events logic
		const deviceId = (req.query?.deviceId || req.headers?.deviceid) as string;

		res.setHeader('Content-Type', 'text/event-stream');
		res.setHeader('Cache-Control', 'no-cache');
		res.setHeader('Connection', 'keep-alive');
		res.write('data: Connected\n\n');

		ActiveClients.AddWebDeviceEvent(deviceId, 'events', res);

		notificationLogger.info(
			{ deviceId, user: req.sub, tenantId: req.tid },
			'Device registered for events',
		);

		req.on('close', () => {
			ActiveClients.DeleteWebDevice(deviceId);
			notificationLogger.info(
				{ deviceId, user: req.sub },
				'Device disconnected from events',
			);
		});
	}

	/**
	 * Default channel listener for database changes
	 */
	async listenChannel(msg: ChannelMessage): Promise<void> {
		const { table, action, data } = !config.isDevelopment
			? JSON.parse(JSON.parse(msg.payload))
			: JSON.parse(msg.payload);
		const dataTenantID =
			data[(this.PortalInfo?.TenantColumnName as string) ?? ''] ||
			data.TenantID;

		// TODO: This is just for the issue of tenantName and ID. will resolve later after discussion.
		const result = await this.db
			.raw('SELECT EntityName FROM tblEntities WHERE entityid = ?', [
				dataTenantID,
			])
			.mtdd();

		// Get Redis keys based on Foreign Key (e.g., VendorID)
		const vendorId = data.tenantid; // Adjust based on your schema
		const redisKey = `${table.toLowerCase()}:${this.PortalInfo.TenantColumnName}:${result.rows[0].entityname}`;

		// Log the notification
		notificationLogger.info(
			{ table, action, tenantId: dataTenantID },
			'Database change notification received',
		);

		// Get list of devices that need to be notified
		for (const [deviceId, deviceEvents] of ActiveClients.web.entries()) {
			const res = deviceEvents.get('events');
			if (res && !res.writableEnded) {
				res.write(`data: ${msg.payload}\n\n`);
			}
		}
	}

	/**
	 * Setup channel listeners
	 */
	setupChannelListeners(): void {
		// Listen to this channel (table_changes) by default
		if (!config.isDevelopment) {
			GrpcQueryClient.ListenToChannel(
				'table_changes',
				this.listenChannel.bind(this),
			);
		} else {
			this.db.client.acquireConnection().then((pgClient: any) => {
				// Subscribe to a channel
				// Note: pgClient is typed as 'any' here because we're using internal Knex/pg API
				pgClient.query('LISTEN table_changes');

				// Handle notifications
				pgClient.on('notification', (msg: ChannelMessage) => {
					this.listenChannel(msg);
				});

				notificationLogger.info(
					'Development mode: Listening to PostgreSQL NOTIFY on table_changes channel',
				);
			});
		}
	}
}
