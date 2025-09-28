import * as grpc from '@grpc/grpc-js';

// Interfaces for channel listening
export interface ChannelRequest {
  channelName: string;
}

export interface ChannelResponse {
  channelName: string;
  data: string;
  timestamp: string;
}

// Backend servers configuration
const backendServers: string[] = [];

// Load from environment or use defaults
if (process.env.NODE_ENV !== 'development') {

  const serverList = JSON.parse(process.env.BACKEND_SERVERS || '[]');
  if (serverList)
    backendServers.push(...serverList);
  else
    throw new Error('No backend servers configured. Please set BACKEND_SERVERS environment variable.');

} else {
  const serverList = JSON.parse(process.env.BACKEND_SERVERS || '["127.0.0.1"]');
  backendServers.push(...serverList);
}
// Single server deployment detection
const IS_SINGLE_SERVER_DEPLOYMENT = backendServers.length === 1;
if (process.env.NODE_ENV !== 'development') {


  console.log(`🏗️  [GRPC-CONFIG] Backend Servers: ${backendServers.length} server(s)`);
  console.log(`🏗️  [GRPC-CONFIG] Servers: ${backendServers.join(', ')}`);
  console.log(`🏗️  [GRPC-CONFIG] Deployment Mode: ${IS_SINGLE_SERVER_DEPLOYMENT ? 'Single Server (Simplified)' : 'Multi-Server (MTDD)'}`);


  if (IS_SINGLE_SERVER_DEPLOYMENT) {
    console.log(`🎯 [GRPC-CONFIG] Single server detected - MTDD optimizations will be bypassed for simplified routing`);
  }
}

// Manual gRPC service definition for database operations
const dbServiceDefinition = {
  executeQuery: {
    path: '/DB.DBService/executeQuery',
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: any) => Buffer.from(JSON.stringify(value)),
    requestDeserialize: (buffer: Buffer) => JSON.parse(buffer.toString()),
    responseSerialize: (value: any) => Buffer.from(JSON.stringify(value)),
    responseDeserialize: (buffer: Buffer) => JSON.parse(buffer.toString()),
  },
  listenToChannel: {
    path: '/DB.DBService/listenToChannel',
    requestStream: false,
    responseStream: true, // This enables streaming responses
    requestSerialize: (value: any) => Buffer.from(JSON.stringify(value)),
    requestDeserialize: (buffer: Buffer) => JSON.parse(buffer.toString()),
    responseSerialize: (value: any) => Buffer.from(JSON.stringify(value)),
    responseDeserialize: (buffer: Buffer) => JSON.parse(buffer.toString()),
  }
};

// Lookup service definition for tenant shard mapping
const lookupServiceDefinition = {
  getTenantShard: {
    path: '/MTDD.LookupService/getTenantShard',
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: any) => Buffer.from(JSON.stringify(value)),
    requestDeserialize: (buffer: Buffer) => JSON.parse(buffer.toString()),
    responseSerialize: (value: any) => Buffer.from(JSON.stringify(value)),
    responseDeserialize: (buffer: Buffer) => JSON.parse(buffer.toString()),
  },
  addTenantShard: {
    path: '/MTDD.LookupService/addTenantShard',
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: any) => Buffer.from(JSON.stringify(value)),
    requestDeserialize: (buffer: Buffer) => JSON.parse(buffer.toString()),
    responseSerialize: (value: any) => Buffer.from(JSON.stringify(value)),
    responseDeserialize: (buffer: Buffer) => JSON.parse(buffer.toString()),
  }
};

// Create gRPC client constructor
const DBServiceClient = grpc.makeGenericClientConstructor(
  dbServiceDefinition,
  'DB'
);

// Create lookup service client constructor
const LookupServiceClient = grpc.makeGenericClientConstructor(
  lookupServiceDefinition,
  'MTDD'
);

