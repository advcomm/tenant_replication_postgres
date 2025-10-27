/**
 * Errors Index
 *
 * Central export point for all custom error classes
 */

// Base error
export { BaseError } from './BaseError';

// gRPC errors
export { GrpcConnectionError, GrpcError, GrpcTimeoutError } from './GrpcError';

// MTDD errors
export {
	MtddError,
	ShardNotFoundError,
	TenantNotFoundError,
} from './MtddError';

// Validation errors
export {
	AuthenticationError,
	AuthorizationError,
	ValidationError,
} from './ValidationError';
