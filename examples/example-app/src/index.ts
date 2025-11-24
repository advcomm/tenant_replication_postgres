/**
 * Example Application for tenant_replication_postgres
 *
 * This is a complete example demonstrating how to use the
 * @advcomm/tenant_replication_postgres library in a real application.
 *
 * Key features:
 * - Initializes the library with proper configuration
 * - Uses library's built-in sync routes (/sync/changes, /sync/bulk-load, etc.)
 * - Adds custom health and test routes
 * - Demonstrates authentication middleware setup
 * - Works in both development (local PostgreSQL) and production (gRPC) modes
 */

import express from 'express';
// Import from local library package (built dist files)
import {
  InitializeReplicationWithDb,
  type DatabaseConfig,
  type LibraryConfig,
} from '@advcomm/tenant_replication_postgres';
import type {Knex} from 'knex';

import {getConfig, logConfig, type AppConfig} from './config';
import {logger} from './utils/logger';
import {corsMiddleware} from './middleware/cors';
import {authMiddleware} from './middleware/auth';
import {errorHandler} from './middleware/errorHandler';
import {createHealthRoutes} from './routes/healthRoutes';
import {createTestRoutes} from './routes/testRoutes';

/**
 * Extended Knex with .mtdd() method
 */
interface MtddKnex extends Knex {
  mtdd?: (tenantId?: string | number, tenantType?: number) => unknown;
}

/**
 * Main application setup
 */
async function main(): Promise<void> {
  // Get configuration
  const config = getConfig();
  logConfig(config);

  // Create Express app
  const app = express();
  app.use(express.json());

  // Apply CORS middleware (required for Flutter apps)
  app.use(corsMiddleware);

  // ============================================================================
  // Authentication Middleware
  // ============================================================================
  // IMPORTANT: Library routes expect AuthenticatedRequest with req.tid, req.sub, req.roles
  // Add auth middleware BEFORE library initialization so it applies to all /mtdd/sync routes
  app.use('/mtdd/sync', authMiddleware);

  // ============================================================================
  // Initialize Library
  // ============================================================================
  // The library will:
  // 1. Create Knex connection
  // 2. Mount routes at /mtdd/sync/*
  //    - POST /mtdd/sync/changes - Receive client changes
  //    - POST /mtdd/sync/bulk-load - Bulk load tables
  //    - GET /mtdd/sync/tables/:tableName - Load single table
  //    - GET /mtdd/sync/events - Server-Sent Events
  // 3. Setup notification listeners
  let db: MtddKnex;
  try {
    db = (await InitializeReplicationWithDb(
      app,
      config.dbConfig,
      config.libraryConfig
    )) as MtddKnex;

    logger.info('✅ Library initialized successfully');
    logger.info(
      '📡 Library routes mounted at /mtdd/sync/* (changes, bulk-load, tables/:tableName, events)'
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    logger.error({error: errorMessage}, '❌ Failed to initialize library');
    process.exit(1);
  }

  // ============================================================================
  // Application Routes
  // ============================================================================
  // Add your custom routes here
  app.use(createHealthRoutes(config));
  app.use(createTestRoutes(db, config.environment));

  // ============================================================================
  // Error Handler (must be last)
  // ============================================================================
  app.use(errorHandler);

  // ============================================================================
  // Test Database Connection
  // ============================================================================
  try {
    await db.raw('SELECT 1');
    logger.info('✅ Database connection successful');
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    logger.error({error: errorMessage}, '❌ Database connection failed');

    if (config.environment === 'development') {
      logger.info('💡 For development mode, ensure PostgreSQL is running:');
      logger.info('   createdb mtdd_dev');
    } else {
      logger.info(
        '💡 For staging/production mode, ensure services are running:'
      );
      logger.info('   npm run start:services');
    }

    process.exit(1);
  }

  // ============================================================================
  // Start Server
  // ============================================================================
  const server = app.listen(config.port, () => {
    logger.info('='.repeat(80));
    logger.info(`🚀 SERVER RUNNING ON http://localhost:${config.port}`);
    logger.info('='.repeat(80));
    logger.info('');
    logger.info('📱 FLUTTER CLIENT ENDPOINTS (from library):');
    logger.info('');
    logger.info(`   POST http://localhost:${config.port}/mtdd/sync/changes`);
    logger.info('        └─ Receive changes from Flutter client');
    logger.info('');
    logger.info(`   POST http://localhost:${config.port}/mtdd/sync/bulk-load`);
    logger.info('        └─ Bulk load tables for Flutter client');
    logger.info('');
    logger.info(
      `   GET  http://localhost:${config.port}/mtdd/sync/tables/:tableName`
    );
    logger.info('        └─ Load single table data');
    logger.info('');
    logger.info(`   GET  http://localhost:${config.port}/mtdd/sync/events`);
    logger.info('        └─ Server-Sent Events for real-time updates');
    logger.info('');
    logger.info('🔧 UTILITY ENDPOINTS:');
    logger.info('');
    logger.info(`   GET  http://localhost:${config.port}/health`);
    logger.info(`   GET  http://localhost:${config.port}/info`);
    logger.info('');
    logger.info('🧪 TEST ENDPOINTS:');
    logger.info('');
    logger.info(`   GET  http://localhost:${config.port}/test/direct`);
    logger.info(`   GET  http://localhost:${config.port}/test/mtdd/:tenant`);
    logger.info(`   POST http://localhost:${config.port}/test/insert`);
    logger.info('');
    logger.info('='.repeat(80));
    logger.info('');
    logger.info('✅ Ready to accept Flutter client connections!');
    logger.info('');
    logger.info('💡 Tip: Set headers for testing:');
    logger.info('   tenant-id: your-tenant-id');
    logger.info('   user-id: your-user-id');
    logger.info('');
  });

  // ============================================================================
  // Graceful Shutdown
  // ============================================================================
  let isShuttingDown = false;

  async function gracefulShutdown(signal: string): Promise<void> {
    if (isShuttingDown) {
      logger.warn('Shutdown already in progress, forcing exit...');
      process.exit(1);
      return;
    }

    isShuttingDown = true;
    logger.info(`${signal} received, shutting down gracefully...`);

    // Set a timeout to force exit if cleanup takes too long
    const forceExitTimeout = setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000); // 10 seconds

    try {
      // Close HTTP server (stops accepting new connections)
      await new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) {
            logger.error({error: err}, 'Error closing HTTP server');
            reject(err);
          } else {
            logger.info('HTTP server closed');
            resolve();
          }
        });
      });

      // Close database connections
      await db.destroy();
      logger.info('Database connections closed');

      // Clear the timeout
      clearTimeout(forceExitTimeout);

      logger.info('Graceful shutdown complete');
      process.exit(0);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logger.error({error: errorMessage}, 'Error during shutdown');
      clearTimeout(forceExitTimeout);
      process.exit(1);
    }
  }

  // Register signal handlers
  process.on('SIGTERM', () => {
    gracefulShutdown('SIGTERM').catch((error: unknown) => {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logger.error({error: errorMessage}, 'Error in SIGTERM handler');
      process.exit(1);
    });
  });

  process.on('SIGINT', () => {
    gracefulShutdown('SIGINT').catch((error: unknown) => {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logger.error({error: errorMessage}, 'Error in SIGINT handler');
      process.exit(1);
    });
  });
}

// Start the application
main().catch((error: unknown) => {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  logger.error(
    {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    },
    '❌ Fatal error during startup'
  );
  process.exit(1);
});
