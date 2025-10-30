/**
 * Configuration Holder
 *
 * Stores library configuration passed by the consuming application
 * Configuration is provided by the consumer via InitializeReplication()
 */

import type { LibraryConfig } from '@/types/config';

/**
 * Internal configuration holder
 * Set via InitializeReplication
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
 * Helper getters for common config values (config-only; no env fallback)
 */
export const config = {
	get isDevelopment(): boolean {
		const cfg = getConfig();

		return cfg?.mtdd?.isDevelopment ?? false;
	},

	get useMtdd(): boolean {
		const cfg = getConfig();

		return cfg?.mtdd?.useMtdd ?? false;
	},

	get queryServers(): string[] {
		const cfg = getConfig();

		return cfg?.mtdd?.queryServers ?? [];
	},

	get lookupServer(): string {
		const cfg = getConfig();

		return cfg?.mtdd?.lookupServer ?? '';
	},

	get portalInfo() {
		const cfg = getConfig();

		return cfg?.portal ?? {};
	},

	get firebaseConfig() {
		const cfg = getConfig();

		return cfg?.firebase;
	},

	get grpcInsecure(): boolean {
		const cfg = getConfig();
		return cfg?.mtdd?.grpcInsecure ?? false;
	},
};
