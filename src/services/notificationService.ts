/**
 * Notification Service
 *
 * Handles channel listening and broadcasting notifications to connected clients
 */

import type { Knex } from 'knex';
import { config } from '@/config/configHolder';
import ActiveClients from '@/helpers/clients';
import { GrpcQueryClient } from '@/services/grpcClient';
import type { ChannelMessage } from '@/types/api';
import { notificationLogger } from '@/utils/logger';

/**
 * Notification Service
 * Manages database change notifications and client broadcasting
 */
export class NotificationService {
	private db: Knex;
	private portalInfo: Record<string, unknown>;

	constructor(db: Knex) {
		this.db = db;
		this.portalInfo = config.portalInfo;
	}

	/**
	 * Handle incoming channel messages and broadcast to clients
	 * @param msg - Channel message from PostgreSQL NOTIFY or gRPC stream
	 */
	async handleChannelMessage(msg: ChannelMessage): Promise<void> {
		const { table, action, data } = !config.isDevelopment
			? JSON.parse(JSON.parse(msg.payload))
			: JSON.parse(msg.payload);

		const dataTenantID =
			data[(this.portalInfo?.tenantColumnName as string) ?? ''] ||
			data.TenantID;

		// TODO: This is just for the issue of tenantName and ID. will resolve later after discussion.
		await this.db
			.raw('SELECT EntityName FROM tblEntities WHERE entityid = ?', [
				dataTenantID,
			])
			.mtdd();

		// Log the notification
		notificationLogger.info(
			{ table, action, tenantId: dataTenantID },
			'Database change notification received',
		);

		// Broadcast to all connected web clients subscribed to 'events'
		this.broadcastToWebClients(msg.payload);
	}

	/**
	 * Broadcast message to all connected web clients
	 * @param payload - Message payload to send
	 */
	private broadcastToWebClients(payload: string): void {
		for (const [_deviceId, deviceEvents] of ActiveClients.web.entries()) {
			const res = deviceEvents.get('events');
			if (res && !res.writableEnded) {
				res.write(`data: ${payload}\n\n`);
			}
		}
	}

	/**
	 * Setup channel listeners for notifications
	 * Configures PostgreSQL LISTEN (dev) or gRPC streaming (production)
	 */
	setupChannelListeners(): void {
		if (!config.isDevelopment) {
			// Production: Use gRPC channel streaming
			GrpcQueryClient.ListenToChannel(
				'table_changes',
				this.handleChannelMessage.bind(this),
			);
		} else {
			// Development: Use PostgreSQL NOTIFY/LISTEN
			this.db.client.acquireConnection().then((pgClient: any) => {
				// Subscribe to a channel
				// Note: pgClient is typed as 'any' here because we're using internal Knex/pg API
				pgClient.query('LISTEN table_changes');

				// Handle notifications
				pgClient.on('notification', (msg: ChannelMessage) => {
					this.handleChannelMessage(msg);
				});

				notificationLogger.info(
					'Development mode: Listening to PostgreSQL NOTIFY on table_changes channel',
				);
			});
		}
	}
}
