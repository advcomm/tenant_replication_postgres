/**
 * Authentication middleware for library routes
 *
 * The tenant_replication_postgres library expects AuthenticatedRequest with:
 * - req.tid (tenant ID)
 * - req.sub (user ID)
 * - req.roles (user roles array)
 *
 * This middleware extracts these values from headers (for testing) or
 * can be extended to use JWT tokens for production.
 */

import type {NextFunction, Request, Response} from 'express';
// Import from local library package (built dist files)
import type {AuthenticatedRequest} from '@advcomm/tenant_replication_postgres';

/**
 * Simple auth middleware for example app
 *
 * In production, you should replace this with proper JWT validation.
 * For testing, this extracts tenant-id and user-id from headers.
 */
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authReq = req as AuthenticatedRequest;

  // Extract from headers (for testing/development)
  // In production, decode from JWT token
  authReq.tid =
    (req.headers['tenant-id'] as string) ||
    (req.headers['x-tenant-id'] as string) ||
    'test-tenant';
  authReq.sub =
    (req.headers['user-id'] as string) ||
    (req.headers['x-user-id'] as string) ||
    'test-user';
  authReq.roles = [];

  next();
}
