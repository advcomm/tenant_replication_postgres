/**
 * SSE Authentication Middleware
 *
 * Handles authentication for Server-Sent Events endpoints
 * Supports token in Authorization header or query parameter
 */

import { decodeAccessToken } from '@advcomm/utils/dist/helper/authenticationHelper';
import type { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from '@/types/api';
import { apiLogger } from '@/utils/logger';

/**
 * Authenticate SSE requests
 * Supports token from Authorization header or query parameter
 *
 * @param req - Express request
 * @param res - Express response
 * @param next - Next middleware function
 */
export async function authenticateSSE(
	req: AuthenticatedRequest,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		let authToken = req.headers.authorization;

		// Check if authorization is provided in query parameters (for SSE compatibility)
		if (!authToken && req.query.token) {
			// Create authorization header from query parameter
			authToken = `Bearer ${req.query.token}`;

			// Add authorization to headers for processing
			req.headers.authorization = authToken;
			apiLogger.debug(
				'Using authorization from query parameter for SSE endpoint',
			);
		}

		// Validate authorization
		if (!authToken || !authToken.startsWith('Bearer ')) {
			res.status(422).json({
				message: 'Authorization required for SSE endpoint',
			});
			return;
		}

		// Extract and decode token
		req.token = authToken.split(' ')[1];
		const decoded = (await decodeAccessToken(req)) as {
			IsSuccess: boolean;
			payload: { sub: string; tid: string; roles: string[] };
		};

		if (!decoded.IsSuccess) {
			res.status(401).json({
				message: 'Invalid token for SSE endpoint',
			});
			return;
		}

		// Extract auth values
		const { sub, tid, roles } = decoded.payload;
		req.sub = sub;
		req.tid = tid;
		req.roles = roles;

		apiLogger.info(
			{ user: sub, tenantId: tid, roles },
			'SSE endpoint authorized',
		);

		next();
	} catch (authError: unknown) {
		const errorMessage =
			authError instanceof Error ? authError.message : 'Unknown error';
		apiLogger.error(
			{ error: errorMessage },
			'SSE endpoint authentication failed',
		);
		res.status(401).json({
			message: 'Authentication failed for SSE endpoint',
		});
	}
}
