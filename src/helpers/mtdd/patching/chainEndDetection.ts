/**
 * Chain-End Detection
 *
 * Patches promise chain-ending methods to auto-execute MTDD queries
 */

import type { KnexQueryObject } from '@/types';
import { mtddLogger } from '@/utils/logger';
import { performMtddAutoActions } from '../actions/performMtddActions';

/**
 * Setup chain-end detection for MTDD queries
 *
 * Patches methods like .then(), .catch(), .finally(), .stream(), .pipe()
 * to automatically execute queries via gRPC when the promise chain ends
 *
 * @param queryObject - Knex query object
 */
export function setupChainEndDetection(queryObject: KnexQueryObject): void {
	const chainEndMethods = ['then', 'catch', 'finally', 'stream', 'pipe'];

	chainEndMethods.forEach((endMethod) => {
		if (
			queryObject[endMethod] &&
			typeof queryObject[endMethod] === 'function'
		) {
			const originalEndMethod = queryObject[endMethod];

			// biome-ignore lint/suspicious/noExplicitAny: Required to preserve chain-end method signatures
			queryObject[endMethod] = function (...endArgs: any[]) {
				// Chain is ending - auto-append toSQL() if not already called
				if (queryObject._mtddMeta && !queryObject._toSQLCalled) {
					const sqlResult = queryObject.toSQL();

					// Mark that we auto-appended toSQL()
					if (sqlResult.options?.mtdd) {
						sqlResult.options.mtdd.toSQLAppended = true;

						// Perform special MTDD actions and execute via gRPC
						const executeViaGrpc = async () => {
							try {
								const result = await performMtddAutoActions(
									queryObject,
									sqlResult,
								);
								return result;
							} catch (error) {
								mtddLogger.error(
									{ error: (error as Error).message },
									'Query execution failed',
								);
								throw error;
							}
						};

						queryObject._toSQLCalled = true;

						if (endMethod === 'then') {
							// For .then(), execute via gRPC and return the actual result
							return executeViaGrpc()
								.then((result) => {
									if (endArgs[0] && typeof endArgs[0] === 'function') {
										try {
											return endArgs[0](result);
										} catch (error) {
											return Promise.reject(error);
										}
									}
									return result;
								})
								.catch((error) => {
									if (endArgs[1] && typeof endArgs[1] === 'function') {
										return endArgs[1](error);
									}
									throw error;
								});
						} else if (endMethod === 'catch') {
							// For .catch(), execute via gRPC first, then handle catch
							return executeViaGrpc()
								.then((result) => result)
								.catch((error) => {
									if (endArgs[0] && typeof endArgs[0] === 'function') {
										return endArgs[0](error);
									}
									throw error;
								});
						} else if (endMethod === 'finally') {
							// For .finally(), execute via gRPC and then run finally callback
							return executeViaGrpc().finally(() => {
								if (endArgs[0] && typeof endArgs[0] === 'function') {
									try {
										endArgs[0]();
									} catch (error) {
										mtddLogger.warn({ error }, 'Error in finally callback');
									}
								}
							});
						} else if (endMethod === 'stream' || endMethod === 'pipe') {
							// For stream operations, execute via gRPC and create a readable stream
							const { Readable } = require('node:stream');
							const readable = new Readable({ objectMode: true });

							executeViaGrpc()
								.then((result) => {
									if (Array.isArray(result)) {
										result.forEach((row) => {
											readable.push(row);
										});
									} else {
										readable.push(result);
									}
									readable.push(null); // End the stream
								})
								.catch((error) => {
									readable.emit('error', error);
								});

							return readable;
						}

						// Default: execute via gRPC and return promise
						return executeViaGrpc();
					}

					// Fallback if no MTDD metadata options
					queryObject._toSQLCalled = true;
					return Promise.resolve([]);
				}

				// If no MTDD metadata or toSQL already called, but still has MTDD metadata
				if (queryObject._mtddMeta) {
					mtddLogger.debug(
						'MTDD query without auto-append detected - returning empty result',
					);

					if (
						endMethod === 'then' &&
						endArgs[0] &&
						typeof endArgs[0] === 'function'
					) {
						try {
							return Promise.resolve(endArgs[0]([]));
						} catch (error) {
							return Promise.reject(error);
						}
					}
					return Promise.resolve([]);
				}

				// If no MTDD metadata at all, allow normal Knex behavior
				return originalEndMethod.apply(this, endArgs);
			};
		}
	});
}
