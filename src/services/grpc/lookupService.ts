/**
 * gRPC Lookup Service
 *
 * Functions for tenant shard mapping and lookup
 * Now using generated protobuf types!
 */

import type { LookupServiceClient } from '@/generated/lookup_grpc_pb';
import type { TenantResponse } from '@/generated/lookup_pb';
import { grpcLogger } from '@/utils/logger';
import { convertTenantResponse, createTenantRequest } from './protoConverters';

/**
 * Function to get tenant shard from lookup service
 * @param lookupClient - Typed lookup service client
 */
export async function getTenantShard(
	lookupClient: LookupServiceClient,
	tenantName: string,
	tenantType: number,
): Promise<number> {
	return new Promise((resolve, reject) => {
		const protoRequest = createTenantRequest(tenantName, tenantType);

		lookupClient.getTenantShard(
			protoRequest,
			(error: Error | null, response: TenantResponse) => {
				if (error) {
					grpcLogger.error(
						{ tenantName, error: error.message },
						'Error getting tenant shard',
					);
					reject(error);
				} else {
					const result = convertTenantResponse(response);
					const shardId = result.shard_index;

					if (shardId === undefined || shardId === null) {
						reject(
							new Error(`Invalid shard response for tenantName ${tenantName}`),
						);
					} else {
						grpcLogger.info({ tenantName, shardId }, 'Tenant mapped to shard');
						resolve(shardId);
					}
				}
			},
		);
	});
}

/**
 * Function to add tenant shard mapping
 * @param lookupClient - Typed lookup service client
 */
export async function addTenantShard(
	lookupClient: LookupServiceClient,
	tenantName: string,
	tenantType: number,
): Promise<unknown> {
	return new Promise((resolve, reject) => {
		const protoRequest = createTenantRequest(tenantName, tenantType);

		lookupClient.addTenantShard(
			protoRequest,
			(error: Error | null, response: TenantResponse) => {
				if (error) {
					grpcLogger.error(
						{ tenantName, tenantType, error: error.message },
						'Error adding tenant shard mapping',
					);
					reject(error);
				} else {
					const result = convertTenantResponse(response);
					grpcLogger.info(
						{ tenantName, tenantType, shardIndex: result.shard_index },
						'Tenant shard mapping added',
					);
					resolve(result);
				}
			},
		);
	});
}
