/**
 * gRPC Client Setup
 *
 * Client instance creation and service definitions
 */

import * as grpc from '@grpc/grpc-js';
import {
	createGrpcCredentials,
	createGrpcConnectionOptions,
	queryServers,
} from './config';
import { config } from '@/config/configHolder';

// Manual gRPC service definition for database operations
// Note: serialization functions use 'any' as required by @grpc/grpc-js API
const dbServiceDefinition = {
	executeQuery: {
		path: '/DB.DBService/executeQuery',
		requestStream: false,
		responseStream: false,
		requestSerialize: (value: any) => Buffer.from(JSON.stringify(value)), // gRPC API requires any
		requestDeserialize: (buffer: Buffer) => JSON.parse(buffer.toString()),
		responseSerialize: (value: any) => Buffer.from(JSON.stringify(value)), // gRPC API requires any
		responseDeserialize: (buffer: Buffer) => JSON.parse(buffer.toString()),
	},
	listenToChannel: {
		path: '/DB.DBService/listenToChannel',
		requestStream: false,
		responseStream: true, // This enables streaming responses
		requestSerialize: (value: any) => Buffer.from(JSON.stringify(value)), // gRPC API requires any
		requestDeserialize: (buffer: Buffer) => JSON.parse(buffer.toString()),
		responseSerialize: (value: any) => Buffer.from(JSON.stringify(value)), // gRPC API requires any
		responseDeserialize: (buffer: Buffer) => JSON.parse(buffer.toString()),
	},
};

// Lookup service definition for tenant shard mapping
// Note: serialization functions use 'any' as required by @grpc/grpc-js API
const lookupServiceDefinition = {
	getTenantShard: {
		path: '/MTDD.LookupService/getTenantShard',
		requestStream: false,
		responseStream: false,
		requestSerialize: (value: any) => Buffer.from(JSON.stringify(value)), // gRPC API requires any
		requestDeserialize: (buffer: Buffer) => JSON.parse(buffer.toString()),
		responseSerialize: (value: any) => Buffer.from(JSON.stringify(value)), // gRPC API requires any
		responseDeserialize: (buffer: Buffer) => JSON.parse(buffer.toString()),
	},
	addTenantShard: {
		path: '/MTDD.LookupService/addTenantShard',
		requestStream: false,
		responseStream: false,
		requestSerialize: (value: any) => Buffer.from(JSON.stringify(value)), // gRPC API requires any
		requestDeserialize: (buffer: Buffer) => JSON.parse(buffer.toString()),
		responseSerialize: (value: any) => Buffer.from(JSON.stringify(value)), // gRPC API requires any
		responseDeserialize: (buffer: Buffer) => JSON.parse(buffer.toString()),
	},
};

// Create gRPC client constructors
const DBServiceClient = grpc.makeGenericClientConstructor(
	dbServiceDefinition,
	'DB',
);
const LookupServiceClient = grpc.makeGenericClientConstructor(
	lookupServiceDefinition,
	'MTDD',
);

// Check for insecure mode
const useInsecure = config.grpcInsecure;

// Create client instances for all gRPC query servers
// Note: clients typed as 'any[]' because gRPC client types are not exported by @grpc/grpc-js
export const clients: any[] = queryServers.map((server) => {
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
	return undefined;
});

// Create lookup service client instance
const lookupServer = config.lookupServer;

if (!lookupServer) {
	throw new Error(
		'No lookup server configured. Please provide lookupServer in configuration.',
	);
}

const useInsecureLookup = config.grpcInsecure;

export let lookupClient: any;
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
