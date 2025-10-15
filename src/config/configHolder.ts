/**
 * Configuration Holder
 *
 * Stores library configuration passed by the consuming application
 * Provides fallback to process.env for backward compatibility
 */

import type { LibraryConfig } from '../types/config';

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
		console.warn(
			'[knex-mtdd] No configuration provided to InitializeReplication(). ' +
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

	get backendServers(): string[] {
		const cfg = getConfig();
		if (cfg?.mtdd?.backendServers) {
			return cfg.mtdd.backendServers;
		}
		warnAboutEnvFallback();
		return process.env.NODE_ENV !== 'development'
			? JSON.parse(process.env.BACKEND_SERVERS || '[]')
			: JSON.parse(process.env.BACKEND_SERVERS || '["127.0.0.1"]');
	},

	get lookupServer(): string {
		const cfg = getConfig();
		if (cfg?.mtdd?.lookupServer) {
			return cfg.mtdd.lookupServer;
		}
		warnAboutEnvFallback();
		const servers = process.env.NODE_ENV !== 'development'
			? JSON.parse(process.env.LOOKUP_SERVER || '["127.0.0.1"]')
			: ['127.0.0.1'];
		return servers[0];
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
};