// Create client instances for all backend servers
const clients: any = backendServers.map(server => {
  if (process.env.NODE_ENV !== 'development') {
    return  new DBServiceClient(
        `${server}`,
        grpc.credentials.createSsl(Buffer.from(`-----BEGIN CERTIFICATE-----
    MIIEDjCCAvagAwIBAgIUGCEDu7QmO7Sn1B23BNlfjf9tuRUwDQYJKoZIhvcNAQEL
    BQAwczELMAkGA1UEBhMCVVMxDjAMBgNVBAgMBVN0YXRlMQ0wCwYDVQQHDARDaXR5
    MRUwEwYDVQQKDAxPcmdhbml6YXRpb24xFjAUBgNVBAsMDUlUIERlcGFydG1lbnQx
    FjAUBgNVBAMMDTk1LjIxNi4xODkuNjAwHhcNMjUwODE5MTMzODEwWhcNMjYwODE5
    MTMzODEwWjBzMQswCQYDVQQGEwJVUzEOMAwGA1UECAwFU3RhdGUxDTALBgNVBAcM
    BENpdHkxFTATBgNVBAoMDE9yZ2FuaXphdGlvbjEWMBQGA1UECwwNSVQgRGVwYXJ0
    bWVudDEWMBQGA1UEAwwNOTUuMjE2LjE4OS42MDCCASIwDQYJKoZIhvcNAQEBBQAD
    ggEPADCCAQoCggEBANVisy9f1amkVSc9tRgxOAhmbYo/T4x3FjEphHqvnY5feCH1
    GkTl/LBMDwwHYMI1Jt7fqxR7R1X/FbH8ve37ovRjJsgh6zG61d/xdtz3xqmmUNuT
    x+DU66KAP/6NjT1Xal7t1HfjKDqJ1cF9VfBpd8SlK1cSTlmM/w3Ayoka9+zksxeQ
    zbz3/34rnCvTbUKJcGfBlh1b3GfJeoqHQBqtshU2AES90/INjtzDtUHY7FMR/6Mm
    VsO1nhhgZTu/+JUvCE9WBxl5Teya9srHzt4uBmUPCgZbwigKnsUGwkv1Eniwo+MY
    zDNsyVmWRAEcb3Uo+/YHx5pNfrlEYSZ+NdJW04UCAwEAAaOBmTCBljAOBgNVHQ8B
    Af8EBAMCA6gwIAYDVR0lAQH/BBYwFAYIKwYBBQUHAwEGCCsGAQUFBwMCMDUGA1Ud
    EQEB/wQrMCmHBF/YvTyCDTk1LjIxNi4xODkuNjCCCWxvY2FsaG9zdIIHKi5sb2Nh
    bDAMBgNVHRMBAf8EAjAAMB0GA1UdDgQWBBR94NkZpzh55M17RTu4z+2je0XwITAN
    BgkqhkiG9w0BAQsFAAOCAQEAqv/stnFVsNUlnba7RzsY743Nox/l24/aa+mbclyj
    fwdlu5aIBT8PkROJg+Qp6TvexD/tiRT5zJFKO4yT/p5lDQb9bktKLzpaRoFfijV0
    7cN5IyMMPcCZ+Oqv4WPSzOIsS3TRXXsA535I2wcota2JCsXTaEaivZ49eLAOT4X/
    4yw5hdYCLCZoFKyoCi9fVRVpM0ktN3VtQE4+VfR7CVK6sSIW7DryxEd7hnjMdroo
    1X6emed5cVU4ddys45QNX3yMo29jmFglC+fZryQulX1cqa3s1SR+tJWWxX0o+Drn
    a3mUx29+bYa8bEo5+ePaewxP4YPCyKAHxjIMRS5SyMSIUw==
    -----END CERTIFICATE-----`)),
        {
          'grpc.max_receive_message_length': 256 * 1024 * 1024,
          'grpc.max_send_message_length': 256 * 1024 * 1024,
          // ⬇️ Stop Node from sending SNI (prevents the RFC 6066 warning)
         'grpc.ssl_target_name_override': 'localhost',
      // Keep HTTP/2 :authority as the IP (so routing stays the same)
      'grpc.default_authority': '95.216.189.60',
        }
      )
    // return new DBServiceClient(
    //   `${server}:50051`,
    //   grpc.credentials.createInsecure()
    // );
  } else {
    return undefined;
  }

});

