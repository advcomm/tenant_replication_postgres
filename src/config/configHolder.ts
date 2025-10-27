/**
 * Configuration Holder
 *
 * Stores library configuration passed by the consuming application
 * Provides fallback to process.env for backward compatibility
 */

import type { LibraryConfig } from '@/types/config';
import { logger } from '@/utils/logger';

/**
 * Internal configuration holder
 * Set via InitializeReplication or falls back to process.env
 */
let libraryConfig: LibraryConfig | null = null;

/**
 * Set the library configuration
 * Called by InitializeReplication
 */
export function setConfig(config: LibraryConfig): void {
	libraryConfig = config;
}

/**
 * Get the library configuration
 * Returns null if not set - consumers should handle fallback
 */
export function getConfig(): LibraryConfig | null {
	return libraryConfig;
}

/**
 * Check if configuration has been set
 */
export function hasConfig(): boolean {
	return libraryConfig !== null;
}

/**
 * Helper getters for common config values
 * Falls back to process.env if config not provided (for backward compatibility)
 */
let hasWarnedAboutEnvFallback = false;

function warnAboutEnvFallback() {
	if (!hasWarnedAboutEnvFallback) {
		logger.warn(
			'No configuration provided to InitializeReplication(). ' +
				'Falling back to process.env (deprecated). ' +
				'Please pass configuration object to InitializeReplication().',
		);
		hasWarnedAboutEnvFallback = true;
	}
}

export const config = {
	get isDevelopment(): boolean {
		const cfg = getConfig();

		if (cfg?.mtdd?.isDevelopment !== undefined) {
			return cfg.mtdd.isDevelopment;
		}

		warnAboutEnvFallback();

		return process.env.NODE_ENV === 'development';
	},

	get useMtdd(): boolean {
		const cfg = getConfig();

		if (cfg?.mtdd?.useMtdd !== undefined) {
			return cfg.mtdd.useMtdd;
		}

		warnAboutEnvFallback();

		// Default to false - opt-in to gRPC routing
		// Only enable if explicitly set to '1'
		return process.env.USE_MTDD === '1';
	},

	get queryServers(): string[] {
		const cfg = getConfig();

		if (cfg?.mtdd?.queryServers) {
			return cfg.mtdd.queryServers;
		}

		warnAboutEnvFallback();

		// Support old BACKEND_SERVERS env var for backward compatibility
		const envVar = process.env.QUERY_SERVERS || process.env.BACKEND_SERVERS;

		if (!envVar) {
			return process.env.NODE_ENV === 'development' ? [] : [];
		}

		// Try JSON parse first, then fall back to comma-separated
		try {
			return JSON.parse(envVar);
		} catch {
			// Parse as comma-separated string
			return envVar
				.split(',')
				.map((s) => s.trim())
				.filter((s) => s);
		}
	},

	get lookupServer(): string {
		const cfg = getConfig();

		if (cfg?.mtdd?.lookupServer) {
			return cfg.mtdd.lookupServer;
		}

		warnAboutEnvFallback();

		const envVar = process.env.LOOKUP_SERVER;

		if (!envVar) {
			return '127.0.0.1:50054';
		}

		// Try JSON parse first (array format), then fall back to simple string
		try {
			const parsed = JSON.parse(envVar);
			return Array.isArray(parsed) ? parsed[0] : parsed;
		} catch {
			// Simple string format
			return envVar;
		}
	},

	get databaseEnabled(): boolean {
		const cfg = getConfig();

		if (cfg?.database?.enabled !== undefined) {
			return cfg.database.enabled;
		}

		warnAboutEnvFallback();

		return process.env.ENABLE_DATABASE !== 'false';
	},

	get databaseConfig() {
		const cfg = getConfig();

		if (cfg?.database?.config) {
			return cfg.database.config;
		}

		warnAboutEnvFallback();

		return JSON.parse(process.env.DB_CONFIG || '{}');
	},

	get portalInfo() {
		const cfg = getConfig();

		if (cfg?.portal) {
			return cfg.portal;
		}

		warnAboutEnvFallback();

		return JSON.parse(process.env.PortalInfo || '{}');
	},

	get firebaseConfig() {
		const cfg = getConfig();

		return cfg?.firebase;
	},

	get grpcInsecure(): boolean {
		// Check config first, then env var
		const cfg = getConfig();

		if (cfg?.mtdd?.grpcInsecure !== undefined) {
			return cfg.mtdd.grpcInsecure;
		}

		// If config provided but no grpcInsecure setting, check environment
		if (cfg?.mtdd) {
			// Config exists but no grpcInsecure - check env var
			return process.env.GRPC_INSECURE === 'true';
		}

		warnAboutEnvFallback();

		return process.env.GRPC_INSECURE === 'true';
	},
};
