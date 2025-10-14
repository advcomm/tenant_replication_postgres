/**
 * gRPC Lookup Service
 *
 * Functions for tenant shard mapping and lookup
 */

import { parseResponse } from './utils';
import type { TenantShardRequest } from '../../types/grpc';

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
        console.error(`❌ Error getting tenant shard for tenantName ${tenantName}:`, errorMessage);
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
          console.log(`📍 Tenant ${tenantName} mapped to shard ${shardId}`);
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
        console.error(
          `❌ Error adding tenant shard mapping for tenantName ${tenantName}:`,
          errorMessage,
        );
        reject(error);
      } else {
        const parsedResponse = parseResponse(response);
        console.log(`✅ Added tenant ${tenantName} to shard ${tenantType}`);
        resolve(parsedResponse);
      }
    });
  });
}
