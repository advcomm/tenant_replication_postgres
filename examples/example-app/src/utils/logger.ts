/**
 * Logger utility for the example app
 *
 * Uses Pino for structured logging with pretty printing in development.
 */

import pino from 'pino';

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Main logger instance
 */
export const logger = pino({
  level: isDevelopment ? 'debug' : 'info',
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});

/**
 * Logger for API requests
 */
export const apiLogger = logger.child({context: 'api'});

/**
 * Logger for database operations
 */
export const dbLogger = logger.child({context: 'database'});
