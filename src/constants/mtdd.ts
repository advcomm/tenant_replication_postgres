/**
 * MTDD Constants
 *
 * Static configuration and method definitions for MTDD routing
 */

import type { MtddMeta } from '@/types/mtdd';

/**
 * Default MTDD metadata values
 * Applied when .mtdd() is called without explicit options
 */
export const MTDD_DEFAULTS: Partial<MtddMeta> = {
	operationType: 'read',
	timeout: 5000,
	cacheTTL: 300,
	auditLog: false,
	skipCache: false,
	maxRetries: 3,
	readPreference: 'primary',
};

/**
 * PostgreSQL/Knex client methods that need MTDD patching
 * Maps method name to description for documentation/logging
 */
export const PG_CLIENT_METHODS: Record<string, string> = {
	// SELECT operations
	select: 'SELECT - Column selection with optional aliasing',
	distinct: 'DISTINCT - Remove duplicate rows from result set',

	// INSERT operations
	insert: 'INSERT - Insert new records into table',

	// UPDATE operations
	update: 'UPDATE - Modify existing records in table',

	// WHERE clause operations
	where: 'WHERE - Basic conditional filtering',
	whereIn: 'WHERE IN - Filter by values in array',
	whereNotIn: 'WHERE NOT IN - Filter by values not in array',
	whereNull: 'WHERE NULL - Filter by null values',
	whereNotNull: 'WHERE NOT NULL - Filter by non-null values',
	whereBetween: 'WHERE BETWEEN - Filter by value range',
	whereNotBetween: 'WHERE NOT BETWEEN - Filter by values outside range',
	andWhere: 'AND WHERE - Additional AND condition',
	orWhere: 'OR WHERE - Alternative OR condition',
	whereExists: 'WHERE EXISTS - Filter by subquery existence',
	whereNotExists: 'WHERE NOT EXISTS - Filter by subquery non-existence',
	whereRaw: 'WHERE RAW - Raw SQL where clause',

	// ORDER BY operations
	orderBy: 'ORDER BY - Sort results by column(s)',
	orderByRaw: 'ORDER BY RAW - Raw SQL ordering',

	// JOIN operations
	join: 'JOIN - Inner join tables',
	leftJoin: 'LEFT JOIN - Left outer join tables',
	rightJoin: 'RIGHT JOIN - Right outer join tables',
	innerJoin: 'INNER JOIN - Explicit inner join tables',
	fullOuterJoin: 'FULL OUTER JOIN - Full outer join tables',
	crossJoin: 'CROSS JOIN - Cartesian product join',
	joinRaw: 'JOIN RAW - Raw SQL join',

	// GROUP BY and aggregation
	groupBy: 'GROUP BY - Group results by column(s)',
	groupByRaw: 'GROUP BY RAW - Raw SQL grouping',
	having: 'HAVING - Filter grouped results',
	havingIn: 'HAVING IN - Group filter by array values',
	havingNotIn: 'HAVING NOT IN - Group filter excluding array values',
	havingNull: 'HAVING NULL - Group filter by null values',
	havingNotNull: 'HAVING NOT NULL - Group filter by non-null values',
	havingBetween: 'HAVING BETWEEN - Group filter by value range',
	havingNotBetween: 'HAVING NOT BETWEEN - Group filter excluding range',
	havingRaw: 'HAVING RAW - Raw SQL having clause',

	// LIMIT and pagination
	limit: 'LIMIT - Restrict number of returned rows',
	offset: 'OFFSET - Skip number of rows for pagination',

	// DELETE operations
	delete: 'DELETE - Remove records from table',
	del: 'DELETE - Alias for delete operation',

	// TABLE operations
	from: 'FROM - Specify source table(s)',
	table: 'TABLE - Set target table',

	// Advanced operations
	union: 'UNION - Combine result sets',
	unionAll: 'UNION ALL - Combine result sets with duplicates',
	intersect: 'INTERSECT - Get intersection of result sets',
	except: 'EXCEPT - Get difference of result sets',

	// Window functions and analytics
	count: 'COUNT - Count number of rows',
	countDistinct: 'COUNT DISTINCT - Count unique values',
	min: 'MIN - Get minimum value',
	max: 'MAX - Get maximum value',
	sum: 'SUM - Calculate sum of values',
	sumDistinct: 'SUM DISTINCT - Sum of unique values',
	avg: 'AVG - Calculate average value',
	avgDistinct: 'AVG DISTINCT - Average of unique values',

	// Additional utility methods
	clone: 'CLONE - Create copy of query builder',
	timeout: 'TIMEOUT - Set query timeout',
	connection: 'CONNECTION - Use specific connection',
	options: 'OPTIONS - Set query options',
	returning: 'RETURNING - Specify returned columns for INSERT/UPDATE/DELETE',
	onConflict: 'ON CONFLICT - Handle constraint conflicts (PostgreSQL)',
	ignore: 'IGNORE - Ignore constraint violations (MySQL)',
	merge: 'MERGE - Upsert operation',

	// Conditional operations
	when: 'WHEN - Conditional query building',
	unless: 'UNLESS - Negative conditional query building',
};

/**
 * Methods that should trigger IsReRun=true flag
 * These methods require complex query execution handling
 */
export const RE_RUN_METHODS = new Set([
	'distinct',
	'having',
	'havingIn',
	'havingNotIn',
	'havingNull',
	'havingNotNull',
	'havingBetween',
	'havingNotBetween',
	'havingRaw',
	'limit',
	'groupBy',
	'groupByRaw',
	'orderBy',
	'orderByRaw',
]);

/**
 * Promise chain-ending methods that trigger query execution
 */
export const CHAIN_END_METHODS = ['then', 'catch', 'finally', 'stream', 'pipe'];
