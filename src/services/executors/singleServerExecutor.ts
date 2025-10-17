/**
 * Single Server Executor
 *
 * Handles query execution for single-server deployments (simplified routing)
 * Now using generated protobuf types!
 */

import type { QueryResponse } from '@/generated/db_pb';
import { clients } from '@/services/grpc/clientSetup';
import { queryServers } from '@/services/grpc/config';
import {
	convertQueryResponse,
	createQueryRequest,
} from '@/services/grpc/protoConverters';
import { processQueryParameters } from '@/services/grpc/queryUtils';
import { convertBigIntToString } from '@/services/grpc/utils';
import type { GrpcQueryRequest, SqlParameters } from '@/types';
import { grpcLogger } from '@/utils/logger';

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
	const request: GrpcQueryRequest = {
		query: processedQuery,
		params: convertedParams || [],
	};

	const selectedClient = clients[0];
	const protoRequest = createQueryRequest(request);

	try {
		grpcLogger.debug(
			{ server: queryServers[0] },
			'Executing query directly on single query server',
		);

		return new Promise((resolve, reject) => {
			selectedClient.executeQuery(
				protoRequest,
				(error: Error | null, response: QueryResponse) => {
					if (error) {
						grpcLogger.error(
							{ error: error.message },
							'Single server query execution failed',
						);
						reject(error);
					} else {
						const result = convertQueryResponse(response);
						grpcLogger.debug('Single server query executed successfully');
						resolve(result);
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
