/**
 * MTDD gRPC Handler
 *
 * Automatic gRPC routing for multi-tenant database operations
 */

import type { MtddMeta, SqlResult } from '../types/mtdd';
import { BackendClient } from '../services/grpcClient';

/**
 * Automatic gRPC MTDD Handler
 * Routes queries to gRPC backend servers based on tenant information
 */
export async function grpcMtddHandler(
  meta: MtddMeta,
  queryObject: unknown,
  sqlResult: SqlResult,
): Promise<unknown> {
  console.log('🚀 [GRPC-MTDD] Processing query via gRPC backend');

  // Single server deployment detection
  const serverList = process.env.BACKEND_SERVERS?.split(',') || ['192.168.0.87', '192.168.0.2'];
  const isSingleServer = serverList.length === 1;

  if (isSingleServer) {
    console.log(
      '🎯 [SINGLE-SERVER] Single server deployment detected - using simplified gRPC routing',
    );
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
        result = await BackendClient.executeQuery(
          sqlResult.sql,
          sqlResult.bindings || [],
          tenantNameStr,
        );
      }

      console.log('✅ [SINGLE-SERVER] gRPC query executed successfully');
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ [SINGLE-SERVER] gRPC query execution failed:', errorMessage);
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
    console.log(
      `🎯 [GRPC-MTDD] Target:`,
      executeOnAllServers ? 'All Servers (Chain End)' : `Tenant Shard for ${tenantNameStr}`,
    );

    // Check the methodType and tenantType to determine action
    const shouldAddTenantShard =
      meta.methodType === 'addTenantShard' ||
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
        tenantTypeToUse =
          typeof meta.tenantType === 'string' ? parseInt(meta.tenantType) || 1 : meta.tenantType;
      }

      if (shouldAddTenantShard) {
        console.log(`🆕 [GRPC-MTDD] Add tenant operation detected - adding tenant shard first`);
        try {
          // Add tenant shard mapping first
          await BackendClient.addTenantShard(tenantNameStr, tenantTypeToUse);
          console.log(
            `✅ [GRPC-MTDD] Tenant shard mapping added for ${tenantNameStr} with type ${tenantTypeToUse}`,
          );
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.warn(
            `⚠️  [GRPC-MTDD] Could not add tenant shard (may already exist): ${errorMessage}`,
          );
          // Continue with query execution even if tenant shard addition fails
        }
      }

      // Execute query on specific shard for the tenant
      console.log(`📡 [GRPC-MTDD] Executing query on specific shard for tenant: ${tenantNameStr}`);
      result = await BackendClient.executeQuery(
        sqlResult.sql,
        sqlResult.bindings || [],
        tenantNameStr,
      );
    } else {
      // Execute query on all servers when no tenant specified or allServers flag is set
      console.log(`📡 [GRPC-MTDD] Executing query on all servers (chain end execution)`);
      result = await BackendClient.executeQueryAll(sqlResult.sql, sqlResult.bindings || []);
    }

    console.log('✅ [GRPC-MTDD] Query executed successfully via gRPC');
    console.log(
      '📦 [GRPC-MTDD] Result preview:',
      Array.isArray(result) ? `${result.length} rows` : 'Non-array result',
    );

    return result;
  } catch (error) {
    console.error('❌ [GRPC-MTDD] Error executing query via gRPC:', (error as Error).message);
    throw error;
  }
}

