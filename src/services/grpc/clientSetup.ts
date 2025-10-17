/**
 * gRPC Client Setup
 *
 * Client instance creation using generated protobuf types
 */

import * as grpc from '@grpc/grpc-js';
import { config } from '@/config/configHolder';
import { DBServiceClient } from '@/generated/db_grpc_pb';
import { LookupServiceClient } from '@/generated/lookup_grpc_pb';
import {
	createGrpcConnectionOptions,
	createGrpcCredentials,
	queryServers,
} from './config';

// Check for insecure mode
const useInsecure = config.grpcInsecure;

// Create client instances for all gRPC query servers
// Now using generated DBServiceClient with full type safety!
export const clients: DBServiceClient[] = queryServers
	.map((server) => {
		if (!config.isDevelopment && !useInsecure) {
			return new DBServiceClient(
				`${server}`,
				createGrpcCredentials(false),
				createGrpcConnectionOptions(false),
			);
		}
		if (useInsecure) {
			return new DBServiceClient(
				`${server}`,
				createGrpcCredentials(true),
				createGrpcConnectionOptions(true),
			);
		}
		return null;
	})
	.filter((client): client is DBServiceClient => client !== null);

// Create lookup service client instance
const lookupServer = config.lookupServer;

if (!lookupServer) {
	throw new Error(
		'No lookup server configured. Please provide lookupServer in configuration.',
	);
}

const useInsecureLookup = config.grpcInsecure;

// Lookup client with full type safety from generated proto!
export let lookupClient: LookupServiceClient;
if (!config.isDevelopment && !useInsecureLookup) {
	lookupClient = new LookupServiceClient(
		lookupServer,
		createGrpcCredentials(false),
		createGrpcConnectionOptions(false),
	);
} else if (useInsecureLookup) {
	lookupClient = new LookupServiceClient(
		lookupServer,
		createGrpcCredentials(true),
		createGrpcConnectionOptions(true),
	);
} else {
	// Development mode
	lookupClient = new LookupServiceClient(
		`${lookupServer}:50054`,
		grpc.credentials.createInsecure(),
	);
}
