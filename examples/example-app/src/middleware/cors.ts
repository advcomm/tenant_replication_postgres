/**
 * CORS middleware for Flutter web/mobile apps
 *
 * This middleware enables cross-origin requests from Flutter applications.
 */

import type {NextFunction, Request, Response} from 'express';

/**
 * CORS middleware
 */
export function corsMiddleware(
	req: Request,
	res: Response,
	next: NextFunction,
): void {
	res.header('Access-Control-Allow-Origin', '*');
	res.header(
		'Access-Control-Allow-Methods',
		'GET, POST, PUT, DELETE, OPTIONS',
	);
	res.header(
		'Access-Control-Allow-Headers',
		'Origin, X-Requested-With, Content-Type, Accept, Authorization, tenant-id, user-id',
	);

	// Handle OPTIONS preflight
	if (req.method === 'OPTIONS') {
		res.sendStatus(200);
		return;
	}

	next();
}

