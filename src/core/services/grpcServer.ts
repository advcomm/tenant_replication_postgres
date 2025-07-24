// gRPC starter boilerplate for core
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as path from 'path';
import { BackendClient } from './grpcClient';
import { HR } from '@advcomm/utils/dist/utils';
import activeClients from '../helper/activeClients';
import { RedisService } from '@advcomm/utils';
import { tblPrimaryKeys } from '../../extension/middlewares/customMiddlewares';

const PROTO_PATH = path.join(__dirname, '../../../proto/api.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true });
const apiProto: any = grpc.loadPackageDefinition(packageDefinition).api;

// Get the appropriate backend client (real or mock)
const CurrentBackendClient = BackendClient;

// Extension hooks
let extensionStreamHandlers: ((stream: any) => void)[] = [];
export function registerStreamHandler(handler: (stream: any) => void) {
  extensionStreamHandlers.push(handler);
}

// Utility function to broadcast events to all connected clients
export function broadcastEvent(eventData: any) {
  const message = {
    deviceId: 'server',
    userAgent: '',
    payload: JSON.stringify({
      type: 'broadcast',
      data: eventData,
      timestamp: new Date().toISOString()
    })
  };
  
  // Send to all web clients
  activeClients.web.forEach((deviceEvents, deviceId) => {
    const stream = deviceEvents.get('events');
    if (stream) {
      try {
        stream.write(message);
        console.log(`📤 Broadcast sent to device: ${deviceId}`);
      } catch (error) {
        console.error(`Failed to send to ${deviceId}:`, error);
        activeClients.DeleteWebDevice(deviceId);
      }
    }
  });
}

// Utility function to send event to specific client
export function sendEventToClient(deviceId: string, eventData: any) {
  const deviceEvents = activeClients.web.get(deviceId);
  if (deviceEvents) {
    const stream = deviceEvents.get('events');
    if (stream) {
      try {
        stream.write({
          deviceId: 'server',
          userAgent: '',
          payload: JSON.stringify({
            type: 'targeted',
            data: eventData,
            timestamp: new Date().toISOString()
          })
        });
        console.log(`📤 Event sent to device: ${deviceId}`);
      } catch (error) {
        console.error(`Failed to send to ${deviceId}:`, error);
        activeClients.DeleteWebDevice(deviceId);
      }
    }
  }
}

// Generic gRPC handlers
const grpcHandlers = {


  Update: async (call: any, callback: any) => {
    const updates = call.request.requests;

    const TenantName="chishtiaq422@gmail.com";
    const TenantID = 1; // TODO: get from metadata if needed
    let response: { success: string[]; failed: { TXID: string; ErrorDetail: string }[] } = { success: [], failed: [] };
    updates.sort((a: any, b: any) => a.TXID - b.TXID);
    try {
      let currentTXID: number | null = null;
      for (const update of updates) {
        try {
          const { TXID, TableName, PK, Action, PayLoad } = update;
          currentTXID = TXID;
          const primaryKeyColumn = tblPrimaryKeys.get(TableName);

          // Verify vendor ownership
        //   const ownershipCheck = await CurrentBackendClient.callProcedure('checkOwnerShip', [TenantID, PK, TableName], true, TenantID);
        //   if (ownershipCheck === 0 && Action !== 0) {
        //     callback(null, { success: response.success, failed: [...response.failed, { TXID: TXID.toString(), ErrorDetail: `TenantID ${TenantID} does not own the record with PK ${PK} in table ${TableName}` }] });
        //     return;
        //   }



          if (Action === 0) {
            // Parse the New payload from JSON string
            const newData = PayLoad.New ? JSON.parse(PayLoad.New) : {};
            await CurrentBackendClient.executeQuery(
              `CALL add_${TableName}(\${tenantId}, \${timestamp}, \${data})`,
              {
                tenantId: TenantID,
                timestamp: HR.ns(),
                data: newData
              },
              TenantName
            );
          } else if (Action === 1) {
            // Parse the New payload from JSON string
            const newData = PayLoad.New ? JSON.parse(PayLoad.New) : {};
            await CurrentBackendClient.executeQuery(
              `CALL update_${TableName}(\${tenantId}, \${timestamp}, \${data})`,
              {
                tenantId: TenantID,
                timestamp: HR.ns(),
                data: newData
              },
              TenantName
            );
          } else if (Action === null) {
            await CurrentBackendClient.executeQuery(
              `CALL delete_${TableName}(\${pk}, \${tenantId}, \${timestamp}, \${txid})`,
              {
                pk: PK,
                tenantId: TenantID,
                timestamp: HR.ns(),
                txid: TXID
              },
              TenantName
            );
          } else {
            throw new Error(`Invalid action type ${Action}`);
          }
          response.success.push(TXID.toString());
        } catch (err: any) {
          if (currentTXID) response.failed.push({ TXID: currentTXID.toString(), ErrorDetail: err.message });
        }
      }
      callback(null, response);
    } catch (err: any) {
      callback({ code: grpc.status.INTERNAL, message: 'Failed to process updates' });
    }
  },

  EventStream: (call: any) => {
    // Extract client info from the initial request
    const { deviceId, userAgent } = call.request;
    
    console.log(`📡 New event stream subscription from device: ${deviceId}`);
    
    // Register the client
    if (!userAgent) {
      activeClients.AddWebDeviceEvent(deviceId, 'events', call);
    } else {
      activeClients.AddMobileDevice(deviceId, userAgent);
    }
    
    // Send initial connection confirmation
    call.write({
      deviceId: 'server',
      userAgent: '',
      payload: JSON.stringify({
        type: 'connection',
        message: 'Connected to gRPC Event Stream',
        timestamp: new Date().toISOString()
      })
    });
    
    // Send periodic test events for demonstration
    const eventInterval = setInterval(() => {
      call.write({
        deviceId: 'server',
        userAgent: '',
        payload: JSON.stringify({
          type: 'heartbeat',
          message: `Server heartbeat at ${new Date().toLocaleTimeString()}`,
          timestamp: new Date().toISOString()
        })
      });
    }, 3000);
    
    // Handle client disconnect
    call.on('cancelled', () => {
      console.log(`❌ Client ${deviceId} disconnected`);
      clearInterval(eventInterval);
      activeClients.DeleteWebDevice(deviceId);
    });
    
    call.on('error', (err: any) => {
      console.error(`❌ Stream error for ${deviceId}:`, err.message);
      clearInterval(eventInterval);
      activeClients.DeleteWebDevice(deviceId);
    });
    
    // Listen for DB changes and push to client using backend client
    const channelListener = async (msg: any) => {
      try {
        const payload = JSON.parse(msg.payload);
        const tableUpdate = JSON.parse(payload.payload);
        const { table, action, data } = tableUpdate;
        const TenantID = data.vendorid;
        const redisKey = `${table.toLowerCase()}:TenantID:${TenantID}`;
        
        const deviceEntries = await RedisService.getInstance().smembers(redisKey);
        if (Array.isArray(deviceEntries) && deviceEntries.length > 0) {
          deviceEntries.forEach((view: string) => {
            const [targetDeviceId, eventName] = view.split(":");
            if (targetDeviceId === deviceId) {
              // Send event to this specific client
              call.write({
                deviceId: 'server',
                userAgent: '',
                payload: JSON.stringify({
                  type: 'database_change',
                  table,
                  action,
                  data,
                  timestamp: new Date().toISOString()
                })
              });
            }
          });
        }
      } catch (error) {
        console.error('Error processing database change:', error);
      }
    };
    
    // Use backend client for channel listening
    CurrentBackendClient.ListenToChannel('table_changes', channelListener);
    
    // Allow extension to register custom stream handlers
    extensionStreamHandlers.forEach(handler => handler(call));
  },

  LoadData: async (call: any) => {

    const { deviceId, tableName, lastUpdated, TenantID } = call.request;
    console.log(`📊 LoadData request: deviceId=${deviceId}, table=${tableName}, lastUpdated=${lastUpdated}, TenantID=${TenantID}`);

    try {
      // Validate required parameters
      if (!deviceId || !tableName || !TenantID) {
        call.write({
          status: 'error',
          error: 'Missing required parameters: deviceId, tableName, or TenantID',
          completed: true,
          rows: []
        });
        call.end();
        return;
      }

      // Default lastUpdated to '1970-01-01' if not provided
      const lastUpdatedParam = lastUpdated || '1970-01-01';

      // Register this client connection for tracking
      //activeClients.AddWebDeviceEvent(deviceId, 'loadData', call);

      // Add client to Redis for tracking
      try {
        const redisInstance = RedisService.getInstance();
        await redisInstance.sadd(`${tableName}:TenantID:${TenantID}`, `${deviceId}:items_view`);
        await redisInstance.zadd('activeclients', Date.now(), deviceId);
      } catch (redisError: any) {
        console.log('Redis not available for client tracking:', redisError?.message || 'Unknown error');
      }

      // Execute the database query - using backend client layer
      const result = await CurrentBackendClient.executeQuery(
        `SELECT * FROM List_${tableName}(\${lastUpdated}, \${tenantId})`,
        {
          lastUpdated: lastUpdatedParam,
          tenantId: TenantID
        },
        TenantID
      );

      // Send data in chunks (streaming response)
      const chunkSize = 1000; // Adjust based on your needs
      // Handle both old format (result.result) and new format (result.rows)
      const rows = result.rows || result.result || [];
      const totalRows = rows.length;
      
      
      for (let i = 0; i < totalRows; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const dataRows = chunk.map((row: any) => ({
          fields: Object.fromEntries(
            Object.entries(row).map(([key, value]) => [key, String(value || '')])
          )
        }));

        call.write({
          status: 'streaming',
          rows: dataRows,
          completed: false,
          error: ''
        });

        // Small delay between chunks to prevent overwhelming the client
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Send completion message
      call.write({
        status: 'completed',
        rows: [],
        completed: true,
        error: ''
      });

      console.log(`✅ LoadData completed for ${deviceId}: ${totalRows} rows sent from ${tableName}`);

    } catch (error: any) {
      console.error(`❌ LoadData error for ${deviceId}:`, error);
      call.write({
        status: 'error',
        error: error.message || 'Unknown error occurred',
        completed: true,
        rows: []
      });
    } finally {
      call.end();
      
      // Cleanup client tracking
      activeClients.DeleteWebDevice(deviceId);
    }

    call.on('cancelled', () => {
      console.log(`❌ LoadData cancelled by client: ${deviceId}`);
      activeClients.DeleteWebDevice(deviceId);
    });

    call.on('error', (error: any) => {
      console.error(`❌ LoadData stream error for ${deviceId}:`, error);
      activeClients.DeleteWebDevice(deviceId);
    });
  }
};

// Start gRPC server
export function startGrpcServer(port = '50051') {
  const server = new grpc.Server();
  server.addService(apiProto.ApiService.service, grpcHandlers);
  server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err: any, bindPort: number) => {
    if (err) throw err;
    //server.start();
    console.log(`gRPC server running at 0.0.0.0:${port}`);
  });
}
