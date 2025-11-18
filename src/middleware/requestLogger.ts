/**
 * Request Logging Middleware
 *
 * Logs HTTP requests and responses with environment-aware verbosity:
 * - Development: Comprehensive logging with request/response bodies
 * - Production: Minimal logging for performance tracking (method, path, status, duration)
 *
 * Follows industry best practices:
 * - Structured logging (Pino)
 * - Performance metrics (duration)
 * - Request correlation (requestId)
 * - Sensitive data filtering in production
 */

import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { config } from '@/config/configHolder';
import type { AuthenticatedRequest } from '@/types/api';
import { apiLogger } from '@/utils/logger';

/**
 * Check if we're in development mode
 */
const isDevelopment =
	config.isDevelopment || process.env.NODE_ENV === 'development';

/**
 * Sanitize sensitive fields from objects (for production logging)
 */
function sanitizeForProduction(obj: unknown): unknown {
	if (!obj || typeof obj !== 'object') {
		return obj;
	}

	if (Array.isArray(obj)) {
		return obj.map(sanitizeForProduction);
	}

	const sanitized: Record<string, unknown> = {};
	const sensitiveFields = [
		'password',
		'token',
		'secret',
		'key',
		'authorization',
		'cookie',
	];

	for (const [key, value] of Object.entries(obj)) {
		const lowerKey = key.toLowerCase();

		if (sensitiveFields.some((field) => lowerKey.includes(field))) {
			sanitized[key] = '[REDACTED]';
		} else if (typeof value === 'object' && value !== null) {
			sanitized[key] = sanitizeForProduction(value);
		} else {
			sanitized[key] = value;
		}
	}

	return sanitized;
}

/**
 * Request logging middleware
 *
 * Logs incoming requests and outgoing responses with appropriate detail level
 */
export function requestLogger(
	req: Request | AuthenticatedRequest,
	res: Response,
	next: NextFunction,
): void {
	const startTime = Date.now();
	const requestId = randomUUID().substring(0, 8);

	// Attach requestId to request for correlation
	(req as Request & { requestId?: string }).requestId = requestId;

	// Extract tenant and user info if available
	const tenantId = 'tid' in req ? req.tid : undefined;
	const userId = 'sub' in req ? req.sub : undefined;

	// Build base log context
	const baseContext = {
		requestId,
		method: req.method,
		path: req.path,
		query: Object.keys(req.query).length > 0 ? req.query : undefined,
		tenantId,
		userId,
		ip: req.ip || req.socket.remoteAddress,
		userAgent: req.get('user-agent'),
	};

	// Log incoming request
	if (isDevelopment) {
		// Development: Comprehensive logging
		apiLogger.info(
			{
				...baseContext,
				headers: sanitizeForProduction(req.headers),
				body:
					req.body && Object.keys(req.body).length > 0 ? req.body : undefined,
			},
			`→ ${req.method} ${req.path}`,
		);
	} else {
		// Production: Minimal logging
		apiLogger.info(baseContext, `${req.method} ${req.path}`);
	}

	// Capture response details
	const originalSend = res.send;
	res.send = function (body: unknown) {
		const duration = Date.now() - startTime;
		const statusCode = res.statusCode;

		// Build response log context
		const responseContext = {
			...baseContext,
			statusCode,
			duration: `${duration}ms`,
			durationMs: duration,
		};

		// Determine log level based on status code
		if (statusCode >= 500) {
			// Server errors
			apiLogger.error(
				{
					...responseContext,
					...(isDevelopment && { responseBody: body }),
				},
				`✗ ${req.method} ${req.path} ${statusCode} (${duration}ms)`,
			);
		} else if (statusCode >= 400) {
			// Client errors
			apiLogger.warn(
				{
					...responseContext,
					...(isDevelopment && { responseBody: body }),
				},
				`⚠ ${req.method} ${req.path} ${statusCode} (${duration}ms)`,
			);
		} else {
			// Success
			if (isDevelopment) {
				apiLogger.info(
					{
						...responseContext,
						responseBody:
							typeof body === 'string' ? body.substring(0, 500) : body, // Limit body size
					},
					`✓ ${req.method} ${req.path} ${statusCode} (${duration}ms)`,
				);
			} else {
				// Production: Only log slow requests (>1s) or important endpoints
				const isImportantEndpoint =
					req.path.includes('/sync/changes') ||
					req.path.includes('/sync/bulk-load') ||
					req.path.includes('/sync/events');

				if (duration > 1000 || isImportantEndpoint) {
					apiLogger.info(
						responseContext,
						`${req.method} ${req.path} ${statusCode} (${duration}ms)`,
					);
				} else {
					// Very minimal logging for fast, non-critical endpoints
					apiLogger.debug(
						responseContext,
						`${req.method} ${req.path} ${statusCode}`,
					);
				}
			}
		}

		// Call original send
		return originalSend.call(this, body);
	};

	next();
}
