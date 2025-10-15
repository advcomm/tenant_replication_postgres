/**
 * MTDD gRPC Handler
 *
 * Automatic gRPC routing for multi-tenant database operations
 */

import type { MtddMeta, SqlResult } from '@/types/mtdd';
import { mtddLogger } from '@/utils/logger';
import { config } from '@/config/configHolder';
import { handleSingleServer } from './handlers/singleServerHandler';
import { handleMultiServer } from './handlers/multiServerHandler';

/**
 * Automatic gRPC MTDD Handler
 * Routes queries to gRPC query servers based on tenant information and deployment type
 *
 * @param meta - MTDD metadata containing tenant and routing information
 * @param queryObject - Knex query object
 * @param sqlResult - SQL result with query and bindings
 * @returns Query result from gRPC execution
 */
export async function grpcMtddHandler(
	meta: MtddMeta,
	queryObject: unknown,
	sqlResult: SqlResult,
): Promise<unknown> {
	mtddLogger.debug('Processing query via gRPC query servers');

	// Single server deployment detection
	const serverList = config.queryServers;
	const isSingleServer = serverList.length === 1;

	// Delegate to appropriate handler based on deployment type
	if (isSingleServer) {
		return handleSingleServer(meta, queryObject, sqlResult);
	}

	// Multi-server MTDD routing
	return handleMultiServer(meta, queryObject, sqlResult);
}
