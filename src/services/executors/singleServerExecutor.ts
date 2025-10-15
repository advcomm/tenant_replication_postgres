/**
 * Single Server Executor
 *
 * Handles query execution for single-server deployments (simplified routing)
 */

import { grpcLogger } from '@/utils/logger';
import { processQueryParameters } from '@/services/grpc/queryUtils';
import { convertBigIntToString } from '@/services/grpc/utils';
import { queryServers } from '@/services/grpc/config';
import { clients } from '@/services/grpc/clientSetup';
import type { SqlParameters } from '@/types';

/**
 * Execute query on single server
 * Optimized path for single-server deployments
 */
export async function executeSingleServer(
	query: string,
	valuesOrBindings: SqlParameters = {},
): Promise<unknown> {
	grpcLogger.debug(
		{ server: queryServers[0] },
		'Simplified routing - executing on single query server',
	);

	const { query: processedQuery, params } = processQueryParameters(
		query,
		valuesOrBindings,
		'SINGLE-SERVER',
	);

	const convertedParams = convertBigIntToString(params) as unknown[];
	const request = {
		query: processedQuery,
		params: convertedParams || [],
	};

	try {
		grpcLogger.debug(
			{ server: queryServers[0] },
			'Executing query directly on single query server',
		);
		const selectedClient = clients[0];

		return new Promise((resolve, reject) => {
			selectedClient.executeQuery(
				request,
				(error: unknown, response: unknown) => {
					if (error) {
						const errorMessage =
							error instanceof Error ? error.message : 'Unknown error';
						grpcLogger.error(
							{ error: errorMessage },
							'Single server query execution failed',
						);
						reject(error);
					} else {
						const parsedResponse = response;
						grpcLogger.debug('Single server query executed successfully');
						resolve(parsedResponse);
					}
				},
			);
		});
	} catch (error: unknown) {
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error';
		grpcLogger.error(
			{ error: errorMessage },
			'Single server query execution failed',
		);
		throw error;
	}
}
