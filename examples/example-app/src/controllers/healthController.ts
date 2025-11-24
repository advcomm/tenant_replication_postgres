/**
 * Health check controller
 *
 * Provides endpoints for health checks and application information.
 */

import type {Request, Response} from 'express';
import type {AppConfig} from '../config';
import {apiLogger} from '../utils/logger';

/**
 * Health controller
 */
export class HealthController {
  constructor(private config: AppConfig) {}

  /**
   * Health check endpoint
   * GET /health
   */
  health(req: Request, res: Response): void {
    apiLogger.info('Health check requested');

    res.json({
      status: 'healthy',
      environment: this.config.environment,
      mode:
        this.config.environment === 'development'
          ? 'local-postgresql'
          : 'grpc-routing',
      timestamp: new Date().toISOString(),
      config: {
        useMtdd: this.config.environment !== 'development',
        backends: this.config.backendServers || [],
        lookup: this.config.lookupServer || '',
        database:
          this.config.environment === 'development'
            ? typeof this.config.dbConfig.connection === 'object' &&
              this.config.dbConfig.connection !== null &&
              'database' in this.config.dbConfig.connection
              ? (this.config.dbConfig.connection as {database?: string})
                  .database
              : 'N/A'
            : 'via-grpc',
      },
    });
  }

  /**
   * Info endpoint
   * GET /info
   */
  info(req: Request, res: Response): void {
    apiLogger.info('Info requested');

    res.json({
      environment: this.config.environment,
      routing:
        this.config.environment === 'development'
          ? 'Direct PostgreSQL'
          : 'gRPC Multi-Shard',
      mtddBehavior:
        this.config.environment === 'development'
          ? '.mtdd() is a no-op, queries execute locally'
          : '.mtdd() triggers shard routing via MTDDLookup',
      endpoints: {
        flutter: {
          sync: 'POST /mtdd/sync/changes - Receive client changes',
          bulkLoad: 'POST /mtdd/sync/bulk-load - Bulk load tables',
          sse: 'GET /mtdd/sync/events - Real-time event stream',
          loadTable: 'GET /mtdd/sync/tables/:tableName - Load single table',
        },
        health: {
          health: 'GET /health',
          info: 'GET /info',
        },
        test: {
          direct: 'GET /test/direct - Direct query test',
          mtdd: 'GET /test/mtdd/:tenant - Query with .mtdd()',
          insert: 'POST /test/insert - Insert test data',
        },
      },
    });
  }
}
