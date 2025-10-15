/**
 * gRPC Backend Client
 *
 * Main interface for communicating with gRPC backend servers
 */

import type { ChannelMessage } from '@/types/api';
import { IS_SINGLE_SERVER_DEPLOYMENT } from '@/services/grpc/config';
import { addTenantShard, getTenantShard, listenToChannel, lookupClient, clients } from '@/services/grpc';
import { grpcLogger } from '@/utils/logger';
import { executeSingleServer } from './executors/singleServerExecutor';
import {
	executeMultiServer,
	executeMultiServerRace,
	executeMultiServerAny,
	executeMultiServerAll,
	executeMultiServerAllSettled,
} from './executors/multiServerExecutor';

/**
 * Main Backend Client Class
 *
 * Provides methods for executing queries and managing tenant shards via gRPC
 */
export class BackendClient {
	/**
	 * @deprecated Use executeQuery instead
	 */
	static async callProcedure(
		procedureName: string,
		params: unknown[],
		isFunction: boolean = false,
		tenantId?: string,
	): Promise<unknown> {
		grpcLogger.warn('callProcedure is deprecated. Use executeQuery instead.');
		
		// Convert to executeQuery format
		const query = isFunction 
			? `SELECT * FROM ${procedureName}(${params.map((_, i) => `$${i + 1}`).join(', ')})`
			: `CALL ${procedureName}(${params.map((_, i) => `$${i + 1}`).join(', ')})`;
		
		return this.executeQuery(query, params, tenantId);
	}

	/**
	 * Executes a query with named or positional parameters
	 * Automatically routes to single or multi-server execution
	 */
	public static async executeQuery(
		query: string,
		valuesOrBindings: Record<string, any> | any[] = {},
		tenantName?: string,
	): Promise<unknown> {
		if (IS_SINGLE_SERVER_DEPLOYMENT) {
			return executeSingleServer(query, valuesOrBindings);
		}

		return executeMultiServer(query, valuesOrBindings, tenantName);
	}

	/**
	 * Execute query on all servers using Promise.race strategy
	 * Returns result from the first server to respond
	 */
	public static async executeQueryRace(
		query: string,
		valuesOrBindings: Record<string, any> | any[] = {},
	): Promise<unknown> {
		return executeMultiServerRace(query, valuesOrBindings);
	}

	/**
	 * Execute query on all servers using Promise.any strategy
	 * Returns result from the first successful server
	 */
	public static async executeQueryAny(
		query: string,
		valuesOrBindings: Record<string, any> | any[] = {},
	): Promise<unknown> {
		return executeMultiServerAny(query, valuesOrBindings);
	}

	/**
	 * Execute query on all servers using Promise.all strategy
	 * Returns results from all servers
	 */
	public static async executeQueryAll(
		query: string,
		valuesOrBindings: Record<string, any> | any[] = {},
	): Promise<unknown[]> {
		// Single server optimization
		if (IS_SINGLE_SERVER_DEPLOYMENT) {
			grpcLogger.debug(
				'executeQueryAll - using single server result',
			);
			const singleResult = await this.executeQuery(query, valuesOrBindings);
			return [singleResult];
		}

		return executeMultiServerAll(query, valuesOrBindings);
	}

	/**
	 * Execute query on all servers using Promise.allSettled strategy
	 * Returns results and errors from all servers
	 */
	public static async executeQueryAllSettled(
		query: string,
		valuesOrBindings: Record<string, any> | any[] = {},
	): Promise<PromiseSettledResult<unknown>[]> {
		// Single server optimization
		if (IS_SINGLE_SERVER_DEPLOYMENT) {
			grpcLogger.debug(
				'executeQueryAllSettled - using single server result',
			);
			try {
				const result = await this.executeQuery(query, valuesOrBindings);
				return [{ status: 'fulfilled', value: result }];
			} catch (error) {
				return [{ status: 'rejected', reason: error }];
			}
		}

		return executeMultiServerAllSettled(query, valuesOrBindings);
	}

	/**
	 * Get tenant shard information
	 */
	public static async getTenantShard(
		tenantName: string,
		lookupType: number = 1,
	): Promise<number> {
		return getTenantShard(lookupClient, tenantName, lookupType);
	}

	/**
	 * Add tenant shard mapping
	 */
	public static async addTenantShard(
		tenantName: string,
		tenantType: number = 1,
	): Promise<unknown> {
		return addTenantShard(lookupClient, tenantName, tenantType);
	}

	/**
	 * Listen to a channel for real-time notifications
	 */
	static ListenToChannel(
		channel: string,
		callback: (msg: ChannelMessage) => void,
	): void {
		listenToChannel(clients, channel, callback);
	}

	/**
	 * Initialize the backend client (for future use)
	 */
	static initialize(config: unknown): void {
		grpcLogger.info({ config }, 'Backend client initialization requested');
		// Future: Allow dynamic configuration
	}
}

