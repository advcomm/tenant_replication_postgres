/**
 * Logging Utility
 *
 * Centralized logging with Pino for structured, high-performance logs
 */

import pino from 'pino';

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Base logger configuration
 * Uses "knex-mtdd" as the logger name to stand out in logs
 */
export const logger = pino({
  name: 'knex-mtdd', // 🎯 Library identifier - stands out in logs!
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),

  // Use pretty formatting in development for better readability
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
          messageFormat: '[knex-mtdd] {msg}',
        },
      }
    : undefined,

  // Default fields included in every log
  base: {
    library: 'tenant_replication_postgres',
    version: '1.0.2',
  },
});

/**
 * Domain-specific child loggers for better log organization
 */

// gRPC operations logger
export const grpcLogger = logger.child({ component: 'grpc' });

// MTDD routing logger
export const mtddLogger = logger.child({ component: 'mtdd' });

// Database operations logger
export const dbLogger = logger.child({ component: 'database' });

// Route/API logger
export const apiLogger = logger.child({ component: 'api' });

// Firebase/notifications logger
export const notificationLogger = logger.child({ component: 'notification' });

/**
 * Helper function to create a logger with request context
 */
export function createRequestLogger(requestId?: string, tenantId?: string | number) {
  return logger.child({
    requestId,
    tenantId,
  });
}

/**
 * Helper function to log performance metrics
 */
export function logPerformance(
  component: string,
  operation: string,
  durationMs: number,
  metadata?: Record<string, unknown>,
) {
  logger.info({
    component,
    operation,
    duration: durationMs,
    ...metadata,
  }, `${operation} completed in ${durationMs}ms`);
}

