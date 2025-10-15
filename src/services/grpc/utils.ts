/**
 * gRPC Utility Functions
 *
 * Helper functions for gRPC response parsing and data conversion
 */

import { grpcLogger } from '@/utils/logger';

/**
 * Parse response helper function - extracts result data to match PostgreSQL format
 */
export function parseResponse(response: unknown): unknown {
	// If response is null or undefined, return as-is
	if (!response) {
		return response;
	}
	// If response is already properly formatted, return as-is
	if (response && typeof response === 'object') {
		grpcLogger.debug('Response already in correct format');
		return response;
	}

	// Try to parse if it's a string
	if (typeof response === 'string') {
		try {
			const parsed = JSON.parse(response);
			// Recursively process the parsed object to extract result if needed
			return parseResponse(parsed);
		} catch {
			return { data: response };
		}
	}

	return response;
}

/**
 * Utility function to convert BigInt values to strings recursively
 */
export function convertBigIntToString(obj: unknown): unknown {
	if (obj === null || obj === undefined) {
		return obj;
	}

	if (typeof obj === 'bigint') {
		return obj.toString();
	}

	if (Array.isArray(obj)) {
		return obj.map(convertBigIntToString);
	}

	if (typeof obj === 'object') {
		const converted: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(obj)) {
			converted[key] = convertBigIntToString(value);
		}
		return converted;
	}

	return obj;
}
