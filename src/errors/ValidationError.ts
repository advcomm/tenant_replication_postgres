/**
 * Validation Error Class
 *
 * Error class for validation failures
 */

import { BaseError } from './BaseError';

export class ValidationError extends BaseError {
	constructor(message: string, context?: Record<string, unknown>) {
		super(message, 'VALIDATION_ERROR', 400, context);
	}
}

export class AuthenticationError extends BaseError {
	constructor(
		message: string = 'Authentication failed',
		context?: Record<string, unknown>,
	) {
		super(message, 'AUTHENTICATION_ERROR', 401, context);
	}
}

export class AuthorizationError extends BaseError {
	constructor(
		message: string = 'Authorization failed',
		context?: Record<string, unknown>,
	) {
		super(message, 'AUTHORIZATION_ERROR', 403, context);
	}
}
