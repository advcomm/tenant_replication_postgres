/**
 * Multi-Server MTDD Handler
 *
 * Complex routing for multi-server gRPC deployments with tenant shard lookup
 */

import type { MtddMeta, SqlResult } from '@/types/mtdd';
import { GrpcQueryClient } from '@/services/grpcClient';
import { mtddLogger } from '@/utils/logger';

/**
 * Handle MTDD routing for multi-server deployments
 * Performs tenant shard lookups and routes to appropriate servers
 *
 * @param meta - MTDD metadata
 * @param queryObject - Knex query object
 * @param sqlResult - SQL result with bindings
 * @returns Query result from gRPC execution
 */
export async function handleMultiServer(
	meta: MtddMeta,
	_queryObject: unknown,
	sqlResult: SqlResult,
): Promise<unknown> {
	const tenantName = meta.tenantId || meta.tenantName;
	const tenantNameStr =
		typeof tenantName === 'string' ? tenantName : String(tenantName);
	const executeOnAllServers = meta.allServers === true || !tenantName;

	if (executeOnAllServers) {
		mtddLogger.debug('Executing on all servers (chain end execution)');
	} else {
		mtddLogger.debug(
			{ tenant: tenantNameStr },
			'Routing to specific tenant shard',
		);
	}

	try {
		mtddLogger.debug(
			{
				sql: sqlResult.sql,
				bindings: sqlResult.bindings,
				target: executeOnAllServers ? 'All Servers' : `Tenant ${tenantNameStr}`,
			},
			'MTDD query routing',
		);

		// Check the methodType and tenantType to determine action
		const shouldAddTenantShard =
			meta.methodType === 'addTenantShard' ||
			meta.tenantType === null ||
			meta.operation?.toLowerCase().includes('add-tenant') ||
			meta.operation?.toLowerCase().includes('create-tenant') ||
			meta.operation?.toLowerCase().includes('addtenant') ||
			meta.operation?.toLowerCase().includes('createtenant') ||
			(sqlResult.sql.toLowerCase().includes('insert') &&
				(sqlResult.sql.toLowerCase().includes('tenant') ||
					sqlResult.sql.toLowerCase().includes('tenants'))) ||
			(meta.operationType === 'write' &&
				meta.operation?.toLowerCase().includes('tenant'));

		let result: unknown;

		if (!executeOnAllServers && tenantName) {
			// Determine tenant type to use
			let tenantTypeToUse = 1; // default
			if (meta.tenantType !== undefined && meta.tenantType !== null) {
				tenantTypeToUse =
					typeof meta.tenantType === 'string'
						? parseInt(meta.tenantType, 10) || 1
						: meta.tenantType;
			}

			if (shouldAddTenantShard) {
				mtddLogger.debug(
					{ tenant: tenantNameStr },
					'Add tenant operation detected - adding tenant shard first',
				);
				try {
					// Add tenant shard mapping first
					await GrpcQueryClient.addTenantShard(tenantNameStr, tenantTypeToUse);
					mtddLogger.info(
						{ tenant: tenantNameStr, tenantType: tenantTypeToUse },
						'Tenant shard mapping added',
					);
				} catch (error: unknown) {
					const errorMessage =
						error instanceof Error ? error.message : 'Unknown error';
					mtddLogger.warn(
						{ tenant: tenantNameStr, error: errorMessage },
						'Could not add tenant shard (may already exist)',
					);
					// Continue with query execution even if tenant shard addition fails
				}
			}

			// Execute query on specific shard for the tenant
			mtddLogger.debug(
				{ tenant: tenantNameStr },
				'Executing query on specific shard',
			);
			result = await GrpcQueryClient.executeQuery(
				sqlResult.sql,
				sqlResult.bindings || [],
				tenantNameStr,
			);
		} else {
			// Execute query on all servers when no tenant specified or allServers flag is set
			mtddLogger.debug('Executing query on all servers (chain end execution)');
			result = await GrpcQueryClient.executeQueryAll(
				sqlResult.sql,
				sqlResult.bindings || [],
			);
		}

		mtddLogger.debug(
			{
				resultType: Array.isArray(result)
					? `${result.length} rows`
					: 'Non-array result',
			},
			'Query executed successfully via gRPC',
		);

		return result;
	} catch (error) {
		mtddLogger.error(
			{ error: (error as Error).message },
			'Error executing query via gRPC',
		);
		throw error;
	}
}
