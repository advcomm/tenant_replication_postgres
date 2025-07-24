import { BackendClient } from './grpcClient';

// Mock backend client for testing when real backend servers are not available
export class MockBackendClient {
  
  /**
   * @deprecated Use executeQuery instead
   */
  static async callProcedure(procedureName: string, params: any[], isFunction: boolean = false, tenantId?: number): Promise<any> {
    console.warn('⚠️ callProcedure is deprecated. Use executeQuery instead.');
    // Convert any BigInt values to strings for logging
    const safeParams = JSON.parse(JSON.stringify(params, (key, value) => 
      typeof value === 'bigint' ? value.toString() : value
    ));
    
    console.log(`🧪 MOCK: Calling procedure ${procedureName} with params:`, safeParams, `TenantID: ${tenantId}`);
    
    // Mock different responses based on procedure name
    if (procedureName.startsWith('List_')) {
      // Mock data loading response
      const tableName = procedureName.replace('List_', '');
      return {
        rows: [
          {
            id: 1,
            name: `Mock ${tableName} Item 1`,
            LastUpdated: new Date().toISOString(),
            TenantID: tenantId,
            isnotdeleted: true
          },
          {
            id: 2,
            name: `Mock ${tableName} Item 2`,
            LastUpdated: new Date().toISOString(),
            TenantID: tenantId,
            isnotdeleted: true
          },
          {
            id: 3,
            name: `Mock ${tableName} Item 3`,
            LastUpdated: new Date().toISOString(),
            TenantID: tenantId,
            isnotdeleted: true
          }
        ]
      };
    } else if (procedureName.startsWith('add_') || procedureName.startsWith('update_') || procedureName.startsWith('delete_')) {
      // Mock CUD operations response
      return {
        success: true,
        affectedRows: 1,
        message: `Mock ${procedureName} completed successfully`
      };
    } else if (procedureName === 'checkOwnerShip') {
      // Mock ownership check
      return 1; // Owner
    }
    
    // Default mock response
    return {
      success: true,
      data: `Mock response for ${procedureName}`,
      params: safeParams,
      tenantId: tenantId
    };
  }

  static async executeQuery(query: string, values: Record<string, any> = {}, tenantId?: number): Promise<any> {
    console.log(`🧪 MOCK: Executing query:`, query, `with values:`, values, `TenantID: ${tenantId}`);
    
    // Mock different responses based on query patterns
    if (query.includes('add_') || query.includes('insert')) {
      return {
        rows: [{ success: true, id: Math.floor(Math.random() * 1000) }],
        rowCount: 1
      };
    } else if (query.includes('update_')) {
      return {
        rows: [{ success: true, updated: true }],
        rowCount: 1
      };
    } else if (query.includes('delete_')) {
      return {
        rows: [{ success: true, deleted: true }],
        rowCount: 1
      };
    } else if (query.includes('SELECT') && query.includes('List_')) {
      // Extract table name from query
      const tableMatch = query.match(/List_(\w+)/);
      const tableName = tableMatch ? tableMatch[1] : 'unknown';
      
      return {
        rows: [
          {
            id: 1,
            name: `Mock ${tableName} Item 1`,
            LastUpdated: new Date().toISOString(),
            TenantID: tenantId,
            isnotdeleted: true
          },
          {
            id: 2,
            name: `Mock ${tableName} Item 2`,
            LastUpdated: new Date().toISOString(),
            TenantID: tenantId,
            isnotdeleted: true
          }
        ],
        rowCount: 2
      };
    }
    
    // Default mock response
    return {
      rows: [{ success: true, message: 'Mock query executed' }],
      rowCount: 1
    };
  }

  static ListenToChannel(channel: string, callback: (msg: any) => void): void {
    console.log(`🧪 MOCK: Starting to listen to channel '${channel}'`);
    
    // Simulate periodic channel messages for testing
    const interval = setInterval(() => {
      const mockMessage = {
        payload: JSON.stringify({
          table: 'mock_table',
          action: 'INSERT',
          data: {
            id: Math.floor(Math.random() * 1000),
            name: `Mock Item ${Date.now()}`,
            TenantID: 1,
            timestamp: new Date().toISOString()
          }
        }),
        channel: channel,
        timestamp: new Date().toISOString()
      };
      
      callback(mockMessage);
    }, 10000); // Send a mock message every 10 seconds

    // Store the interval so it can be cleared if needed
    // In a real implementation, you'd want to manage these intervals properly
    console.log(`🧪 MOCK: Channel listener started for '${channel}' (interval: ${interval})`);
  }

  static initialize(config: any): void {
    console.log('🧪 MOCK: Backend client initialized in test mode');
  }
}

// Use mock client if MOCK_BACKEND environment variable is set
export const getCurrentBackendClient = () => {
  if (process.env.MOCK_BACKEND === 'true') {
    console.log('🧪 Using Mock Backend Client for testing');
    return MockBackendClient;
  }
  return BackendClient;
};
