/**
 * gRPC Backend Client
 *
 * Main interface for communicating with gRPC backend servers
 */

import {
  IS_SINGLE_SERVER_DEPLOYMENT,
  addTenantShard,
  backendServers,
  callAllServersAll,
  callAllServersAny,
  callAllServersRace,
  callSpecificServerByShard,
  clients,
  convertBigIntToString,
  getTenantShard,
  listenToChannel,
  lookupClient,
  processQueryParameters,
} from './grpc';

/**
 * Main Backend Client Class
 *
 * Provides methods for executing queries and managing tenant shards via gRPC
 */
export class BackendClient {
  /**
   * @deprecated Use executeQuery instead
   */
  static async callProcedure(
    procedureName: string,
    params: unknown[],
    isFunction: boolean = false,
    tenantId?: string,
  ): Promise<unknown> {
    console.warn('⚠️ callProcedure is deprecated. Use executeQuery instead.');
    const convertedParams = convertBigIntToString(params) as unknown[];

    const request: any = {
      name: procedureName,
      params: convertedParams || [],
      isFunction: isFunction,
    };

    try {
      if (tenantId !== undefined && tenantId !== null) {
        console.log(`🔍 Looking up shard for tenant ${tenantId} (procedure: ${procedureName})`);
        const shardId = await getTenantShard(lookupClient, tenantId, 1);

        console.log(
          `📡 Calling procedure ${procedureName} on shard ${shardId} (TenantID: ${tenantId})`,
        );
        return await callSpecificServerByShard(clients, shardId, request);
      }
      console.log(`📡 Calling procedure ${procedureName} on all servers concurrently`);
      return await callAllServersAny(clients, request);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Backend client error for procedure ${procedureName}:`, errorMessage);
      throw error;
    }
  }

  /**
   * Executes a query with named or positional parameters
   */
  public static async executeQuery(
    query: string,
    valuesOrBindings: Record<string, any> | any[] = {},
    tenantName?: string,
  ): Promise<unknown> {
    // Single server deployment optimization
    if (IS_SINGLE_SERVER_DEPLOYMENT) {
      console.log(
        `🎯 [SINGLE-SERVER] Simplified routing - executing on single server (${backendServers[0]})`,
      );

      const { query: processedQuery, params } = processQueryParameters(
        query,
        valuesOrBindings,
        'SINGLE-SERVER',
      );

      const convertedParams = convertBigIntToString(params) as unknown[];
      const request = {
        query: processedQuery,
        params: convertedParams || [],
      };

      try {
        console.log(`📡 [SINGLE-SERVER] Executing query directly on ${backendServers[0]}`);
        const selectedClient = clients[0];

        return new Promise((resolve, reject) => {
          selectedClient.executeQuery(request, (error: any, response: any) => {
            if (error) {
              console.error(`❌ [SINGLE-SERVER] Query execution failed:`, error.message);
              reject(error);
            } else {
              const parsedResponse = response;
              console.log(`✅ [SINGLE-SERVER] Query executed successfully`);
              resolve(parsedResponse);
            }
          });
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ [SINGLE-SERVER] Query execution failed:`, errorMessage);
        throw error;
      }
    }

    // Multi-server deployment with MTDD routing
    const { query: processedQuery, params } = processQueryParameters(
      query,
      valuesOrBindings,
      'MULTI-SERVER',
    );

    const convertedParams = convertBigIntToString(params) as unknown[];
    const request = {
      query: processedQuery,
      params: convertedParams || [],
    };

    try {
      if (tenantName !== undefined && tenantName !== null) {
        console.log(`🔍 Looking up shard for tenant ${tenantName}`);
        const shardId = await getTenantShard(lookupClient, tenantName, 1);

        console.log(`📡 Executing query on shard ${shardId} (tenantName: ${tenantName})`);
        return await callSpecificServerByShard(clients, shardId, request);
      }
      console.log(`📡 Executing query on all servers concurrently`);
      return await callAllServersAny(clients, request);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Backend client error for query execution:`, errorMessage);
      throw error;
    }
  }

  /**
   * Execute query on all servers using Promise.race strategy
   */
  public static async executeQueryRace(
    query: string,
    valuesOrBindings: Record<string, any> | any[] = {},
  ): Promise<unknown> {
    const { query: processedQuery, params } = processQueryParameters(
      query,
      valuesOrBindings,
      'MULTI-SERVER-RACE',
    );

    const convertedParams = convertBigIntToString(params) as unknown[];
    const request = {
      query: processedQuery,
      params: convertedParams || [],
    };

    try {
      console.log(`📡 Executing query on all servers using Promise.race`);
      return await callAllServersRace(clients, request);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Backend client error for race query execution:`, errorMessage);
      throw error;
    }
  }

  /**
   * Execute query on all servers using Promise.any strategy
   */
  public static async executeQueryAny(
    query: string,
    valuesOrBindings: Record<string, any> | any[] = {},
  ): Promise<unknown> {
    const { query: processedQuery, params } = processQueryParameters(
      query,
      valuesOrBindings,
      'MULTI-SERVER-ANY',
    );

    const convertedParams = convertBigIntToString(params) as unknown[];
    const request = {
      query: processedQuery,
      params: convertedParams || [],
    };

    try {
      console.log(`📡 Executing query on all servers using Promise.any`);
      return await callAllServersAny(clients, request);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Backend client error for any query execution:`, errorMessage);
      throw error;
    }
  }

  /**
   * Execute query on all servers using Promise.all strategy
   */
  public static async executeQueryAll(
    query: string,
    valuesOrBindings: Record<string, any> | any[] = {},
  ): Promise<unknown[]> {
    // Single server deployment optimization - return single result in array format
    if (IS_SINGLE_SERVER_DEPLOYMENT) {
      console.log(
        `🎯 [SINGLE-SERVER] executeQueryAll - using single server result (${backendServers[0]})`,
      );
      const singleResult = await this.executeQuery(query, valuesOrBindings);
      return [singleResult];
    }

    // Multi-server deployment
    const { query: processedQuery, params } = processQueryParameters(
      query,
      valuesOrBindings,
      'MULTI-SERVER-ALL',
    );

    const convertedParams = convertBigIntToString(params) as unknown[];
    const request = {
      query: processedQuery,
      params: convertedParams || [],
    };

    try {
      console.log(`📡 Executing query on all servers using Promise.all`);
      return await callAllServersAll(clients, request);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Backend client error for all query execution:`, errorMessage);
      throw error;
    }
  }

  /**
   * Execute query on all servers using Promise.allSettled strategy
   */
  public static async executeQueryAllSettled(
    query: string,
    valuesOrBindings: Record<string, any> | any[] = {},
  ): Promise<PromiseSettledResult<unknown>[]> {
    const { query: processedQuery, params } = processQueryParameters(
      query,
      valuesOrBindings,
      'MULTI-SERVER-SETTLED',
    );

    const convertedParams = convertBigIntToString(params) as unknown[];
    const request = {
      query: processedQuery,
      params: convertedParams || [],
    };

    if (clients.length === 0) {
      throw new Error('No backend servers available');
    }

    const promises = clients.map((client: any, index: number) => {
      return new Promise((resolve, reject) => {
        client.executeQuery(request, (error: any, response: any) => {
          if (error) {
            reject(error);
          } else if (response) {
            resolve(response);
          } else {
            reject(new Error(`No valid response from server ${index}`));
          }
        });
      });
    });

    try {
      console.log(`📡 Executing query on all servers using Promise.allSettled`);
      return await Promise.allSettled(promises);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Backend client error for allSettled query execution:`, errorMessage);
      throw error;
    }
  }

  /**
   * Get the shard ID for a specific tenant
   */
  public static async getTenantShard(tenantName: string, tenantType: number = 1): Promise<number> {
    return await getTenantShard(lookupClient, tenantName, tenantType);
  }

  /**
   * Add a tenant to shard mapping
   */
  public static async addTenantShard(
    tenantName: string,
    tenantType: number = 1,
  ): Promise<unknown> {
    return await addTenantShard(lookupClient, tenantName, tenantType);
  }

  /**
   * Listen to a gRPC channel with streaming
   */
  static ListenToChannel(channel: string, callback: (msg: any) => void): void {
    listenToChannel(clients, channel, callback);
  }

  /**
   * Initialize the backend client
   */
  static initialize(config: unknown): void {
    console.log('📡 Backend gRPC client initialized with servers:', backendServers);
  }
}

