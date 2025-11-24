/**
 * Redis Service
 *
 * Manages Redis client and tenant timestamp caching operations
 */

import Redis from 'ioredis';
import { dbLogger } from '@/utils/logger';

/**
 * Redis Service
 * Handles Redis operations for tenant timestamp caching
 */
export class RedisService {
	private client: Redis | null = null;
	private keyPrefix: string;
	private ttl: number;
	private isConnected = false;

	constructor(config?: {
		host?: string;
		port?: number;
		password?: string;
		db?: number;
		keyPrefix?: string;
		ttl?: number;
	}) {
		this.keyPrefix = config?.keyPrefix ?? 'mtds:';
		this.ttl = config?.ttl ?? 3600; // 1 hour default

		if (config) {
			this.initialize(config);
		}
	}

	/**
	 * Initialize Redis client connection
	 */
	initialize(config: {
		host?: string;
		port?: number;
		password?: string;
		db?: number;
		retryStrategy?: (times: number) => number | null | void;
		enableOfflineQueue?: boolean;
		lazyConnect?: boolean;
	}): void {
		try {
			this.client = new Redis({
				host: config.host ?? 'localhost',
				port: config.port ?? 6379,
				password: config.password,
				db: config.db ?? 0,
				retryStrategy: config.retryStrategy ?? this.defaultRetryStrategy,
				enableOfflineQueue: config.enableOfflineQueue ?? true,
				lazyConnect: config.lazyConnect ?? false,
			});

			this.client.on('connect', () => {
				this.isConnected = true;
				dbLogger.info('Redis client connected');
			});

			this.client.on('ready', () => {
				this.isConnected = true;
				dbLogger.info('Redis client ready');
			});

			this.client.on('error', (error) => {
				this.isConnected = false;
				dbLogger.error({ error }, 'Redis client error');
			});

			this.client.on('close', () => {
				this.isConnected = false;
				dbLogger.warn('Redis client connection closed');
			});

			this.client.on('reconnecting', () => {
				dbLogger.info('Redis client reconnecting');
			});

			// Connect if not lazy
			if (!config.lazyConnect) {
				this.client.connect().catch((error) => {
					dbLogger.error({ error }, 'Failed to connect to Redis');
				});
			}
		} catch (error) {
			dbLogger.error({ error }, 'Failed to initialize Redis client');
			this.client = null;
		}
	}

	/**
	 * Default retry strategy: exponential backoff with max delay
	 */
	private defaultRetryStrategy(times: number): number | null {
		if (times > 10) {
			return null; // Stop retrying after 10 attempts
		}

		const delay = Math.min(times * 100, 3000); // Max 3 seconds
		return delay;
	}

	/**
	 * Check if Redis client is connected
	 */
	isAvailable(): boolean {
		return this.isConnected && this.client !== null;
	}

	/**
	 * Get Redis client instance
	 */
	getClient(): Redis | null {
		return this.client;
	}

	/**
	 * Build Redis key with prefix
	 */
	private buildKey(tenantId: string | number): string {
		return `${this.keyPrefix}${tenantId}`;
	}

	/**
	 * Update tenant table timestamp in Redis
	 * @param tenantId - Tenant identifier
	 * @param tableName - Table name
	 * @param serverTs - Server transaction ID (mtds_server_ts)
	 */
	async updateTenantTableTimestamp(
		tenantId: string | number,
		tableName: string,
		serverTs: number,
	): Promise<void> {
		if (!this.isAvailable()) {
			dbLogger.debug('Redis not available, skipping timestamp update');
			return;
		}

		try {
			const key = this.buildKey(tenantId);
			const value = Buffer.from(serverTs.toString());

			await this.client!.hset(key, tableName, value);
			await this.client!.expire(key, this.ttl);

			dbLogger.debug(
				{ tenantId, tableName, serverTs },
				'Updated tenant table timestamp in Redis',
			);
		} catch (error) {
			dbLogger.error(
				{ error, tenantId, tableName, serverTs },
				'Failed to update tenant table timestamp in Redis',
			);
			// Non-blocking: don't throw, just log
		}
	}

	/**
	 * Update 'a:t' (all tables) timestamp in Redis
	 * This allows quick checking if tenant has any table changes
	 * @param tenantId - Tenant identifier
	 * @param serverTs - Server transaction ID (mtds_server_ts)
	 */
	async updateAllTablesTimestamp(
		tenantId: string | number,
		serverTs: number,
	): Promise<void> {
		if (!this.isAvailable()) {
			dbLogger.debug(
				'Redis not available, skipping all-tables timestamp update',
			);
			return;
		}

		try {
			const key = this.buildKey(tenantId);
			const value = Buffer.from(serverTs.toString());

			await this.client!.hset(key, 'a:t', value);
			await this.client!.expire(key, this.ttl);

			dbLogger.debug(
				{ tenantId, serverTs },
				'Updated all-tables timestamp in Redis',
			);
		} catch (error) {
			dbLogger.error(
				{ error, tenantId, serverTs },
				'Failed to update all-tables timestamp in Redis',
			);
			// Non-blocking: don't throw, just log
		}

		// Also update the specific table timestamp
		await this.updateTenantTableTimestamp(tenantId, 'a:t', serverTs);
	}

	/**
	 * Get tenant table timestamp from Redis
	 * @param tenantId - Tenant identifier
	 * @param tableName - Table name
	 * @returns Server transaction ID or null if not found
	 */
	async getTenantTableTimestamp(
		tenantId: string | number,
		tableName: string,
	): Promise<number | null> {
		if (!this.isAvailable()) {
			return null;
		}

		try {
			const key = this.buildKey(tenantId);
			const value = await this.client!.hget(key, tableName);

			if (!value) {
				return null;
			}

			// Value is stored as Buffer (from hset), but hget returns string
			// Convert to number
			const timestamp = parseInt(String(value), 10);

			return Number.isNaN(timestamp) ? null : timestamp;
		} catch (error) {
			dbLogger.error(
				{ error, tenantId, tableName },
				'Failed to get tenant table timestamp from Redis',
			);
			return null;
		}
	}

	/**
	 * Get 'a:t' (all tables) timestamp from Redis
	 * @param tenantId - Tenant identifier
	 * @returns Server transaction ID or null if not found
	 */
	async getAllTablesTimestamp(
		tenantId: string | number,
	): Promise<number | null> {
		return this.getTenantTableTimestamp(tenantId, 'a:t');
	}

	/**
	 * Refresh tenant key TTL in Redis
	 * @param tenantId - Tenant identifier
	 * @param ttlSeconds - Optional TTL override (uses default if not provided)
	 */
	async refreshTenantTTL(
		tenantId: string | number,
		ttlSeconds?: number,
	): Promise<void> {
		if (!this.isAvailable()) {
			return;
		}

		try {
			const key = this.buildKey(tenantId);
			const ttl = ttlSeconds ?? this.ttl;

			await this.client!.expire(key, ttl);

			dbLogger.debug({ tenantId, ttl }, 'Refreshed tenant TTL in Redis');
		} catch (error) {
			dbLogger.error(
				{ error, tenantId },
				'Failed to refresh tenant TTL in Redis',
			);
			// Non-blocking: don't throw, just log
		}
	}

	/**
	 * Close Redis connection
	 */
	async disconnect(): Promise<void> {
		if (this.client) {
			await this.client.quit();
			this.client = null;
			this.isConnected = false;
			dbLogger.info('Redis client disconnected');
		}
	}
}
