/**
 * Library Configuration Type Definitions
 *
 * Types for configuring the tenant replication library
 * (Future: Will replace process.env usage - see LIBRARY_DESIGN_DECISIONS.md)
 */

import type {FirebaseConfig} from '../core/helper/activeClients';

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
 * MTDD Backend Configuration
 */
export interface MtddBackendConfig {
  backendServers: string[];
  lookupServer: string;
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
