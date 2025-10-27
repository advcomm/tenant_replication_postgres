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

/**
 * Get query servers
 */
export function getQueryServers(): string[] {
	return config.queryServers;
}

/**
 * Detect single server deployment
 */
export function isSingleServerDeployment(): boolean {
	return getQueryServers().length === 1;
}

// Log configuration when first accessed
let configLogged = false;

export function logGrpcConfig(): void {
	if (!configLogged && !config.isDevelopment) {
		const servers = getQueryServers();
		const isSingle = isSingleServerDeployment();

		grpcLogger.info(
			{ serverCount: servers.length, servers: servers },
			'gRPC query servers configuration loaded',
		);

		grpcLogger.info(
			{
				mode: isSingle ? 'Single Server (Simplified)' : 'Multi-Server (MTDD)',
				isSingleServer: isSingle,
			},
			'Deployment mode configured',
		);

		if (isSingle) {
			grpcLogger.info(
				'Single query server detected - using simplified routing',
			);
		}

		configLogged = true;
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
