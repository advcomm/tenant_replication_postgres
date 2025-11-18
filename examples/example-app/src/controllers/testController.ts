/**
 * Test controller for demonstration purposes
 *
 * Provides test endpoints to demonstrate direct queries and .mtdd() usage.
 */

import type {Request, Response} from 'express';
import type {Knex} from 'knex';
import {apiLogger} from '../utils/logger';

/**
 * Extended Knex with .mtdd() method
 */
interface MtddKnex extends Knex {
  mtdd?: (tenantId?: string | number, tenantType?: number) => unknown;
}

/**
 * Test controller
 */
export class TestController {
  constructor(private db: MtddKnex, private environment: string) {}

  /**
   * GET /test/direct
   * Direct query without .mtdd()
   */
  async direct(req: Request, res: Response): Promise<void> {
    try {
      apiLogger.info('Direct query test');

      const result = await this.db('items')
        .select('*')
        .where('tenant_id', 'tenant-123')
        .limit(10);

      apiLogger.info({count: result.length}, 'Direct query completed');

      res.json({
        success: true,
        environment: this.environment,
        test: 'direct-query',
        data: result,
        count: result.length,
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      apiLogger.error({error: errorMessage}, 'Direct query failed');
      res.status(500).json({success: false, error: errorMessage});
    }
  }

  /**
   * GET /test/mtdd/:tenant
   * Query with .mtdd() - demonstrates tenant routing
   */
  async mtdd(req: Request, res: Response): Promise<void> {
    try {
      const tenantName = req.params.tenant;

      apiLogger.info(
        {
          tenant: tenantName,
          mode:
            this.environment === 'development'
              ? 'no-op (local)'
              : 'gRPC routing',
        },
        'MTDD query test'
      );

      let result: unknown[];

      // Use .mtdd() if available (patched by library)
      const query = this.db('items')
        .select('*')
        .where('tenant_id', `tenant-${tenantName}`);

      // Check if .mtdd() method is available on the query builder
      const queryWithMtdd = query as unknown as {
        mtdd?: (tenant: string) => Promise<unknown[]>;
      };

      if (this.db.mtdd && queryWithMtdd.mtdd) {
        result = (await queryWithMtdd.mtdd(tenantName)) as unknown[];
      } else {
        result = (await query.limit(10)) as unknown[];
      }

      apiLogger.info({count: result.length}, 'MTDD query completed');

      res.json({
        success: true,
        environment: this.environment,
        test: 'mtdd-query',
        tenant: tenantName,
        data: result,
        count: result.length,
        routing:
          this.environment === 'development' ? 'local' : 'grpc-shard-routed',
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      apiLogger.error({error: errorMessage}, 'MTDD query failed');
      res.status(500).json({success: false, error: errorMessage});
    }
  }

  /**
   * POST /test/insert
   * Insert test data
   */
  async insert(req: Request, res: Response): Promise<void> {
    try {
      const {tenant_id, name} = req.body;

      apiLogger.info(
        {
          tenant_id,
          name,
        },
        'Insert test'
      );

      const result = await this.db('items')
        .insert({tenant_id, name})
        .returning('*');

      apiLogger.info({id: result[0]?.id}, 'Insert completed');

      res.json({
        success: true,
        environment: this.environment,
        test: 'insert',
        data: result[0],
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      apiLogger.error({error: errorMessage}, 'Insert failed');
      res.status(500).json({success: false, error: errorMessage});
    }
  }
}
