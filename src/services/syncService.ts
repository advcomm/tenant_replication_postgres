import type { Knex } from 'knex';

import { config } from '@/config/configHolder';
import { LoadDataService } from '@/services/loadDataService';
import type {
	NormalizedSyncChange,
	ProcessSyncChangesParams,
	ServerSyncUpdate,
	SyncChangePayload,
	SyncChangeRequest,
	SyncLoadRequest,
	SyncResponse,
	TableLoadContext,
} from '@/types/api';
import { SyncChangeAction } from '@/types/api';
import { apiLogger } from '@/utils/logger';

/**
 * Service responsible for handling sync requests from MTDS clients.
 */
export class SyncService {
	private readonly loadDataService: LoadDataService;
	private readonly pkCache = new Map<string, string>();

	constructor(private readonly db: Knex) {
		this.loadDataService = new LoadDataService(db);
	}

	/**
	 * Apply client changes to the authoritative database.
	 */
	async applyChanges(params: ProcessSyncChangesParams): Promise<SyncResponse> {
		if (!params.changes.length) {
			return {
				success: true,
				processed: 0,
				errors: 0,
				updates: [],
				failures: [],
			};
		}

		const normalized = params.changes
			.map((change) => this.normalizeChange(change))
			.sort((a, b) => a.clientTxid - b.clientTxid);

		const updates: ServerSyncUpdate[] = [];
		const failures: SyncResponse['failures'] = [];

		const tenantId = params.tenantId;
		if (!tenantId) {
			throw new Error('Tenant ID is required to apply sync changes');
		}

		for (const change of normalized) {
			const serverTxid = this.generateServerTxid();

			try {
				const pkColumn = await this.resolvePrimaryKey(change.tableName);
				const pkValue = this.normalizePkValue(change.pkValue);

				if (change.action === SyncChangeAction.Delete) {
					await this.applyDelete(
						change.tableName,
						pkColumn,
						pkValue,
						serverTxid,
						tenantId,
					);
				} else {
					await this.applyUpsert(
						change,
						pkColumn,
						pkValue,
						serverTxid,
						tenantId,
					);
				}

				updates.push({
					clientTxid: change.clientTxid,
					serverTxid,
					tableName: change.tableName,
					pk: pkValue ?? change.pkValue,
				});
			} catch (error) {
				const message =
					error instanceof Error ? error.message : 'Unknown error';
				apiLogger.error(
					{ error, table: change.tableName, clientTxid: change.clientTxid },
					'Failed to apply sync change',
				);

				failures.push({
					change: {
						clientTxid: change.clientTxid,
						tableName: change.tableName,
						action: change.action,
						pkValue: change.pkValue,
					},
					message,
				});
			}
		}

		return {
			success: failures.length === 0,
			processed: updates.length,
			errors: failures.length,
			updates,
			failures,
		};
	}

	/**
	 * Load tables for the client, reusing LoadDataService to keep parity with GET /Load.
	 */
	async loadTables(
		params: SyncLoadRequest & TableLoadContext,
	): Promise<Record<string, unknown[]>> {
		const results: Record<string, unknown[]> = {};

		const tenantId = params.tenantId ?? params.authenticatedTenantId;
		if (!tenantId) {
			throw new Error('Tenant ID is required to load tables');
		}

		for (const tableName of params.tables) {
			try {
				const { rows } = await this.loadDataService.loadData({
					tableName,
					lastUpdated: params.lastUpdated,
					tenantId,
					userId: params.userId,
					roles: params.roles,
					deviceId: params.deviceId,
				});
				results[tableName] = rows;
			} catch (error) {
				apiLogger.error(
					{ error, tableName },
					'Failed to load table for sync client',
				);
				results[tableName] = [];
			}
		}

		return results;
	}

	private async applyUpsert(
		change: NormalizedSyncChange,
		pkColumn: string,
		pkValue: string | number | null,
		serverTxid: number,
		tenantId: string | number,
	): Promise<void> {
		const payload = change.payload?.New;

		if (!payload || typeof payload !== 'object') {
			throw new Error('Change payload missing New values');
		}

		// Get tenant column name from config, default to 'tenant_id'
		const tenantColumnName =
			(config.portalInfo?.tenantColumnName as string | undefined) ??
			'tenant_id';

		const row = { ...payload };
		row[pkColumn] ??= pkValue;
		row[tenantColumnName] = tenantId; // Always set tenant_id from authenticated request
		row.mtds_last_updated_txid = serverTxid;
		row.mtds_device_id = change.deviceId;

		await this.db(change.tableName).insert(row).onConflict(pkColumn).merge(row);
	}

	private async applyDelete(
		tableName: string,
		pkColumn: string,
		pkValue: string | number | null,
		serverTxid: number,
		tenantId: string | number,
	): Promise<void> {
		// Get tenant column name from config, default to 'tenant_id'
		const tenantColumnName =
			(config.portalInfo?.tenantColumnName as string | undefined) ??
			'tenant_id';

		// Ensure we only delete records for the authenticated tenant
		await this.db(tableName)
			.where(pkColumn, pkValue)
			.where(tenantColumnName, tenantId)
			.update({
				mtds_deleted_txid: serverTxid,
				mtds_last_updated_txid: serverTxid,
			});
	}

	private normalizeChange(change: SyncChangeRequest): NormalizedSyncChange {
		const clientTxid = Number(change.clientTxid);
		const deviceId = Number(change.mtds_device_id);

		if (Number.isNaN(clientTxid) || Number.isNaN(deviceId)) {
			throw new Error('Invalid clientTxid or mtds_device_id');
		}

		return {
			clientTxid,
			tableName: change.table_name,
			deviceId,
			action: this.resolveAction(change.action),
			pkValue: change.record_pk,
			payload: this.ensurePayload(change.payload),
		};
	}

	private resolveAction(action: SyncChangeRequest['action']): SyncChangeAction {
		if (action === null || action === SyncChangeAction.Delete) {
			return SyncChangeAction.Delete;
		}

		if (typeof action === 'number') {
			if (action === 0) return SyncChangeAction.Insert;
			if (action === 1) return SyncChangeAction.Update;
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

	private ensurePayload(
		raw: SyncChangeRequest['payload'],
	): SyncChangePayload | undefined {
		if (!raw) {
			return undefined;
		}

		if (typeof raw === 'string') {
			try {
				return JSON.parse(raw) as SyncChangePayload;
			} catch (error) {
				apiLogger.warn({ error }, 'Failed to parse payload JSON');
				return undefined;
			}
		}

		return raw;
	}

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

		this.pkCache.set(tableName, row.column_name);
		return row.column_name;
	}

	private normalizePkValue(
		value: string | number | null,
	): string | number | null {
		if (typeof value === 'number' || value === null) {
			return value;
		}

		const numeric = Number(value);
		return Number.isNaN(numeric) ? value : numeric;
	}

	private generateServerTxid(): number {
		const [seconds, nanos] = process.hrtime();
		return seconds * 1_000_000_000 + nanos;
	}
}
