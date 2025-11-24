/**
 * Validation Middleware
 *
 * Input validation using Zod schemas
 */

import type { NextFunction, Request, Response } from 'express';
import { type ZodError, type ZodSchema, z } from 'zod';
import { SyncChangeAction } from '@/types/api';
import { apiLogger } from '@/utils/logger';

const numericTransform = z.union([z.string(), z.number()]).transform((val) => {
	const num = typeof val === 'number' ? val : Number(val);
	return Number.isNaN(num) ? undefined : num;
});

const actionEnumSchema = z.nativeEnum(SyncChangeAction);

const actionStringSchema = z
	.string()
	.transform((value) => value.toLowerCase())
	.refine(
		(value) =>
			Object.values(SyncChangeAction).includes(value as SyncChangeAction),
		'Invalid action value',
	);

const syncChangeSchema = z.object({
	clientTxid: z.union([z.number(), z.string()]),
	table_name: z.string().min(1, 'table_name is required'),
	record_pk: z.union([z.string(), z.number(), z.null()]).optional(),
	mtds_device_id: z.union([z.number(), z.string()]),
	action: z
		.union([actionEnumSchema, actionStringSchema, z.number(), z.null()])
		.optional(),
	payload: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
});

/**
 * Validation schemas for API endpoints
 */
export const schemas = {
	loadData: z.object({
		lastUpdated: numericTransform.optional(),
		deviceId: z.string().optional(),
	}),
	tableNameParam: z.object({
		tableName: z.string().min(1, 'Table name is required'),
	}),
	syncChanges: z.object({
		changes: z
			.array(syncChangeSchema)
			.min(1, 'At least one change is required'),
	}),
	syncLoad: z.object({
		tables: z.array(z.string().min(1, 'Table name cannot be empty')).min(1),
		lastUpdated: numericTransform.optional(),
		tenantId: z.union([z.string(), z.number()]).optional(),
		deviceId: z.string().optional(),
	}),
};

/**
 * Validation error response format
 */
interface ValidationErrorResponse {
	error: string;
	details?: Array<{
		field: string;
		message: string;
	}>;
}

/**
 * Format Zod validation errors for API response
 */
function formatZodError(error: ZodError): ValidationErrorResponse {
	return {
		error: 'Validation failed',
		details: error.issues.map((err) => ({
			field: err.path.join('.'),
			message: err.message,
		})),
	};
}

/**
 * Create validation middleware for query parameters
 *
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 */
export function validateQuery(schema: ZodSchema) {
	return (req: Request, res: Response, next: NextFunction): void => {
		try {
			// Validate and transform query parameters
			const validated = schema.parse(req.query);

			// Replace req.query with validated/transformed data
			req.query = validated as Request['query'];

			apiLogger.debug({ validated }, 'Query parameters validated');
			next();
		} catch (error) {
			if (error instanceof z.ZodError) {
				apiLogger.warn(
					{ errors: error.issues },
					'Query parameter validation failed',
				);

				res.status(400).json(formatZodError(error));
			} else {
				apiLogger.error({ error }, 'Unexpected validation error');
				res.status(500).json({ error: 'Internal validation error' });
			}
		}
	};
}

/**
 * Create validation middleware for request body
 *
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 */
export function validateBody(schema: ZodSchema) {
	return (req: Request, res: Response, next: NextFunction): void => {
		try {
			// Validate and transform body
			const validated = schema.parse(req.body);

			// Replace req.body with validated/transformed data
			req.body = validated as Request['body'];

			apiLogger.debug({ validated }, 'Request body validated');
			next();
		} catch (error) {
			if (error instanceof z.ZodError) {
				apiLogger.warn({ errors: error.issues }, 'Body validation failed');

				res.status(400).json(formatZodError(error));
			} else {
				apiLogger.error({ error }, 'Unexpected validation error');
				res.status(500).json({ error: 'Internal validation error' });
			}
		}
	};
}

/**
 * Create validation middleware for path parameters
 *
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 */
export function validateParams(schema: ZodSchema) {
	return (req: Request, res: Response, next: NextFunction): void => {
		try {
			// Validate and transform path parameters
			const validated = schema.parse(req.params);

			// Replace req.params with validated/transformed data
			req.params = validated as Request['params'];

			apiLogger.debug({ validated }, 'Path parameters validated');
			next();
		} catch (error) {
			if (error instanceof z.ZodError) {
				apiLogger.warn(
					{ errors: error.issues },
					'Path parameter validation failed',
				);

				res.status(400).json(formatZodError(error));
			} else {
				apiLogger.error({ error }, 'Unexpected validation error');
				res.status(500).json({ error: 'Internal validation error' });
			}
		}
	};
}
