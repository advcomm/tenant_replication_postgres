/**
 * gRPC Lookup Service
 *
 * Functions for tenant shard mapping and lookup
 */

import { parseResponse } from './utils';
import type { TenantShardRequest } from '../../types/grpc';
import { grpcLogger } from '../../utils/logger';

/**
 * Function to get tenant shard from lookup service
 * @param lookupClient - gRPC lookup client (typed as any - gRPC doesn't export client types)
 */
export async function getTenantShard(
  lookupClient: any, // gRPC client type not exported
  tenantName: string,
  tenantType: number,
): Promise<number> {
  return new Promise((resolve, reject) => {
    const request: TenantShardRequest = { tenantName, tenantType };

    lookupClient.getTenantShard(request, (error: unknown, response: unknown) => {
      if (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        grpcLogger.error({ tenantName, error: errorMessage }, 'Error getting tenant shard');
        reject(error);
      } else {
        const parsedResponse = parseResponse(response) as { rows: Array<{ shard_idx: number }> };
        const shardId = parsedResponse.rows?.[0]?.shard_idx;

        if (shardId === undefined || shardId === null) {
          reject(
            new Error(
              `Invalid shard response for tenantName ${tenantName}: ${JSON.stringify(parsedResponse)}`,
            ),
          );
        } else {
          grpcLogger.info({ tenantName, shardId }, 'Tenant mapped to shard');
          resolve(shardId);
        }
      }
    });
  });
}

/**
 * Function to add tenant shard mapping
 * @param lookupClient - gRPC lookup client (typed as any - gRPC doesn't export client types)
 */
export async function addTenantShard(
  lookupClient: any, // gRPC client type not exported
  tenantName: string,
  tenantType: number,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const request: TenantShardRequest = { tenantName, tenantType };

    lookupClient.addTenantShard(request, (error: unknown, response: unknown) => {
      if (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        grpcLogger.error(
          { tenantName, tenantType, error: errorMessage },
          'Error adding tenant shard mapping',
        );
        reject(error);
      } else {
        const parsedResponse = parseResponse(response);
        grpcLogger.info({ tenantName, tenantType }, 'Tenant shard mapping added');
        resolve(parsedResponse);
      }
    });
  });
}
