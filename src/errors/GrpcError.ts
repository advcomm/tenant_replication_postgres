/**
 * gRPC Error Class
 *
 * Error class for gRPC-related failures
 */

import { BaseError } from './BaseError';

export class GrpcError extends BaseError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'GRPC_ERROR', 503, context);
  }
}

export class GrpcConnectionError extends BaseError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'GRPC_CONNECTION_ERROR', 503, context);
  }
}

export class GrpcTimeoutError extends BaseError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'GRPC_TIMEOUT_ERROR', 504, context);
  }
}


