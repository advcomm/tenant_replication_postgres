/**
 * Multi-Server Executor
 *
 * Handles query execution for multi-server deployments with various strategies
 */

import { grpcLogger } from '@/utils/logger';
import { processQueryParameters } from '@/services/grpc/queryUtils';
import { convertBigIntToString } from '@/services/grpc/utils';
import {
	callAllServersAny,
	callAllServersRace,
	callAllServersAll,
	callSpecificServerByShard,
} from '@/services/grpc/serverCalls';
import { getTenantShard, lookupClient, clients } from '@/services/grpc';

/**
 * Execute query with default strategy (any)
 * With optional tenant shard routing
 */
export async function executeMultiServer(
	query: string,
	valuesOrBindings: Record<string, any> | any[] = {},
	tenantName?: string,
): Promise<unknown> {
	const { query: processedQuery, params } = processQueryParameters(
		query,
		valuesOrBindings,
		'MULTI-SERVER',
	);

	const convertedParams = convertBigIntToString(params) as unknown[];
	const request = {
		query: processedQuery,
		params: convertedParams || [],
	};

	try {
		if (tenantName !== undefined && tenantName !== null) {
			grpcLogger.debug({ tenantName }, 'Looking up shard for tenant');
			const shardId = await getTenantShard(lookupClient, tenantName, 1);

			grpcLogger.debug(
				{ shardId, tenantName },
				'Executing query on specific shard',
			);
			return await callSpecificServerByShard(clients, shardId, request);
		}
		grpcLogger.debug('Executing query on all servers concurrently');
		return await callAllServersAny(clients, request);
	} catch (error: unknown) {
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error';
		grpcLogger.error(
			{ error: errorMessage },
			'Backend client error for query execution',
		);
		throw error;
	}
}

/**
 * Execute query using Promise.race strategy
 * Returns result from the first server to respond
 */
export async function executeMultiServerRace(
	query: string,
	valuesOrBindings: Record<string, any> | any[] = {},
): Promise<unknown> {
	const { query: processedQuery, params } = processQueryParameters(
		query,
		valuesOrBindings,
		'MULTI-SERVER-RACE',
	);

	const convertedParams = convertBigIntToString(params) as unknown[];
	const request = {
		query: processedQuery,
		params: convertedParams || [],
	};

	try {
		grpcLogger.debug('Executing query on all servers using Promise.race');
		return await callAllServersRace(clients, request);
	} catch (error: unknown) {
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error';
		grpcLogger.error(
			{ error: errorMessage },
			'Backend client error for race query execution',
		);
		throw error;
	}
}

/**
 * Execute query using Promise.any strategy
 * Returns result from the first successful server
 */
export async function executeMultiServerAny(
	query: string,
	valuesOrBindings: Record<string, any> | any[] = {},
): Promise<unknown> {
	const { query: processedQuery, params } = processQueryParameters(
		query,
		valuesOrBindings,
		'MULTI-SERVER-ANY',
	);

	const convertedParams = convertBigIntToString(params) as unknown[];
	const request = {
		query: processedQuery,
		params: convertedParams || [],
	};

	try {
		grpcLogger.debug('Executing query on all servers using Promise.any');
		return await callAllServersAny(clients, request);
	} catch (error: unknown) {
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error';
		grpcLogger.error(
			{ error: errorMessage },
			'Backend client error for any query execution',
		);
		throw error;
	}
}

/**
 * Execute query using Promise.all strategy
 * Returns results from all servers
 */
export async function executeMultiServerAll(
	query: string,
	valuesOrBindings: Record<string, any> | any[] = {},
): Promise<unknown[]> {
	const { query: processedQuery, params } = processQueryParameters(
		query,
		valuesOrBindings,
		'MULTI-SERVER-ALL',
	);

	const convertedParams = convertBigIntToString(params) as unknown[];
	const request = {
		query: processedQuery,
		params: convertedParams || [],
	};

	try {
		grpcLogger.debug('Executing query on all servers using Promise.all');
		return await callAllServersAll(clients, request);
	} catch (error: unknown) {
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error';
		grpcLogger.error(
			{ error: errorMessage },
			'Backend client error for all query execution',
		);
		throw error;
	}
}

/**
 * Execute query using Promise.allSettled strategy
 * Returns results and errors from all servers
 */
export async function executeMultiServerAllSettled(
	query: string,
	valuesOrBindings: Record<string, any> | any[] = {},
): Promise<PromiseSettledResult<unknown>[]> {
	const { query: processedQuery, params } = processQueryParameters(
		query,
		valuesOrBindings,
		'MULTI-SERVER-ALLSETTLED',
	);

	const convertedParams = convertBigIntToString(params) as unknown[];
	const request = {
		query: processedQuery,
		params: convertedParams || [],
	};

	try {
		grpcLogger.debug('Executing query on all servers using Promise.allSettled');

		const promises = clients.map((client) => {
			return new Promise((resolve, reject) => {
				client.executeQuery(request, (error: unknown, response: unknown) => {
					if (error) {
						reject(error);
					} else {
						resolve(response);
					}
				});
			});
		});

		return await Promise.allSettled(promises);
	} catch (error: unknown) {
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error';
		grpcLogger.error(
			{ error: errorMessage },
			'Backend client error for allSettled query execution',
		);
		throw error;
	}
}

