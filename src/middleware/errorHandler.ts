/**
 * Global Error Handler Middleware
 *
 * Centralized error handling for Express routes
 */

import type { Request, Response, NextFunction } from 'express';
import { apiLogger } from '../utils/logger';
import { BaseError } from '../errors/BaseError';
import { GrpcError } from '../errors/GrpcError';
import { MtddError } from '../errors/MtddError';
import { ValidationError } from '../errors/ValidationError';

/**
 * Standard error response format
 */
export interface ErrorResponse {
	error: string;
	message: string;
	code?: string;
	statusCode: number;
	context?: Record<string, unknown>;
	stack?: string;
}

/**
 * Global error handler middleware
 *
 * Catches all errors thrown in routes and formats them into consistent responses
 * Should be registered as the last middleware in the Express app
 *
 * @example
 * ```typescript
 * import { errorHandler } from './middleware/errorHandler';
 * app.use(errorHandler);
 * ```
 */
export function errorHandler(
	error: Error | BaseError,
	req: Request,
	res: Response,
	next: NextFunction,
): void {
	// Skip if response already sent
	if (res.headersSent) {
		return next(error);
	}

	// Handle custom errors
	if (error instanceof BaseError) {
		const response: ErrorResponse = {
			error: error.name,
			message: error.message,
			code: error.code,
			statusCode: error.statusCode,
		};

		// Include context in development
		if (process.env.NODE_ENV === 'development' && error.context) {
			response.context = error.context;
		}

		// Include stack trace in development
		if (process.env.NODE_ENV === 'development' && error.stack) {
			response.stack = error.stack;
		}

		// Log based on severity
		if (error.statusCode >= 500) {
			apiLogger.error(
				{
					error: error.name,
					message: error.message,
					code: error.code,
					statusCode: error.statusCode,
					context: error.context,
					stack: error.stack,
				},
				'Server error occurred',
			);
		} else {
			apiLogger.warn(
				{
					error: error.name,
					message: error.message,
					code: error.code,
					statusCode: error.statusCode,
				},
				'Client error occurred',
			);
		}

		res.status(error.statusCode).json(response);
		return;
	}

	// Handle standard JavaScript errors
	const statusCode = 500;
	const response: ErrorResponse = {
		error: error.name || 'Error',
		message: error.message || 'An unexpected error occurred',
		statusCode,
	};

	// Include stack trace in development
	if (process.env.NODE_ENV === 'development' && error.stack) {
		response.stack = error.stack;
	}

	// Log the error
	apiLogger.error(
		{
			error: error.name,
			message: error.message,
			stack: error.stack,
		},
		'Unhandled error occurred',
	);

	res.status(statusCode).json(response);
}

/**
 * Not Found (404) handler
 *
 * Catches all unmatched routes and returns a 404 response
 * Should be registered after all other routes but before the error handler
 *
 * @example
 * ```typescript
 * import { notFoundHandler } from './middleware/errorHandler';
 * app.use(notFoundHandler);
 * ```
 */
export function notFoundHandler(
	req: Request,
	res: Response,
	next: NextFunction,
): void {
	const response: ErrorResponse = {
		error: 'NotFound',
		message: `Route ${req.method} ${req.path} not found`,
		statusCode: 404,
	};

	apiLogger.warn(
		{
			method: req.method,
			path: req.path,
			query: req.query,
		},
		'Route not found',
	);

	res.status(404).json(response);
}

/**
 * Async error wrapper
 *
 * Wraps async route handlers to catch promise rejections
 *
 * @param fn - Async route handler function
 * @returns Wrapped handler that catches errors
 *
 * @example
 * ```typescript
 * import { asyncHandler } from './middleware/errorHandler';
 *
 * router.get('/data', asyncHandler(async (req, res) => {
 *   const data = await fetchData();
 *   res.json(data);
 * }));
 * ```
 */
export function asyncHandler(
	fn: (req: Request, res: Response, next: NextFunction) => Promise<void | any>,
) {
	return (req: Request, res: Response, next: NextFunction): void => {
		Promise.resolve(fn(req, res, next)).catch(next);
	};
}

