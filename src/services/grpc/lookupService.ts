/**
 * gRPC Lookup Service
 *
 * Functions for tenant shard mapping and lookup
 */

import { parseResponse } from './utils';
import type { TenantShardRequest } from '../../types/grpc';

/**
 * Function to get tenant shard from lookup service
 */
export async function getTenantShard(
  lookupClient: any,
  tenantName: string,
  tenantType: number,
): Promise<number> {
  return new Promise((resolve, reject) => {
    const request: TenantShardRequest = { tenantName, tenantType };

    lookupClient.getTenantShard(request, (error: any, response: any) => {
      if (error) {
        console.error(`❌ Error getting tenant shard for tenantName ${tenantName}:`, error.message);
        reject(error);
      } else {
        const parsedResponse = parseResponse(response) as any;
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
 */
export async function addTenantShard(
  lookupClient: any,
  tenantName: string,
  tenantType: number,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const request: TenantShardRequest = { tenantName, tenantType };

    lookupClient.addTenantShard(request, (error: any, response: any) => {
      if (error) {
        console.error(
          `❌ Error adding tenant shard mapping for tenantName ${tenantName}:`,
          error.message,
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

