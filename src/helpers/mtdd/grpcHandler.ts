/**
 * MTDD gRPC Handler
 *
 * Automatic gRPC routing for multi-tenant database operations
 */

import type { MtddMeta, SqlResult } from '../../types/mtdd';
import { BackendClient } from '../../services/grpcClient';
import { mtddLogger } from '../../utils/logger';
import { config } from '../../config/configHolder';

/**
 * Automatic gRPC MTDD Handler
 * Routes queries to gRPC backend servers based on tenant information
 */
export async function grpcMtddHandler(
	meta: MtddMeta,
	queryObject: unknown,
	sqlResult: SqlResult,
): Promise<unknown> {
	mtddLogger.debug('Processing query via gRPC backend');

	// Single server deployment detection
	const serverList = config.backendServers;
	const isSingleServer = serverList.length === 1;

	if (isSingleServer) {
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

			let result;
			if (executeOnAllServers) {
				mtddLogger.debug(
					'Executing on single server (acting as "all servers")',
				);
				result = await BackendClient.executeQueryAll(
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
				result = await BackendClient.executeQuery(
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

	// Multi-server MTDD routing (existing logic)
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

		let result;

		if (!executeOnAllServers && tenantName) {
			// Determine tenant type to use
			let tenantTypeToUse = 1; // default
			if (meta.tenantType !== undefined && meta.tenantType !== null) {
				tenantTypeToUse =
					typeof meta.tenantType === 'string'
						? parseInt(meta.tenantType) || 1
						: meta.tenantType;
			}

			if (shouldAddTenantShard) {
				mtddLogger.debug(
					{ tenant: tenantNameStr },
					'Add tenant operation detected - adding tenant shard first',
				);
				try {
					// Add tenant shard mapping first
					await BackendClient.addTenantShard(tenantNameStr, tenantTypeToUse);
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
			result = await BackendClient.executeQuery(
				sqlResult.sql,
				sqlResult.bindings || [],
				tenantNameStr,
			);
		} else {
			// Execute query on all servers when no tenant specified or allServers flag is set
			mtddLogger.debug('Executing query on all servers (chain end execution)');
			result = await BackendClient.executeQueryAll(
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
