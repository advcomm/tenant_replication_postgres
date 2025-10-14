/**
 * gRPC Client Setup
 *
 * Client instance creation and service definitions
 */

import * as grpc from '@grpc/grpc-js';
import {
	createGrpcCredentials,
	createGrpcConnectionOptions,
	backendServers,
} from './config';

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
const useInsecure = process.env.GRPC_INSECURE === 'true';

// Create client instances for all backend servers
// Note: clients typed as 'any[]' because gRPC client types are not exported by @grpc/grpc-js
export const clients: any[] = backendServers.map((server) => {
	if (process.env.NODE_ENV !== 'development' && !useInsecure) {
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
const lookupServerList =
	process.env.NODE_ENV !== 'development'
		? JSON.parse(process.env.LOOKUP_SERVER || '["127.0.0.1"]')
		: ['127.0.0.1'];

if (!lookupServerList) {
	throw new Error(
		'No lookup server configured. Please set LOOKUP_SERVER environment variable.',
	);
}

const useInsecureLookup = process.env.GRPC_INSECURE === 'true';

export let lookupClient: any;
if (process.env.NODE_ENV !== 'development' && !useInsecureLookup) {
	lookupClient = new LookupServiceClient(
		`${lookupServerList[0]}`,
		createGrpcCredentials(false),
		createGrpcConnectionOptions(false),
	);
} else if (useInsecureLookup) {
	lookupClient = new LookupServiceClient(
		`${lookupServerList[0]}`,
		createGrpcCredentials(true),
		createGrpcConnectionOptions(true),
	);
} else {
	// Development mode
	lookupClient = new LookupServiceClient(
		`${lookupServerList[0]}:50054`,
		grpc.credentials.createInsecure(),
	);
}
