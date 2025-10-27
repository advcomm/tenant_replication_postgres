/**
 * Raw Query Patching
 *
 * Patches Knex Raw queries to support MTDD functionality
 */

import type { Knex } from 'knex';
import type { SqlResult } from '@/types/mtdd';
import { mtddLogger } from '@/utils/logger';
import { createMtddMethod } from '../mtddMethod';

/**
 * Patch Raw query prototype with MTDD support
 * @param knexInstance - The Knex instance to get the Raw class from
 */
export function patchRawQueries(knexInstance: Knex): void {
	// Get Raw class from the actual Knex instance to ensure we patch the right prototype
	// This is critical when library and user have different Knex versions/installations
	const dummyRaw = knexInstance.raw('SELECT 1');
	const Raw = dummyRaw.constructor;
	const rawProto = Raw.prototype;

	if (!rawProto.mtdd) {
		const originalToSQL_Raw = rawProto.toSQL;

		// Core MTDD method for Raw queries (using factory, no IsReRun preservation)
		rawProto.mtdd = createMtddMethod(false);

		// Override toSQL to include MTDD metadata in raw query options
		// biome-ignore lint/suspicious/noExplicitAny: Required to preserve toSQL method signature
		rawProto.toSQL = function (...args: any[]): SqlResult {
			const result: SqlResult = originalToSQL_Raw.apply(this, args);
			if (this._mtddMeta) {
				result.options = {
					...result.options,
					mtdd: {
						...this._mtddMeta,
						toSQLAppended: false, // Default for manual calls
					},
				};

				// Only perform special MTDD actions if toSQL was manually called by user
				// When manually called, we preserve normal Knex behavior
				if (!this._mtddMeta.toSQLAppended) {
					mtddLogger.debug(
						{ operation: this._mtddMeta?.operation || 'unknown' },
						'Manual toSQL() call detected for RAW query',
					);
					mtddLogger.debug(
						'Preserving normal Knex behavior - no special MTDD actions, no database execution',
					);
				}
			}
			return result;
		};

		mtddLogger.info('Raw queries patched for MTDD routing');
	}
}