// Create lookup service client instance
const lookupServer = process.env.NODE_ENV !== 'development' ? JSON.parse(process.env.LOOKUP_SERVER || '["127.0.0.1"]') : '["127.0.0.1"]'; // Default to first server or env var
if (!lookupServer) {
  throw new Error('No lookup server configured. Please set LOOKUP_SERVER environment variable.');
}
let lookupClient: any;
if (process.env.NODE_ENV !== 'development') {
  lookupClient = new LookupServiceClient(
    `${lookupServer[0]}`,
    grpc.credentials.createSsl(Buffer.from(`-----BEGIN CERTIFICATE-----
MIIEDjCCAvagAwIBAgIUGCEDu7QmO7Sn1B23BNlfjf9tuRUwDQYJKoZIhvcNAQEL
BQAwczELMAkGA1UEBhMCVVMxDjAMBgNVBAgMBVN0YXRlMQ0wCwYDVQQHDARDaXR5
MRUwEwYDVQQKDAxPcmdhbml6YXRpb24xFjAUBgNVBAsMDUlUIERlcGFydG1lbnQx
FjAUBgNVBAMMDTk1LjIxNi4xODkuNjAwHhcNMjUwODE5MTMzODEwWhcNMjYwODE5
MTMzODEwWjBzMQswCQYDVQQGEwJVUzEOMAwGA1UECAwFU3RhdGUxDTALBgNVBAcM
BENpdHkxFTATBgNVBAoMDE9yZ2FuaXphdGlvbjEWMBQGA1UECwwNSVQgRGVwYXJ0
bWVudDEWMBQGA1UEAwwNOTUuMjE2LjE4OS42MDCCASIwDQYJKoZIhvcNAQEBBQAD
ggEPADCCAQoCggEBANVisy9f1amkVSc9tRgxOAhmbYo/T4x3FjEphHqvnY5feCH1
GkTl/LBMDwwHYMI1Jt7fqxR7R1X/FbH8ve37ovRjJsgh6zG61d/xdtz3xqmmUNuT
x+DU66KAP/6NjT1Xal7t1HfjKDqJ1cF9VfBpd8SlK1cSTlmM/w3Ayoka9+zksxeQ
zbz3/34rnCvTbUKJcGfBlh1b3GfJeoqHQBqtshU2AES90/INjtzDtUHY7FMR/6Mm
VsO1nhhgZTu/+JUvCE9WBxl5Teya9srHzt4uBmUPCgZbwigKnsUGwkv1Eniwo+MY
zDNsyVmWRAEcb3Uo+/YHx5pNfrlEYSZ+NdJW04UCAwEAAaOBmTCBljAOBgNVHQ8B
Af8EBAMCA6gwIAYDVR0lAQH/BBYwFAYIKwYBBQUHAwEGCCsGAQUFBwMCMDUGA1Ud
EQEB/wQrMCmHBF/YvTyCDTk1LjIxNi4xODkuNjCCCWxvY2FsaG9zdIIHKi5sb2Nh
bDAMBgNVHRMBAf8EAjAAMB0GA1UdDgQWBBR94NkZpzh55M17RTu4z+2je0XwITAN
BgkqhkiG9w0BAQsFAAOCAQEAqv/stnFVsNUlnba7RzsY743Nox/l24/aa+mbclyj
fwdlu5aIBT8PkROJg+Qp6TvexD/tiRT5zJFKO4yT/p5lDQb9bktKLzpaRoFfijV0
7cN5IyMMPcCZ+Oqv4WPSzOIsS3TRXXsA535I2wcota2JCsXTaEaivZ49eLAOT4X/
4yw5hdYCLCZoFKyoCi9fVRVpM0ktN3VtQE4+VfR7CVK6sSIW7DryxEd7hnjMdroo
1X6emed5cVU4ddys45QNX3yMo29jmFglC+fZryQulX1cqa3s1SR+tJWWxX0o+Drn
a3mUx29+bYa8bEo5+ePaewxP4YPCyKAHxjIMRS5SyMSIUw==
-----END CERTIFICATE-----`)),
    {
      'grpc.max_receive_message_length': 256 * 1024 * 1024,
      'grpc.max_send_message_length': 256 * 1024 * 1024,
      // ⬇️ Stop Node from sending SNI (prevents the RFC 6066 warning)
      'grpc.ssl_target_name_override': 'localhost',
      // Keep HTTP/2 :authority as the IP (so routing stays the same)
      'grpc.default_authority': '95.216.189.60',
    }
  );
} else {
  lookupClient = new LookupServiceClient(
    `${lookupServer[0] + ':50054'}`,
    grpc.credentials.createInsecure()
  );
}

