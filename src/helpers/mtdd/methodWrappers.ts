/**
 * MTDD Method Wrappers
 *
 * Helper functions to create method wrappers that preserve MTDD metadata
 */

/**
 * Helper function to create a method wrapper that preserves MTDD metadata
 * This eliminates code duplication and makes the patching more maintainable
 *
 * Note: `any` types are required here for dynamic prototype patching
 * - `this: any` - allows binding to any Knex prototype
 * - `...args: any[]` - preserves any method signature
 * - return `any` - maintains Knex's fluent interface
 */
export function createMtddMethodWrapper(originalMethod: Function) {
	// biome-ignore lint/suspicious/noExplicitAny: Required for dynamic prototype patching
	return function (this: any, ...args: any[]): any {
		const result = originalMethod.apply(this, args);
		// Preserve MTDD metadata across method calls
		if (this._mtddMeta && result && typeof result === 'object') {
			result._mtddMeta = this._mtddMeta;
		}
		return result;
	};
}

/**
 * Specialized wrapper for methods that trigger IsReRun=true
 * These are complex query methods that typically require re-execution or special handling
 *
 * Note: `any` types are required here for dynamic prototype patching (see createMtddMethodWrapper)
 */
export function createReRunMethodWrapper(
	originalMethod: Function,
	methodName: string,
) {
	// biome-ignore lint/suspicious/noExplicitAny: Required for dynamic prototype patching
	return function (this: any, ...args: any[]): any {
		const result = originalMethod.apply(this, args);

		// Initialize MTDD metadata if it doesn't exist
		if (!this._mtddMeta) {
			this._mtddMeta = {};
		}

		// Always set IsReRun=true for complex query methods (override any manual setting)
		this._mtddMeta.IsReRun = true;

		// Special handling for HAVING methods - extract and store their values
		if (methodName.includes('having')) {
			if (!this._mtddMeta.havingConditions) {
				this._mtddMeta.havingConditions = [];
			}

			// Store the having condition details
			const havingCondition = {
				method: methodName,
				args: [...args],
				timestamp: Date.now(),
			};

			this._mtddMeta.havingConditions.push(havingCondition);

			// Also create a summary for easier access
			if (!this._mtddMeta.havingSummary) {
				this._mtddMeta.havingSummary = {
					totalConditions: 0,
					methods: [],
					complexity: 'simple',
				};
			}

			this._mtddMeta.havingSummary.totalConditions++;
			if (!this._mtddMeta.havingSummary.methods.includes(methodName)) {
				this._mtddMeta.havingSummary.methods.push(methodName);
			}

			// Determine complexity based on number and type of having conditions
			const conditionCount = this._mtddMeta.havingSummary.totalConditions;
			const hasComplexMethods = this._mtddMeta.havingSummary.methods.some(
				(m: string) =>
					[
						'havingIn',
						'havingNotIn',
						'havingBetween',
						'havingNotBetween',
						'havingRaw',
					].includes(m),
			);

			if (conditionCount > 3 || hasComplexMethods) {
				this._mtddMeta.havingSummary.complexity = 'complex';
			} else if (conditionCount > 1) {
				this._mtddMeta.havingSummary.complexity = 'moderate';
			}
		}

		// Preserve MTDD metadata across method calls
		if (result && typeof result === 'object') {
			result._mtddMeta = { ...this._mtddMeta };
			result._mtddMeta.IsReRun = true; // Ensure it's always set on the result too
		}

		return result;
	};
}
