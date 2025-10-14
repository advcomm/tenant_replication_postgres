/**
 * gRPC Configuration
 *
 * Client setup and connection configuration for gRPC services
 */

import * as grpc from '@grpc/grpc-js';
import {
  GRPC_SSL_CERTIFICATE,
  SSL_TARGET_OVERRIDE,
  DEFAULT_AUTHORITY,
  GRPC_MAX_MESSAGE_SIZE,
} from '../../constants/grpc';
import type { GrpcConnectionOptions } from '../../types/grpc';

// Backend servers configuration
export const backendServers: string[] = [];

// Load from environment or use defaults
if (process.env.NODE_ENV !== 'development') {
  const serverList = JSON.parse(process.env.BACKEND_SERVERS || '[]');
  if (serverList) {
    backendServers.push(...serverList);
  } else {
    throw new Error(
      'No backend servers configured. Please set BACKEND_SERVERS environment variable.',
    );
  }
} else {
  const serverList = JSON.parse(process.env.BACKEND_SERVERS || '["127.0.0.1"]');
  backendServers.push(...serverList);
}

// Single server deployment detection
export const IS_SINGLE_SERVER_DEPLOYMENT = backendServers.length === 1;

if (process.env.NODE_ENV !== 'development') {
  console.log(`🏗️  [GRPC-CONFIG] Backend Servers: ${backendServers.length} server(s)`);
  console.log(`🏗️  [GRPC-CONFIG] Servers: ${backendServers.join(', ')}`);
  console.log(
    `🏗️  [GRPC-CONFIG] Deployment Mode: ${IS_SINGLE_SERVER_DEPLOYMENT ? 'Single Server (Simplified)' : 'Multi-Server (MTDD)'}`,
  );

  if (IS_SINGLE_SERVER_DEPLOYMENT) {
    console.log(
      `🎯 [GRPC-CONFIG] Single server detected - MTDD optimizations will be bypassed for simplified routing`,
    );
  }
}

/**
 * Create gRPC connection options
 */
export function createGrpcConnectionOptions(useInsecure: boolean = false): GrpcConnectionOptions {
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
export function createGrpcCredentials(useInsecure: boolean = false): grpc.ChannelCredentials {
  if (useInsecure) {
    return grpc.credentials.createInsecure();
  }
  return grpc.credentials.createSsl(Buffer.from(GRPC_SSL_CERTIFICATE));
}