// Parse response helper function - extracts result data to match PostgreSQL format
const parseResponse = (response: any): any => {
  // If response is null or undefined, return as-is
  if (!response) {
    return response;
  }
  // If response is already properly formatted, return as-is
  if (response && typeof response === 'object') {
    console.log('🔧 [GRPC-RESPONSE] Response already in correct format');
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
};

// Function to call all servers concurrently and return first valid response (Promise.race implementation)
const callAllServersRace = async (request: any): Promise<any> => {
  if (clients.length === 0) {
    throw new Error('No backend servers available');
  }

  // Create promises for all gRPC calls
  const promises = clients.map((client: any, index: number) => {
    return new Promise((resolve, reject) => {
      client.executeQuery(request, (error: any, response: any) => {
        if (error) {
          reject(error);
        } else if (response) {
          // Parse the response before resolving
          const parsedResponse = parseResponse(response);
          resolve(parsedResponse);
        } else {
          reject(new Error(`No valid response from server ${index}`));
        }
      });
    });
  });

  // Use Promise.race to get the first response (success or failure)
  return await Promise.race(promises);
};

// Function to call all servers and return first successful response (Promise.any implementation)
const callAllServersAny = async (request: any): Promise<any> => {
  if (clients.length === 0) {
    throw new Error('No backend servers available');
  }

  // Create promises for all gRPC calls
  const promises = clients.map((client: any, index: number) => {
    return new Promise((resolve, reject) => {
      client.executeQuery(request, (error: any, response: any) => {
        if (error) {
          reject(error);
        } else if (response) {
          // Parse the response before resolving
          const parsedResponse = parseResponse(response);
          resolve(parsedResponse);
        } else {
          reject(new Error(`No valid response from server ${index}`));
        }
      });
    });
  });

  // Use Promise.any to get the first successful response
  try {
    return await Promise.any(promises);
  } catch (error) {
    // If all promises reject, throw an AggregateError
    throw new Error('All servers failed to respond successfully');
  }
};

// Function to call all servers and wait for all responses (Promise.all implementation)
const callAllServersAll = async (request: any): Promise<any[]> => {
  if (clients.length === 0) {
    throw new Error('No backend servers available');
  }

  // Create promises for all gRPC calls
  const promises = clients.map((client: any, index: number) => {
    return new Promise((resolve, reject) => {
      client.executeQuery(request, (error: any, response: any) => {
        if (error) {
          reject(error);
        } else if (response) {
          // Parse the response before resolving
          const parsedResponse = parseResponse(response);
          resolve(parsedResponse);
        } else {
          reject(new Error(`No valid response from server ${index}`));
        }
      });
    });
  });

  // Use Promise.all to wait for all responses
  return await Promise.all(promises);
};

// Legacy function - kept for backward compatibility
const callAllServers = callAllServersAny;

// Function to call specific server based on TenantID
const callSpecificServer = async (tenantId: number, request: any): Promise<any> => {
  if (clients.length === 0) {
    throw new Error('No backend servers available');
  }

  // Select server based on TenantID modulo number of servers
  const serverIndex = tenantId % clients.length;
  const selectedClient = clients[serverIndex];

  return new Promise((resolve, reject) => {
    selectedClient.executeQuery(request, (error: any, response: any) => {
      if (error) {
        reject(error);
      } else {
        const parsedResponse = parseResponse(response);
        resolve(parsedResponse);
      }
    });
  });
};

// Function to call specific server by shard index
const callSpecificServerByShard = async (shardIndex: number, request: any): Promise<any> => {
  if (clients.length === 0) {
    throw new Error('No backend servers available');
  }

  if (shardIndex < 0 || shardIndex >= clients.length) {
    throw new Error(`Invalid shard index ${shardIndex}. Available shards: 0-${clients.length - 1}`);
  }

  const selectedClient = clients[shardIndex];

  return new Promise((resolve, reject) => {
    selectedClient.executeQuery(request, (error: any, response: any) => {
      if (error) {
        reject(error);
      } else {
        const parsedResponse = parseResponse(response);
        resolve(parsedResponse);
      }
    });
  });
};

// Function to get tenant shard from lookup service
const getTenantShard = async (tenantName: string, tenantType: number): Promise<number> => {
  return new Promise((resolve, reject) => {
    const request = { tenantName, tenantType };

    lookupClient.getTenantShard(request, (error: any, response: any) => {
      if (error) {
        console.error(`❌ Error getting tenant shard for tenantName ${tenantName}:`, error.message);
        reject(error);
      } else {
        const parsedResponse = parseResponse(response);
        const shardId = parsedResponse.rows[0].shard_idx;

        if (shardId === undefined || shardId === null) {
          reject(new Error(`Invalid shard response for tenantName ${tenantName}: ${JSON.stringify(parsedResponse)}`));
        } else {
          console.log(`📍 Tenant ${tenantName} mapped to shard ${shardId}`);
          resolve(shardId);
        }
      }
    });
  });
};

// Function to add tenant shard mapping
const addTenantShard = async (tenantName: string, tenantType: number): Promise<any> => {
  return new Promise((resolve, reject) => {
    const request = { tenantName, tenantType };

    lookupClient.addTenantShard(request, (error: any, response: any) => {
      if (error) {
        console.error(`❌ Error adding tenant shard mapping for tenantName ${tenantName}:`, error.message);
        reject(error);
      } else {
        const parsedResponse = parseResponse(response);
        console.log(`✅ Added tenant ${tenantName} to shard ${tenantType}`);
        resolve(parsedResponse);
      }
    });
  });
};

// Utility function to convert BigInt values to strings recursively
function convertBigIntToString(obj: any): any {
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
    const converted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      converted[key] = convertBigIntToString(value);
    }
    return converted;
  }

  return obj;
}

