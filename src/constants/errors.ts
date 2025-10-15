/**
 * Error Message Constants
 *
 * Standardized error messages used throughout the library
 */

// Firebase Errors
export const ERROR_FIREBASE_NOT_INITIALIZED =
	'Firebase not initialized. Call InitializeFirebase() first.';
export const ERROR_FIREBASE_CONFIG_INVALID =
	'Invalid Firebase configuration provided.';
export const ERROR_FIREBASE_CONFIG_FILE_NOT_FOUND =
	'Firebase config file not found at specified path.';
export const ERROR_FIREBASE_CONFIG_ENV_INVALID =
	'Invalid Firebase config in environment variable.';

// gRPC Errors
export const ERROR_NO_QUERY_SERVERS = 'No gRPC query servers available.';
export const ERROR_NO_QUERY_SERVERS_CONFIG =
	'No gRPC query servers configured. Please provide queryServers in configuration or set QUERY_SERVERS environment variable.';
export const ERROR_NO_LOOKUP_SERVER =
	'No lookup server configured. Please provide lookupServer in configuration or set LOOKUP_SERVER environment variable.';
export const ERROR_INVALID_SHARD_INDEX = 'Invalid shard index';
export const ERROR_INVALID_SHARD_RESPONSE = 'Invalid shard response for tenant';
export const ERROR_ALL_SERVERS_FAILED =
	'All servers failed to respond successfully.';

// Database Errors
export const ERROR_DATABASE_DISABLED = 'Database is disabled.';
export const ERROR_QUERY_EXECUTION_FAILED = 'Query execution failed.';

// Validation Errors
export const ERROR_MISSING_AUTHORIZATION = 'Authorization required.';
export const ERROR_INVALID_TOKEN = 'Invalid authentication token.';
export const ERROR_MISSING_PARAMETERS = 'Missing required parameters';

// Generic Errors
export const ERROR_OPERATION_FAILED = 'Operation failed';
export const ERROR_NOT_IMPLEMENTED = 'Not implemented';
