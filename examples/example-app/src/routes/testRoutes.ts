/**
 * Test routes for demonstration
 */

import {Router} from 'express';
import {TestController} from '../controllers/testController';
import {asyncHandler} from '../middleware/errorHandler';
import type {Knex} from 'knex';

/**
 * Extended Knex with .mtdd() method
 */
interface MtddKnex extends Knex {
  mtdd?: (tenantId?: string | number, tenantType?: number) => unknown;
}

/**
 * Create test routes
 */
export function createTestRoutes(db: MtddKnex, environment: string): Router {
  const router = Router();
  const controller = new TestController(db, environment);

  // GET /test/direct - Direct query without .mtdd()
  router.get(
    '/test/direct',
    asyncHandler(async (req, res) => {
      await controller.direct(req, res);
    })
  );

  // GET /test/mtdd/:tenant - Query with .mtdd()
  router.get(
    '/test/mtdd/:tenant',
    asyncHandler(async (req, res) => {
      await controller.mtdd(req, res);
    })
  );

  // POST /test/insert - Insert test data
  router.post(
    '/test/insert',
    asyncHandler(async (req, res) => {
      await controller.insert(req, res);
    })
  );

  return router;
}
