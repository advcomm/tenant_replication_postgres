/**
 * gRPC Client Setup
 *
 * Client instance creation using generated protobuf types
 * Uses lazy initialization to avoid module-load-time configuration access
 */

import * as grpc from '@grpc/grpc-js';
import { config } from '@/config/configHolder';
import { DBServiceClient } from '@/generated/db_grpc_pb';
import { LookupServiceClient } from '@/generated/lookup_grpc_pb';
import { grpcLogger } from '@/utils/logger';
import {
	createGrpcConnectionOptions,
	createGrpcCredentials,
	getQueryServers,
	logGrpcConfig,
} from './config';

// Lazy initialization flag
let clientsInitialized = false;
let lookupInitialized = false;

// Storage for initialized clients
let _clients: DBServiceClient[] = [];
let _lookupClient: LookupServiceClient | null = null;

/**
 * Initialize query server clients (lazy)
 * Only called when clients are first accessed
 */
function initializeClients(): DBServiceClient[] {
	if (clientsInitialized) {
		return _clients;
	}

	// Log configuration on first initialization
	logGrpcConfig();

	const useInsecure = config.grpcInsecure;
	const servers = getQueryServers();

	// Validate configuration
	if (!servers || servers.length === 0) {
		throw new Error(
			'No query servers configured. Please provide queryServers in configuration or set QUERY_SERVERS environment variable.',
		);
	}

	// Debug logging
	grpcLogger.info(
		{
			useInsecure,
			env: process.env.GRPC_INSECURE,
			serverCount: servers.length,
		},
		'Initializing gRPC clients with insecure mode',
	);

	_clients = servers
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

	clientsInitialized = true;
	return _clients;
}

/**
 * Initialize lookup client (lazy)
 * Only called when lookup client is first accessed
 */
function initializeLookupClient(): LookupServiceClient {
	if (lookupInitialized && _lookupClient) {
		return _lookupClient;
	}

	const lookupServer = config.lookupServer;

	if (!lookupServer) {
		throw new Error(
			'No lookup server configured. Please provide lookupServer in configuration.',
		);
	}

	const useInsecureLookup = config.grpcInsecure;

	// Debug logging
	grpcLogger.info(
		{ useInsecureLookup, env: process.env.GRPC_INSECURE },
		'Initializing lookup client with insecure mode',
	);

	// Create lookup client with full type safety from generated proto!
	if (!config.isDevelopment && !useInsecureLookup) {
		_lookupClient = new LookupServiceClient(
			lookupServer,
			createGrpcCredentials(false),
			createGrpcConnectionOptions(false),
		);
	} else if (useInsecureLookup) {
		_lookupClient = new LookupServiceClient(
			lookupServer,
			createGrpcCredentials(true),
			createGrpcConnectionOptions(true),
		);
	} else {
		// Development mode
		_lookupClient = new LookupServiceClient(
			`${lookupServer}:50054`,
			grpc.credentials.createInsecure(),
		);
	}

	lookupInitialized = true;
	return _lookupClient;
}

/**
 * Get query server clients
 */
export function getClients(): DBServiceClient[] {
	return initializeClients();
}

/**
 * Get lookup client
 */
export function getLookupClient(): LookupServiceClient {
	return initializeLookupClient();
}
