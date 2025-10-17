/**
 * Single Server MTDD Handler
 *
 * Simplified routing for single gRPC query server deployments
 */

import { config } from '@/config/configHolder';
import { GrpcQueryClient } from '@/services/grpcClient';
import type { MtddMeta, SqlResult } from '@/types/mtdd';
import { mtddLogger } from '@/utils/logger';

/**
 * Handle MTDD routing for single server deployments
 * Uses simplified routing without complex shard lookups
 *
 * @param meta - MTDD metadata
 * @param queryObject - Knex query object
 * @param sqlResult - SQL result with bindings
 * @returns Query result from gRPC execution
 */
export async function handleSingleServer(
	meta: MtddMeta,
	_queryObject: unknown,
	sqlResult: SqlResult,
): Promise<unknown> {
	const serverList = config.queryServers;

	mtddLogger.info(
		{ server: serverList[0] },
		'Single server deployment detected - using simplified routing',
	);

	mtddLogger.debug(
		{ sql: sqlResult.sql, bindings: sqlResult.bindings },
		'Single server query',
	);

	try {
		// For single server, determine if tenant-specific or all-server execution
		const tenantName = meta.tenantId || meta.tenantName;
		const executeOnAllServers = meta.allServers === true || !tenantName;

		let result: unknown;
		if (executeOnAllServers) {
			mtddLogger.debug('Executing on single server (acting as "all servers")');
			result = await GrpcQueryClient.executeQueryAll(
				sqlResult.sql,
				sqlResult.bindings || [],
			);
		} else {
			mtddLogger.debug(
				{ tenantName },
				'Executing tenant-specific query on single server',
			);
			const tenantNameStr =
				typeof tenantName === 'string' ? tenantName : String(tenantName);
			result = await GrpcQueryClient.executeQuery(
				sqlResult.sql,
				sqlResult.bindings || [],
				tenantNameStr,
			);
		}

		mtddLogger.debug('Single server gRPC query executed successfully');
		return result;
	} catch (error: unknown) {
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error';
		mtddLogger.error(
			{ error: errorMessage },
			'Single server gRPC query execution failed',
		);
		throw error;
	}
}
