/**
 * SQL Query Types
 *
 * Type definitions for SQL parameters and query objects
 */

import type { Knex } from 'knex';

/**
 * SQL parameter value types
 */
export type SqlParameterValue =
	| string
	| number
	| boolean
	| null
	| Date
	| Buffer
	| SqlParameterValue[];

/**
 * SQL parameters - can be positional array or named object
 */
export type SqlParameters =
	| SqlParameterValue[]
	| Record<string, SqlParameterValue>;

/**
 * Knex query object with MTDD metadata support
 * This represents any Knex query builder or raw query instance
 *
 * Using a flexible interface that works with both QueryBuilder and Raw
 */
export interface KnexQueryObject {
	// biome-ignore lint/suspicious/noExplicitAny: Knex toSQL accepts variable arguments and returns Sql object
	toSQL: (...args: any[]) => any;

	// biome-ignore lint/suspicious/noExplicitAny: MTDD method accepts flexible input types
	mtdd: (
		// biome-ignore lint/suspicious/noExplicitAny: Can be string, number, or MtddMeta object
		tenantIdOrMeta?: string | number | any,
		tenantType?: number | string | null,
		methodType?: 'addTenantShard' | 'executeQuery' | 'auto',
		// biome-ignore lint/suspicious/noExplicitAny: Partial options object with dynamic properties
		options?: Partial<any>,
		// biome-ignore lint/suspicious/noExplicitAny: Returns this for fluent chaining
	) => any;

	// biome-ignore lint/suspicious/noExplicitAny: MTDD metadata contains dynamic properties
	_mtddMeta?: any;
	_toSQLCalled?: boolean;
	_toSQLPatched?: boolean;
	_chainEndSetup?: boolean;

	// biome-ignore lint/suspicious/noExplicitAny: Allow dynamic Knex properties and promise methods
	[key: string]: any;
}

/**
 * Type guard to check if a value is a Knex query object
 */
export function isKnexQueryObject(obj: unknown): obj is KnexQueryObject {
	return (
		typeof obj === 'object' &&
		obj !== null &&
		'toSQL' in obj &&
		typeof (obj as KnexQueryObject).toSQL === 'function'
	);
}

/**
 * gRPC client type (external library doesn't export proper types)
 */
export interface GrpcClient {
	executeQuery: (
		request: any,
		callback: (error: unknown, response: unknown) => void,
	) => void;
	lookupTenantShard: (
		request: any,
		callback: (error: unknown, response: unknown) => void,
	) => void;
	addTenantShard: (
		request: any,
		callback: (error: unknown, response: unknown) => void,
	) => void;
	listenToChannel: (request: any) => any;
}