// Main interface that replaces DatabaseFacade calls
export class BackendClient {

  /**
   * @deprecated Use executeQuery instead
   */
  static async callProcedure(procedureName: string, params: any[], isFunction: boolean = false, tenantId?: string): Promise<any> {
    console.warn('⚠️ callProcedure is deprecated. Use executeQuery instead.');
    // Convert any BigInt values to strings before sending
    const convertedParams = convertBigIntToString(params);

    const request = {
      name: procedureName,
      params: convertedParams || [],
      isFunction: isFunction
    };

    try {
      if (tenantId !== undefined && tenantId !== null) {
        // Get shard ID from lookup service for procedures too
        console.log(`🔍 Looking up shard for tenant ${tenantId} (procedure: ${procedureName})`);
        const shardId = await getTenantShard(tenantId, 1);

        // Call specific server based on shard ID from lookup service
        console.log(`📡 Calling procedure ${procedureName} on shard ${shardId} (TenantID: ${tenantId})`);
        return await callSpecificServerByShard(shardId, request);
      } else {
        // Call all servers concurrently and return first valid response
        console.log(`📡 Calling procedure ${procedureName} on all servers concurrently`);
        return await callAllServers(request);
      }
    } catch (error: any) {
      console.error(`❌ Backend client error for procedure ${procedureName}:`, error.message);
      throw error;
    }
  }

  // For backward compatibility - wrapper for procedures that return query results
  // static async executeQuery(query: string, params: any[], tenantId?: number): Promise<any> {
  //   // This would need a corresponding stored procedure on the backend that executes raw SQL
  //   // For now, we'll throw an error to indicate this needs to be implemented as a procedure
  //   throw new Error('Raw SQL queries not supported. Please use stored procedures instead.');
  // }



  /**
   * Check if query contains named parameters (e.g., ${id}, ${status})
   * @param query SQL query to check
   * @returns true if query contains named parameters, false otherwise
   */
  private static hasNamedParameters(query: string): boolean {
    const parameterRegex = /\$\{(\w+)\}/g;
    return parameterRegex.test(query);
  }

  /**
   * Check if query contains Knex-style question mark placeholders
   * @param query SQL query to check
   * @returns true if query contains ? placeholders, false otherwise
   */
  private static hasQuestionMarkParameters(query: string): boolean {
    return query.includes('?');
  }

  /**
   * Convert Knex-style question mark placeholders to PostgreSQL positional parameters
   * @param query SQL query with ? placeholders
   * @returns query with $1, $2, etc. placeholders
   */
  private static convertQuestionMarksToPositional(query: string): string {
    let paramIndex = 1;
    return query.replace(/\?/g, () => `$${paramIndex++}`);
  }

