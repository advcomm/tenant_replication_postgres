import {knex, Knex} from 'knex';
import { BackendClient } from '../services/grpcClient';


// Create database connection using environment variables
function createDatabaseConnection(): Knex {
  const enableDatabase = process.env.ENABLE_DATABASE !== 'false';
  
  if (!enableDatabase) {
    throw new Error('Database is disabled');
  }
  const dbConfig = JSON.parse(process.env.DB_CONFIG || '{}');
  

 const  connection = process.env.NODE_ENV !== 'development' ? {
      // Use dummy connection settings that won't be used
      host: 'grpc-backend',
      port: 50051,
      user: 'grpc-user',
      password: 'not-used',
      database: 'grpc-routed',
      // Disable actual connection pooling
      pool: {
        min: 0,
        max: 0
      }
    } : {
    host: dbConfig.host || 'localhost',
    port: dbConfig.port || 5432,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    pool: {
      min: 2,
      max: 10
    }
  }
  


  // Use the simplest possible Knex configuration
  var result = knex({
    client: 'pg',
    connection: connection,
    debug: false
  });

  // Enable MTDD routing only for non-development environments
  if(process.env.NODE_ENV !== 'development'){
    console.log('🚀 [GRPC-ONLY] Creating gRPC-only database interface');
    console.log('🚀 [GRPC-ONLY] Bypassing PostgreSQL connection - all operations via gRPC');
    enableMtddRouting(result);
  } else {
    console.log('🛠️ [DEVELOPMENT] Enabling development MTDD stubs - .mtdd() calls will be no-ops');
    enableDevelopmentMtddStubs(result);
  }
  return result;
}

/**
 * Development MTDD Stubs - No-op implementation for development environment
 * This allows .mtdd() calls to work without any actual MTDD routing logic
 */
function enableDevelopmentMtddStubs(knexInstance: Knex): void {
  console.log('🛠️ [DEVELOPMENT] Setting up MTDD no-op stubs for development environment');
  console.log('🛠️ [DEVELOPMENT] NODE_ENV:', process.env.NODE_ENV);
  
  try {
    // PATCH QueryBuilder for development - using the knex instance to get the right prototypes
    const QueryBuilder = knexInstance.queryBuilder().constructor;
    const qbProto = QueryBuilder.prototype;
    
    if (!qbProto.mtdd) {
      // Simple no-op implementation for QueryBuilder
      qbProto.mtdd = function (
        tenantIdOrMeta?: string | number | MtddMeta,
        tenantType?: number | string | null | undefined,
        methodType?: 'addTenantShard' | 'executeQuery' | 'auto',
        options: Partial<Omit<MtddMeta, 'tenantId' | 'tenantType' | 'methodType'>> = {}
      ): any {
        // Store minimal metadata for compatibility but don't use it
        this._mtddMeta = {
          tenantId: typeof tenantIdOrMeta === 'object' ? tenantIdOrMeta?.tenantId : tenantIdOrMeta,
          tenantType: tenantType,
          methodType: methodType || 'auto',
          isDevelopmentStub: true
        };
        
        console.log(`🛠️ [DEV-STUB] QueryBuilder.mtdd() called with tenantId: ${this._mtddMeta.tenantId} - no-op in development`);
        
        // Return this for chaining - no special logic
        return this;
      };
      
      console.log('✅ [DEVELOPMENT] QueryBuilder.mtdd() stub enabled');
    }

    // PATCH Raw queries for development - using the knex instance to get the right Raw constructor  
    const Raw = knexInstance.raw('SELECT 1').constructor;
    const rawProto = Raw.prototype;
    
    if (!rawProto.mtdd) {
      // Simple no-op implementation for Raw queries
      rawProto.mtdd = function (
        tenantIdOrMeta?: string | number | MtddMeta,
        tenantType?: number | string | null | undefined,
        methodType?: 'addTenantShard' | 'executeQuery' | 'auto',
        options: Partial<Omit<MtddMeta, 'tenantId' | 'tenantType' | 'methodType'>> = {}
      ): any {
        // Store minimal metadata for compatibility but don't use it
        this._mtddMeta = {
          tenantId: typeof tenantIdOrMeta === 'object' ? tenantIdOrMeta?.tenantId : tenantIdOrMeta,
          tenantType: tenantType,
          methodType: methodType || 'auto',
          isDevelopmentStub: true
        };
        
        console.log(`🛠️ [DEV-STUB] Raw.mtdd() called with tenantId: ${this._mtddMeta.tenantId} - no-op in development`);
        
        // Return this for chaining - no special logic
        return this;
      };
      
      console.log('✅ [DEVELOPMENT] Raw.mtdd() stub enabled');
    }

    console.log('✅ [DEVELOPMENT] MTDD development stubs enabled successfully');
    console.log('🔄 [DEVELOPMENT] All .mtdd() calls will be no-ops and use standard Knex behavior');
    
  } catch (error) {
    console.error('❌ [DEVELOPMENT] Error enabling MTDD development stubs:', error);
    throw error;
  }
}

// Enhanced TypeScript interfaces for MTDD routing
interface MtddMeta {
  // Tenant identification (optional - null for all servers execution)
  tenantId?: string | number | null;
  tenantType?: number | string | null | undefined;
  
