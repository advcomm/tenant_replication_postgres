/**
 * Library Configuration Type Definitions
 *
 * Types for configuring the tenant replication library
 * (Future: Will replace process.env usage - see LIBRARY_DESIGN_DECISIONS.md)
 */

import type { Knex } from 'knex';
import type { FirebaseConfig } from '@/helpers/clients/types';

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
	 * @example ['<query-server-host1>:<query-server-port>', '<query-server-host2>:<query-server-port>']
	 */
	queryServers?: string[];

	/**
	 * gRPC lookup server address (host:port)
	 * Required when useMtdd=true
	 *
	 * @example '<lookup-server-host>:<lookup-server-port>'
	 */
	lookupServer?: string;

	/**
	 * Whether running in development mode
	 * Controls log levels, SSL defaults, and pretty formatting
	 *
	 * @default false (reads from process.env.NODE_ENV)
	 */
	isDevelopment?: boolean;

	/**
	 * Use insecure gRPC connections (no SSL/TLS)
	 * Set to true for local development/testing
	 * Set to false for production with proper SSL certificates
	 *
	 * @default false (reads from process.env.GRPC_INSECURE)
	 */
	grpcInsecure?: boolean;
}

/**
 * Portal Configuration
 * Matches backend PortalInfo shape for compatibility
 */
export interface PortalConfig {
	/** Tenant column name in database (e.g., 'entityid', 'TenantID', 'VendorID') */
	tenantColumnName?: string;

	/** Stored procedure name for creating tenant with role */
	tenantInsertProc?: string;

	/** Portal name identifier (e.g., 'VendorPortal') */
	portalName?: string;

	/** Portal identifier number */
	portalId?: number;

	/** Allow any other portal-specific fields for backward compatibility */
	[key: string]: unknown;
}

/**
 * Library Configuration
 */
export interface LibraryConfig {
	mtdd: MtddBackendConfig;
	firebase?: FirebaseConfig;
	portal?: PortalConfig;
}

// Minimal DatabaseConfig for consumers who want the library to own Knex
export interface DatabaseConfig extends Knex.Config {}