  private static processNamedParameters(query: string, values: Record<string, any> = {}): { query: string; params: any[] } {
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
    const missingParameters = foundParameters.filter(param => !(param in values));
    if (missingParameters.length > 0) {
      throw new Error(`Missing parameters: ${missingParameters.join(', ')}. Required parameters: ${foundParameters.join(', ')}`);
    }

    // Replace named parameters with PostgreSQL positional parameters ($1, $2, etc.)
    let processedQuery = query;
    let paramIndex = 1;

    foundParameters.forEach(paramName => {
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
   * Executes a query with named parameters
   * @param query SQL query with named parameters like 'SELECT * FROM users WHERE id = ${id}'
   * @param values Object containing parameter values like { id: 123, status: 'active' }
   * @returns Query result
   */
  public static async executeQuery(query: string, valuesOrBindings: Record<string, any> | any[] = {}, tenantName?: string): Promise<any> {
    // Single server deployment optimization
    if (IS_SINGLE_SERVER_DEPLOYMENT) {
      console.log(`🎯 [SINGLE-SERVER] Simplified routing - executing on single server (${backendServers[0]})`);

      let processedQuery = query;
      let params: any[];

      // Handle both named parameters and direct bindings array
      if (Array.isArray(valuesOrBindings)) {
        // Direct bindings array from Knex - convert ? to $1, $2, etc.
        params = valuesOrBindings;
        if (this.hasQuestionMarkParameters(query)) {
          processedQuery = this.convertQuestionMarksToPositional(query);
          console.log(`� [SINGLE-SERVER] Converted ? placeholders to PostgreSQL format:`, processedQuery);
        }
        console.log(`�📝 [SINGLE-SERVER] Using direct bindings array:`, params);
      } else if (this.hasNamedParameters(query)) {
        // Named parameters - convert to positional
        const result = this.processNamedParameters(query, valuesOrBindings);
        processedQuery = result.query;
        params = result.params;
      } else if (this.hasQuestionMarkParameters(query)) {
        // Knex-style ? parameters without bindings array
        processedQuery = this.convertQuestionMarksToPositional(query);
        params = [];
        console.log(`🔄 [SINGLE-SERVER] Converted ? placeholders to PostgreSQL format (no bindings):`, processedQuery);
      } else {
        // No parameters or empty object
        params = [];
      }

      const convertedParams = convertBigIntToString(params);
      const request = {
        query: processedQuery,
        params: convertedParams || []
      };

      try {
        console.log(`📡 [SINGLE-SERVER] Executing query directly on ${backendServers[0]}`);

        const selectedClient = clients[0]; // Use first (and only) client

        return new Promise((resolve, reject) => {
          selectedClient.executeQuery(request, (error: any, response: any) => {
            if (error) {
              console.error(`❌ [SINGLE-SERVER] Query execution failed:`, error.message);
              reject(error);
            } else {
              const parsedResponse = parseResponse(response);
              console.log(`✅ [SINGLE-SERVER] Query executed successfully`);
              resolve(parsedResponse);
            }
          });
        });
      } catch (error: any) {
        console.error(`❌ [SINGLE-SERVER] Query execution failed:`, error.message);
        throw error;
      }
    }

    // Multi-server deployment with MTDD routing
    let processedQuery = query;
    let params: any[];

    // Handle both named parameters and direct bindings array
    if (Array.isArray(valuesOrBindings)) {
      // Direct bindings array from Knex - convert ? to $1, $2, etc.
      params = valuesOrBindings;
      if (this.hasQuestionMarkParameters(query)) {
        processedQuery = this.convertQuestionMarksToPositional(query);
        console.log(`🔄 [MULTI-SERVER] Converted ? placeholders to PostgreSQL format:`, processedQuery);
      }
    } else if (this.hasNamedParameters(query)) {
      // Named parameters - convert to positional
      const result = this.processNamedParameters(query, valuesOrBindings);
      processedQuery = result.query;
      params = result.params;
    } else if (this.hasQuestionMarkParameters(query)) {
      // Knex-style ? parameters without bindings array
      processedQuery = this.convertQuestionMarksToPositional(query);
      params = [];
      console.log(`🔄 [MULTI-SERVER] Converted ? placeholders to PostgreSQL format (no bindings):`, processedQuery);
    } else {
      // No parameters or empty object
      params = [];
    }

    const convertedParams = convertBigIntToString(params);

    const request = {
      query: processedQuery,
      params: convertedParams || []
    };

    try {
      if (tenantName !== undefined && tenantName !== null) {

        // await addTenantShard(tenantName, 1);

        // Get shard ID from lookup service
        console.log(`🔍 Looking up shard for tenant ${tenantName}`);
        const shardId = await getTenantShard(tenantName, 1);

        // Call specific server based on shard ID from lookup service
        console.log(`📡 Executing query on shard ${shardId} (tenantName: ${tenantName})`);
        return await callSpecificServerByShard(shardId, request);
      } else {
        // Call all servers concurrently and return first valid response
        console.log(`📡 Executing query on all servers concurrently`);
        return await callAllServers(request);
      }
    } catch (error: any) {
      console.error(`❌ Backend client error for query execution:`, error.message);
      throw error;
    }
  }

  /**
   * Execute query on all servers using Promise.race strategy
   * Returns the first response (success or failure)
   * @param query SQL query with named parameters
   * @param values Parameter values
   * @returns First response from any server
   */
  public static async executeQueryRace(query: string, valuesOrBindings: Record<string, any> | any[] = {}): Promise<any> {
    let processedQuery = query;
    let params: any[] = [];

    // Handle both named parameters and direct bindings array
    if (Array.isArray(valuesOrBindings)) {
      // Direct bindings array from Knex - convert ? to $1, $2, etc.
      params = valuesOrBindings;
      if (this.hasQuestionMarkParameters(query)) {
        processedQuery = this.convertQuestionMarksToPositional(query);
        console.log(`🔄 [MULTI-SERVER-RACE] Converted ? placeholders to PostgreSQL format:`, processedQuery);
      }
    } else if (this.hasNamedParameters(query)) {
      // Named parameters - convert to positional
      const result = this.processNamedParameters(query, valuesOrBindings);
      processedQuery = result.query;
      params = result.params;
    } else if (this.hasQuestionMarkParameters(query)) {
      // Knex-style ? parameters without bindings array
      processedQuery = this.convertQuestionMarksToPositional(query);
      params = [];
      console.log(`🔄 [MULTI-SERVER-RACE] Converted ? placeholders to PostgreSQL format (no bindings):`, processedQuery);
    }

    const convertedParams = convertBigIntToString(params);

    const request = {
      query: processedQuery,
      params: convertedParams || []
    };

    try {
      console.log(`📡 Executing query on all servers using Promise.race`);
      return await callAllServersRace(request);
    } catch (error: any) {
      console.error(`❌ Backend client error for race query execution:`, error.message);
      throw error;
    }
  }

  /**
   * Execute query on all servers using Promise.any strategy
   * Returns the first successful response, ignores failures
   * @param query SQL query with named parameters
   * @param values Parameter values
   * @returns First successful response from any server
   */
  public static async executeQueryAny(query: string, valuesOrBindings: Record<string, any> | any[] = {}): Promise<any> {
    let processedQuery = query;
    let params: any[] = [];

    // Handle both named parameters and direct bindings array
    if (Array.isArray(valuesOrBindings)) {
      // Direct bindings array from Knex - convert ? to $1, $2, etc.
      params = valuesOrBindings;
      if (this.hasQuestionMarkParameters(query)) {
        processedQuery = this.convertQuestionMarksToPositional(query);
        console.log(`🔄 [MULTI-SERVER-ANY] Converted ? placeholders to PostgreSQL format:`, processedQuery);
      }
    } else if (this.hasNamedParameters(query)) {
      // Named parameters - convert to positional
      const result = this.processNamedParameters(query, valuesOrBindings);
      processedQuery = result.query;
      params = result.params;
    } else if (this.hasQuestionMarkParameters(query)) {
      // Knex-style ? parameters without bindings array
      processedQuery = this.convertQuestionMarksToPositional(query);
      params = [];
      console.log(`🔄 [MULTI-SERVER-ANY] Converted ? placeholders to PostgreSQL format (no bindings):`, processedQuery);
    }

    const convertedParams = convertBigIntToString(params);

    const request = {
      query: processedQuery,
      params: convertedParams || []
    };

    try {
      console.log(`📡 Executing query on all servers using Promise.any`);
      return await callAllServersAny(request);
    } catch (error: any) {
      console.error(`❌ Backend client error for any query execution:`, error.message);
      throw error;
    }
  }

  /**
   * Execute query on all servers using Promise.all strategy
   * Waits for all servers to respond and returns all responses
   * @param query SQL query with named parameters
   * @param values Parameter values
   * @returns Array of responses from all servers
   */
  public static async executeQueryAll(query: string, valuesOrBindings: Record<string, any> | any[] = {}): Promise<any[]> {
    // Single server deployment optimization - return single result in array format
    if (IS_SINGLE_SERVER_DEPLOYMENT) {
      console.log(`🎯 [SINGLE-SERVER] executeQueryAll - using single server result (${backendServers[0]})`);
      const singleResult = await this.executeQuery(query, valuesOrBindings);
      return [singleResult]; // Wrap single result in array to maintain API compatibility
    }

    // Multi-server deployment
    let processedQuery = query;
    let params: any[];

    // Handle both named parameters and direct bindings array
    if (Array.isArray(valuesOrBindings)) {
      // Direct bindings array from Knex - convert ? to $1, $2, etc.
      params = valuesOrBindings;
      if (this.hasQuestionMarkParameters(query)) {
        processedQuery = this.convertQuestionMarksToPositional(query);
        console.log(`🔄 [MULTI-SERVER-ALL] Converted ? placeholders to PostgreSQL format:`, processedQuery);
      }
    } else if (this.hasNamedParameters(query)) {
      // Named parameters - convert to positional
      const result = this.processNamedParameters(query, valuesOrBindings);
      processedQuery = result.query;
      params = result.params;
    } else if (this.hasQuestionMarkParameters(query)) {
      // Knex-style ? parameters without bindings array
      processedQuery = this.convertQuestionMarksToPositional(query);
      params = [];
      console.log(`🔄 [MULTI-SERVER-ALL] Converted ? placeholders to PostgreSQL format (no bindings):`, processedQuery);
    } else {
      // No parameters or empty object
      params = [];
    }

    const convertedParams = convertBigIntToString(params);

    const request = {
      query: processedQuery,
      params: convertedParams || []
    };

    try {
      console.log(`📡 Executing query on all servers using Promise.all`);
      return await callAllServersAll(request);
    } catch (error: any) {
      console.error(`❌ Backend client error for all query execution:`, error.message);
      throw error;
    }
  }

  /**
   * Execute query on all servers using Promise.allSettled strategy
   * Waits for all servers to respond and returns all results (success and failures)
   * @param query SQL query with named parameters
   * @param values Parameter values
   * @returns Array of PromiseSettledResult objects from all servers
   */
  public static async executeQueryAllSettled(query: string, valuesOrBindings: Record<string, any> | any[] = {}): Promise<PromiseSettledResult<any>[]> {
    let processedQuery = query;
    let params: any[] = [];

    // Handle both named parameters and direct bindings array
    if (Array.isArray(valuesOrBindings)) {
      // Direct bindings array from Knex - convert ? to $1, $2, etc.
      params = valuesOrBindings;
      if (this.hasQuestionMarkParameters(query)) {
        processedQuery = this.convertQuestionMarksToPositional(query);
        console.log(`🔄 [MULTI-SERVER-SETTLED] Converted ? placeholders to PostgreSQL format:`, processedQuery);
      }
    } else if (this.hasNamedParameters(query)) {
      // Named parameters - convert to positional
      const result = this.processNamedParameters(query, valuesOrBindings);
      processedQuery = result.query;
      params = result.params;
    } else if (this.hasQuestionMarkParameters(query)) {
      // Knex-style ? parameters without bindings array
      processedQuery = this.convertQuestionMarksToPositional(query);
      params = [];
      console.log(`🔄 [MULTI-SERVER-SETTLED] Converted ? placeholders to PostgreSQL format (no bindings):`, processedQuery);
    }

    const convertedParams = convertBigIntToString(params);

    const request = {
      query: processedQuery,
      params: convertedParams || []
    };

    if (clients.length === 0) {
      throw new Error('No backend servers available');
    }

    // Create promises for all gRPC calls
    const promises = clients.map((client: any, index: number) => {
      return new Promise((resolve, reject) => {
        client.executeQuery(request, (error: any, response: any) => {
          if (error) {
            reject(error);
          } else if (response) {
            const parsedResponse = parseResponse(response);
            resolve(parsedResponse);
          } else {
            reject(new Error(`No valid response from server ${index}`));
          }
        });
      });
    });

    try {
      console.log(`📡 Executing query on all servers using Promise.allSettled`);
      return await Promise.allSettled(promises);
    } catch (error: any) {
      console.error(`❌ Backend client error for allSettled query execution:`, error.message);
      throw error;
    }
  }


  // Lookup service methods
  /**
   * Get the shard ID for a specific tenant
   * @param tenantName The tenant name to look up
   * @param tenantType The tenant type (default: 1)
   * @returns Promise resolving to the shard ID
   */
  public static async getTenantShard(tenantName: string, tenantType: number = 1): Promise<number> {
    return await getTenantShard(tenantName, tenantType);
  }

  /**
   * Add a tenant to shard mapping
   * @param tenantName The tenant name
   * @param tenantType The tenant type (default: 1)
   * @returns Promise resolving to the operation result
   */
  public static async addTenantShard(tenantName: string, tenantType: number = 1): Promise<any> {
    return await addTenantShard(tenantName, tenantType);
  }



  // Channel listening using gRPC streaming
  static ListenToChannel(channel: string, callback: (msg: any) => void): void {
    if (clients.length === 0) {
      console.log(`📡 No backend servers available for channel listening: ${channel}`);
      return;
    }

    // Use the first available server for channel listening
    const selectedClient = clients[0];
    console.log(`📡 Starting channel listener for '${channel}' on server 0`);

    const channelRequest = {
      channelName: channel
    };

    const stream = selectedClient.listenToChannel(channelRequest);

    stream.on('data', (response: any) => {
      try {
        const parsedResponse = parseResponse(response);
        // Convert the gRPC response back to the expected format
        const msg = {
          payload: parsedResponse.data,
          channel: parsedResponse.channelName,
          timestamp: parsedResponse.timestamp
        };
        callback(msg);
      } catch (error) {
        console.error(`❌ Error processing channel data for ${channel}:`, error);
      }
    });

    stream.on('error', (error: any) => {
      console.error(`❌ Channel stream error for ${channel}:`, error.message);
      // You could implement reconnection logic here
    });

    stream.on('end', () => {
      console.log(`📡 Channel stream ended for ${channel}`);
      // You could implement reconnection logic here
    });
  }

  static initialize(config: any): void {
    console.log('📡 Backend gRPC client initialized with servers:', backendServers);
  }
}
