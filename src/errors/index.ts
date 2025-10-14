/**
 * Errors Index
 *
 * Central export point for all custom error classes
 */

// Base error
export { BaseError } from './BaseError';

// gRPC errors
export { GrpcError, GrpcConnectionError, GrpcTimeoutError } from './GrpcError';

// MTDD errors
export { MtddError, TenantNotFoundError, ShardNotFoundError } from './MtddError';

// Validation errors
export {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
} from './ValidationError';


