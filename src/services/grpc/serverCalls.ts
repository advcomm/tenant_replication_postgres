/**
 * gRPC Server Call Functions
 *
 * Functions to execute queries across single or multiple gRPC servers
 */

import { parseResponse } from './utils';
import type { GrpcQueryRequest } from '../../types/grpc';

/**
 * Function to call all servers concurrently and return first valid response (Promise.race implementation)
 * @param clients - gRPC client instances (typed as any[] - gRPC doesn't export client types)
 */
export async function callAllServersRace(
  clients: any[], // gRPC client type not exported
  request: GrpcQueryRequest,
): Promise<unknown> {
  if (clients.length === 0) {
    throw new Error('No backend servers available');
  }

  // Create promises for all gRPC calls
  const promises = clients.map((client: any, index: number) => {
    return new Promise((resolve, reject) => {
      client.executeQuery(request, (error: unknown, response: unknown) => {
        if (error) {
          reject(error);
        } else if (response) {
          const parsedResponse = parseResponse(response);
          resolve(parsedResponse);
        } else {
          reject(new Error(`No valid response from server ${index}`));
        }
      });
    });
  });

  // Use Promise.race to get the first response (success or failure)
  return await Promise.race(promises);
}

/**
 * Function to call all servers and return first successful response (Promise.any implementation)
 * @param clients - gRPC client instances (typed as any[] - gRPC doesn't export client types)
 */
export async function callAllServersAny(
  clients: any[], // gRPC client type not exported
  request: GrpcQueryRequest,
): Promise<unknown> {
  if (clients.length === 0) {
    throw new Error('No backend servers available');
  }

  // Create promises for all gRPC calls
  const promises = clients.map((client: any, index: number) => {
    return new Promise((resolve, reject) => {
      client.executeQuery(request, (error: unknown, response: unknown) => {
        if (error) {
          reject(error);
        } else if (response) {
          const parsedResponse = parseResponse(response);
          resolve(parsedResponse);
        } else {
          reject(new Error(`No valid response from server ${index}`));
        }
      });
    });
  });

  // Use Promise.any to get the first successful response
  try {
    return await Promise.any(promises);
  } catch (error) {
    throw new Error('All servers failed to respond successfully');
  }
}

/**
 * Function to call all servers and wait for all responses (Promise.all implementation)
 * @param clients - gRPC client instances (typed as any[] - gRPC doesn't export client types)
 */
export async function callAllServersAll(
  clients: any[], // gRPC client type not exported
  request: GrpcQueryRequest,
): Promise<unknown[]> {
  if (clients.length === 0) {
    throw new Error('No backend servers available');
  }

  // Create promises for all gRPC calls
  const promises = clients.map((client: any, index: number) => {
    return new Promise((resolve, reject) => {
      client.executeQuery(request, (error: unknown, response: unknown) => {
        if (error) {
          reject(error);
        } else if (response) {
          const parsedResponse = parseResponse(response);
          resolve(parsedResponse);
        } else {
          reject(new Error(`No valid response from server ${index}`));
        }
      });
    });
  });

  // Use Promise.all to wait for all responses
  return await Promise.all(promises);
}

/**
 * Function to call specific server based on TenantID
 * @param clients - gRPC client instances (typed as any[] - gRPC doesn't export client types)
 */
export async function callSpecificServer(
  clients: any[], // gRPC client type not exported
  tenantId: number,
  request: GrpcQueryRequest,
): Promise<unknown> {
  if (clients.length === 0) {
    throw new Error('No backend servers available');
  }

  // Select server based on TenantID modulo number of servers
  const serverIndex = tenantId % clients.length;
  const selectedClient = clients[serverIndex];

  return new Promise((resolve, reject) => {
    selectedClient.executeQuery(request, (error: unknown, response: unknown) => {
      if (error) {
        reject(error);
      } else {
        const parsedResponse = parseResponse(response);
        resolve(parsedResponse);
      }
    });
  });
}

/**
 * Function to call specific server by shard index
 * @param clients - gRPC client instances (typed as any[] - gRPC doesn't export client types)
 */
export async function callSpecificServerByShard(
  clients: any[], // gRPC client type not exported
  shardIndex: number,
  request: GrpcQueryRequest,
): Promise<unknown> {
  if (clients.length === 0) {
    throw new Error('No backend servers available');
  }

  if (shardIndex < 0 || shardIndex >= clients.length) {
    throw new Error(`Invalid shard index ${shardIndex}. Available shards: 0-${clients.length - 1}`);
  }

  const selectedClient = clients[shardIndex];

  return new Promise((resolve, reject) => {
    selectedClient.executeQuery(request, (error: unknown, response: unknown) => {
      if (error) {
        reject(error);
      } else {
        const parsedResponse = parseResponse(response);
        resolve(parsedResponse);
      }
    });
  });
}
