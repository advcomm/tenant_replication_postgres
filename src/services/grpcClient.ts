/**
 * gRPC Query Client
 *
 * Main interface for executing SQL queries via gRPC query servers
 */

import type { ChannelMessage } from '@/types/api';
import { IS_SINGLE_SERVER_DEPLOYMENT } from '@/services/grpc/config';
import {
	addTenantShard,
	getTenantShard,
	listenToChannel as listenToChannelGrpc,
	lookupClient,
	clients,
} from '@/services/grpc';
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
 * @deprecated Use executeQuery instead
 */
export async function callProcedure(
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
	
	return executeQuery(query, params, tenantId);
}

/**
 * Executes a query with named or positional parameters
 * Automatically routes to single or multi-server execution
 */
export async function executeQuery(
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
export async function executeQueryRace(
	query: string,
	valuesOrBindings: Record<string, any> | any[] = {},
): Promise<unknown> {
	return executeMultiServerRace(query, valuesOrBindings);
}

/**
 * Execute query on all servers using Promise.any strategy
 * Returns result from the first successful server
 */
export async function executeQueryAny(
	query: string,
	valuesOrBindings: Record<string, any> | any[] = {},
): Promise<unknown> {
	return executeMultiServerAny(query, valuesOrBindings);
}

/**
 * Execute query on all servers using Promise.all strategy
 * Returns results from all servers
 */
export async function executeQueryAll(
	query: string,
	valuesOrBindings: Record<string, any> | any[] = {},
): Promise<unknown[]> {
	// Single server optimization
	if (IS_SINGLE_SERVER_DEPLOYMENT) {
		grpcLogger.debug(
			'executeQueryAll - using single server result',
		);
		const singleResult = await executeQuery(query, valuesOrBindings);
		return [singleResult];
	}

	return executeMultiServerAll(query, valuesOrBindings);
}

/**
 * Execute query on all servers using Promise.allSettled strategy
 * Returns results and errors from all servers
 */
export async function executeQueryAllSettled(
	query: string,
	valuesOrBindings: Record<string, any> | any[] = {},
): Promise<PromiseSettledResult<unknown>[]> {
	// Single server optimization
	if (IS_SINGLE_SERVER_DEPLOYMENT) {
		grpcLogger.debug(
			'executeQueryAllSettled - using single server result',
		);
		try {
			const result = await executeQuery(query, valuesOrBindings);
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
export async function getTenantShardInfo(
	tenantName: string,
	lookupType: number = 1,
): Promise<number> {
	return getTenantShard(lookupClient, tenantName, lookupType);
}

/**
 * Add tenant shard mapping
 */
export async function addTenantShardMapping(
	tenantName: string,
	tenantType: number = 1,
): Promise<unknown> {
	return addTenantShard(lookupClient, tenantName, tenantType);
}

/**
 * Listen to a channel for real-time notifications
 */
export function listenToChannel(
	channel: string,
	callback: (msg: ChannelMessage) => void,
): void {
	listenToChannelGrpc(clients, channel, callback);
}

/**
 * Initialize the gRPC query client (for future use)
 */
export function initializeGrpcClient(config: unknown): void {
	grpcLogger.info({ config }, 'gRPC query client initialization requested');
	// Future: Allow dynamic configuration
}

/**
 * GrpcQueryClient - Backward compatibility wrapper
 * Delegates to exported functions to avoid static-only class
 */
export class GrpcQueryClient {
	static callProcedure = callProcedure;
	static executeQuery = executeQuery;
	static executeQueryRace = executeQueryRace;
	static executeQueryAny = executeQueryAny;
	static executeQueryAll = executeQueryAll;
	static executeQueryAllSettled = executeQueryAllSettled;
	static getTenantShard = getTenantShardInfo;
	static addTenantShard = addTenantShardMapping;
	static ListenToChannel = listenToChannel;
	static initialize = initializeGrpcClient;
}

