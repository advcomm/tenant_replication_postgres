/**
 * Error handling middleware
 *
 * Provides custom error class and global error handler.
 */

import type {NextFunction, Request, Response} from 'express';
import {logger} from '../utils/logger';

/**
 * Custom error class
 */
export class AppError extends Error {
	constructor(
		public statusCode: number,
		message: string,
		public details?: unknown,
	) {
		super(message);
		this.name = 'AppError';
		Error.captureStackTrace(this, this.constructor);
	}
}

/**
 * Global error handler middleware
 */
export function errorHandler(
	error: Error | AppError,
	req: Request,
	res: Response,
	next: NextFunction,
): void {
	if (res.headersSent) {
		return next(error);
	}

	const statusCode = error instanceof AppError ? error.statusCode : 500;
	const message = error.message || 'Internal Server Error';

	logger.error(
		{
			error: message,
			stack: error.stack,
			statusCode,
			path: req.path,
			method: req.method,
		},
		'Error occurred',
	);

	res.status(statusCode).json({
		success: false,
		error: message,
		...(error instanceof AppError && error.details
			? {details: error.details}
			: {}),
	});
}

/**
 * Async handler wrapper to catch errors
 */
export function asyncHandler(
	fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
	return (req: Request, res: Response, next: NextFunction): void => {
		Promise.resolve(fn(req, res, next)).catch(next);
	};
}

