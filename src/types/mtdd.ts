/**
 * MTDD (Multi-Tenant Database Deployment) Type Definitions
 *
 * These types define the metadata and routing information for multi-tenant database operations.
 */

/**
 * MTDD Metadata Interface
 * Contains routing and operational metadata for tenant-specific database queries
 */
export interface MtddMeta {
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
  isolationLevel?:
    | 'read_uncommitted'
    | 'read_committed'
    | 'repeatable_read'
    | 'serializable';

  // Re-run detection (automatically set when complex query methods are used)
  IsReRun?: boolean;

  // Having conditions extraction (special handling for HAVING methods)
  havingConditions?: Array<{
    method: string;
    args: unknown[];
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
  [key: string]: unknown;
}

/**
 * SQL Result Interface
 * Represents the result of a SQL query compilation
 */
export interface SqlResult {
  sql: string;
  bindings?: unknown[];
  method?: string;
  options?: {
    mtdd?: MtddMeta;
    [key: string]: unknown;
  };
  __knexQueryUid?: string;
  timeout?: boolean;
  cancelOnTimeout?: boolean;
  returning?: unknown;
}
