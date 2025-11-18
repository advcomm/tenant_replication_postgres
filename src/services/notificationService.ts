/**
 * Notification Service
 *
 * Handles channel listening and broadcasting notifications to connected clients
 */

import type { Knex } from 'knex';
import { config } from '@/config/configHolder';
import ActiveClients from '@/helpers/clients';
import { GrpcQueryClient } from '@/services/grpcClient';
import type { ChannelMessage, JsonMap, ServerEventPayload } from '@/types/api';
import { ServerEventType, SyncChangeAction } from '@/types/api';
import { notificationLogger } from '@/utils/logger';

/**
 * Notification Service
 * Manages database change notifications and client broadcasting
 */
export class NotificationService {
	private db: Knex;
	private portalInfo: Record<string, unknown>;
	private readonly pkCache = new Map<string, string>();

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

		const dataRecord = data as JsonMap;
		const tenantColumn =
			(this.portalInfo?.tenantColumnName as string | undefined) ?? undefined;
		const tenantColumnValue =
			(tenantColumn ? dataRecord[tenantColumn] : undefined) ??
			dataRecord.TenantID;
		const dataTenantID = tenantColumnValue as string | number | undefined;

		// TODO: This is just for the issue of tenantName and ID. will resolve later after discussion.
		if (dataTenantID !== undefined) {
			await this.db
				.raw('SELECT EntityName FROM tblEntities WHERE entityid = ?', [
					dataTenantID,
				])
				.mtdd();
		}

		const normalizedAction = this.normalizeAction(action);

		// Log the notification
		notificationLogger.info(
			{ table, action: normalizedAction, tenantId: dataTenantID },
			'Database change notification received',
		);

		// Resolve primary key column and value for efficient client-side processing
		let pkColumn: string | undefined;
		let pkValue: string | number | null | undefined;

		if (table) {
			try {
				pkColumn = await this.resolvePrimaryKey(table);
				if (pkColumn && dataRecord) {
					pkValue = dataRecord[pkColumn] as string | number | null | undefined;
				}
			} catch (error) {
				notificationLogger.warn(
					{ error, table },
					'Failed to resolve primary key for SSE event',
				);
			}
		}

		const eventPayload: ServerEventPayload = {
			type: this.eventTypeFromAction(normalizedAction),
			action: normalizedAction,
			table,
			pkColumn,
			pkValue,
			data: dataRecord,
			timestamp: new Date().toISOString(),
		};

		// Broadcast to all connected web clients subscribed to 'events'
		this.broadcastToWebClients(JSON.stringify(eventPayload));
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

	private normalizeAction(action: unknown): SyncChangeAction {
		if (typeof action === 'number') {
			return action === 0
				? SyncChangeAction.Insert
				: action === 1
					? SyncChangeAction.Update
					: SyncChangeAction.Delete;
		}

		if (typeof action === 'string') {
			const normalized = action.toLowerCase();
			if (normalized === SyncChangeAction.Insert)
				return SyncChangeAction.Insert;
			if (normalized === SyncChangeAction.Update)
				return SyncChangeAction.Update;
			if (normalized === SyncChangeAction.Delete)
				return SyncChangeAction.Delete;
		}

		return SyncChangeAction.Update;
	}

	private eventTypeFromAction(action: SyncChangeAction): ServerEventType {
		switch (action) {
			case SyncChangeAction.Insert:
				return ServerEventType.Insert;
			case SyncChangeAction.Delete:
				return ServerEventType.Delete;
			default:
				return ServerEventType.Update;
		}
	}

	/**
	 * Resolve primary key column name for a table
	 * Uses cache to avoid repeated information_schema queries
	 * @param tableName - Name of the table
	 * @returns Primary key column name
	 */
	private async resolvePrimaryKey(tableName: string): Promise<string> {
		if (this.pkCache.has(tableName)) {
			return this.pkCache.get(tableName) as string;
		}

		// Query information_schema to find primary key column
		const result = await this.db.raw(
			`
			SELECT kcu.column_name
			FROM information_schema.table_constraints tc
			INNER JOIN information_schema.key_column_usage kcu
				ON tc.constraint_name = kcu.constraint_name
				AND tc.table_schema = kcu.table_schema
			WHERE tc.constraint_type = 'PRIMARY KEY'
				AND tc.table_name = ?
			LIMIT 1
			`,
			[tableName],
		);

		const row = result.rows?.[0];
		if (!row || !row.column_name) {
			throw new Error(`Primary key not found for table ${tableName}`);
		}

		const pkColumn = row.column_name as string;
		this.pkCache.set(tableName, pkColumn);
		return pkColumn;
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
			// biome-ignore lint/suspicious/noExplicitAny: Knex does not expose pg client typings
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