  // Method control
  methodType?: 'addTenantShard' | 'executeQuery' | 'auto';
  
  // All servers execution flag
  allServers?: boolean;
  
  // Legacy support
  tenantName?: string;
  entityId?: string;
  
  // Operation metadata
  operation?: string;
  operationType?: 'read' | 'write' | 'delete' | 'admin';
  
  // Performance and routing
  timeout?: number;
  maxRetries?: number;
  readPreference?: 'primary' | 'secondary' | 'nearest';
  connectionPool?: string;
  
  // Caching
  cacheKey?: string;
  cacheTTL?: number;
  skipCache?: boolean;
  
  // Auditing and logging
  auditLog?: boolean;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  
  // Query optimization
  useIndex?: string | string[];
  queryHint?: string;
  
  // Transaction context
  transactionId?: string;
  isolationLevel?: 'read_uncommitted' | 'read_committed' | 'repeatable_read' | 'serializable';
  
  // Re-run detection (automatically set when complex query methods are used)
  IsReRun?: boolean;
  
  // Having conditions extraction (special handling for HAVING methods)
  havingConditions?: Array<{
    method: string;
    args: any[];
    timestamp: number;
  }>;
  
  havingSummary?: {
    totalConditions: number;
    methods: string[];
    complexity: 'simple' | 'moderate' | 'complex';
  };
  
  // Auto toSQL() tracking
  toSQLAppended?: boolean; // true = auto-appended, false = manually called by user
  
  // Custom metadata
  [key: string]: any;
}

interface SqlResult {
  sql: string;
  bindings?: any[];
  method?: string;
  options?: {
    mtdd?: MtddMeta;
    [key: string]: any;
  };
  __knexQueryUid?: string;
  timeout?: boolean;
  cancelOnTimeout?: boolean;
  returning?: any;
}

// Extend Knex types to include our enhanced MTDD methods
declare module 'knex' {
  namespace Knex {
    interface QueryBuilder {
      /**
       * Add MTDD (Multi-Tenant Database Deployment) routing metadata to the query.
       * This method can be chained anywhere in the query builder chain.
       * 
       * @param tenantId - Optional tenant identifier. If not provided, executes on all servers using chain end
       * @param tenantType - Optional tenant type. If null, triggers addTenantShard. If undefined, defaults to 1
       * @param methodType - Optional method type control
       * @param options - Optional MTDD metadata for routing, caching, auditing, and performance optimization
       * @returns The query builder instance for method chaining
       * 
       * @example
       * ```typescript
       * // Execute on all servers (chain end)
       * db.select('*').from('users').mtdd()
       * 
       * // Minimal usage - just tenant ID
       * db.select('*').from('users').mtdd('tenant-123')
       * 
       * // With tenant type
       * db.select('*').from('users').mtdd('tenant-123', 1)
       * 
       * // Force add tenant shard
       * db.insert(tenantData).into('tenants').mtdd('new-tenant', null, 'addTenantShard')
       * 
       * // With full options
       * db.select('*').from('users').mtdd('tenant-123', 1, 'auto', {
       *   operation: 'get-users',
       *   cacheKey: 'users:tenant-123',
       *   timeout: 5000
       * })
       * 
       * // Legacy object syntax (still supported)
       * db.select('*').from('users').mtdd({ tenantId: 'tenant-123', operation: 'get-users' })
       * ```
       */
      mtdd(
        tenantIdOrMeta?: string | number | MtddMeta,
        tenantType?: number | string | null | undefined,
        methodType?: 'addTenantShard' | 'executeQuery' | 'auto',
        options?: Partial<Omit<MtddMeta, 'tenantId' | 'tenantType' | 'methodType'>>
      ): this;
      _mtddMeta?: MtddMeta;
    }
    
    interface Raw {
      /**
       * Add MTDD routing metadata to raw SQL queries.
       * 
       * @param tenantIdOrMeta - Optional tenant ID or complete MTDD metadata object. If not provided, executes on all servers
       * @param tenantType - Optional tenant type. If null, triggers addTenantShard. If undefined, defaults to 1
       * @param methodType - Optional method type control
       * @param options - Optional MTDD metadata for routing and optimization
       * @returns The raw query instance for method chaining
       * 
       * @example
       * ```typescript
       * // Execute on all servers
       * db.raw('SELECT COUNT(*) FROM users').mtdd()
       * 
       * // Minimal usage
       * db.raw('SELECT * FROM users WHERE tenant_id = ?', [tenantId]).mtdd(tenantId)
       * 
       * // With options
       * db.raw('SELECT * FROM users WHERE tenant_id = ?', [tenantId])
       *   .mtdd(tenantId, 1, 'auto', { operation: 'get-users', timeout: 5000 })
       * ```
       */
      mtdd(
        tenantIdOrMeta?: string | number | MtddMeta,
        tenantType?: number | string | null | undefined,
        methodType?: 'addTenantShard' | 'executeQuery' | 'auto',
        options?: Partial<Omit<MtddMeta, 'tenantId' | 'tenantType' | 'methodType'>>
      ): this;
      _mtddMeta?: MtddMeta;
    }
  }
}

