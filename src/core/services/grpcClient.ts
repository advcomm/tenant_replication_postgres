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
const serverList = process.env.BACKEND_SERVERS?.split(',') || ['192.168.0.87', '192.168.0.2'];
backendServers.push(...serverList);

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

// Create gRPC client constructor
const DBServiceClient = grpc.makeGenericClientConstructor(
  dbServiceDefinition,
  'DB'
);

// Create client instances for all backend servers
const clients = backendServers.map(server => 
  new DBServiceClient(
    `${server}:50053`,
    grpc.credentials.createInsecure()
  )
);

// Parse response helper function
const parseResponse = (response: any): any => {
  // If response is already properly formatted, return as-is
  if (response && typeof response === 'object') {
    return response;
  }
  
  // Try to parse if it's a string
  if (typeof response === 'string') {
    try {
      return JSON.parse(response);
    } catch {
      return { data: response };
    }
  }
  
  return response;
};

// Function to call all servers concurrently and return first valid response
const callAllServers = async (request: any): Promise<any> => {
  if (clients.length === 0) {
    throw new Error('No backend servers available');
  }

  // Create promises for all gRPC calls
  const promises = clients.map((client, index) => {
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

  // Use Promise.race to get the first successful response
  try {
    const response = await Promise.race(promises);
    return response;
  } catch (error) {
    // If all promises reject, try Promise.allSettled to get more details
    const results = await Promise.allSettled(promises);
    const successfulResult = results.find(result => result.status === 'fulfilled');
    
    if (successfulResult && successfulResult.status === 'fulfilled') {
      return successfulResult.value;
    }
    
    throw new Error('No valid response from any server');
  }
};

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
  static async callProcedure(procedureName: string, params: any[], isFunction: boolean = false, tenantId?: number): Promise<any> {
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
        // Call specific server based on TenantID
        console.log(`📡 Calling procedure ${procedureName} on server ${tenantId % clients.length} (TenantID: ${tenantId})`);
        return await callSpecificServer(tenantId, request);
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
   public static async executeQuery(query: string, values: Record<string, any> = {}, tenantId?: number): Promise<any> {
        const { query: processedQuery, params } = this.processNamedParameters(query, values);
        const convertedParams = convertBigIntToString(params);

        const request = {
            query: processedQuery,
            params: convertedParams || []
        };

        try {
            if (tenantId !== undefined && tenantId !== null) {
                // Call specific server based on TenantID
                console.log(`📡 Executing query on server ${tenantId % clients.length} (TenantID: ${tenantId})`);
                return await callSpecificServer(tenantId, request);
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
