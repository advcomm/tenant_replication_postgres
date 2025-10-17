/**
 * gRPC Configuration
 *
 * Client setup and connection configuration for gRPC query servers
 */

import * as grpc from '@grpc/grpc-js';
import { config } from '@/config/configHolder';
import {
	DEFAULT_AUTHORITY,
	GRPC_MAX_MESSAGE_SIZE,
	GRPC_SSL_CERTIFICATE,
	SSL_TARGET_OVERRIDE,
} from '@/constants/grpc';
import type { GrpcConnectionOptions } from '@/types/grpc';
import { grpcLogger } from '@/utils/logger';

// gRPC query servers configuration from config holder
export const queryServers = config.queryServers;

// Single server deployment detection
export const IS_SINGLE_SERVER_DEPLOYMENT = queryServers.length === 1;

// Log configuration in non-development mode
if (!config.isDevelopment) {
	grpcLogger.info(
		{ serverCount: queryServers.length, servers: queryServers },
		'gRPC query servers configuration loaded',
	);
	grpcLogger.info(
		{
			mode: IS_SINGLE_SERVER_DEPLOYMENT
				? 'Single Server (Simplified)'
				: 'Multi-Server (MTDD)',
			isSingleServer: IS_SINGLE_SERVER_DEPLOYMENT,
		},
		'Deployment mode configured',
	);

	if (IS_SINGLE_SERVER_DEPLOYMENT) {
		grpcLogger.info('Single query server detected - using simplified routing');
	}
}

/**
 * Create gRPC connection options
 */
export function createGrpcConnectionOptions(
	useInsecure: boolean = false,
): GrpcConnectionOptions {
	const options: GrpcConnectionOptions = {
		'grpc.max_receive_message_length': GRPC_MAX_MESSAGE_SIZE,
		'grpc.max_send_message_length': GRPC_MAX_MESSAGE_SIZE,
	};

	if (!useInsecure) {
		options['grpc.ssl_target_name_override'] = SSL_TARGET_OVERRIDE;
		options['grpc.default_authority'] = DEFAULT_AUTHORITY;
	}

	return options;
}

/**
 * Create gRPC credentials
 */
export function createGrpcCredentials(
	useInsecure: boolean = false,
): grpc.ChannelCredentials {
	if (useInsecure) {
		return grpc.credentials.createInsecure();
	}
	return grpc.credentials.createSsl(Buffer.from(GRPC_SSL_CERTIFICATE));
}
