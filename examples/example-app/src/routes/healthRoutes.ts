/**
 * Health check routes
 */

import {Router} from 'express';
import {HealthController} from '../controllers/healthController';
import type {AppConfig} from '../config';

/**
 * Create health check routes
 */
export function createHealthRoutes(config: AppConfig): Router {
  const router = Router();
  const controller = new HealthController(config);

  // GET /health
  router.get('/health', (req, res) => controller.health(req, res));

  // GET /info
  router.get('/info', (req, res) => controller.info(req, res));

  return router;
}
