/**
 * gRPC Server Call Functions
 *
 * Functions to execute queries across single or multiple gRPC servers
 * Now using generated protobuf types for full type safety!
 */

import type { DBServiceClient } from '@/generated/db_grpc_pb';
import type { StoredProcResponse } from '@/generated/db_pb';
import type { GrpcQueryRequest } from '@/types/grpc';
import { convertQueryResponse, createQueryRequest } from './protoConverters';

/**
 * Function to call all servers concurrently and return first valid response (Promise.race)
 * @param clients - Typed DB service clients
 */
export async function callAllServersRace(
	clients: DBServiceClient[],
	request: GrpcQueryRequest,
): Promise<unknown> {
	if (clients.length === 0) {
		throw new Error('No backend servers available');
	}

	const protoRequest = createQueryRequest(request);

	// Create promises for all gRPC calls
	const promises = clients.map((client, index: number) => {
		return new Promise((resolve, reject) => {
			client.executeQuery(
				protoRequest,
				(error: Error | null, response: StoredProcResponse) => {
					if (error) {
						reject(error);
					} else if (response) {
						const result = convertQueryResponse(response);
						resolve(result);
					} else {
						reject(new Error(`No valid response from server ${index}`));
					}
				},
			);
		});
	});

	// Use Promise.race to get the first response (success or failure)
	return await Promise.race(promises);
}

/**
 * Function to call all servers and return first successful response (Promise.any)
 * @param clients - Typed DB service clients
 */
export async function callAllServersAny(
	clients: DBServiceClient[],
	request: GrpcQueryRequest,
): Promise<unknown> {
	if (clients.length === 0) {
		throw new Error('No backend servers available');
	}

	const protoRequest = createQueryRequest(request);

	// Create promises for all gRPC calls
	const promises = clients.map((client, index: number) => {
		return new Promise((resolve, reject) => {
			client.executeQuery(
				protoRequest,
				(error: Error | null, response: StoredProcResponse) => {
					if (error) {
						reject(error);
					} else if (response) {
						const result = convertQueryResponse(response);
						resolve(result);
					} else {
						reject(new Error(`No valid response from server ${index}`));
					}
				},
			);
		});
	});

	// Use Promise.any to get the first successful response
	try {
		return await Promise.any(promises);
	} catch (_error) {
		throw new Error('All servers failed to respond successfully');
	}
}

/**
 * Function to call all servers and wait for all responses (Promise.all)
 * @param clients - Typed DB service clients
 */
export async function callAllServersAll(
	clients: DBServiceClient[],
	request: GrpcQueryRequest,
): Promise<unknown[]> {
	if (clients.length === 0) {
		throw new Error('No backend servers available');
	}

	const protoRequest = createQueryRequest(request);

	// Create promises for all gRPC calls
	const promises = clients.map((client, index: number) => {
		return new Promise((resolve, reject) => {
			client.executeQuery(
				protoRequest,
				(error: Error | null, response: StoredProcResponse) => {
					if (error) {
						reject(error);
					} else if (response) {
						const result = convertQueryResponse(response);
						resolve(result);
					} else {
						reject(new Error(`No valid response from server ${index}`));
					}
				},
			);
		});
	});

	// Use Promise.all to get all responses
	return await Promise.all(promises);
}

/**
 * Function to call a specific server by tenant ID hash
 * @param clients - Typed DB service clients
 * @param tenantId - Tenant identifier for hash-based routing
 */
export async function callSpecificServer(
	clients: DBServiceClient[],
	tenantId: number,
	request: GrpcQueryRequest,
): Promise<unknown> {
	if (clients.length === 0) {
		throw new Error('No backend servers available');
	}

	const protoRequest = createQueryRequest(request);

	// Simple hash-based server selection
	const serverIndex = tenantId % clients.length;
	const selectedClient = clients[serverIndex];

	return new Promise((resolve, reject) => {
		selectedClient.executeQuery(
			protoRequest,
			(error: Error | null, response: StoredProcResponse) => {
				if (error) {
					reject(error);
				} else if (response) {
					const result = convertQueryResponse(response);
					resolve(result);
				} else {
					reject(new Error(`No valid response from server ${serverIndex}`));
				}
			},
		);
	});
}

/**
 * Function to call a specific server by shard index
 * @param clients - Typed DB service clients
 * @param shardIndex - Direct shard index to target
 */
export async function callSpecificServerByShard(
	clients: DBServiceClient[],
	shardIndex: number,
	request: GrpcQueryRequest,
): Promise<unknown> {
	if (clients.length === 0) {
		throw new Error('No backend servers available');
	}

	if (shardIndex < 0 || shardIndex >= clients.length) {
		throw new Error(
			`Invalid shard index ${shardIndex}. Valid range: 0-${clients.length - 1}`,
		);
	}

	const protoRequest = createQueryRequest(request);
	const selectedClient = clients[shardIndex];

	return new Promise((resolve, reject) => {
		selectedClient.executeQuery(
			protoRequest,
			(error: Error | null, response: StoredProcResponse) => {
				if (error) {
					reject(error);
				} else if (response) {
					const result = convertQueryResponse(response);
					resolve(result);
				} else {
					reject(new Error(`No valid response from shard ${shardIndex}`));
				}
			},
		);
	});
}