/**
 * Helper function to create a method wrapper that preserves MTDD metadata
 * This eliminates code duplication and makes the patching more maintainable
 */

///TODO: Create avg override that must also get the count(columnname) for the average column if scattered then adjust average on gather using count. namespace extra count(columname as mtdd_columnName) and on gather strip of these values.
function createMtddMethodWrapper(originalMethod: Function, methodName: string) {
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
 */
function createReRunMethodWrapper(originalMethod: Function, methodName: string) {
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
        timestamp: Date.now()
      };
      
      this._mtddMeta.havingConditions.push(havingCondition);
      
      // Also create a summary for easier access
      if (!this._mtddMeta.havingSummary) {
        this._mtddMeta.havingSummary = {
          totalConditions: 0,
          methods: [],
          complexity: 'simple'
        };
      }
      
      this._mtddMeta.havingSummary.totalConditions++;
      if (!this._mtddMeta.havingSummary.methods.includes(methodName)) {
        this._mtddMeta.havingSummary.methods.push(methodName);
      }
      
      // Determine complexity based on number and type of having conditions
      const conditionCount = this._mtddMeta.havingSummary.totalConditions;
      const hasComplexMethods = this._mtddMeta.havingSummary.methods.some((m: string) => 
        ['havingIn', 'havingNotIn', 'havingBetween', 'havingNotBetween', 'havingRaw'].includes(m)
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

// Global custom MTDD handler - can be set by users
let customMtddHandler: ((meta: MtddMeta, queryObject: any, sqlResult: SqlResult) => void) | null = null;

/**
 * Automatic gRPC MTDD Handler
 * Routes queries to gRPC backend servers based on tenant information
 */
async function grpcMtddHandler(meta: MtddMeta, queryObject: any, sqlResult: SqlResult): Promise<any> {
  console.log('🚀 [GRPC-MTDD] Processing query via gRPC backend');
  
  // Single server deployment detection
  const serverList = process.env.BACKEND_SERVERS?.split(',') || ['192.168.0.87', '192.168.0.2'];
  const isSingleServer = serverList.length === 1;
  
  if (isSingleServer) {
    console.log('🎯 [SINGLE-SERVER] Single server deployment detected - using simplified gRPC routing');
    console.log(`📡 [SINGLE-SERVER] Routing to single gRPC server: ${serverList[0]}`);
    
    console.log(`📄 [SINGLE-SERVER] SQL Query:`, sqlResult.sql);
    console.log(`📝 [SINGLE-SERVER] Bindings:`, sqlResult.bindings);
    
    try {
      // For single server, determine if tenant-specific or all-server execution
      const tenantName = meta.tenantId || meta.tenantName;
      const executeOnAllServers = meta.allServers === true || !tenantName;
      
      let result;
      if (executeOnAllServers) {
        console.log(`🌐 [SINGLE-SERVER] Executing on single server (acting as "all servers")`);
        result = await BackendClient.executeQueryAll(sqlResult.sql, sqlResult.bindings || []);
      } else {
        console.log(`🏢 [SINGLE-SERVER] Executing tenant-specific query on single server`);
        const tenantNameStr = typeof tenantName === 'string' ? tenantName : String(tenantName);
        result = await BackendClient.executeQuery(sqlResult.sql, sqlResult.bindings || [], tenantNameStr);
      }
      
      console.log('✅ [SINGLE-SERVER] gRPC query executed successfully');
      return result;
    } catch (error: any) {
      console.error('❌ [SINGLE-SERVER] gRPC query execution failed:', error.message);
      throw error;
    }
  }
  
  // Multi-server MTDD routing (existing logic)
  const tenantName = meta.tenantId || meta.tenantName;
  const tenantNameStr = typeof tenantName === 'string' ? tenantName : String(tenantName);
  const executeOnAllServers = meta.allServers === true || !tenantName;
  
  if (executeOnAllServers) {
    console.log('⚠️  [GRPC-MTDD] Executing on all servers (chain end execution)');
  } else {
    console.log(`🏢 [GRPC-MTDD] Tenant identified: ${tenantNameStr} - routing to specific shard`);
  }
  
  try {
    console.log(`📊 [GRPC-MTDD] SQL Query:`, sqlResult.sql);
    console.log(`🔗 [GRPC-MTDD] Bindings:`, sqlResult.bindings);
    console.log(`🎯 [GRPC-MTDD] Target:`, executeOnAllServers ? 'All Servers (Chain End)' : `Tenant Shard for ${tenantNameStr}`);
    
    // Check the methodType and tenantType to determine action
    const shouldAddTenantShard = meta.methodType === 'addTenantShard' || 
                                 meta.tenantType === null ||
                                 meta.operation?.toLowerCase().includes('add-tenant') || 
                                 meta.operation?.toLowerCase().includes('create-tenant') ||
                                 meta.operation?.toLowerCase().includes('addtenant') ||
                                 meta.operation?.toLowerCase().includes('createtenant') ||
                                 (sqlResult.sql.toLowerCase().includes('insert') && 
                                  (sqlResult.sql.toLowerCase().includes('tenant') || 
                                   sqlResult.sql.toLowerCase().includes('tenants'))) ||
                                 (meta.operationType === 'write' && meta.operation?.toLowerCase().includes('tenant'));
    
    let result;
    
    if (!executeOnAllServers && tenantName) {
      // Determine tenant type to use
      let tenantTypeToUse = 1; // default
      if (meta.tenantType !== undefined && meta.tenantType !== null) {
        tenantTypeToUse = typeof meta.tenantType === 'string' ? parseInt(meta.tenantType) || 1 : meta.tenantType;
      }
      
      if (shouldAddTenantShard) {
        console.log(`🆕 [GRPC-MTDD] Add tenant operation detected - adding tenant shard first`);
        try {
          // Add tenant shard mapping first
          await BackendClient.addTenantShard(tenantNameStr, tenantTypeToUse);
          console.log(`✅ [GRPC-MTDD] Tenant shard mapping added for ${tenantNameStr} with type ${tenantTypeToUse}`);
        } catch (error: any) {
          console.warn(`⚠️  [GRPC-MTDD] Could not add tenant shard (may already exist): ${error.message}`);
          // Continue with query execution even if tenant shard addition fails
        }
      }
      
      // Execute query on specific shard for the tenant
      console.log(`📡 [GRPC-MTDD] Executing query on specific shard for tenant: ${tenantNameStr}`);
      result = await BackendClient.executeQuery(
        sqlResult.sql,
        sqlResult.bindings || [],
        tenantNameStr
      );
    } else {
      // Execute query on all servers when no tenant specified or allServers flag is set
      console.log(`📡 [GRPC-MTDD] Executing query on all servers (chain end execution)`);
      result = await BackendClient.executeQueryAll(
        sqlResult.sql,
        sqlResult.bindings || []
      );
    }

    console.log('✅ [GRPC-MTDD] Query executed successfully via gRPC');
    console.log('📦 [GRPC-MTDD] Result preview:', Array.isArray(result) ? `${result.length} rows` : 'Non-array result');

    return result;  } catch (error) {
    console.error('❌ [GRPC-MTDD] Error executing query via gRPC:', (error as Error).message);
    throw error;
  }
}

/**
 * Enhanced MTDD Routing with comprehensive PostgreSQL client method patching
 * Supports transparent .mtdd() chaining with all Knex QueryBuilder methods
 */
function enableMtddRouting(knexInstance: Knex): void {
  // Single server deployment detection
  const serverList = process.env.BACKEND_SERVERS?.split(',') || ['192.168.0.87', '192.168.0.2'];
  const isSingleServer = serverList.length === 1;
  
  if (isSingleServer) {
    console.log(`🎯 [SINGLE-SERVER] Single server deployment detected (${serverList[0]}) - simplified gRPC routing enabled`);
    console.log(`🎯 [SINGLE-SERVER] All queries will route through gRPC to single server without complex MTDD overhead`);
    console.log(`🎯 [SINGLE-SERVER] IsReRun flags, chain-end detection, and shard routing are simplified`);
    
    // Set flag to use simplified gRPC routing in the MTDD handler
    process.env.MTDD_SINGLE_SERVER_MODE = 'true';
    process.env.MTDD_SINGLE_SERVER_TARGET = serverList[0];
    
    console.log(`✅ [SINGLE-SERVER] Single-server mode enabled - will use simplified gRPC routing to ${serverList[0]}`);
    // Continue with normal MTDD setup but the grpcMtddHandler will use simplified routing
  }
  
  // Multi-server MTDD routing (existing complex logic)
  console.log(`🏗️  [MULTI-SERVER] Multi-server deployment detected (${serverList.length} servers) - full MTDD routing enabled`);
  
  try {
    // Helper function to perform special MTDD actions when toSQL() is auto-appended
    const performMtddAutoActions = async (queryObject: any, sqlResult: SqlResult): Promise<any> => {
      const mtddMeta = sqlResult.options?.mtdd;
      if (!mtddMeta) return [];
      
      // Only perform actions if toSQL was auto-appended (not manually called)
      if (!mtddMeta.toSQLAppended) {
        console.log('⏭️  Skipping MTDD actions - toSQL() was manually called');
        return [];
      }
      
      const queryType = queryObject.sql ? 'RAW query' : 'operation';
      console.log(`🔄 Auto-appending toSQL() at chain end for ${queryType}: ${mtddMeta?.operation || 'unknown'}`);
      console.log(`📊 MTDD Metadata:`, JSON.stringify(mtddMeta, null, 2));
      
      // Perform special MTDD actions based on metadata
      if (mtddMeta.IsReRun) {
        console.log(`🔁 Re-run detected - applying special handling for complex query`);
        
        // Handle having conditions if present
        if (mtddMeta.havingConditions && mtddMeta.havingConditions.length > 0) {
          console.log(`📋 Having conditions detected (${mtddMeta.havingConditions.length}):`, 
            mtddMeta.havingConditions.map(c => `${c.method}(${c.args.join(', ')})`).join(', '));
          console.log(`🔍 Complexity level: ${mtddMeta.havingSummary?.complexity || 'unknown'}`);
        }
      }
      
      // Handle caching logic - ONLY when auto-appended
      if (mtddMeta.cacheKey && !mtddMeta.skipCache) {
        console.log(`💾 [AUTO-APPEND] Cache key: ${mtddMeta.cacheKey}, TTL: ${mtddMeta.cacheTTL || 'default'}`);
        // Your custom caching logic here
      }
      
      // Handle tenant routing - ONLY when auto-appended
      if (mtddMeta.tenantId) {
        console.log(`🏢 [AUTO-APPEND] Tenant routing: ${mtddMeta.tenantId} (${mtddMeta.operationType || 'unknown'} operation)`);
        // Your custom tenant routing logic here
      }
      
      // Handle audit logging - ONLY when auto-appended
      if (mtddMeta.auditLog) {
        console.log(`📝 [AUTO-APPEND] Audit logging enabled for user: ${mtddMeta.userId || 'unknown'}, session: ${mtddMeta.sessionId || 'none'}`);
        // Your custom audit logging logic here
      }
      
      // Handle performance optimizations - ONLY when auto-appended
      if (mtddMeta.useIndex) {
        const indexes = Array.isArray(mtddMeta.useIndex) ? mtddMeta.useIndex.join(', ') : mtddMeta.useIndex;
        console.log(`⚡ [AUTO-APPEND] Performance hint - use indexes: ${indexes}`);
        // Your custom index optimization logic here
      }
      
      if (mtddMeta.timeout) {
        console.log(`⏱️  [AUTO-APPEND] Query timeout set to: ${mtddMeta.timeout}ms`);
        // Your custom timeout handling logic here
      }
      
      // Handle connection pooling - ONLY when auto-appended
      if (mtddMeta.connectionPool) {
        console.log(`🏊 [AUTO-APPEND] Using connection pool: ${mtddMeta.connectionPool}`);
        // Your custom connection pool routing logic here
      }
      
      // Handle transaction management - ONLY when auto-appended
      if (mtddMeta.transactionId) {
        console.log(`🔒 [AUTO-APPEND] Transaction context: ${mtddMeta.transactionId}`);
        if (mtddMeta.isolationLevel) {
          console.log(`🛡️  [AUTO-APPEND] Isolation level: ${mtddMeta.isolationLevel}`);
        }
        // Your custom transaction handling logic here
      }
      
      // Execute query via gRPC backend
      try {
        console.log('🎯 [AUTO-APPEND] Executing query via gRPC backend');
        const result = await grpcMtddHandler(mtddMeta, queryObject, sqlResult);
        
        // Call custom handler if provided (after gRPC execution)
        if (typeof customMtddHandler === 'function') {
          try {
            console.log('🎯 [AUTO-APPEND] Calling additional custom MTDD handler');
            customMtddHandler(mtddMeta, queryObject, sqlResult);
          } catch (error) {
            console.error('❌ Error in custom MTDD handler:', error);
          }
        }
        
        console.log('✅ [AUTO-APPEND] MTDD actions completed - query executed via gRPC');
        return result;
        
      } catch (error) {
        console.error('❌ [AUTO-APPEND] Error in gRPC execution:', (error as Error).message);
        throw error;
      }
    }

    // Helper function to set up chain-end detection
    const setupChainEndDetection = (queryObject: any) => {
      const chainEndMethods = ['then', 'catch', 'finally', 'stream', 'pipe'];
      
      chainEndMethods.forEach(endMethod => {
        if (queryObject[endMethod] && typeof queryObject[endMethod] === 'function') {
          const originalEndMethod = queryObject[endMethod];
          
          queryObject[endMethod] = function(...endArgs: any[]) {
            // Chain is ending - auto-append toSQL() if not already called
            if (queryObject._mtddMeta && !queryObject._toSQLCalled) {
              const sqlResult = queryObject.toSQL();
              
              // Mark that we auto-appended toSQL()
              if (sqlResult.options?.mtdd) {
                sqlResult.options.mtdd.toSQLAppended = true;
                
                // Perform special MTDD actions and execute via gRPC
                const executeViaGrpc = async () => {
                  try {
                    const result = await performMtddAutoActions(queryObject, sqlResult);
                    return result;
                  } catch (error) {
                    console.error('🚫 [GRPC-MTDD] Query execution failed:', (error as Error).message);
                    throw error;
                  }
                };
                
                queryObject._toSQLCalled = true;
                
                if (endMethod === 'then') {
                  // For .then(), execute via gRPC and return the actual result
                  return executeViaGrpc().then(result => {
                    if (endArgs[0] && typeof endArgs[0] === 'function') {
                      try {
                        return endArgs[0](result);
                      } catch (error) {
                        return Promise.reject(error);
                      }
                    }
                    return result;
                  }).catch(error => {
                    if (endArgs[1] && typeof endArgs[1] === 'function') {
                      return endArgs[1](error);
                    }
                    throw error;
                  });
                } else if (endMethod === 'catch') {
                  // For .catch(), execute via gRPC first, then handle catch
                  return executeViaGrpc().then(result => result).catch(error => {
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
                        console.warn('Error in finally callback:', error);
                      }
                    }
                  });
                } else if (endMethod === 'stream' || endMethod === 'pipe') {
                  // For stream operations, execute via gRPC and create a readable stream
                  const { Readable } = require('stream');
                  const readable = new Readable({ objectMode: true });
                  
                  executeViaGrpc().then(result => {
                    if (Array.isArray(result)) {
                      result.forEach(row => readable.push(row));
                    } else {
                      readable.push(result);
                    }
                    readable.push(null); // End the stream
                  }).catch(error => {
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
              console.log('🚫 [GRPC-MTDD] MTDD query without auto-append detected - returning empty result');
              
              if (endMethod === 'then' && endArgs[0] && typeof endArgs[0] === 'function') {
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
    };

    // PATCH QueryBuilder - Access it through the knex client
    const QueryBuilder = require('knex/lib/query/querybuilder');
    const qbProto = QueryBuilder.prototype;
    
    if (!qbProto.mtdd) {
      const originalToSQL_QB = qbProto.toSQL;

      // Core MTDD method for QueryBuilder with flexible parameter handling
      qbProto.mtdd = function (
        tenantIdOrMeta?: string | number | MtddMeta,
        tenantType?: number | string | null | undefined,
        methodType?: 'addTenantShard' | 'executeQuery' | 'auto',
        options: Partial<Omit<MtddMeta, 'tenantId' | 'tenantType' | 'methodType'>> = {}
      ): any {
        // Preserve existing IsReRun=true if it was set by re-run methods
        const preserveIsReRun = this._mtddMeta?.IsReRun === true;
        
        let meta: MtddMeta;
        
        // Type guard for MtddMeta object
        const isMtddMeta = (obj: any): obj is MtddMeta => {
          return typeof obj === 'object' && obj !== null && 
                 (typeof obj.tenantId === 'string' || typeof obj.tenantId === 'number' || 
                  obj.tenantId === null || obj.tenantId === undefined);
        };
        
        // Handle different parameter signatures
        if (isMtddMeta(tenantIdOrMeta)) {
          // Legacy object syntax: .mtdd({ tenantId: '...', ... })
          meta = { ...tenantIdOrMeta };
        } else if (tenantIdOrMeta === undefined) {
          // No tenant ID provided - execute on all servers (chain end)
          meta = {
            tenantId: null, // Special marker for all servers
            allServers: true, // Flag for chain end execution
            methodType: methodType || 'executeQuery',
            ...options
          };
          
          // Handle tenantType parameter when no tenantId
          if (tenantType !== undefined) {
            meta.tenantType = tenantType;
          } else {
            meta.tenantType = 1; // Default when executing on all servers
          }
        } else {
          // New parameter syntax: .mtdd(tenantId, tenantType, methodType, options)
          meta = {
            tenantId: tenantIdOrMeta,
            ...options
          };
          
          // Handle tenantType parameter
          if (tenantType !== undefined) {
            if (tenantType === null) {
              // null means force addTenantShard
              meta.tenantType = null;
              meta.methodType = methodType || 'addTenantShard';
            } else {
              // Valid value provided
              meta.tenantType = tenantType;
              meta.methodType = methodType || 'auto';
            }
          } else {
            // undefined means use default value 1
            meta.tenantType = 1;
            meta.methodType = methodType || 'auto';
          }
        }
        
        // Apply default values for missing options
        const defaults: Partial<MtddMeta> = {
          operationType: 'read',
          timeout: 5000,
          cacheTTL: 300,
          auditLog: false,
          skipCache: false,
          maxRetries: 3,
          readPreference: 'primary'
        };
        
        this._mtddMeta = { ...this._mtddMeta, ...defaults, ...meta };
        
        // If IsReRun was previously set to true by a re-run method, keep it true
        if (preserveIsReRun) {
          this._mtddMeta.IsReRun = true;
        }
        
        return this;
      };

      // Override toSQL to include MTDD metadata in query options
      qbProto.toSQL = function (...args: any[]): SqlResult {
        const result: SqlResult = originalToSQL_QB.apply(this, args);
        if (this._mtddMeta) {
          result.options = {
            ...result.options,
            mtdd: {
              ...this._mtddMeta,
              toSQLAppended: false // User called toSQL() manually
            },
          };
          
          // Only perform special MTDD actions if toSQL was manually called by user
          // When manually called, we preserve normal Knex behavior
          if (!this._mtddMeta.toSQLAppended) {
            console.log(`🔧 Manual toSQL() call detected for operation: ${this._mtddMeta?.operation || 'unknown'}`);
            console.log(`↩️  Preserving normal Knex behavior - no special MTDD actions, no database execution`);
          }
        }
        return result;
      };

      // Auto-append toSQL() when query chain ends
      const createChainEndWrapper = (originalMethod: Function, methodName: string, isReRunMethod: boolean = false) => {
        return function (this: any, ...args: any[]): any {
          const result = isReRunMethod ? 
            createReRunMethodWrapper(originalMethod, methodName).apply(this, args) :
            createMtddMethodWrapper(originalMethod, methodName).apply(this, args);
          
          // If this query has MTDD metadata, set up chain-end detection immediately
          if (result && result._mtddMeta && !result._chainEndSetup) {
            setupChainEndDetection(result);
            result._chainEndSetup = true;
          }
          
          return result;
        };
      };

      // Define PostgreSQL client methods to be patched
      const pgClientMethods = {
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
        unless: 'UNLESS - Negative conditional query building'
      };

      // Define methods that should trigger IsReRun=true
      const reRunMethods = new Set([
        'distinct',
        'having', 'havingIn', 'havingNotIn', 'havingNull', 'havingNotNull', 
        'havingBetween', 'havingNotBetween', 'havingRaw',
        'limit',
        'groupBy', 'groupByRaw',
        'orderBy', 'orderByRaw'
      ]);

      // Apply monkey patching to all defined PostgreSQL client methods
      Object.keys(pgClientMethods).forEach(methodName => {
        if (qbProto[methodName]) {
          const originalMethod = qbProto[methodName];
          
          // Use the chain-end wrapper for all methods
          const isReRunMethod = reRunMethods.has(methodName);
          qbProto[methodName] = createChainEndWrapper(originalMethod, methodName, isReRunMethod);
        }
      });

      // Patch the mtdd method to track manual vs auto toSQL calls
      qbProto.mtdd = function (
        tenantIdOrMeta?: string | number | MtddMeta,
        tenantType?: number | string | null | undefined,
        methodType?: 'addTenantShard' | 'executeQuery' | 'auto',
        options: Partial<Omit<MtddMeta, 'tenantId' | 'tenantType' | 'methodType'>> = {}
      ): any {
        // Preserve existing IsReRun=true if it was set by re-run methods
        const preserveIsReRun = this._mtddMeta?.IsReRun === true;
        
        let meta: MtddMeta;
        
        // Handle different parameter signatures
        if (typeof tenantIdOrMeta === 'object' && tenantIdOrMeta !== null) {
          // Legacy object syntax: .mtdd({ tenantId: '...', ... })
          meta = { ...tenantIdOrMeta };
        } else if (tenantIdOrMeta === undefined) {
          // No tenant ID provided - execute on all servers (chain end)
          meta = {
            tenantId: null, // Special marker for all servers
            allServers: true, // Flag for chain end execution
            methodType: methodType || 'executeQuery',
            ...options
          };
          
          // Handle tenantType parameter when no tenantId
          if (tenantType !== undefined) {
            meta.tenantType = tenantType;
          } else {
            meta.tenantType = 1; // Default when executing on all servers
          }
        } else {
          // New parameter syntax: .mtdd(tenantId, tenantType, methodType, options)
          meta = {
            tenantId: tenantIdOrMeta,
            ...options
          };
          
          // Handle tenantType parameter
          if (tenantType !== undefined) {
            if (tenantType === null) {
              // null means force addTenantShard
              meta.tenantType = null;
              meta.methodType = methodType || 'addTenantShard';
            } else {
              // Valid value provided
              meta.tenantType = tenantType;
              meta.methodType = methodType || 'auto';
            }
          } else {
            // undefined means use default value 1
            meta.tenantType = 1;
            meta.methodType = methodType || 'auto';
          }
        }
        
        // Apply default values for missing options
        const defaults: Partial<MtddMeta> = {
          operationType: 'read',
          timeout: 5000,
          cacheTTL: 300,
          auditLog: false,
          skipCache: false,
          maxRetries: 3,
          readPreference: 'primary'
        };
        
        this._mtddMeta = { ...this._mtddMeta, ...defaults, ...meta };
        
        // If IsReRun was previously set to true by a re-run method, keep it true
        if (preserveIsReRun) {
          this._mtddMeta.IsReRun = true;
        }
        
        // Mark that toSQL hasn't been called yet
        this._toSQLCalled = false;
        
        // Override the manual toSQL call to track it
        if (!this._toSQLPatched) {
          const originalToSQL = this.toSQL;
          this.toSQL = function(...args: any[]) {
            this._toSQLCalled = true;
            const result = originalToSQL.apply(this, args);
            
            // Mark as manually called by user
            if (result.options?.mtdd) {
              result.options.mtdd.toSQLAppended = false;
            }
            
            return result;
          };
          this._toSQLPatched = true;
        }
        
        // Set up chain-end detection immediately after mtdd() is called
        if (!this._chainEndSetup) {
          setupChainEndDetection(this);
          this._chainEndSetup = true;
        }
        
        return this;
      };

      console.log(`QueryBuilder methods patched for MTDD routing: ${Object.keys(pgClientMethods).length} methods`);
      console.log(`Re-run methods (auto-set IsReRun=true): ${Array.from(reRunMethods).join(', ')}`);
    }

    // PATCH Raw queries for comprehensive MTDD support
    const Raw = require('knex/lib/raw');
    const rawProto = Raw.prototype;
    
    if (!rawProto.mtdd) {
      const originalToSQL_Raw = rawProto.toSQL;

      // Core MTDD method for Raw queries
      rawProto.mtdd = function (
        tenantIdOrMeta?: string | number | MtddMeta,
        tenantType?: number | string | null | undefined,
        methodType?: 'addTenantShard' | 'executeQuery' | 'auto',
        options: Partial<Omit<MtddMeta, 'tenantId' | 'tenantType' | 'methodType'>> = {}
      ): any {

        let meta: MtddMeta;
        
        // Handle different parameter signatures
        if (typeof tenantIdOrMeta === 'object' && tenantIdOrMeta !== null) {
          // Legacy object syntax: .mtdd({ tenantId: '...', ... })
          meta = { ...tenantIdOrMeta };
        } else if (tenantIdOrMeta === undefined) {
          // No tenant ID provided - execute on all servers (chain end)
          meta = {
            tenantId: null, // Special marker for all servers
            allServers: true, // Flag for chain end execution
            methodType: methodType || 'executeQuery',
            ...options
          };
          
          // Handle tenantType parameter when no tenantId
          if (tenantType !== undefined) {
            meta.tenantType = tenantType;
          } else {
            meta.tenantType = 1; // Default when executing on all servers
          }
        } else {
          // New parameter syntax: .mtdd(tenantId, tenantType, methodType, options)
          meta = {
            tenantId: tenantIdOrMeta,
            ...options
          };
          
          // Handle tenantType parameter
          if (tenantType !== undefined) {
            if (tenantType === null) {
              // null means force addTenantShard
              meta.tenantType = null;
              meta.methodType = methodType || 'addTenantShard';
            } else {
              // Valid value provided
              meta.tenantType = tenantType;
              meta.methodType = methodType || 'auto';
            }
          } else {
            // undefined means use default value 1
            meta.tenantType = 1;
            meta.methodType = methodType || 'auto';
          }
        }
        
        // Apply default values for missing options
        const defaults: Partial<MtddMeta> = {
          operationType: 'read',
          timeout: 5000,
          cacheTTL: 300,
          auditLog: false,
          skipCache: false,
          maxRetries: 3,
          readPreference: 'primary'
        };
        
        this._mtddMeta = { ...this._mtddMeta, ...defaults, ...meta };
        this._toSQLCalled = false;
        
      // Override the manual toSQL call to track it for raw queries
      if (!this._toSQLPatched) {
        const originalToSQL = this.toSQL;
        this.toSQL = function(...args: any[]) {
          this._toSQLCalled = true;
          const result = originalToSQL.apply(this, args);
          
          // Mark as manually called by user and preserve normal Knex behavior
          if (result.options?.mtdd) {
            result.options.mtdd.toSQLAppended = false;
            console.log(`🔧 Manual toSQL() call detected for RAW query: ${this._mtddMeta?.operation || 'unknown'}`);
            console.log(`↩️  Preserving normal Knex behavior - no special MTDD actions, no database execution`);
          }
          
          return result;
        };
        this._toSQLPatched = true;
      }
      
      // Set up chain-end detection for raw queries (reuse the main function)
      if (!this._chainEndSetup) {
        setupChainEndDetection(this);
        this._chainEndSetup = true;
      }
      
      return this;
    };

    // Override toSQL to include MTDD metadata in raw query options
    rawProto.toSQL = function (...args: any[]): SqlResult {
      const result: SqlResult = originalToSQL_Raw.apply(this, args);
      if (this._mtddMeta) {
        result.options = {
          ...result.options,
          mtdd: {
            ...this._mtddMeta,
            toSQLAppended: false // Default for manual calls
          },
        };
        
        // Only perform special MTDD actions if toSQL was manually called by user
        // When manually called, we preserve normal Knex behavior
        if (!this._mtddMeta.toSQLAppended) {
          console.log(`🔧 Manual toSQL() call detected for RAW query: ${this._mtddMeta?.operation || 'unknown'}`);
          console.log(`↩️  Preserving normal Knex behavior - no special MTDD actions, no database execution`);
        }
      }
      return result;
    };

      console.log('Raw queries patched for MTDD routing');
    }

    console.log('MTDD routing enabled successfully - All PostgreSQL client methods are now MTDD-aware');
  } catch (error) {
    console.error('Error enabling MTDD routing:', error);
    throw error;
  }
}

/**
 * Set a custom MTDD handler that will be called only when toSQL() is auto-appended
 * This allows you to implement your own business logic for auto-appended queries
 * 
 * @param handler - Function to handle MTDD metadata when toSQL() is auto-appended
 * 
 * @example
 * ```typescript
 * setCustomMtddHandler((meta, queryObject, sqlResult) => {
 *   if (meta.tenantId) {
 *     // Route to tenant-specific database
 *     routeToTenantDatabase(meta.tenantId, sqlResult);
 *   }
 *   
 *   if (meta.cacheKey && !meta.skipCache) {
 *     // Implement caching logic
 *     checkAndSetCache(meta.cacheKey, sqlResult);
 *   }
 *   
 *   if (meta.auditLog) {
 *     // Log the query for auditing
 *     auditLogger.log(meta, sqlResult);
 *   }
 * });
 * ```
 */
function setCustomMtddHandler(handler: ((meta: MtddMeta, queryObject: any, sqlResult: SqlResult) => void) | null): void {
  customMtddHandler = handler;
}

/**
 * Get the current custom MTDD handler
 */
function getCustomMtddHandler(): ((meta: MtddMeta, queryObject: any, sqlResult: SqlResult) => void) | null {
  return customMtddHandler;
}

// Create the database instance
const db = createDatabaseConnection();

export { 
  db, 
  enableMtddRouting, 
  enableDevelopmentMtddStubs,
  createDatabaseConnection,
  setCustomMtddHandler,
  getCustomMtddHandler,
  type MtddMeta,
  type SqlResult
};
