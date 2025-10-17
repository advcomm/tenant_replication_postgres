/**
 * Library Configuration Type Definitions
 *
 * Types for configuring the tenant replication library
 * (Future: Will replace process.env usage - see LIBRARY_DESIGN_DECISIONS.md)
 */

import type { FirebaseConfig } from '@/helpers/clients/types';

/**
 * Database Configuration
 */
export interface DatabaseConfig {
	host: string;
	port: number;
	user: string;
	password: string;
	database: string;
	pool?: {
		min: number;
		max: number;
	};
}

/**
 * MTDD Configuration
 * Configuration for Multi-Tenant Database Deployment query routing
 */
export interface MtddBackendConfig {
	/**
	 * Enable MTDD gRPC routing
	 * If false, queries execute on local Knex connection (standard pg)
	 * If true, queries route through gRPC servers
	 *
	 * Set via environment variable: USE_MTDD=1 (enable) or USE_MTDD=0 (disable)
	 *
	 * @default false (reads from process.env.USE_MTDD)
	 */
	useMtdd?: boolean;

	/**
	 * List of gRPC query server addresses (host:port)
	 * Required when useMtdd=true
	 *
	 * @example ['query-server1:50051', 'query-server2:50051']
	 */
	queryServers?: string[];

	/**
	 * gRPC lookup server address (host:port)
	 * Required when useMtdd=true
	 *
	 * @example 'lookup-server:50054'
	 */
	lookupServer?: string;

	/**
	 * Whether running in development mode
	 * Controls log levels, SSL defaults, and pretty formatting
	 *
	 * @default false (reads from process.env.NODE_ENV)
	 */
	isDevelopment?: boolean;
}

/**
 * Portal Configuration
 */
export interface PortalConfig {
	tenantColumnName?: string;
	[key: string]: unknown;
}

/**
 * Library Configuration (Future API)
 * This will be used when refactoring away from process.env
 */
export interface LibraryConfig {
	mtdd?: MtddBackendConfig;
	database?: {
		enabled: boolean;
		config: DatabaseConfig;
	};
	firebase?: FirebaseConfig;
	portal?: PortalConfig;
}
