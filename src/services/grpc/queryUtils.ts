/**
 * gRPC Query Utilities
 *
 * Helper functions for query parameter processing and conversion
 */

/**
 * Check if query contains named parameters (e.g., ${id}, ${status})
 */
export function hasNamedParameters(query: string): boolean {
  const parameterRegex = /\$\{(\w+)\}/g;
  return parameterRegex.test(query);
}

/**
 * Check if query contains Knex-style question mark placeholders
 */
export function hasQuestionMarkParameters(query: string): boolean {
  return query.includes('?');
}

/**
 * Convert Knex-style question mark placeholders to PostgreSQL positional parameters
 */
export function convertQuestionMarksToPositional(query: string): string {
  let paramIndex = 1;
  return query.replace(/\?/g, () => `$${paramIndex++}`);
}

/**
 * Process named parameters and convert to positional parameters
 */
export function processNamedParameters(
  query: string,
  values: Record<string, any> = {},
): { query: string; params: any[] } {
  // Find all named parameters in the query (e.g., ${id}, ${status})
  const parameterRegex = /\$\{(\w+)\}/g;
  const foundParameters: string[] = [];
  const params: any[] = [];
  let match;

  // Extract all parameter names from the query
  while ((match = parameterRegex.exec(query)) !== null) {
    foundParameters.push(match[1]);
  }

  // Check if all found parameters exist in values object
  const missingParameters = foundParameters.filter((param) => !(param in values));
  if (missingParameters.length > 0) {
    throw new Error(
      `Missing parameters: ${missingParameters.join(', ')}. Required parameters: ${foundParameters.join(', ')}`,
    );
  }

  // Replace named parameters with PostgreSQL positional parameters ($1, $2, etc.)
  let processedQuery = query;
  let paramIndex = 1;

  foundParameters.forEach((paramName) => {
    const namedParam = `\${${paramName}}`;
    const positionalParam = `$${paramIndex}`;

    // Replace the first occurrence of this named parameter
    processedQuery = processedQuery.replace(namedParam, positionalParam);
    params.push(values[paramName]);
    paramIndex++;
  });

  return { query: processedQuery, params };
}

/**
 * Process query parameters based on their format
 */
export function processQueryParameters(
  query: string,
  valuesOrBindings: Record<string, any> | any[],
  logPrefix: string = '',
): { query: string; params: any[] } {
  let processedQuery = query;
  let params: any[];

  // Handle both named parameters and direct bindings array
  if (Array.isArray(valuesOrBindings)) {
    // Direct bindings array from Knex - convert ? to $1, $2, etc.
    params = valuesOrBindings;
    if (hasQuestionMarkParameters(query)) {
      processedQuery = convertQuestionMarksToPositional(query);
      if (logPrefix) {
        console.log(`🔄 [${logPrefix}] Converted ? placeholders to PostgreSQL format:`, processedQuery);
      }
    }
  } else if (hasNamedParameters(query)) {
    // Named parameters - convert to positional
    const result = processNamedParameters(query, valuesOrBindings);
    processedQuery = result.query;
    params = result.params;
  } else if (hasQuestionMarkParameters(query)) {
    // Knex-style ? parameters without bindings array
    processedQuery = convertQuestionMarksToPositional(query);
    params = [];
    if (logPrefix) {
      console.log(
        `🔄 [${logPrefix}] Converted ? placeholders to PostgreSQL format (no bindings):`,
        processedQuery,
      );
    }
  } else {
    // No parameters or empty object
    params = [];
  }

  return { query: processedQuery, params };
}

