/**
 * Configuration management for the example app
 *
 * This demonstrates how to configure the tenant_replication_postgres library
 * for different environments (development, staging, production).
 */

// Import from local library package (built dist files)
import type {
  DatabaseConfig,
  LibraryConfig,
} from '@advcomm/tenant_replication_postgres';

export type Environment = 'development' | 'staging' | 'production';

export interface AppConfig {
  port: number;
  environment: Environment;
  dbConfig: DatabaseConfig;
  libraryConfig: LibraryConfig;
  backendServers?: string[];
  lookupServer?: string;
  grpcInsecure?: boolean;
}

/**
 * Parse database configuration from environment variables
 */
function parseDatabaseConfig(): DatabaseConfig {
  // Use individual environment variables for all environments
  // DatabaseConfig is Omit<Knex.Config, 'client'>, so we don't include 'client'
  return {
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: Number.parseInt(process.env.DB_PORT || '5432', 10),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_NAME || 'mtdd_dev',
    },
    debug: false,
  } as DatabaseConfig;
}

/**
 * Get application configuration from environment
 */
export function getConfig(): AppConfig {
  const environment = (process.env.NODE_ENV || 'development') as Environment;
  const dbConfig = parseDatabaseConfig();

  // Configure library based on environment
  const libraryConfig: LibraryConfig = {
    mtdd: {
      useMtdd: environment !== 'development',
      queryServers: process.env.GRPC_QUERY_SERVERS?.split(',') || [
        'localhost:50051',
        'localhost:50052',
        'localhost:50053',
      ],
      lookupServer: process.env.GRPC_LOOKUP_SERVER || 'localhost:50054',
      isDevelopment: environment === 'development',
      grpcInsecure: process.env.GRPC_INSECURE === 'true' || true,
    },
    portal: {
      portalId: Number.parseInt(process.env.PORTAL_ID || '1', 10),
      tenantColumnName: process.env.TENANT_COLUMN_NAME || 'tenant_id',
      tenantInsertProc: process.env.TENANT_INSERT_PROC || 'insert_tenant',
      portalName: process.env.PORTAL_NAME || 'ExamplePortal',
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: Number.parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      db: Number.parseInt(process.env.REDIS_DB || '0', 10),
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'mtds:',
      ttl: Number.parseInt(process.env.REDIS_TTL || '3600', 10),
    },
  };

  const config: AppConfig = {
    port: Number.parseInt(process.env.PORT || '3000', 10),
    environment,
    dbConfig,
    libraryConfig,
  };

  // Add gRPC configuration for staging/production
  if (environment !== 'development') {
    config.backendServers = process.env.GRPC_QUERY_SERVERS?.split(',') || [
      'localhost:50051',
      'localhost:50052',
      'localhost:50053',
    ];
    config.lookupServer = process.env.GRPC_LOOKUP_SERVER || 'localhost:50054';
    config.grpcInsecure = process.env.GRPC_INSECURE === 'true';
  }

  return config;
}

/**
 * Log configuration information
 */
export function logConfig(config: AppConfig): void {
  console.log('='.repeat(80));
  console.log('🔷 TENANT REPLICATION POSTGRES - EXAMPLE APP');
  console.log('='.repeat(80));
  console.log(`Environment: ${config.environment}`);
  console.log(`Port: ${config.port}`);
  console.log('');

  if (config.environment === 'development') {
    console.log('📦 Development Mode - Local PostgreSQL');
    const dbName =
      typeof config.dbConfig.connection === 'object' &&
      config.dbConfig.connection !== null &&
      'database' in config.dbConfig.connection
        ? (config.dbConfig.connection as {database?: string}).database
        : 'N/A';
    console.log(`   Database: ${dbName || 'N/A'}`);
    console.log('   Behavior:');
    console.log('     - Queries go directly to local PostgreSQL');
    console.log('     - .mtdd() calls are no-ops (pass-through)');
    console.log('     - No gRPC services needed');
    console.log('     - Perfect for local development and Flutter app testing');
  } else {
    console.log(`📦 ${config.environment.toUpperCase()} Mode - gRPC Routing`);
    console.log(`   Backend Servers: ${config.backendServers?.join(', ')}`);
    console.log(`   Lookup Server: ${config.lookupServer}`);
    console.log('   Behavior:');
    console.log('     - All queries route through gRPC');
    console.log('     - .mtdd() triggers tenant-to-shard routing');
    console.log('     - MTDDLookup determines which shard');
    console.log('     - MTDD services execute on correct shard');
  }

  // Redis configuration
  if (config.libraryConfig.redis) {
    console.log('');
    console.log('🔴 Redis Configuration:');
    console.log(`   Host: ${config.libraryConfig.redis.host || 'localhost'}`);
    console.log(`   Port: ${config.libraryConfig.redis.port || 6379}`);
    console.log(`   DB: ${config.libraryConfig.redis.db || 0}`);
    console.log(
      `   Key Prefix: ${config.libraryConfig.redis.keyPrefix || 'mtds:'}`
    );
    console.log(`   TTL: ${config.libraryConfig.redis.ttl || 3600}s`);
    console.log(
      '   Purpose: Tenant timestamp caching for efficient change detection'
    );
  }

  console.log('');
}
